-- ============================================================================
-- CampusFind :: seeds/003_workflow.sql
--
-- Runs the matching engine over the seeded reports and then walks a few of
-- them through the full lifecycle so the dashboards have believable history:
--
--   * three items already returned  -> resolution rate, return history, audit
--   * one claim waiting for staff   -> the staff review queue is not empty
--   * one rejected claim            -> the "rejected" branch is demonstrable
--   * the AirPods match left open   -> this is the live demo you present
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Score every open lost report against every collectable found item.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT lost_item_id FROM lost_items ORDER BY lost_item_id LOOP
        PERFORM fn_generate_matches_for_lost(r.lost_item_id);
    END LOOP;
END;
$$;


-- ---------------------------------------------------------------------------
-- 2. Walk three matches all the way to RETURNED, inside one transaction each.
--    This mirrors exactly what the backend's approveClaim service does.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v         RECORD;
    v_match   RECORD;
    v_claim   INTEGER;
    v_staff   INTEGER;
    v_days    INTEGER;
BEGIN
    SELECT user_id INTO v_staff FROM users WHERE email = 'rahul.desai@campusfind.edu';

    FOR v IN
        SELECT * FROM (VALUES
            ('fatima@campus.edu', 'Prescription Spectacles', 'Brown Spectacles in Case',
             'The tan hard case has my name inside the lid and the right arm is taped.', 5),
            ('diya@campus.edu',   'Data Structures Textbook', 'Pearson Textbook',
             'My name and phone number are handwritten on the first page of the book.',  6),
            ('rohan@campus.edu',  'Blue Hoodie', 'Navy Puma Hoodie',
             'There is a small ink stain on the right sleeve cuff of the hoodie.',       7)
        ) AS t(email, lost_name, found_name, details, days_ago)
    LOOP
        SELECT m.match_id, m.lost_item_id, m.found_item_id, u.user_id AS claimant
          INTO v_match
          FROM matches m
          JOIN lost_items  l ON l.lost_item_id  = m.lost_item_id
          JOIN found_items f ON f.found_item_id = m.found_item_id
          JOIN users       u ON u.user_id       = l.reported_by
         WHERE u.email = v.email
           AND l.item_name = v.lost_name
           AND f.item_name = v.found_name
         LIMIT 1;

        CONTINUE WHEN v_match IS NULL;

        v_days := v.days_ago;

        -- (a) the student submits the claim
        INSERT INTO claims (found_item_id, lost_item_id, match_id, claimant_id,
                            claim_details, status, submitted_at)
        VALUES (v_match.found_item_id, v_match.lost_item_id, v_match.match_id,
                v_match.claimant, v.details, 'PENDING',
                NOW() - (v_days || ' days')::INTERVAL)
        RETURNING claim_id INTO v_claim;

        UPDATE found_items SET status = 'CLAIM_PENDING' WHERE found_item_id = v_match.found_item_id;
        UPDATE lost_items  SET status = 'CLAIMED'       WHERE lost_item_id  = v_match.lost_item_id;

        -- (b) staff scans the QR label and checks the person
        INSERT INTO verifications (claim_id, staff_id, method, qr_code_used, outcome, notes, verified_at)
        SELECT v_claim, v_staff, 'QR_SCAN', q.qr_code, 'PASSED',
               'Identifying detail confirmed against the physical item.',
               NOW() - ((v_days - 1) || ' days')::INTERVAL
          FROM qr_tags q WHERE q.found_item_id = v_match.found_item_id;

        UPDATE qr_tags
           SET scan_count = scan_count + 1,
               last_scanned_at = NOW() - ((v_days - 1) || ' days')::INTERVAL
         WHERE found_item_id = v_match.found_item_id;

        -- (c) staff approves and the item is handed over
        UPDATE claims
           SET status = 'APPROVED', reviewed_by = v_staff,
               reviewed_at = NOW() - ((v_days - 1) || ' days')::INTERVAL,
               review_notes = 'Ownership confirmed at the desk. Item released.'
         WHERE claim_id = v_claim;

        UPDATE found_items SET status = 'VERIFIED' WHERE found_item_id = v_match.found_item_id;
        UPDATE found_items SET status = 'RETURNED' WHERE found_item_id = v_match.found_item_id;
        UPDATE lost_items  SET status = 'RESOLVED' WHERE lost_item_id  = v_match.lost_item_id;

        UPDATE matches SET status = 'CONFIRMED' WHERE match_id = v_match.match_id;
        UPDATE matches SET status = 'DISMISSED'
         WHERE found_item_id = v_match.found_item_id AND match_id <> v_match.match_id;

        INSERT INTO return_records (found_item_id, claim_id, lost_item_id, returned_to,
                                    released_by, remarks, returned_at)
        VALUES (v_match.found_item_id, v_claim, v_match.lost_item_id, v_match.claimant,
                v_staff, 'Collected in person from the lost & found desk.',
                NOW() - ((v_days - 1) || ' days')::INTERVAL);

        PERFORM fn_notify(
            v_match.claimant, 'ITEM_RETURNED',
            'Your ' || v.lost_name || ' has been returned',
            'The item was handed over at the lost & found desk. Thank you for using CampusFind.',
            'CLAIM', v_claim
        );
    END LOOP;
