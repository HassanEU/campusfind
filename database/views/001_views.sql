-- ============================================================================
-- CampusFind :: views/001_views.sql
--
-- These views exist because the same multi-table JOIN was needed in several
-- places.  Defining it once keeps the backend queries short and guarantees
-- that the dashboard, the list screen and the exports all agree.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- v_lost_items_detail
-- lost_items with its category / location / reporter names resolved.
-- Demonstrates INNER JOIN across four tables.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_lost_items_detail AS
SELECT
    l.lost_item_id,
    l.item_name,
    l.brand,
    l.color,
    l.description,
    l.identifying_details,
    l.lost_date,
    l.lost_time_approx,
    l.status,
    l.created_at,
    l.updated_at,
    l.reported_by,
    u.full_name    AS reporter_name,
    u.email        AS reporter_email,
    l.category_id,
    c.name         AS category_name,
    c.icon         AS category_icon,
    l.location_id,
    loc.name       AS location_name,
    loc.building   AS location_building
FROM lost_items l
INNER JOIN users      u   ON u.user_id       = l.reported_by
INNER JOIN categories c   ON c.category_id   = l.category_id
INNER JOIN locations  loc ON loc.location_id = l.location_id;

-- ----------------------------------------------------------------------------
-- v_found_items_detail
-- The same for found items, plus the QR code (LEFT JOIN, because a found item
-- may exist for a moment before its tag is issued).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_found_items_detail AS
SELECT
    f.found_item_id,
    f.item_name,
    f.brand,
    f.color,
    f.description,
    f.storage_location,
    f.found_date,
    f.found_time_approx,
    f.status,
    f.created_at,
    f.updated_at,
    f.reported_by,
    u.full_name    AS reporter_name,
    f.category_id,
    c.name         AS category_name,
    c.icon         AS category_icon,
    f.location_id,
    loc.name       AS location_name,
    loc.building   AS location_building,
    q.qr_code,
    q.scan_count,
    q.last_scanned_at
FROM found_items f
INNER JOIN users      u   ON u.user_id       = f.reported_by
INNER JOIN categories c   ON c.category_id   = f.category_id
INNER JOIN locations  loc ON loc.location_id = f.location_id
LEFT  JOIN qr_tags    q   ON q.found_item_id = f.found_item_id;

-- ----------------------------------------------------------------------------
-- v_active_lost_items
-- Reports that are still open.  Used by the matching engine's candidate query
-- and by the "open reports" screens.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_active_lost_items AS
SELECT * FROM v_lost_items_detail
WHERE status IN ('ACTIVE', 'MATCHED');

-- ----------------------------------------------------------------------------
-- v_available_found_items
-- Items still sitting on the shelf and therefore claimable.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_available_found_items AS
SELECT * FROM v_found_items_detail
WHERE status IN ('UNCLAIMED', 'MATCHED');

-- ----------------------------------------------------------------------------
-- v_match_overview
-- The heart of the match screen: one row that carries both sides of the
-- comparison plus the score breakdown.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_match_overview AS
SELECT
    m.match_id,
    m.total_score,
    m.category_score,
    m.brand_score,
    m.color_score,
    m.location_score,
    m.time_score,
    m.description_score,
    m.day_gap,
    m.reasons,
    m.status        AS match_status,
    m.created_at    AS matched_at,

    l.lost_item_id,
    l.item_name     AS lost_item_name,
    l.brand         AS lost_brand,
    l.color         AS lost_color,
    l.description   AS lost_description,
    l.lost_date,
    l.status        AS lost_status,
    l.reported_by   AS lost_reported_by,
    lc.name         AS lost_category,
    ll.name         AS lost_location,

    f.found_item_id,
    f.item_name     AS found_item_name,
    f.brand         AS found_brand,
    f.color         AS found_color,
    f.description   AS found_description,
    f.found_date,
    f.status        AS found_status,
    f.storage_location,
    fc.name         AS found_category,
    fl.name         AS found_location,
    q.qr_code
FROM matches m
INNER JOIN lost_items  l  ON l.lost_item_id   = m.lost_item_id
INNER JOIN found_items f  ON f.found_item_id  = m.found_item_id
INNER JOIN categories  lc ON lc.category_id   = l.category_id
INNER JOIN categories  fc ON fc.category_id   = f.category_id
INNER JOIN locations   ll ON ll.location_id   = l.location_id
INNER JOIN locations   fl ON fl.location_id   = f.location_id
LEFT  JOIN qr_tags     q  ON q.found_item_id  = f.found_item_id;

