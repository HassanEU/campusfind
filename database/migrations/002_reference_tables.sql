-- ============================================================================
-- CampusFind :: 002_reference_tables.sql
-- Reference / lookup entities: roles, users, categories, locations.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- roles
-- A small lookup table.  Storing the role as a separate relation (instead of a
-- text column on users) removes an update anomaly: renaming a role is a single
-- row update rather than an update of every user row.
-- ----------------------------------------------------------------------------
CREATE TABLE roles (
    role_id     SMALLSERIAL PRIMARY KEY,
    role_name   VARCHAR(20)  NOT NULL UNIQUE,
    description VARCHAR(160) NOT NULL,
    CONSTRAINT chk_roles_name CHECK (role_name IN ('STUDENT', 'STAFF', 'ADMIN'))
);

COMMENT ON TABLE roles IS 'Lookup table for the three CampusFind actor types.';

-- ----------------------------------------------------------------------------
-- users
-- email is a candidate key (UNIQUE + NOT NULL).  user_id is the surrogate
-- primary key so that foreign keys stay narrow and stable if an email changes.
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    user_id       SERIAL PRIMARY KEY,
    full_name     VARCHAR(120)  NOT NULL,
    email         VARCHAR(160)  NOT NULL UNIQUE,
    password_hash VARCHAR(120)  NOT NULL,
    phone         VARCHAR(20),
    enrollment_no VARCHAR(30)   UNIQUE,
    department    VARCHAR(80),
    role_id       SMALLINT      NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- A cheap sanity check: an email must look like an email.  Full validation
    -- happens in the API layer, this only stops obviously corrupt rows.
    CONSTRAINT chk_users_email      CHECK (email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'),
    CONSTRAINT chk_users_name_len   CHECK (char_length(trim(full_name)) >= 2),
    CONSTRAINT chk_users_phone      CHECK (phone IS NULL OR phone ~ '^[0-9+\-\s]{7,20}$')
);

COMMENT ON TABLE users IS 'Every person who can sign in: students, staff and admins.';
COMMENT ON COLUMN users.password_hash IS 'bcrypt hash. Plaintext passwords are never stored.';

-- ----------------------------------------------------------------------------
-- categories
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name        VARCHAR(60)  NOT NULL UNIQUE,
    icon        VARCHAR(40)  NOT NULL DEFAULT 'package',
    description VARCHAR(200),
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE categories IS 'Item categories (Electronics, ID Cards, Bags ...).';

-- ----------------------------------------------------------------------------
-- locations
-- building is kept as a column so the matching engine can award partial credit
-- when two reports are in different rooms of the same building.
-- ----------------------------------------------------------------------------
CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    name        VARCHAR(80)  NOT NULL UNIQUE,
    building    VARCHAR(80)  NOT NULL,
    floor_label VARCHAR(30),
    description VARCHAR(200),
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE locations IS 'Campus places where items are lost or handed in.';
