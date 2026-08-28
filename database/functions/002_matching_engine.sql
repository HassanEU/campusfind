-- ============================================================================
-- CampusFind :: functions/002_matching_engine.sql
--
-- THE MATCHING ENGINE.
--
-- This is deterministic, rule based scoring -- not machine learning.  Given one
-- lost report and one found item it awards points on six criteria:
--
--     Category      20   same category?
--     Brand         20   same brand (exact, or close spelling)?
--     Colour        10   same colour family?
--     Location      20   same place, or at least the same building?
--     Time          15   was it handed in soon after it went missing?
--     Description   15   how similar is the free text? (pg_trgm)
--     ------------------
--     Total        100
--
-- Running the same two rows through the function always produces the same
-- number, which is exactly what you want when a human has to justify a
-- decision about someone else's property.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- fn_score_match(lost_item_id, found_item_id)
-- Returns one row containing the six component scores, the total, the day gap
-- and a human readable list of reasons.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_score_match(p_lost_id INTEGER, p_found_id INTEGER)
RETURNS TABLE (
    category_score    NUMERIC,
    brand_score       NUMERIC,
    color_score       NUMERIC,
    location_score    NUMERIC,
    time_score        NUMERIC,
    description_score NUMERIC,
    total_score       NUMERIC,
    day_gap           INTEGER,
    reasons           TEXT[]
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    l           RECORD;
    f           RECORD;
    v_gap       INTEGER;
    v_cat       NUMERIC := 0;
    v_brand     NUMERIC := 0;
    v_color     NUMERIC := 0;
    v_loc       NUMERIC := 0;
    v_time      NUMERIC := 0;
    v_desc      NUMERIC := 0;
    v_text_sim  NUMERIC := 0;
    v_reasons   TEXT[]  := '{}';
BEGIN
    SELECT li.*, loc.building AS building_name, c.name AS category_name
      INTO l
      FROM lost_items li
      JOIN locations  loc ON loc.location_id = li.location_id
      JOIN categories c   ON c.category_id   = li.category_id
     WHERE li.lost_item_id = p_lost_id;

    SELECT fi.*, loc.building AS building_name, c.name AS category_name
      INTO f
      FROM found_items fi
      JOIN locations  loc ON loc.location_id = fi.location_id
      JOIN categories c   ON c.category_id   = fi.category_id
     WHERE fi.found_item_id = p_found_id;

    IF l IS NULL OR f IS NULL THEN
        RETURN;  -- one of the rows does not exist: no row is returned
    END IF;

    ------------------------------------------------------------------
    -- 1. CATEGORY  (20 points, all-or-nothing)
    ------------------------------------------------------------------
    IF l.category_id = f.category_id THEN
        v_cat     := 20;
        v_reasons := v_reasons || format('Both reports are in the %s category', l.category_name);
    END IF;

    ------------------------------------------------------------------
    -- 2. BRAND  (20 points; 12 for a near-miss spelling such as "Sony"/"Sonny")
    ------------------------------------------------------------------
    IF l.brand IS NOT NULL AND f.brand IS NOT NULL THEN
        IF fn_normalise(l.brand) = fn_normalise(f.brand) THEN
            v_brand   := 20;
            v_reasons := v_reasons || format('Brand matches exactly (%s)', f.brand);
        ELSIF similarity(fn_normalise(l.brand), fn_normalise(f.brand)) >= 0.45 THEN
            v_brand   := 12;
            v_reasons := v_reasons || format('Brand is a close spelling match (%s / %s)', l.brand, f.brand);
        END IF;
    END IF;

    ------------------------------------------------------------------
    -- 3. COLOUR  (10 points; 6 when one colour contains the other,
    --             e.g. "black" vs "matte black")
    ------------------------------------------------------------------
    IF l.color IS NOT NULL AND f.color IS NOT NULL THEN
        IF fn_normalise(l.color) = fn_normalise(f.color) THEN
            v_color   := 10;
            v_reasons := v_reasons || format('Colour matches (%s)', f.color);
        ELSIF fn_normalise(l.color) LIKE '%' || fn_normalise(f.color) || '%'
           OR fn_normalise(f.color) LIKE '%' || fn_normalise(l.color) || '%' THEN
            v_color   := 6;
            v_reasons := v_reasons || format('Colours are related (%s / %s)', l.color, f.color);
        END IF;
    END IF;

    ------------------------------------------------------------------
    -- 4. LOCATION  (20 for the same place, 12 for the same building)
    ------------------------------------------------------------------
    IF l.location_id = f.location_id THEN
        v_loc     := 20;
        v_reasons := v_reasons || 'Lost and found at the same location'::TEXT;
    ELSIF l.building_name = f.building_name THEN
        v_loc     := 12;
        v_reasons := v_reasons || format('Both locations are inside %s', f.building_name);
    END IF;

    ------------------------------------------------------------------
    -- 5. TIME  (15 points, decaying with the gap in days)
    --    A negative gap means the item was handed in BEFORE it was reported
    --    lost, which is common (people report late), so a small negative gap
    --    still earns credit.
    ------------------------------------------------------------------
    v_gap := f.found_date - l.lost_date;

    v_time := CASE
        WHEN v_gap BETWEEN 0  AND 1  THEN 15
        WHEN v_gap BETWEEN 0  AND 3  THEN 12
        WHEN v_gap BETWEEN 0  AND 7  THEN 9
        WHEN v_gap BETWEEN 0  AND 14 THEN 5
        WHEN v_gap BETWEEN 0  AND 30 THEN 2
        WHEN v_gap BETWEEN -2 AND -1 THEN 8   -- handed in just before the report
        WHEN v_gap BETWEEN -7 AND -3 THEN 4
        ELSE 0
    END;

    IF v_time >= 12 THEN
        v_reasons := v_reasons || format('Handed in within %s day(s) of going missing', GREATEST(v_gap, 0));
    ELSIF v_time > 0 THEN
        v_reasons := v_reasons || format('Dates are %s day(s) apart', abs(v_gap));
    END IF;

    ------------------------------------------------------------------
    -- 6. DESCRIPTION  (15 points, scaled by pg_trgm similarity)
    --    The item name is folded into the text so that "AirPods" in the title
    --    still counts even when the descriptions are worded differently.
    ------------------------------------------------------------------
    v_text_sim := similarity(
        fn_normalise(l.item_name || ' ' || l.description),
        fn_normalise(f.item_name || ' ' || f.description)
    );

    v_desc := ROUND(LEAST(v_text_sim * 1.6, 1.0) * 15, 2);

    IF v_desc >= 9 THEN
        v_reasons := v_reasons || 'Descriptions are strongly similar'::TEXT;
    ELSIF v_desc >= 4 THEN
        v_reasons := v_reasons || 'Descriptions have some words in common'::TEXT;
    END IF;

    ------------------------------------------------------------------
    RETURN QUERY SELECT
        v_cat, v_brand, v_color, v_loc, v_time, v_desc,
        ROUND(v_cat + v_brand + v_color + v_loc + v_time + v_desc, 2),
        v_gap,
        v_reasons;
END;
$$;

COMMENT ON FUNCTION fn_score_match IS
    'Deterministic 100-point similarity score between one lost report and one found item.';


-- ----------------------------------------------------------------------------
-- fn_generate_matches_for_lost(lost_item_id, threshold)
--
-- Scores the given lost report against every found item that is still
-- collectable, and stores every pair that clears the threshold.
-- Returns the number of matches written.
--
-- Candidate narrowing (so we do not score the whole table):
--   * the found item must still be collectable,
--   * and it must either share the category or have a similar name.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_generate_matches_for_lost(
    p_lost_id    INTEGER,
    p_threshold  NUMERIC DEFAULT 40
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_candidate  RECORD;
    v_score      RECORD;
    v_written    INTEGER := 0;
    v_best       NUMERIC := 0;
    v_owner      INTEGER;
    v_item_name  TEXT;
BEGIN
    SELECT reported_by, item_name INTO v_owner, v_item_name
      FROM lost_items WHERE lost_item_id = p_lost_id;

    IF v_owner IS NULL THEN
        RETURN 0;
    END IF;

    FOR v_candidate IN
        SELECT f.found_item_id
          FROM found_items f
          JOIN lost_items  l ON l.lost_item_id = p_lost_id
         WHERE f.status IN ('UNCLAIMED', 'MATCHED')
           AND (
                f.category_id = l.category_id
             OR similarity(fn_normalise(f.item_name), fn_normalise(l.item_name)) >= 0.25
           )
    LOOP
        SELECT * INTO v_score FROM fn_score_match(p_lost_id, v_candidate.found_item_id);

        IF v_score.total_score >= p_threshold THEN
            INSERT INTO matches (
                lost_item_id, found_item_id,
                category_score, brand_score, color_score,
                location_score, time_score, description_score,
                total_score, day_gap, reasons
            ) VALUES (
                p_lost_id, v_candidate.found_item_id,
                v_score.category_score, v_score.brand_score, v_score.color_score,
                v_score.location_score, v_score.time_score, v_score.description_score,
                v_score.total_score, v_score.day_gap, v_score.reasons
            )
            ON CONFLICT (lost_item_id, found_item_id) DO UPDATE
                SET category_score    = EXCLUDED.category_score,
                    brand_score       = EXCLUDED.brand_score,
                    color_score       = EXCLUDED.color_score,
                    location_score    = EXCLUDED.location_score,
                    time_score        = EXCLUDED.time_score,
                    description_score = EXCLUDED.description_score,
                    total_score       = EXCLUDED.total_score,
                    day_gap           = EXCLUDED.day_gap,
                    reasons           = EXCLUDED.reasons,
                    updated_at        = NOW()
                WHERE matches.status = 'POTENTIAL';

            v_written := v_written + 1;
            v_best    := GREATEST(v_best, v_score.total_score);
        END IF;
    END LOOP;

    -- A strong candidate moves the report from ACTIVE to MATCHED and tells the
    -- student.  Weak candidates are stored but do not change the status.
    IF v_best >= 60 THEN
        UPDATE lost_items
           SET status = 'MATCHED'
         WHERE lost_item_id = p_lost_id
           AND status = 'ACTIVE';

        PERFORM fn_notify(
            v_owner, 'MATCH_FOUND',
            'Possible match for your ' || v_item_name,
            'CampusFind found an item that scores ' || ROUND(v_best) ||
            '/100 against your report. Open the match to compare the details.',
            'LOST_ITEM', p_lost_id
        );
    END IF;

    RETURN v_written;
END;
$$;


-- ----------------------------------------------------------------------------
-- fn_generate_matches_for_found(found_item_id, threshold)
-- The mirror image: a new found item is scored against every open lost report.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_generate_matches_for_found(
    p_found_id   INTEGER,
    p_threshold  NUMERIC DEFAULT 40
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_candidate RECORD;
    v_score     RECORD;
    v_written   INTEGER := 0;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM found_items WHERE found_item_id = p_found_id) THEN
        RETURN 0;
    END IF;

    FOR v_candidate IN
        SELECT l.lost_item_id, l.reported_by, l.item_name
          FROM lost_items  l
          JOIN found_items f ON f.found_item_id = p_found_id
         WHERE l.status IN ('ACTIVE', 'MATCHED')
           AND (
                l.category_id = f.category_id
             OR similarity(fn_normalise(l.item_name), fn_normalise(f.item_name)) >= 0.25
           )
    LOOP
        SELECT * INTO v_score FROM fn_score_match(v_candidate.lost_item_id, p_found_id);

        IF v_score.total_score >= p_threshold THEN
            INSERT INTO matches (
                lost_item_id, found_item_id,
                category_score, brand_score, color_score,
                location_score, time_score, description_score,
                total_score, day_gap, reasons
            ) VALUES (
                v_candidate.lost_item_id, p_found_id,
                v_score.category_score, v_score.brand_score, v_score.color_score,
                v_score.location_score, v_score.time_score, v_score.description_score,
                v_score.total_score, v_score.day_gap, v_score.reasons
            )
            ON CONFLICT (lost_item_id, found_item_id) DO UPDATE
                SET category_score    = EXCLUDED.category_score,
                    brand_score       = EXCLUDED.brand_score,
                    color_score       = EXCLUDED.color_score,
                    location_score    = EXCLUDED.location_score,
                    time_score        = EXCLUDED.time_score,
                    description_score = EXCLUDED.description_score,
                    total_score       = EXCLUDED.total_score,
                    day_gap           = EXCLUDED.day_gap,
                    reasons           = EXCLUDED.reasons,
                    updated_at        = NOW()
                WHERE matches.status = 'POTENTIAL';

            v_written := v_written + 1;

            IF v_score.total_score >= 60 THEN
                UPDATE lost_items
                   SET status = 'MATCHED'
                 WHERE lost_item_id = v_candidate.lost_item_id
                   AND status = 'ACTIVE';

                UPDATE found_items
                   SET status = 'MATCHED'
                 WHERE found_item_id = p_found_id
                   AND status = 'UNCLAIMED';

                PERFORM fn_notify(
                    v_candidate.reported_by, 'MATCH_FOUND',
                    'Possible match for your ' || v_candidate.item_name,
                    'An item just handed in scores ' || ROUND(v_score.total_score) ||
                    '/100 against your report. Open the match to compare the details.',
                    'LOST_ITEM', v_candidate.lost_item_id
                );
            END IF;
        END IF;
    END LOOP;

    RETURN v_written;
END;
$$;