-- ----------------------------------------------------------------------------
-- v_claims_detail
-- The staff review queue.  LEFT JOINs are required because a claim may have no
-- linked lost report, no match and no reviewer yet.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_claims_detail AS
SELECT
    cl.claim_id,
    cl.status,
    cl.claim_details,
    cl.review_notes,
    cl.submitted_at,
    cl.reviewed_at,

    cl.claimant_id,
    u.full_name      AS claimant_name,
    u.email          AS claimant_email,
    u.enrollment_no  AS claimant_enrollment,
    u.department     AS claimant_department,

    cl.found_item_id,
    f.item_name      AS found_item_name,
    f.status         AS found_item_status,
    f.storage_location,
    f.found_date,
    cat.name         AS category_name,
    loc.name         AS found_location,
    q.qr_code,

    cl.lost_item_id,
    l.item_name      AS lost_item_name,
    l.identifying_details,

    cl.match_id,
    m.total_score    AS match_score,

    cl.reviewed_by,
    rev.full_name    AS reviewer_name
FROM claims cl
INNER JOIN users       u   ON u.user_id       = cl.claimant_id
INNER JOIN found_items f   ON f.found_item_id = cl.found_item_id
INNER JOIN categories  cat ON cat.category_id = f.category_id
INNER JOIN locations   loc ON loc.location_id = f.location_id
LEFT  JOIN qr_tags     q   ON q.found_item_id = f.found_item_id
LEFT  JOIN lost_items  l   ON l.lost_item_id  = cl.lost_item_id
LEFT  JOIN matches     m   ON m.match_id      = cl.match_id
LEFT  JOIN users       rev ON rev.user_id     = cl.reviewed_by;

-- ----------------------------------------------------------------------------
-- v_pending_claims
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_pending_claims AS
SELECT * FROM v_claims_detail WHERE status = 'PENDING';

-- ----------------------------------------------------------------------------
-- v_return_history
-- Completed handovers, newest first.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_return_history AS
SELECT
    r.return_id,
    r.returned_at,
    r.remarks,
    r.found_item_id,
    f.item_name       AS item_name,
    cat.name          AS category_name,
    loc.name          AS found_location,
    r.claim_id,
    r.lost_item_id,
    r.returned_to,
    owner.full_name   AS returned_to_name,
    owner.email       AS returned_to_email,
    r.released_by,
    staff.full_name   AS released_by_name,
    (r.returned_at::DATE - f.found_date) AS days_in_storage
FROM return_records r
INNER JOIN found_items f    ON f.found_item_id = r.found_item_id
INNER JOIN categories  cat  ON cat.category_id = f.category_id
INNER JOIN locations   loc  ON loc.location_id = f.location_id
INNER JOIN users       owner ON owner.user_id  = r.returned_to
INNER JOIN users       staff ON staff.user_id  = r.released_by;

-- ----------------------------------------------------------------------------
-- v_category_stats
-- GROUP BY + aggregate + CASE, used by the admin "items by category" chart.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_category_stats AS
SELECT
    c.category_id,
    c.name AS category_name,
    c.icon,
    COUNT(DISTINCT l.lost_item_id)  AS lost_count,
    COUNT(DISTINCT f.found_item_id) AS found_count,
    COUNT(DISTINCT f.found_item_id) FILTER (WHERE f.status = 'RETURNED') AS returned_count,
    CASE
        WHEN COUNT(DISTINCT f.found_item_id) = 0 THEN 0
        ELSE ROUND(100.0 * COUNT(DISTINCT f.found_item_id) FILTER (WHERE f.status = 'RETURNED')
                   / COUNT(DISTINCT f.found_item_id), 1)
    END AS return_rate
FROM categories c
LEFT JOIN lost_items  l ON l.category_id = c.category_id
LEFT JOIN found_items f ON f.category_id = c.category_id
GROUP BY c.category_id, c.name, c.icon;

-- ----------------------------------------------------------------------------
-- v_location_stats
-- Which places swallow the most belongings?
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_location_stats AS
SELECT
    loc.location_id,
    loc.name AS location_name,
    loc.building,
    COUNT(DISTINCT l.lost_item_id)  AS lost_count,
    COUNT(DISTINCT f.found_item_id) AS found_count,
    COUNT(DISTINCT l.lost_item_id) + COUNT(DISTINCT f.found_item_id) AS total_reports
FROM locations loc
LEFT JOIN lost_items  l ON l.location_id = loc.location_id
LEFT JOIN found_items f ON f.location_id = loc.location_id
GROUP BY loc.location_id, loc.name, loc.building;

-- ----------------------------------------------------------------------------
-- v_audit_trail
-- Audit rows with the actor's name resolved.  LEFT JOIN because the actor may
-- have been deleted (actor_id is then NULL) but the event must remain visible.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_audit_trail AS
SELECT
    a.audit_id,
    a.action,
    a.entity_type,
    a.entity_id,
    a.details,
    a.created_at,
    a.actor_id,
    COALESCE(u.full_name, 'System') AS actor_name,
    COALESCE(r.role_name, 'SYSTEM') AS actor_role
FROM audit_logs a
LEFT JOIN users u ON u.user_id = a.actor_id
LEFT JOIN roles r ON r.role_id = u.role_id;
