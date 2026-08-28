-- ============================================================================
-- CampusFind :: 004_matches_claims.sql
-- Matching, claiming, verification and return entities.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- matches
--
-- A lost report may match many found items and a found item may match many
-- lost reports, so `matches` is the resolution of an M:N relationship.  The
-- pair (lost_item_id, found_item_id) is the candidate key.
--
-- The individual criterion scores are stored, not just the total, so the UI can
-- show WHY a score was produced and a reviewer can audit the decision later.
-- ----------------------------------------------------------------------------
CREATE TABLE matches (
    match_id          SERIAL PRIMARY KEY,
    lost_item_id      INTEGER      NOT NULL REFERENCES lost_items(lost_item_id)  ON DELETE CASCADE,
    found_item_id     INTEGER      NOT NULL REFERENCES found_items(found_item_id) ON DELETE CASCADE,

    category_score    NUMERIC(5,2) NOT NULL DEFAULT 0,  -- max 20
    brand_score       NUMERIC(5,2) NOT NULL DEFAULT 0,  -- max 20
    color_score       NUMERIC(5,2) NOT NULL DEFAULT 0,  -- max 10
    location_score    NUMERIC(5,2) NOT NULL DEFAULT 0,  -- max 20
    time_score        NUMERIC(5,2) NOT NULL DEFAULT 0,  -- max 15
    description_score NUMERIC(5,2) NOT NULL DEFAULT 0,  -- max 15
    total_score       NUMERIC(5,2) NOT NULL,            -- max 100

    day_gap           INTEGER      NOT NULL DEFAULT 0,
    reasons           TEXT[]       NOT NULL DEFAULT '{}',
    status            VARCHAR(12)  NOT NULL DEFAULT 'POTENTIAL',
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_match_pair     UNIQUE (lost_item_id, found_item_id),
    CONSTRAINT chk_match_total   CHECK (total_score BETWEEN 0 AND 100),
    CONSTRAINT chk_match_bounds  CHECK (
        category_score    BETWEEN 0 AND 20 AND
        brand_score       BETWEEN 0 AND 20 AND
        color_score       BETWEEN 0 AND 10 AND
        location_score    BETWEEN 0 AND 20 AND
        time_score        BETWEEN 0 AND 15 AND
        description_score BETWEEN 0 AND 15
    ),
    CONSTRAINT chk_match_status CHECK (status IN ('POTENTIAL', 'CLAIMED', 'CONFIRMED', 'DISMISSED'))
);

COMMENT ON TABLE matches IS 'Scored candidate pairing between a lost report and a found item.';
COMMENT ON COLUMN matches.reasons IS 'Human readable justification lines shown on the match screen.';

-- ----------------------------------------------------------------------------
-- claims
--
-- A student asserts ownership of a found item.  match_id is optional because a
-- student may also claim an item they spotted while browsing, without the
-- engine having produced a match first.
-- ----------------------------------------------------------------------------
CREATE TABLE claims (
    claim_id      SERIAL PRIMARY KEY,
    found_item_id INTEGER      NOT NULL REFERENCES found_items(found_item_id) ON DELETE RESTRICT,
    lost_item_id  INTEGER      REFERENCES lost_items(lost_item_id) ON DELETE SET NULL,
    match_id      INTEGER      REFERENCES matches(match_id)        ON DELETE SET NULL,
    claimant_id   INTEGER      NOT NULL REFERENCES users(user_id)  ON DELETE RESTRICT,
    claim_details TEXT         NOT NULL,
    status        VARCHAR(12)  NOT NULL DEFAULT 'PENDING',
    reviewed_by   INTEGER      REFERENCES users(user_id) ON DELETE SET NULL,
    review_notes  TEXT,
    submitted_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    reviewed_at   TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_claim_status  CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT chk_claim_details CHECK (char_length(trim(claim_details)) >= 15),
    -- A decided claim must record who decided it and when.
    CONSTRAINT chk_claim_review  CHECK (
        (status IN ('PENDING', 'CANCELLED'))
        OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    )
);

COMMENT ON TABLE claims IS 'A student''s request to collect a found item.';

-- Business rule: the same student may not have two open claims on one item.
-- A partial unique index expresses "unique only while PENDING".
CREATE UNIQUE INDEX uq_claim_one_open_per_user_item
    ON claims (found_item_id, claimant_id)
    WHERE status = 'PENDING';

-- Business rule: an item can only have one claim under review at a time.
CREATE UNIQUE INDEX uq_claim_one_pending_per_item
    ON claims (found_item_id)
    WHERE status = 'PENDING';

-- ----------------------------------------------------------------------------
-- verifications
--
-- The physical check performed by staff at the desk: scan the QR (or type the
-- code), confirm the person, then record the outcome.
-- ----------------------------------------------------------------------------
CREATE TABLE verifications (
    verification_id SERIAL PRIMARY KEY,
    claim_id        INTEGER     NOT NULL REFERENCES claims(claim_id) ON DELETE CASCADE,
    staff_id        INTEGER     NOT NULL REFERENCES users(user_id)   ON DELETE RESTRICT,
    method          VARCHAR(12) NOT NULL,
    qr_code_used    VARCHAR(24),
    outcome         VARCHAR(10) NOT NULL,
    notes           TEXT,
    verified_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_verif_method  CHECK (method  IN ('QR_SCAN', 'MANUAL_ID', 'VISUAL')),
    CONSTRAINT chk_verif_outcome CHECK (outcome IN ('PASSED', 'FAILED'))
);

COMMENT ON TABLE verifications IS 'Audit of the desk-side identity/QR check for a claim.';

-- ----------------------------------------------------------------------------
-- return_records
--
-- Written once, inside the approval transaction.  UNIQUE on both found_item_id
-- and claim_id guarantees an item cannot be handed over twice.
-- ----------------------------------------------------------------------------
CREATE TABLE return_records (
    return_id     SERIAL PRIMARY KEY,
    found_item_id INTEGER     NOT NULL UNIQUE REFERENCES found_items(found_item_id) ON DELETE RESTRICT,
    claim_id      INTEGER     NOT NULL UNIQUE REFERENCES claims(claim_id)           ON DELETE RESTRICT,
    lost_item_id  INTEGER     REFERENCES lost_items(lost_item_id) ON DELETE SET NULL,
    returned_to   INTEGER     NOT NULL REFERENCES users(user_id)  ON DELETE RESTRICT,
    released_by   INTEGER     NOT NULL REFERENCES users(user_id)  ON DELETE RESTRICT,
    remarks       TEXT,
    returned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Staff cannot hand an item to themselves as the claimant.
    CONSTRAINT chk_return_parties CHECK (returned_to <> released_by)
);

COMMENT ON TABLE return_records IS 'Immutable record of a completed handover.';