END;
$$;


-- ---------------------------------------------------------------------------
-- 3. One claim still waiting for staff review (Kabir's calculator).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_match RECORD;
    v_claim INTEGER;
BEGIN
    SELECT m.match_id, m.lost_item_id, m.found_item_id, l.reported_by AS claimant
      INTO v_match
      FROM matches m
      JOIN lost_items  l ON l.lost_item_id  = m.lost_item_id
      JOIN found_items f ON f.found_item_id = m.found_item_id
     WHERE l.item_name = 'Casio Scientific Calculator'
       AND f.item_name = 'Scientific Calculator'
     LIMIT 1;

    IF v_match IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO claims (found_item_id, lost_item_id, match_id, claimant_id, claim_details, status, submitted_at)
    VALUES (v_match.found_item_id, v_match.lost_item_id, v_match.match_id, v_match.claimant,
            'My full name is written in blue marker on the back cover of the calculator, just below the model number.',
            'PENDING', NOW() - INTERVAL '1 day')
    RETURNING claim_id INTO v_claim;

    UPDATE found_items SET status = 'CLAIM_PENDING' WHERE found_item_id = v_match.found_item_id;
    UPDATE lost_items  SET status = 'CLAIMED'       WHERE lost_item_id  = v_match.lost_item_id;

    PERFORM fn_notify(
        (SELECT user_id FROM users WHERE email = 'rahul.desai@campusfind.edu'),
        'CLAIM_SUBMITTED', 'New claim awaiting review',
        'A student submitted a claim for a scientific calculator. Verify the QR label and the identifying detail.',
        'CLAIM', v_claim
    );
END;
$$;


-- ---------------------------------------------------------------------------
-- 4. One rejected claim, so the rejected branch has real history.
--    Ishaan claims the wallet he did not lose; staff rejects it.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_found INTEGER;
    v_user  INTEGER;
    v_staff INTEGER;
    v_claim INTEGER;
BEGIN
    SELECT found_item_id INTO v_found FROM found_items WHERE item_name = 'Leather Wallet' LIMIT 1;
    SELECT user_id INTO v_user  FROM users WHERE email = 'ananya@campus.edu';
    SELECT user_id INTO v_staff FROM users WHERE email = 'priya.nair@campusfind.edu';

    IF v_found IS NULL THEN RETURN; END IF;

    INSERT INTO claims (found_item_id, claimant_id, claim_details, status, submitted_at)
    VALUES (v_found, v_user,
            'I think this brown wallet could be mine, I lost one somewhere around the main block last week.',
            'PENDING', NOW() - INTERVAL '9 days')
    RETURNING claim_id INTO v_claim;

    UPDATE found_items SET status = 'CLAIM_PENDING' WHERE found_item_id = v_found;

    INSERT INTO verifications (claim_id, staff_id, method, outcome, notes, verified_at)
    VALUES (v_claim, v_staff, 'MANUAL_ID', 'FAILED',
            'Claimant could not describe the cards inside the wallet.',
            NOW() - INTERVAL '8 days');

    UPDATE claims
       SET status = 'REJECTED', reviewed_by = v_staff,
           reviewed_at = NOW() - INTERVAL '8 days',
           review_notes = 'Identifying details did not match the item held at the desk.'
     WHERE claim_id = v_claim;

    UPDATE found_items SET status = 'UNCLAIMED' WHERE found_item_id = v_found;

    PERFORM fn_notify(
        v_user, 'CLAIM_REJECTED', 'Your claim was not approved',
        'The details you provided did not match the item held at the desk. You can still report the item you lost.',
        'CLAIM', v_claim
    );
END;
$$;


-- ---------------------------------------------------------------------------
-- 5. Housekeeping: mark unread notifications older than a week as read so the
--    bell badge shows a believable number.
-- ---------------------------------------------------------------------------
UPDATE notifications SET is_read = TRUE WHERE created_at < NOW() - INTERVAL '7 days';

-- Refresh planner statistics after the bulk load.
ANALYZE;
