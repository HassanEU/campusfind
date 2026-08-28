-- ============================================================================
-- CampusFind :: functions/003_analytics.sql
-- Reporting helpers used by the dashboards.  Every number the UI shows comes
-- from one of these (or from a view) -- nothing is hard-coded in the frontend.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- fn_resolution_rate()
-- What percentage of handed-in items actually made it back to their owner?
--
--   returned items
--   -------------- x 100
--   all found items
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_resolution_rate()
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
    SELECT CASE
             WHEN COUNT(*) = 0 THEN 0
             ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'RETURNED') / COUNT(*), 1)
           END
      FROM found_items;
$$;

-- ----------------------------------------------------------------------------
-- fn_student_dashboard(user_id)
-- The four counters on the student dashboard, in a single round trip.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_student_dashboard(p_user_id INTEGER)
RETURNS TABLE (
    lost_reports      BIGINT,
    active_reports    BIGINT,
    potential_matches BIGINT,
    open_claims       BIGINT,
    returned_items    BIGINT,
    unread_notices    BIGINT
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        (SELECT COUNT(*) FROM lost_items WHERE reported_by = p_user_id),
        (SELECT COUNT(*) FROM lost_items WHERE reported_by = p_user_id AND status IN ('ACTIVE','MATCHED')),
        (SELECT COUNT(*)
           FROM matches m
           JOIN lost_items l ON l.lost_item_id = m.lost_item_id
          WHERE l.reported_by = p_user_id AND m.status = 'POTENTIAL'),
        (SELECT COUNT(*) FROM claims WHERE claimant_id = p_user_id AND status = 'PENDING'),
        (SELECT COUNT(*) FROM return_records WHERE returned_to = p_user_id),
        (SELECT COUNT(*) FROM notifications WHERE user_id = p_user_id AND is_read = FALSE);
$$;

-- ----------------------------------------------------------------------------
-- fn_platform_stats()
-- Headline numbers for the landing page and the admin dashboard.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_platform_stats()
RETURNS TABLE (
    total_lost       BIGINT,
    total_found      BIGINT,
    active_lost      BIGINT,
    available_found  BIGINT,
    potential_matches BIGINT,
    confirmed_matches BIGINT,
    pending_claims   BIGINT,
    returned_items   BIGINT,
    registered_users BIGINT,
    resolution_rate  NUMERIC
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        (SELECT COUNT(*) FROM lost_items),
        (SELECT COUNT(*) FROM found_items),
        (SELECT COUNT(*) FROM lost_items  WHERE status IN ('ACTIVE','MATCHED')),
        (SELECT COUNT(*) FROM found_items WHERE status IN ('UNCLAIMED','MATCHED')),
        (SELECT COUNT(*) FROM matches WHERE status = 'POTENTIAL'),
        (SELECT COUNT(*) FROM matches WHERE status = 'CONFIRMED'),
        (SELECT COUNT(*) FROM claims  WHERE status = 'PENDING'),
        (SELECT COUNT(*) FROM found_items WHERE status = 'RETURNED'),
        (SELECT COUNT(*) FROM users WHERE is_active),
        fn_resolution_rate();
$$;

-- ----------------------------------------------------------------------------
-- fn_reports_over_time(days)
-- One row per day for the admin line chart.  generate_series guarantees that
-- days with zero reports still appear, otherwise the chart would lie.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_reports_over_time(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    day         DATE,
    lost_count  BIGINT,
    found_count BIGINT,
    returned_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
    WITH calendar AS (
        SELECT generate_series(
                   CURRENT_DATE - (p_days - 1) * INTERVAL '1 day',
                   CURRENT_DATE,
                   INTERVAL '1 day'
               )::DATE AS day
    )
    SELECT c.day,
           COUNT(DISTINCT l.lost_item_id),
           COUNT(DISTINCT f.found_item_id),
           COUNT(DISTINCT r.return_id)
      FROM calendar c
      LEFT JOIN lost_items     l ON l.created_at::DATE  = c.day
      LEFT JOIN found_items    f ON f.created_at::DATE  = c.day
      LEFT JOIN return_records r ON r.returned_at::DATE = c.day
     GROUP BY c.day
     ORDER BY c.day;
$$;
