-- ============================================================================
-- CampusFind :: 003_items.sql
-- The two core reporting entities: lost_items and found_items.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- lost_items
--
-- Workflow states:
--   ACTIVE   -> the student is still looking for it
--   MATCHED  -> the matching engine produced at least one strong candidate
--   CLAIMED  -> the student has submitted a claim on a found item
--   RESOLVED -> the item was returned (or the student closed the report)
-- ----------------------------------------------------------------------------
CREATE TABLE lost_items (
    lost_item_id        SERIAL PRIMARY KEY,
    reported_by         INTEGER      NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    item_name           VARCHAR(120) NOT NULL,
    category_id         INTEGER      NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
    location_id         INTEGER      NOT NULL REFERENCES locations(location_id) ON DELETE RESTRICT,
    brand               VARCHAR(60),
    color               VARCHAR(40),
    description         TEXT         NOT NULL,
    identifying_details TEXT,
    lost_date           DATE         NOT NULL,
    lost_time_approx    TIME,
    status              VARCHAR(12)  NOT NULL DEFAULT 'ACTIVE',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_lost_status CHECK (status IN ('ACTIVE', 'MATCHED', 'CLAIMED', 'RESOLVED')),
    CONSTRAINT chk_lost_name   CHECK (char_length(trim(item_name)) >= 2),
    CONSTRAINT chk_lost_desc   CHECK (char_length(trim(description)) >= 10)
    -- "lost_date must not be in the future" is enforced by trigger
    -- trg_lost_items_validate, because CHECK constraints may only contain
    -- IMMUTABLE expressions and CURRENT_DATE is not immutable.
);

COMMENT ON TABLE lost_items IS 'A student report describing an item they have lost.';

-- ----------------------------------------------------------------------------
-- found_items
--
-- Workflow states:
--   UNCLAIMED     -> handed in, nobody has come forward
--   MATCHED       -> the engine linked it to a lost report
--   CLAIM_PENDING -> a student submitted a claim, staff must review it
--   VERIFIED      -> staff verified the claimant + QR, ready for handover
--   RETURNED      -> physically handed back, terminal state
-- ----------------------------------------------------------------------------
CREATE TABLE found_items (
    found_item_id     SERIAL PRIMARY KEY,
    reported_by       INTEGER      NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    item_name         VARCHAR(120) NOT NULL,
    category_id       INTEGER      NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
    location_id       INTEGER      NOT NULL REFERENCES locations(location_id) ON DELETE RESTRICT,
    brand             VARCHAR(60),
    color             VARCHAR(40),
    description       TEXT         NOT NULL,
    storage_location  VARCHAR(120) NOT NULL DEFAULT 'Lost & Found Desk',
    found_date        DATE         NOT NULL,
    found_time_approx TIME,
    status            VARCHAR(16)  NOT NULL DEFAULT 'UNCLAIMED',
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_found_status CHECK (status IN ('UNCLAIMED', 'MATCHED', 'CLAIM_PENDING', 'VERIFIED', 'RETURNED')),
    CONSTRAINT chk_found_name   CHECK (char_length(trim(item_name)) >= 2),
    CONSTRAINT chk_found_desc   CHECK (char_length(trim(description)) >= 10)
    -- See note above: future-date validation lives in trg_found_items_validate.
);

COMMENT ON TABLE found_items IS 'An item handed in to the lost & found desk.';

-- ----------------------------------------------------------------------------
-- qr_tags
--
-- Each found item may receive exactly one printable QR label.  The 1:1
-- cardinality is enforced with a UNIQUE constraint on found_item_id.
-- The QR payload deliberately contains ONLY the opaque code (CF-FOUND-000125)
-- so scanning a stray label never leaks personal data.
-- ----------------------------------------------------------------------------
CREATE SEQUENCE qr_code_seq START 100 INCREMENT 1;

CREATE TABLE qr_tags (
    qr_tag_id     SERIAL PRIMARY KEY,
    found_item_id INTEGER     NOT NULL UNIQUE REFERENCES found_items(found_item_id) ON DELETE CASCADE,
    qr_code       VARCHAR(24) NOT NULL UNIQUE,
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    scan_count    INTEGER     NOT NULL DEFAULT 0,
    last_scanned_at TIMESTAMPTZ,
    issued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_qr_format CHECK (qr_code ~ '^CF-FOUND-[0-9]{6}$'),
    CONSTRAINT chk_qr_scans  CHECK (scan_count >= 0)
);

COMMENT ON TABLE qr_tags IS 'Printable QR label attached to a physical found item.';
COMMENT ON COLUMN qr_tags.qr_code IS 'Opaque public identifier, e.g. CF-FOUND-000125. Contains no personal data.';
