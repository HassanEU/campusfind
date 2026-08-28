import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));

// In Docker the values arrive as real environment variables and both files are
// absent, which is fine. Locally, backend/.env holds developer overrides and
// the repository root .env holds the shared secrets, so there is exactly one
// copy of POSTGRES_PASSWORD / JWT_SECRET on the machine.
dotenv.config({ path: path.resolve(here, '../../.env'), quiet: true });
dotenv.config({ path: path.resolve(here, '../../../.env'), quiet: true });

// The root .env is written for docker compose, which uses POSTGRES_* names.
process.env.PGPASSWORD ??= process.env.POSTGRES_PASSWORD;
process.env.PGUSER ??= process.env.POSTGRES_USER;
process.env.PGDATABASE ??= process.env.POSTGRES_DB;

/**
 * Every configurable value lives here and nowhere else.  Secrets are read from
 * the environment; none of them have a hard-coded fallback, so a missing
 * JWT_SECRET stops the server at boot instead of silently signing tokens with
 * a guessable string.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : fallback;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(optional('PORT', '4001')),

  db: {
    host: optional('PGHOST', 'localhost'),
    port: Number(optional('PGPORT', '55432')),
    user: optional('PGUSER', 'campusfind'),
    password: required('PGPASSWORD'),
    database: optional('PGDATABASE', 'campusfind'),
    max: Number(optional('PGPOOL_MAX', '10')),
  },

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: optional('JWT_EXPIRES_IN', '12h'),
  },

  /** Comma separated list so the API can serve the dev server and the container. */
  corsOrigins: optional('CORS_ORIGIN', 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  /**
   * Public origin of the web app, used when encoding a scan URL into a QR label.
   * Leave empty to derive it from the incoming request (works for localhost,
   * a LAN IP, and a deployed hostname without rebuilding).
   */
  publicAppUrl: optional('PUBLIC_APP_URL', '').replace(/\/$/, ''),

  bcryptRounds: Number(optional('BCRYPT_ROUNDS', '10')),

  /** Minimum score (out of 100) required before a pair is stored as a match. */
  matchThreshold: Number(optional('MATCH_THRESHOLD', '40')),
} as const;
