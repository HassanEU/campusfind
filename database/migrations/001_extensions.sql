-- ============================================================================
-- CampusFind :: 001_extensions.sql
-- PostgreSQL extensions used by the project.
-- ============================================================================

-- pg_trgm gives us trigram based text similarity.  It is used by the matching
-- engine to compare free-text descriptions ("black airpods pro with a scratch"
-- vs "black apple airpods case") and to power fuzzy search on item names.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- pgcrypto is used ONLY by the seed script so that demo passwords are stored as
-- real bcrypt hashes (crypt(..., gen_salt('bf'))) instead of plaintext.
-- The application itself hashes passwords in the API layer with bcrypt.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Every timestamp in CampusFind is stored as TIMESTAMPTZ so that the value is
-- unambiguous regardless of the client timezone.
SET TIME ZONE 'UTC';
