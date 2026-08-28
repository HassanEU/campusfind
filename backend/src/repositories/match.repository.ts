import { queryAll, queryOne } from '../db/pool.js';

/**
 * The matching engine itself lives in PostgreSQL (fn_generate_matches_for_*).
 * The API only asks the database to run it and then reads the results back,
 * which keeps the scoring rules in one place and makes them easy to inspect
 * with plain SQL during a viva.
 */
export async function generateMatchesForLostItem(lostItemId: number, threshold: number) {
  const row = await queryOne<{ generated: number }>(
    `SELECT fn_generate_matches_for_lost($1, $2) AS generated`,
    [lostItemId, threshold],
  );
  return row?.generated ?? 0;
}

export async function generateMatchesForFoundItem(foundItemId: number, threshold: number) {
  const row = await queryOne<{ generated: number }>(
    `SELECT fn_generate_matches_for_found($1, $2) AS generated`,
    [foundItemId, threshold],
  );
  return row?.generated ?? 0;
}

/** Every potential match belonging to one student, best score first. */
export function listMatchesForUser(userId: number) {
  return queryAll(
    `SELECT v.*
       FROM v_match_overview v
       INNER JOIN lost_items l ON l.lost_item_id = v.lost_item_id
      WHERE l.reported_by = $1
        AND v.match_status IN ('POTENTIAL', 'CLAIMED', 'CONFIRMED')
      ORDER BY
        CASE v.match_status WHEN 'POTENTIAL' THEN 0 WHEN 'CLAIMED' THEN 1 ELSE 2 END,
        v.total_score DESC`,
    [userId],
  );
}

export function listMatchesForLostItem(lostItemId: number) {
  return queryAll(
    `SELECT * FROM v_match_overview
      WHERE lost_item_id = $1 AND match_status <> 'DISMISSED'
      ORDER BY total_score DESC`,
    [lostItemId],
  );
}

export function getMatch(matchId: number) {
  return queryOne(
    `SELECT v.*,
            l.identifying_details AS lost_identifying_details,
            f.storage_location    AS found_storage_location,
            -- Has this student already claimed this item?
            (SELECT c.claim_id FROM claims c
              WHERE c.found_item_id = v.found_item_id
                AND c.claimant_id = l.reported_by
                AND c.status IN ('PENDING', 'APPROVED')
              LIMIT 1) AS existing_claim_id
       FROM v_match_overview v
       INNER JOIN lost_items  l ON l.lost_item_id  = v.lost_item_id
       INNER JOIN found_items f ON f.found_item_id = v.found_item_id
      WHERE v.match_id = $1`,
    [matchId],
  );
}

/** Live re-scoring, used by the "explain this match" panel. */
export function scoreMatch(lostItemId: number, foundItemId: number) {
  return queryOne(`SELECT * FROM fn_score_match($1, $2)`, [lostItemId, foundItemId]);
}

export function dismissMatch(matchId: number) {
  return queryOne(
    `UPDATE matches SET status = 'DISMISSED'
      WHERE match_id = $1 AND status = 'POTENTIAL'
      RETURNING match_id, status`,
    [matchId],
  );
}
