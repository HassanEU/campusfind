import { queryAll, queryOne } from '../db/pool.js';

export function listClaimsForUser(userId: number) {
  return queryAll(
    `SELECT * FROM v_claims_detail
      WHERE claimant_id = $1
      ORDER BY
        CASE status WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 ELSE 2 END,
        submitted_at DESC`,
    [userId],
  );
}

/** The staff review queue. Optional status filter, oldest pending first. */
export function listClaimsForStaff(status?: string) {
  if (status) {
    return queryAll(
      `SELECT * FROM v_claims_detail WHERE status = $1 ORDER BY submitted_at DESC`,
      [status],
    );
  }
  return queryAll(
    `SELECT * FROM v_claims_detail
      ORDER BY
        CASE status WHEN 'PENDING' THEN 0 ELSE 1 END,
        submitted_at DESC`,
  );
}

export function getClaim(claimId: number) {
  return queryOne(`SELECT * FROM v_claims_detail WHERE claim_id = $1`, [claimId]);
}

export function getClaimVerifications(claimId: number) {
  return queryAll(
    `SELECT v.verification_id, v.method, v.outcome, v.qr_code_used, v.notes, v.verified_at,
            u.full_name AS staff_name
       FROM verifications v
       INNER JOIN users u ON u.user_id = v.staff_id
      WHERE v.claim_id = $1
      ORDER BY v.verified_at DESC`,
    [claimId],
  );
}

export function findOpenClaimForItem(foundItemId: number) {
  return queryOne<{ claim_id: number; claimant_id: number }>(
    `SELECT claim_id, claimant_id FROM claims
      WHERE found_item_id = $1 AND status = 'PENDING'`,
    [foundItemId],
  );
}

export function insertVerification(input: {
  claimId: number;
  staffId: number;
  method: string;
  qrCode?: string;
  outcome: string;
  notes?: string;
}) {
  return queryOne(
    `INSERT INTO verifications (claim_id, staff_id, method, qr_code_used, outcome, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING verification_id, outcome, verified_at`,
    [input.claimId, input.staffId, input.method, input.qrCode ?? null, input.outcome, input.notes ?? null],
  );
}

export function listReturnHistory(limit = 50) {
  return queryAll(`SELECT * FROM v_return_history ORDER BY returned_at DESC LIMIT $1`, [limit]);
}

export function listReturnsForUser(userId: number) {
  return queryAll(
    `SELECT * FROM v_return_history WHERE returned_to = $1 ORDER BY returned_at DESC`,
    [userId],
  );
}
