-- ============================================================================
-- CampusFind :: seeds/004_completed_returns.sql
--
-- The live demo keeps two found items open:
--   * Apple AirPods Pro Case  — browse / match presentation
--   * Scientific Calculator   — staff claim queue
--
-- Everything else that has already been handed in is walked through the real
-- claim → QR verify → approve → return path so fn_resolution_rate() (returned
-- found items / all found items) lands in the low nineties, matching a desk
-- that actually reunites most items.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extra historical lost + found pairs (older than the live demo cases).
--    Skipped when this file is re-applied against an already-enriched database.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM found_items WHERE item_name = 'Grey Anker Power Bank') THEN
        RETURN;
    END IF;

    INSERT INTO lost_items (reported_by, item_name, category_id, location_id, brand, color,
                            description, identifying_details, lost_date, lost_time_approx, created_at)
    SELECT u.user_id, v.item_name, c.category_id, l.location_id, v.brand, v.color,
           v.description, v.identifying_details,
           CURRENT_DATE - v.days_ago, v.approx_time::TIME,
           NOW() - (v.days_ago || ' days')::INTERVAL
    FROM (VALUES
        ('sneha@campus.edu',  'Anker Power Bank',        'Electronics', 'Computer Lab',        'Anker',  'Grey',
         'Grey Anker 20000mAh power bank left charging under a lab bench after a late practical.',
         'Initials SI written on the underside in silver marker', 32, '18:40'),
        ('kabir@campus.edu',  'Maroon Sports Cap',       'Clothing',    'Sports Complex',      'Nike',   'Maroon',
         'Maroon Nike cap left on the badminton court bench after evening practice.',
         'Sweat stain on the inner band and a small hole near the brim', 28, '19:10'),
        ('ananya@campus.edu', 'Wildcraft Duffle Bag',    'Bags',        'Sports Complex',      'Wildcraft', 'Black',
         'Black Wildcraft gym duffle with a wet towel inside, left in the changing room.',
         'Orange carabiner clipped to the side handle', 36, '20:00'),
        ('ishaan@campus.edu', 'White Lab Coat',          'Clothing',    'Physics Lab',         NULL,     'White',
         'Standard white lab coat left on a stool after the optics experiment.',
         'Enrollment number written inside the collar', 40, '16:20'),
        ('fatima@campus.edu', 'Green Hydro Flask',       'Other',       'Cafeteria',           'Hydro Flask', 'Green',
         'Forest green Hydro Flask with a straw lid, left on a cafeteria window ledge.',
         'Dent on the base and a faded biology sticker', 22, '13:50'),
        ('rohan@campus.edu',  'Sony Wired Earphones',    'Electronics', 'Lecture Hall 3',      'Sony',   'Black',
         'Black Sony wired earphones left tangled on a lecture theatre seat.',
         'Right earbud has peeling mesh', 26, '11:30'),
        ('diya@campus.edu',   'Red Spiral Notebooks',    'Books',       'Library Study Pods',  NULL,     'Red',
         'Pack of two red spiral notebooks with circuit diagrams, left in a study pod.',
         'Name Diya Patel on the inside cover of both books', 34, '17:45'),
        ('aarav@campus.edu',  'Silver Cycle Lock',       'Keys',        'Sports Complex',      NULL,     'Silver',
         'Silver U-lock left at the sports complex cycle stand after a match.',
         'Blue silicone cover on the shackle', 30, '18:05'),
        ('sneha@campus.edu',  'Beige Canvas Tote',       'Bags',        'Auditorium',          NULL,     'Beige',
         'Beige canvas tote left on an auditorium seat after rehearsal.',
         'Screen-printed campus theatre logo on one side', 38, '21:15'),
        ('kabir@campus.edu',  'Blue Sports Bottle',      'Other',       'Sports Complex',      'Cello',  'Blue',
         'Blue Cello sports bottle left beside the gym water cooler.',
         'Tape with KM on the cap', 24, '07:50'),
        ('ananya@campus.edu', 'Black Spectacles Pouch',  'Accessories', 'Central Library',     NULL,     'Black',
         'Black zip spectacles pouch left at a library reading table. The glasses were not inside.',
         'Tiny embroidered bee on the corner', 42, '10:10'),
        ('ishaan@campus.edu', 'Grey Zip Hoodie',         'Clothing',    'Student Lounge',      'H&M',    'Grey',
         'Heather grey zip hoodie left on the lounge windowsill overnight.',
         'Broken zipper pull replaced with a keyring', 20, '22:00'),
        ('fatima@campus.edu', 'Orange ID Lanyard',       'ID Cards',    'Main Block',          NULL,     'Orange',
         'Orange lanyard with a cracked plastic ID holder, found empty near reception.',
         'Knot tied in the strap to shorten it', 44, '09:20'),
        ('rohan@campus.edu',  'White iPad Pencil',       'Electronics', 'Library Study Pods',  'Apple',  'White',
         'Apple Pencil left rolled against a study pod monitor stand.',
         'Tooth marks on the cap from a habit of chewing it', 18, '15:05')
    ) AS v(email, item_name, category_name, location_name, brand, color, description,
           identifying_details, days_ago, approx_time)
    JOIN users      u ON u.email = v.email
    JOIN categories c ON c.name  = v.category_name
    JOIN locations  l ON l.name  = v.location_name;

    INSERT INTO found_items (reported_by, item_name, category_id, location_id, brand, color,
                             description, storage_location, found_date, found_time_approx, created_at)
    SELECT u.user_id, v.item_name, c.category_id, l.location_id, v.brand, v.color,
           v.description, v.storage_location,
           CURRENT_DATE - v.days_ago, v.approx_time::TIME,
           NOW() - (v.days_ago || ' days')::INTERVAL
    FROM (VALUES
        ('rahul.desai@campusfind.edu', 'Grey Anker Power Bank',     'Electronics', 'Computer Lab',        'Anker', 'Grey',
         'Grey Anker power bank handed in from the database lab. Initials are written underneath.',
         'Desk Locker A-11', 31, '19:10'),
        ('priya.nair@campusfind.edu',  'Maroon Nike Cap',           'Clothing',    'Sports Complex',      'Nike',  'Maroon',
         'Maroon Nike cap collected from the indoor court bench by the sports attendant.',
         'Clothing Bin 1', 27, '20:00'),
        ('rahul.desai@campusfind.edu', 'Black Wildcraft Duffle',    'Bags',        'Sports Complex',      'Wildcraft', 'Black',
         'Black gym duffle with an orange carabiner, left in the changing room overnight.',
         'Shelf B', 35, '08:30'),
        ('priya.nair@campusfind.edu',  'White Physics Lab Coat',    'Clothing',    'Physics Lab',         NULL,    'White',
         'White lab coat with an enrollment number inside the collar, found on a physics lab stool.',
         'Clothing Bin 2', 39, '17:00'),
        ('rahul.desai@campusfind.edu', 'Green Hydro Flask Bottle',  'Other',       'Cafeteria',           'Hydro Flask', 'Green',
         'Forest green Hydro Flask with a dented base, collected from a cafeteria window ledge.',
         'Shelf A', 21, '15:40'),
        ('priya.nair@campusfind.edu',  'Sony Wired Earphones',      'Electronics', 'Lecture Hall 3',      'Sony',  'Black',
         'Black Sony earphones found on a lecture theatre seat after the morning class.',
         'Desk Drawer 3', 25, '12:15'),
        ('rahul.desai@campusfind.edu', 'Red Spiral Notebook Pack',  'Books',       'Library Study Pods',  NULL,    'Red',
         'Two red spiral notebooks with circuit diagrams, name on the inside cover.',
         'Shelf C', 33, '18:20'),
        ('priya.nair@campusfind.edu',  'Silver U-Lock',             'Keys',        'Sports Complex',      NULL,    'Silver',
         'Silver cycle U-lock with a blue silicone shackle cover, left at the cycle stand.',
         'Desk Drawer 2', 29, '19:00'),
        ('rahul.desai@campusfind.edu', 'Beige Canvas Tote Bag',     'Bags',        'Auditorium',          NULL,    'Beige',
         'Beige tote with a theatre logo, found on an auditorium seat after rehearsal.',
         'Shelf B', 37, '22:10'),
        ('priya.nair@campusfind.edu',  'Blue Cello Sports Bottle',  'Other',       'Sports Complex',      'Cello', 'Blue',
         'Blue sports bottle with tape on the cap, left beside the gym cooler.',
         'Shelf A', 23, '08:20'),
        ('rahul.desai@campusfind.edu', 'Black Spectacles Pouch',    'Accessories', 'Central Library',     NULL,    'Black',
         'Empty black spectacles pouch with a small embroidered bee, found at a reading table.',
         'Desk Locker B-03', 41, '11:00'),
        ('priya.nair@campusfind.edu',  'Grey Zip Hoodie',           'Clothing',    'Student Lounge',      'H&M',   'Grey',
         'Grey zip hoodie with a keyring used as a zipper pull, left on the lounge sill.',
         'Clothing Bin 1', 19, '09:15'),
        ('rahul.desai@campusfind.edu', 'Orange Lanyard Holder',     'ID Cards',    'Main Block',          NULL,    'Orange',
         'Orange lanyard with a cracked holder and a knot in the strap, found near reception.',
         'Desk Drawer 1', 43, '10:00'),
        ('priya.nair@campusfind.edu',  'White Apple Pencil',        'Electronics', 'Library Study Pods',  'Apple', 'White',
         'White Apple Pencil with tooth marks on the cap, rolled against a study pod stand.',
         'Desk Locker A-08', 17, '16:30')
    ) AS v(email, item_name, category_name, location_name, brand, color, description,
           storage_location, days_ago, approx_time)
    JOIN users      u ON u.email = v.email
    JOIN categories c ON c.name  = v.category_name
    JOIN locations  l ON l.name  = v.location_name;

    FOR r IN
        SELECT lost_item_id
          FROM lost_items
         WHERE item_name IN (
            'Anker Power Bank', 'Maroon Sports Cap', 'Wildcraft Duffle Bag', 'White Lab Coat',
            'Green Hydro Flask', 'Sony Wired Earphones', 'Red Spiral Notebooks', 'Silver Cycle Lock',
            'Beige Canvas Tote', 'Blue Sports Bottle', 'Black Spectacles Pouch', 'Grey Zip Hoodie',
            'Orange ID Lanyard', 'White iPad Pencil'
         )
    LOOP
        PERFORM fn_generate_matches_for_lost(r.lost_item_id);
    END LOOP;
