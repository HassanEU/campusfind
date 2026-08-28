-- ============================================================================
-- CampusFind :: functions/001_utility.sql
-- Small helper functions and the trigger functions that use them.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- fn_touch_updated_at()
-- Generic BEFORE UPDATE trigger function.  Keeps updated_at honest without the
-- application having to remember to set it on every UPDATE statement.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- fn_next_qr_code()
-- Produces the next public QR identifier, e.g. 'CF-FOUND-000125'.
-- A sequence guarantees uniqueness even when two staff members submit a found
-- report at exactly the same moment.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_next_qr_code()
RETURNS VARCHAR
LANGUAGE sql
AS $$
    SELECT 'CF-FOUND-' || LPAD(nextval('qr_code_seq')::TEXT, 6, '0');
$$;

-- ----------------------------------------------------------------------------
-- fn_write_audit(actor, action, entity_type, entity_id, details)
-- One place that appends to the audit trail.  Called from triggers and from
-- backend transactions so the format never drifts.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_write_audit(
    p_actor_id    INTEGER,
    p_action      VARCHAR,
    p_entity_type VARCHAR,
    p_entity_id   INTEGER,
    p_details     JSONB DEFAULT '{}'::jsonb
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_id BIGINT;
BEGIN
    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
    VALUES (p_actor_id, p_action, p_entity_type, p_entity_id, p_details)
    RETURNING audit_id INTO v_id;

    RETURN v_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- fn_notify(user, type, title, body, entity_type, entity_id)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_notify(
    p_user_id     INTEGER,
    p_type        VARCHAR,
    p_title       VARCHAR,
    p_body        VARCHAR,
    p_entity_type VARCHAR DEFAULT NULL,
    p_entity_id   INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_id INTEGER;
BEGIN
    INSERT INTO notifications (user_id, notification_type, title, body,
                               related_entity_type, related_entity_id)
    VALUES (p_user_id, p_type, p_title, p_body, p_entity_type, p_entity_id)
    RETURNING notification_id INTO v_id;

    RETURN v_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- fn_normalise(text)
-- Lower-cases and strips punctuation so that "AirPods Pro." and "airpods pro"
-- compare equal.  Used by the matching engine.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_normalise(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT COALESCE(NULLIF(trim(regexp_replace(lower(p_text), '[^a-z0-9 ]+', ' ', 'g')), ''), '');
$$;
