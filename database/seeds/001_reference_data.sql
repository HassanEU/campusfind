-- ============================================================================
-- CampusFind :: seeds/001_reference_data.sql
-- Roles, categories, locations and demo accounts.
--
-- Every demo account uses the password:  Campus@123
-- It is hashed here with pgcrypto's bcrypt so that no plaintext password ever
-- reaches a table.  The API verifies these hashes with the bcrypt library.
-- ============================================================================

INSERT INTO roles (role_name, description) VALUES
    ('STUDENT', 'Reports lost items, reviews matches and submits claims'),
    ('STAFF',   'Runs the lost & found desk: reviews claims, verifies and returns items'),
    ('ADMIN',   'Manages users, reference data and views campus-wide analytics');

INSERT INTO categories (name, icon, description) VALUES
    ('Electronics', 'laptop',      'Phones, laptops, earbuds, chargers and other devices'),
    ('ID Cards',    'id-card',     'Student and staff identity cards, library cards'),
    ('Bags',        'backpack',    'Backpacks, tote bags, laptop sleeves'),
    ('Books',       'book-open',   'Textbooks, notebooks, lab records'),
    ('Keys',        'key-round',   'Room keys, bike keys, locker keys'),
    ('Accessories', 'watch',       'Watches, spectacles, wallets, umbrellas'),
    ('Clothing',    'shirt',       'Jackets, hoodies, scarves and sports kit'),
    ('Other',       'package',     'Anything that does not fit the categories above');

INSERT INTO locations (name, building, floor_label, description) VALUES
    ('Central Library',    'Central Library', 'Ground floor', 'Reading halls, issue counter and reference section'),
    ('Library Study Pods', 'Central Library', 'First floor',  'Individual and group study pods'),
    ('Main Block',         'Main Block',      'Ground floor', 'Administration, reception and main corridor'),
    ('Lecture Hall 3',     'Main Block',      'Second floor', 'Large lecture theatre'),
    ('Cafeteria',          'Student Centre',  'Ground floor', 'Main dining hall and juice counter'),
    ('Student Lounge',     'Student Centre',  'First floor',  'Common seating and club noticeboards'),
    ('Computer Lab',       'Science Block',   'Third floor',  'Programming and database laboratories'),
    ('Physics Lab',        'Science Block',   'Second floor', 'Undergraduate physics laboratory'),
    ('Sports Complex',     'Sports Complex',  'Ground floor', 'Indoor courts, gym and changing rooms'),
    ('Auditorium',         'Auditorium',      'Ground floor', 'Main stage, seating and green room');

-- ---------------------------------------------------------------------------
-- Demo accounts.  Password for all of them: Campus@123
-- ---------------------------------------------------------------------------
INSERT INTO users (full_name, email, password_hash, phone, enrollment_no, department, role_id)
SELECT v.full_name, v.email, crypt('Campus@123', gen_salt('bf', 10)),
       v.phone, v.enrollment_no, v.department, r.role_id
FROM (VALUES
    ('Dr. Meera Krishnan', 'admin@campusfind.edu',  '+91 98450 11001', NULL,        'Administration',        'ADMIN'),
    ('Rahul Desai',        'rahul.desai@campusfind.edu', '+91 98450 11002', NULL,   'Lost & Found Desk',     'STAFF'),
    ('Priya Nair',         'priya.nair@campusfind.edu',  '+91 98450 11003', NULL,   'Campus Security',       'STAFF'),
    ('Aarav Sharma',       'aarav@campus.edu',      '+91 98450 22001', 'CS21B1042', 'Computer Science',      'STUDENT'),
    ('Sneha Iyer',         'sneha@campus.edu',      '+91 98450 22002', 'EC21B1108', 'Electronics',           'STUDENT'),
    ('Kabir Menon',        'kabir@campus.edu',      '+91 98450 22003', 'ME22B1077', 'Mechanical Engineering','STUDENT'),
    ('Ananya Rao',         'ananya@campus.edu',     '+91 98450 22004', 'CS22B1015', 'Computer Science',      'STUDENT'),
    ('Ishaan Gupta',       'ishaan@campus.edu',     '+91 98450 22005', 'CV21B1090', 'Civil Engineering',     'STUDENT'),
    ('Fatima Sheikh',      'fatima@campus.edu',     '+91 98450 22006', 'BT22B1033', 'Biotechnology',         'STUDENT'),
    ('Rohan Verma',        'rohan@campus.edu',      '+91 98450 22007', 'CS21B1067', 'Computer Science',      'STUDENT'),
    ('Diya Patel',         'diya@campus.edu',       '+91 98450 22008', 'EE22B1021', 'Electrical Engineering','STUDENT')
) AS v(full_name, email, phone, enrollment_no, department, role_name)
JOIN roles r ON r.role_name = v.role_name;