END;
$$;


-- ---------------------------------------------------------------------------
-- 2. Walk every remaining collectable found item (except the live demo pair)
--    through the same handover the API uses: claim, QR check, approve, return.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_found     RECORD;
    v_match     RECORD;
    v_claimant  INTEGER;
    v_lost      INTEGER;
    v_match_id  INTEGER;
    v_claim     INTEGER;
    v_staff     INTEGER;
    v_days      INTEGER;
    v_details   TEXT;
BEGIN
    SELECT user_id INTO v_staff FROM users WHERE email = 'rahul.desai@campusfind.edu';

    FOR v_found IN
        SELECT found_item_id, item_name, status, found_date
          FROM found_items
         WHERE status NOT IN ('RETURNED', 'CLAIM_PENDING', 'VERIFIED')
           AND item_name <> 'Apple AirPods Pro Case'
         ORDER BY found_item_id
    LOOP
        -- Prefer the strongest open match so lost reports resolve with the item.
        SELECT m.match_id, m.lost_item_id, l.reported_by
          INTO v_match
          FROM matches m
          JOIN lost_items l ON l.lost_item_id = m.lost_item_id
         WHERE m.found_item_id = v_found.found_item_id
           AND m.status IN ('POTENTIAL', 'CLAIMED')
           AND l.status <> 'RESOLVED'
         ORDER BY m.total_score DESC
         LIMIT 1;

        IF FOUND THEN
            v_match_id := v_match.match_id;
            v_lost     := v_match.lost_item_id;
            v_claimant := v_match.reported_by;
        ELSE
            v_match_id := NULL;
            v_lost     := NULL;
            SELECT user_id INTO v_claimant
              FROM users
             WHERE email = 'diya@campus.edu';
        END IF;

        -- Staff cannot be the claimant (return_records CHECK).
        IF v_claimant = v_staff THEN
            SELECT user_id INTO v_claimant FROM users WHERE email = 'diya@campus.edu';
        END IF;

        v_days := GREATEST(1, (CURRENT_DATE - v_found.found_date) - 1);
        v_details := 'I can identify this item: ' || v_found.item_name
                  || '. The desk confirmed the detail against what was handed in.';

        INSERT INTO claims (found_item_id, lost_item_id, match_id, claimant_id,
                            claim_details, status, submitted_at)
        VALUES (v_found.found_item_id, v_lost, v_match_id, v_claimant, v_details, 'PENDING',
                NOW() - (v_days || ' days')::INTERVAL)
        RETURNING claim_id INTO v_claim;

        IF v_found.status = 'UNCLAIMED' THEN
            UPDATE found_items SET status = 'CLAIM_PENDING' WHERE found_item_id = v_found.found_item_id;
        ELSIF v_found.status = 'MATCHED' THEN
            UPDATE found_items SET status = 'CLAIM_PENDING' WHERE found_item_id = v_found.found_item_id;
        END IF;

        IF v_lost IS NOT NULL THEN
            UPDATE lost_items SET status = 'CLAIMED' WHERE lost_item_id = v_lost AND status <> 'RESOLVED';
        END IF;

        INSERT INTO verifications (claim_id, staff_id, method, qr_code_used, outcome, notes, verified_at)
        SELECT v_claim, v_staff, 'QR_SCAN', q.qr_code, 'PASSED',
               'Identifying detail confirmed against the physical item.',
               NOW() - ((v_days - 1) || ' days')::INTERVAL
          FROM qr_tags q
         WHERE q.found_item_id = v_found.found_item_id;

        UPDATE qr_tags
           SET scan_count = scan_count + 1,
               last_scanned_at = NOW() - ((v_days - 1) || ' days')::INTERVAL
         WHERE found_item_id = v_found.found_item_id;

        UPDATE claims
           SET status = 'APPROVED', reviewed_by = v_staff,
               reviewed_at = NOW() - ((v_days - 1) || ' days')::INTERVAL,
               review_notes = 'Ownership confirmed at the desk. Item released.'
         WHERE claim_id = v_claim;

        UPDATE found_items SET status = 'VERIFIED' WHERE found_item_id = v_found.found_item_id;
        UPDATE found_items SET status = 'RETURNED' WHERE found_item_id = v_found.found_item_id;

        IF v_lost IS NOT NULL THEN
            UPDATE lost_items SET status = 'RESOLVED' WHERE lost_item_id = v_lost;
        END IF;

        IF v_match_id IS NOT NULL THEN
            UPDATE matches SET status = 'CONFIRMED' WHERE match_id = v_match_id;
            UPDATE matches SET status = 'DISMISSED'
             WHERE found_item_id = v_found.found_item_id AND match_id <> v_match_id;
        END IF;

        INSERT INTO return_records (found_item_id, claim_id, lost_item_id, returned_to,
                                    released_by, remarks, returned_at)
        VALUES (v_found.found_item_id, v_claim, v_lost, v_claimant, v_staff,
                'Collected in person from the lost & found desk.',
                NOW() - ((v_days - 1) || ' days')::INTERVAL);

        PERFORM fn_notify(
            v_claimant, 'ITEM_RETURNED',
            'Your item has been returned',
            'The item was handed over at the lost & found desk. Thank you for using CampusFind.',
            'CLAIM', v_claim
        );
    END LOOP;
END;
$$;

UPDATE notifications SET is_read = TRUE WHERE created_at < NOW() - INTERVAL '7 days';

ANALYZE;
