-- ============================================================================
-- CampusFind :: triggers/001_triggers.sql
--
-- Four kinds of trigger, each with a reason to exist:
--   1. housekeeping   -> keep updated_at correct
--   2. validation     -> rules that a CHECK constraint cannot express
--   3. workflow       -> issue a QR tag the moment an item is handed in
--   4. audit          -> guarantee history is written even if someone edits a
--                        row directly in psql or pgAdmin
--
-- Point 4 is the important one: audit rows written by the application could be
-- skipped by a manual UPDATE.  Trigger-written audit rows cannot.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. HOUSEKEEPING: updated_at
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_users_touch        BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TRIGGER trg_lost_items_touch   BEFORE UPDATE ON lost_items
    FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TRIGGER trg_found_items_touch  BEFORE UPDATE ON found_items
    FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TRIGGER trg_matches_touch      BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TRIGGER trg_claims_touch       BEFORE UPDATE ON claims
    FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();


-- ---------------------------------------------------------------------------
-- 2. VALIDATION: dates may not be in the future
--    CHECK constraints must be IMMUTABLE, and CURRENT_DATE is not, so this
--    rule lives in a trigger instead.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validate_report_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_date DATE;
BEGIN
    -- Separate statements, not a CASE expression: PL/pgSQL would have to
    -- resolve every branch of a CASE, and NEW.found_date does not exist on
    -- lost_items (nor NEW.lost_date on found_items).
    IF TG_TABLE_NAME = 'lost_items' THEN
        v_date := NEW.lost_date;
    ELSE
        v_date := NEW.found_date;
    END IF;

    IF v_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Report date % cannot be in the future', v_date
            USING ERRCODE = 'check_violation';
    END IF;

    IF v_date < CURRENT_DATE - INTERVAL '2 years' THEN
        RAISE EXCEPTION 'Report date % is unreasonably old', v_date
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lost_items_validate  BEFORE INSERT OR UPDATE ON lost_items
    FOR EACH ROW EXECUTE FUNCTION fn_validate_report_date();

CREATE TRIGGER trg_found_items_validate BEFORE INSERT OR UPDATE ON found_items
    FOR EACH ROW EXECUTE FUNCTION fn_validate_report_date();


-- ---------------------------------------------------------------------------
-- 2b. VALIDATION: the found-item state machine
--
--     UNCLAIMED -> MATCHED | CLAIM_PENDING
--     MATCHED   -> UNCLAIMED | CLAIM_PENDING
--     CLAIM_PENDING -> VERIFIED | MATCHED | UNCLAIMED   (claim rejected/cancelled)
--     VERIFIED  -> RETURNED | CLAIM_PENDING
--     RETURNED  -> (terminal)
--
--     This is what stops RETURNED -> ACTIVE from ever happening, even from a
--     stray UPDATE typed straight into pgAdmin.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_guard_found_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_allowed TEXT[];
BEGIN
    IF NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;

    v_allowed := CASE OLD.status
        WHEN 'UNCLAIMED'     THEN ARRAY['MATCHED', 'CLAIM_PENDING']
        WHEN 'MATCHED'       THEN ARRAY['UNCLAIMED', 'CLAIM_PENDING']
        WHEN 'CLAIM_PENDING' THEN ARRAY['VERIFIED', 'MATCHED', 'UNCLAIMED']
        WHEN 'VERIFIED'      THEN ARRAY['RETURNED', 'CLAIM_PENDING']
        WHEN 'RETURNED'      THEN ARRAY[]::TEXT[]
        ELSE ARRAY[]::TEXT[]
    END;

    IF NOT (NEW.status = ANY (v_allowed)) THEN
        RAISE EXCEPTION 'Invalid found item transition: % -> %', OLD.status, NEW.status
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_found_items_status_guard BEFORE UPDATE OF status ON found_items
    FOR EACH ROW EXECUTE FUNCTION fn_guard_found_status();

-- The mirror rule for lost reports:
--     ACTIVE -> MATCHED | CLAIMED | RESOLVED
--     MATCHED -> ACTIVE | CLAIMED | RESOLVED
--     CLAIMED -> MATCHED | ACTIVE | RESOLVED
--     RESOLVED -> (terminal)
CREATE OR REPLACE FUNCTION fn_guard_lost_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'RESOLVED' THEN
        RAISE EXCEPTION 'A resolved lost report cannot be reopened (% -> %)', OLD.status, NEW.status
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lost_items_status_guard BEFORE UPDATE OF status ON lost_items
    FOR EACH ROW EXECUTE FUNCTION fn_guard_lost_status();


