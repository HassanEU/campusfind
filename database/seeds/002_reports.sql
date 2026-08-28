-- ============================================================================
-- CampusFind :: seeds/002_reports.sql
-- Realistic lost and found reports.  Dates are relative to CURRENT_DATE so the
-- demo data never goes stale.
--
-- Inserting into found_items fires trg_found_items_issue_qr, so every row here
-- automatically receives a CF-FOUND-xxxxxx tag.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- LOST REPORTS
-- ---------------------------------------------------------------------------
INSERT INTO lost_items (reported_by, item_name, category_id, location_id, brand, color,
                        description, identifying_details, lost_date, lost_time_approx, created_at)
SELECT u.user_id, v.item_name, c.category_id, l.location_id, v.brand, v.color,
       v.description, v.identifying_details,
       CURRENT_DATE - v.days_ago, v.approx_time::TIME,
       NOW() - (v.days_ago || ' days')::INTERVAL
FROM (VALUES
    ('aarav@campus.edu', 'AirPods Pro', 'Electronics', 'Central Library', 'Apple', 'Black',
     'Black Apple AirPods Pro in a black silicone case. There is a visible scratch on the front of the charging case near the status light.',
     'Deep scratch on the charging case, left earbud has a small paint mark',
     3, '16:30'),

    ('sneha@campus.edu', 'Student ID Card', 'ID Cards', 'Cafeteria', NULL, 'Blue',
     'College identity card in a blue lanyard, dropped somewhere near the juice counter during lunch.',
     'Enrollment number EC21B1108 printed on the card',
     2, '13:15'),

    ('kabir@campus.edu', 'Casio Scientific Calculator', 'Electronics', 'Lecture Hall 3', 'Casio', 'Grey',
     'Grey Casio fx-991EX scientific calculator, left on the desk after the thermodynamics class.',
     'Name written in blue marker on the back cover',
     5, '11:00'),

    ('ananya@campus.edu', 'Black Backpack', 'Bags', 'Computer Lab', 'Wildcraft', 'Black',
     'Black Wildcraft backpack containing a DBMS textbook and a red water bottle. Left under the lab table.',
     'Small enamel pin of a cat on the front pocket',
     6, '15:45'),

    ('ishaan@campus.edu', 'Bike Keys', 'Keys', 'Sports Complex', NULL, 'Silver',
     'Two silver keys on a yellow rubber keyring, lost while playing badminton in the indoor court.',
     'Yellow keyring shaped like a tennis ball',
     4, '18:00'),

    ('fatima@campus.edu', 'Prescription Spectacles', 'Accessories', 'Central Library', 'Titan', 'Brown',
     'Brown rimmed Titan spectacles in a hard tan case. Left them on the reading table on the ground floor.',
     'Right arm of the frame has been repaired with clear tape',
     8, '10:20'),

    ('rohan@campus.edu', 'Blue Hoodie', 'Clothing', 'Student Lounge', 'Puma', 'Navy',
     'Navy blue Puma hoodie with a small white logo on the chest, left on the lounge sofa after a club meeting.',
     'Ink stain on the right sleeve cuff',
     11, '19:30'),

    ('diya@campus.edu', 'Data Structures Textbook', 'Books', 'Library Study Pods', 'Pearson', 'White',
     'White and blue Pearson Data Structures textbook, fourth edition. Left inside study pod number seven.',
     'My name and phone number are written on the first page',
     9, '17:10'),

    ('aarav@campus.edu', 'Analog Wristwatch', 'Accessories', 'Physics Lab', 'Fossil', 'Brown',
     'Brown leather strap Fossil analog watch with a cream dial, removed during a lab experiment and never picked up.',
     'Leather strap has a extra hole punched near the buckle',
     15, '14:00'),

    ('sneha@campus.edu', 'USB Flash Drive', 'Electronics', 'Computer Lab', 'SanDisk', 'Red',
     'Red 64GB SanDisk USB flash drive containing my mini project files, left plugged into a lab machine.',
     'Sticker of a green leaf on one side',
     20, '16:00'),

    ('kabir@campus.edu', 'Umbrella', 'Accessories', 'Main Block', NULL, 'Black',
     'Plain black folding umbrella with a wooden handle, left in the main block corridor stand.',
     'Wooden handle with a small crack',
     25, '09:30'),

    ('ananya@campus.edu', 'Wireless Mouse', 'Electronics', 'Library Study Pods', 'Logitech', 'White',
     'White Logitech wireless mouse with a USB receiver, left in the first floor study pods.',
     'Receiver was still plugged into my laptop, so the mouse is alone',
     28, '20:15')
) AS v(email, item_name, category_name, location_name, brand, color, description,
       identifying_details, days_ago, approx_time)
