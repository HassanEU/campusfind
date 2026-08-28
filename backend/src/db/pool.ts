import pg from 'pg';
import { env } from '../config/env.js';

const { Pool, types } = pg;

/**
 * node-postgres returns NUMERIC as a string to avoid losing precision on
 * arbitrary-precision values.  Every NUMERIC in CampusFind is a small score or
 * percentage, so converting to a JS number here keeps the API responses clean
 * (92.5 instead of "92.50").
 */
types.setTypeParser(types.builtins.NUMERIC, (value) => Number.parseFloat(value));
types.setTypeParser(types.builtins.INT8, (value) => Number.parseInt(value, 10));
/** DATE should stay a plain 'YYYY-MM-DD' string, not drift across timezones. */
types.setTypeParser(types.builtins.DATE, (value) => value);

export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  max: env.db.max,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (error) => {
  // A pooled client can be dropped by the server; log it but never crash.
  console.error('[db] idle client error:', error.message);
});

export type QueryParam = string | number | boolean | null | undefined | Date | string[] | number[];

/**
 * The single place SQL is executed.
 *
 * Values are ALWAYS passed as the second argument so PostgreSQL receives them
 * as bound parameters ($1, $2 ...).  Because the value never becomes part of
 * the SQL text, SQL injection is structurally impossible here.
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: QueryParam[] = [],
): Promise<pg.QueryResult<T>> {
  const startedAt = Date.now();
  const result = await pool.query<T>(text, params as unknown[]);

  if (!env.isProduction) {
    const elapsed = Date.now() - startedAt;
    if (elapsed > 200) {
      console.warn(`[db] slow query (${elapsed}ms): ${text.replace(/\s+/g, ' ').slice(0, 120)}`);
    }
  }

  return result;
}

/** Convenience: first row or null. */
export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: QueryParam[] = [],
): Promise<T | null> {
  const { rows } = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Convenience: all rows. */
export async function queryAll<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: QueryParam[] = [],
): Promise<T[]> {
  const { rows } = await query<T>(text, params);
  return rows;
}

/**
 * Runs `work` inside a real database transaction.
 *
 *   BEGIN
 *     ... every statement in `work`, on the SAME client ...
 *   COMMIT            (or ROLLBACK if anything threw)
 *
 * This is what makes claim approval atomic: the claim, both item statuses, the
 * return record, the audit row and the notification either all land, or none
 * of them do.
 */
export async function withTransaction<T>(
  work: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Returning the client to the pool must happen whatever the outcome.
    client.release();
  }
}

export async function checkDatabase(): Promise<{ ok: boolean; latencyMs: number }> {
  const startedAt = Date.now();
  await pool.query('SELECT 1');
  return { ok: true, latencyMs: Date.now() - startedAt };
}

export async function closePool(): Promise<void> {
  await pool.end();
}
