-- ============================================================================
-- CampusFind :: 006_indexes.sql
--
-- Every index below exists because a real query in the application filters,
-- joins or sorts on that column.  PostgreSQL already creates indexes for
-- PRIMARY KEY and UNIQUE constraints, so those are not repeated here.
-- ============================================================================

-- --- users -------------------------------------------------------------------
-- The role filter is used by the admin user table ("show me all staff").
CREATE INDEX idx_users_role ON users (role_id);

-- --- lost_items --------------------------------------------------------------
-- "My reports", sorted newest first: WHERE reported_by = $1 ORDER BY created_at DESC
CREATE INDEX idx_lost_reporter_created ON lost_items (reported_by, created_at DESC);
-- Dashboard counters and the "active lost items" view.
CREATE INDEX idx_lost_status           ON lost_items (status);
-- Analytics: items grouped by category / location.
CREATE INDEX idx_lost_category         ON lost_items (category_id);
CREATE INDEX idx_lost_location         ON lost_items (location_id);
-- The matching engine narrows candidates by date window.
CREATE INDEX idx_lost_date             ON lost_items (lost_date);
-- Free-text search on the browse screen uses ILIKE '%term%', which a B-tree
-- cannot serve.  A GIN trigram index can.
CREATE INDEX idx_lost_name_trgm        ON lost_items USING GIN (item_name gin_trgm_ops);
CREATE INDEX idx_lost_desc_trgm        ON lost_items USING GIN (description gin_trgm_ops);

-- --- found_items -------------------------------------------------------------
CREATE INDEX idx_found_reporter_created ON found_items (reported_by, created_at DESC);
CREATE INDEX idx_found_status           ON found_items (status);
CREATE INDEX idx_found_category         ON found_items (category_id);
CREATE INDEX idx_found_location         ON found_items (location_id);
CREATE INDEX idx_found_date             ON found_items (found_date);
CREATE INDEX idx_found_name_trgm        ON found_items USING GIN (item_name gin_trgm_ops);
CREATE INDEX idx_found_desc_trgm        ON found_items USING GIN (description gin_trgm_ops);

-- --- matches -----------------------------------------------------------------
-- "Show my matches, best first" is the single most common dashboard query.
CREATE INDEX idx_matches_lost_score  ON matches (lost_item_id, total_score DESC);
CREATE INDEX idx_matches_found       ON matches (found_item_id);
CREATE INDEX idx_matches_status      ON matches (status);

-- --- claims ------------------------------------------------------------------
-- The staff review queue: WHERE status = 'PENDING' ORDER BY submitted_at
CREATE INDEX idx_claims_status_time ON claims (status, submitted_at DESC);
CREATE INDEX idx_claims_claimant    ON claims (claimant_id, submitted_at DESC);
CREATE INDEX idx_claims_found_item  ON claims (found_item_id);

-- --- verifications / returns -------------------------------------------------
CREATE INDEX idx_verifications_claim ON verifications (claim_id);
CREATE INDEX idx_returns_time        ON return_records (returned_at DESC);

-- --- notifications -----------------------------------------------------------
-- The bell icon asks for unread notifications of one user.  A partial index
-- keeps the index tiny because most rows are eventually read.
CREATE INDEX idx_notif_user_unread ON notifications (user_id, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX idx_notif_user        ON notifications (user_id, created_at DESC);

-- --- audit_logs --------------------------------------------------------------
-- The admin audit screen scans newest-first and filters by entity or action.
CREATE INDEX idx_audit_created ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_entity  ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_actor   ON audit_logs (actor_id);
CREATE INDEX idx_audit_action  ON audit_logs (action);