-- ---------------------------------------------------------------------------
-- 3. WORKFLOW: every found item automatically gets a QR tag
--    The application never has to remember to do it, and the code format is
--    guaranteed to be consistent.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_issue_qr_tag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_code VARCHAR(24);
BEGIN
    v_code := fn_next_qr_code();

    INSERT INTO qr_tags (found_item_id, qr_code)
    VALUES (NEW.found_item_id, v_code);

    PERFORM fn_write_audit(
        NEW.reported_by, 'QR_GENERATED', 'QR_TAG', NEW.found_item_id,
        jsonb_build_object('qr_code', v_code, 'item_name', NEW.item_name)
    );

    RETURN NULL;  -- AFTER trigger, return value is ignored
END;
$$;

CREATE TRIGGER trg_found_items_issue_qr AFTER INSERT ON found_items
    FOR EACH ROW EXECUTE FUNCTION fn_issue_qr_tag();


-- ---------------------------------------------------------------------------
-- 4. AUDIT
-- ---------------------------------------------------------------------------

-- 4a. new reports
CREATE OR REPLACE FUNCTION fn_audit_lost_item()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM fn_write_audit(
            NEW.reported_by, 'LOST_ITEM_CREATED', 'LOST_ITEM', NEW.lost_item_id,
            jsonb_build_object('item_name', NEW.item_name, 'status', NEW.status)
        );
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
        PERFORM fn_write_audit(
            NEW.reported_by, 'LOST_ITEM_UPDATED', 'LOST_ITEM', NEW.lost_item_id,
            jsonb_build_object('from', OLD.status, 'to', NEW.status)
        );
    END IF;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_lost_items_audit AFTER INSERT OR UPDATE ON lost_items
    FOR EACH ROW EXECUTE FUNCTION fn_audit_lost_item();

CREATE OR REPLACE FUNCTION fn_audit_found_item()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM fn_write_audit(
            NEW.reported_by, 'FOUND_ITEM_CREATED', 'FOUND_ITEM', NEW.found_item_id,
            jsonb_build_object('item_name', NEW.item_name, 'status', NEW.status)
        );
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
        PERFORM fn_write_audit(
            NULL, 'FOUND_ITEM_UPDATED', 'FOUND_ITEM', NEW.found_item_id,
            jsonb_build_object('from', OLD.status, 'to', NEW.status)
        );
    END IF;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_found_items_audit AFTER INSERT OR UPDATE ON found_items
    FOR EACH ROW EXECUTE FUNCTION fn_audit_found_item();

-- 4b. matches
CREATE OR REPLACE FUNCTION fn_audit_match()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM fn_write_audit(
        NULL, 'MATCH_CREATED', 'MATCH', NEW.match_id,
        jsonb_build_object(
            'lost_item_id',  NEW.lost_item_id,
            'found_item_id', NEW.found_item_id,
            'score',         NEW.total_score
        )
    );
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_matches_audit AFTER INSERT ON matches
    FOR EACH ROW EXECUTE FUNCTION fn_audit_match();

-- 4c. claims: one trigger covers submission and every decision
CREATE OR REPLACE FUNCTION fn_audit_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_action VARCHAR(30);
    v_actor  INTEGER;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'CLAIM_SUBMITTED';
        v_actor  := NEW.claimant_id;
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
        v_action := CASE NEW.status
                        WHEN 'APPROVED'  THEN 'CLAIM_APPROVED'
                        WHEN 'REJECTED'  THEN 'CLAIM_REJECTED'
                        WHEN 'CANCELLED' THEN 'CLAIM_CANCELLED'
                        ELSE NULL
                    END;
        v_actor  := COALESCE(NEW.reviewed_by, NEW.claimant_id);
    END IF;

    IF v_action IS NULL THEN
        RETURN NULL;
    END IF;

    PERFORM fn_write_audit(
        v_actor, v_action, 'CLAIM', NEW.claim_id,
        jsonb_build_object('found_item_id', NEW.found_item_id, 'status', NEW.status)
    );

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_claims_audit AFTER INSERT OR UPDATE ON claims
    FOR EACH ROW EXECUTE FUNCTION fn_audit_claim();

-- 4d. returns
CREATE OR REPLACE FUNCTION fn_audit_return()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM fn_write_audit(
        NEW.released_by, 'ITEM_RETURNED', 'RETURN', NEW.return_id,
        jsonb_build_object(
            'found_item_id', NEW.found_item_id,
            'claim_id',      NEW.claim_id,
            'returned_to',   NEW.returned_to
        )
    );
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_returns_audit AFTER INSERT ON return_records
    FOR EACH ROW EXECUTE FUNCTION fn_audit_return();

-- 4e. QR scans
CREATE OR REPLACE FUNCTION fn_audit_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM fn_write_audit(
        NEW.staff_id, 'QR_VERIFIED', 'CLAIM', NEW.claim_id,
        jsonb_build_object('method', NEW.method, 'outcome', NEW.outcome, 'qr_code', NEW.qr_code_used)
    );
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_verifications_audit AFTER INSERT ON verifications
    FOR EACH ROW EXECUTE FUNCTION fn_audit_verification();