JOIN users      u ON u.email       = v.email
JOIN categories c ON c.name        = v.category_name
JOIN locations  l ON l.name        = v.location_name;


-- ---------------------------------------------------------------------------
-- FOUND REPORTS
-- Most are handed in by desk staff; a couple are handed in by helpful students.
-- ---------------------------------------------------------------------------
INSERT INTO found_items (reported_by, item_name, category_id, location_id, brand, color,
                         description, storage_location, found_date, found_time_approx, created_at)
SELECT u.user_id, v.item_name, c.category_id, l.location_id, v.brand, v.color,
       v.description, v.storage_location,
       CURRENT_DATE - v.days_ago, v.approx_time::TIME,
       NOW() - (v.days_ago || ' days')::INTERVAL
FROM (VALUES
    -- The headline demo pair: matches Aarav's AirPods report almost perfectly.
    ('rahul.desai@campusfind.edu', 'Apple AirPods Pro Case', 'Electronics', 'Central Library', 'Apple', 'Black',
     'Black Apple AirPods Pro with charging case, handed in at the library issue counter. The case has a scratch on the front near the light.',
     'Desk Locker A-04', 2, '18:10'),

    ('priya.nair@campusfind.edu', 'College ID Card', 'ID Cards', 'Cafeteria', NULL, 'Blue',
     'Student identity card on a blue lanyard picked up from the floor near the cafeteria juice counter.',
     'Desk Drawer 1', 2, '15:00'),

    ('rahul.desai@campusfind.edu', 'Scientific Calculator', 'Electronics', 'Lecture Hall 3', 'Casio', 'Grey',
     'Grey Casio scientific calculator left behind on a desk in the second floor lecture theatre. A name is written on the back.',
     'Desk Locker A-02', 4, '12:30'),

    ('rohan@campus.edu', 'Silver Keys with Yellow Ring', 'Keys', 'Sports Complex', NULL, 'Silver',
     'Two silver keys attached to a yellow rubber keyring, found on the bench beside the badminton court.',
     'Desk Drawer 2', 4, '19:15'),

    ('priya.nair@campusfind.edu', 'Brown Spectacles in Case', 'Accessories', 'Central Library', 'Titan', 'Brown',
     'Brown framed spectacles inside a tan hard case, found on a reading table in the ground floor hall.',
     'Desk Locker B-01', 7, '17:40'),

    ('rahul.desai@campusfind.edu', 'Navy Puma Hoodie', 'Clothing', 'Student Lounge', 'Puma', 'Navy',
     'Navy blue Puma hoodie with a white chest logo, collected from the student lounge sofa by housekeeping.',
     'Clothing Bin 1', 10, '21:00'),

    ('priya.nair@campusfind.edu', 'Pearson Textbook', 'Books', 'Library Study Pods', 'Pearson', 'White',
     'White and blue Pearson data structures textbook found inside a first floor study pod, has a name on the first page.',
     'Shelf C', 9, '18:30'),

    ('rahul.desai@campusfind.edu', 'Black Folding Umbrella', 'Accessories', 'Main Block', NULL, 'Black',
     'Plain black folding umbrella with a wooden handle collected from the main block umbrella stand at closing time.',
     'Umbrella Stand', 24, '18:00'),

    ('rahul.desai@campusfind.edu', 'Stainless Steel Water Bottle', 'Other', 'Cafeteria', 'Milton', 'Steel',
     'One litre stainless steel Milton water bottle with a black cap, left on a cafeteria table.',
     'Shelf A', 5, '14:20'),

    ('priya.nair@campusfind.edu', 'Blue Denim Jacket', 'Clothing', 'Auditorium', 'Levis', 'Blue',
     'Blue denim jacket found on a seat in the auditorium after the cultural evening rehearsal.',
     'Clothing Bin 2', 12, '20:45'),

    ('rahul.desai@campusfind.edu', 'Laptop Charger', 'Electronics', 'Computer Lab', 'Dell', 'Black',
     'Black Dell laptop charger with a coiled cable, left plugged in at workstation fourteen in the database lab.',
     'Desk Locker A-07', 6, '17:00'),

    ('ishaan@campus.edu', 'Leather Wallet', 'Accessories', 'Main Block', NULL, 'Brown',
     'Brown leather wallet found near the main block reception. Contains cards but no cash was verified at the desk.',
     'Secure Drawer', 13, '11:45')
) AS v(email, item_name, category_name, location_name, brand, color, description,
       storage_location, days_ago, approx_time)
JOIN users      u ON u.email = v.email
JOIN categories c ON c.name  = v.category_name
JOIN locations  l ON l.name  = v.location_name;
