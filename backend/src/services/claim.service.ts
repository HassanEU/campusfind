import { queryOne, withTransaction } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import * as claimRepo from '../repositories/claim.repository.js';
import type { AuthUser } from '../types/index.js';
import type { ClaimInput } from '../validators/schemas.js';

/* -------------------------------------------------------------------------- */
/* Submitting a claim                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Submitting a claim touches three tables (claims, found_items and, when the
 * claim came from a match, lost_items + matches), so it runs as one
 * transaction.  A half-written claim would leave an item stuck in
 * CLAIM_PENDING with nothing to review.
 */
export async function submitClaim(user: AuthUser, input: ClaimInput) {
  return withTransaction(async (client) => {
    // Lock the item row for the duration of the transaction.  Without this,
    // two students clicking "Submit claim" at the same instant could both pass
    // the availability check.
    const item = await client.query<{
      found_item_id: number; status: string; item_name: string; reported_by: number;
    }>(
      `SELECT found_item_id, status, item_name, reported_by
         FROM found_items WHERE found_item_id = $1 FOR UPDATE`,
      [input.foundItemId],
    );

    const found = item.rows[0];
    if (!found) throw ApiError.notFound('That found item no longer exists.');

    if (found.status === 'RETURNED') {
      throw ApiError.conflict('This item has already been returned to its owner.');
    }
    if (found.status === 'CLAIM_PENDING' || found.status === 'VERIFIED') {
      throw ApiError.conflict('Another claim for this item is already being reviewed.');
    }

    // If a lost report was supplied it has to belong to the person claiming.
    if (input.lostItemId) {
      const owned = await client.query(
        `SELECT 1 FROM lost_items WHERE lost_item_id = $1 AND reported_by = $2`,
        [input.lostItemId, user.userId],
      );
      if (owned.rowCount === 0) {
        throw ApiError.forbidden('You can only link a claim to your own lost report.');
      }
    }

    const inserted = await client.query<{ claim_id: number }>(
      `INSERT INTO claims (found_item_id, lost_item_id, match_id, claimant_id, claim_details)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING claim_id`,
      [input.foundItemId, input.lostItemId ?? null, input.matchId ?? null, user.userId, input.claimDetails],
    );

    const claimId = inserted.rows[0]!.claim_id;

    await client.query(`UPDATE found_items SET status = 'CLAIM_PENDING' WHERE found_item_id = $1`, [
      input.foundItemId,
    ]);

    if (input.lostItemId) {
      await client.query(
        `UPDATE lost_items SET status = 'CLAIMED' WHERE lost_item_id = $1 AND status <> 'RESOLVED'`,
        [input.lostItemId],
      );
    }

    if (input.matchId) {
      await client.query(`UPDATE matches SET status = 'CLAIMED' WHERE match_id = $1`, [input.matchId]);
    }

    // Tell every staff member there is something in the queue.
    await client.query(
      `INSERT INTO notifications (user_id, notification_type, title, body, related_entity_type, related_entity_id)
       SELECT u.user_id, 'CLAIM_SUBMITTED',
              'New claim awaiting review',
              $2 || ' submitted a claim for "' || $3 || '". Verify the QR label before approving.',
              'CLAIM', $1
         FROM users u
         INNER JOIN roles r ON r.role_id = u.role_id
        WHERE r.role_name IN ('STAFF', 'ADMIN') AND u.is_active`,
      [claimId, user.fullName, found.item_name],
    );

    return { claimId };
  });
}

/* -------------------------------------------------------------------------- */
/* Approving a claim — the showpiece transaction                               */
/* -------------------------------------------------------------------------- */

/**
 * Approving a claim is the moment a physical object changes hands, so it must
 * be all-or-nothing.  Inside a single BEGIN ... COMMIT the system:
 *
 *   1. locks and re-checks the claim (it may have been decided a second ago)
 *   2. confirms a verification actually PASSED
 *   3. marks the claim APPROVED
 *   4. moves the found item CLAIM_PENDING -> VERIFIED -> RETURNED
 *   5. marks the linked lost report RESOLVED
 *   6. confirms the winning match and dismisses the competing ones
 *   7. writes the immutable return record
 *   8. notifies the student
 *
 * Steps 4, 5, 7 and the audit rows also fire triggers.  If any single statement
 * fails — say the return record collides with an existing one — ROLLBACK undoes
 * every earlier step, so an item can never be recorded as returned twice or be
 * left approved but never handed over.
 */
export async function approveClaim(staff: AuthUser, claimId: number, reviewNotes?: string) {
  return withTransaction(async (client) => {
    const claimResult = await client.query<{
      claim_id: number; status: string; found_item_id: number;
      lost_item_id: number | null; match_id: number | null;
      claimant_id: number; item_name: string;
    }>(
      `SELECT c.claim_id, c.status, c.found_item_id, c.lost_item_id, c.match_id,
              c.claimant_id, f.item_name
         FROM claims c
         INNER JOIN found_items f ON f.found_item_id = c.found_item_id
        WHERE c.claim_id = $1
        FOR UPDATE OF c`,
      [claimId],
    );

    const claim = claimResult.rows[0];
    if (!claim) throw ApiError.notFound('That claim no longer exists.');
    if (claim.status !== 'PENDING') {
      throw ApiError.conflict(`This claim was already ${claim.status.toLowerCase()}.`);
    }
    if (claim.claimant_id === staff.userId) {
      throw ApiError.forbidden('You cannot approve your own claim.');
    }

    // A claim may only be approved after the desk-side check succeeded.
    const verified = await client.query(
      `SELECT 1 FROM verifications
        WHERE claim_id = $1 AND outcome = 'PASSED' LIMIT 1`,
      [claimId],
    );
    if (verified.rowCount === 0) {
      throw ApiError.unprocessable(
        'Verify the item first: scan its QR label (or enter the code) and confirm the claimant.',
      );
    }

    await client.query(
      `UPDATE claims
          SET status = 'APPROVED', reviewed_by = $2, reviewed_at = NOW(), review_notes = $3
        WHERE claim_id = $1`,
      [claimId, staff.userId, reviewNotes ?? 'Ownership confirmed at the lost & found desk.'],
    );

    // The status guard trigger only permits CLAIM_PENDING -> VERIFIED -> RETURNED,
    // so both steps are written explicitly and both are audited.
    await client.query(`UPDATE found_items SET status = 'VERIFIED' WHERE found_item_id = $1`, [
      claim.found_item_id,
    ]);
    await client.query(`UPDATE found_items SET status = 'RETURNED' WHERE found_item_id = $1`, [
      claim.found_item_id,
    ]);

    if (claim.lost_item_id) {
      await client.query(`UPDATE lost_items SET status = 'RESOLVED' WHERE lost_item_id = $1`, [
        claim.lost_item_id,
      ]);
    }

    if (claim.match_id) {
      await client.query(`UPDATE matches SET status = 'CONFIRMED' WHERE match_id = $1`, [claim.match_id]);
    }
    await client.query(
      `UPDATE matches SET status = 'DISMISSED'
        WHERE found_item_id = $1 AND status IN ('POTENTIAL', 'CLAIMED')
          AND ($2::int IS NULL OR match_id <> $2)`,
      [claim.found_item_id, claim.match_id],
    );

    const ret = await client.query<{ return_id: number }>(
      `INSERT INTO return_records (found_item_id, claim_id, lost_item_id, returned_to, released_by, remarks)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING return_id`,
      [
        claim.found_item_id, claimId, claim.lost_item_id, claim.claimant_id, staff.userId,
        reviewNotes ?? 'Collected in person from the lost & found desk.',
      ],
    );

    await client.query(
      `SELECT fn_notify($1, 'CLAIM_APPROVED', $2, $3, 'CLAIM', $4)`,
      [
        claim.claimant_id,
        `Your claim for "${claim.item_name}" was approved`,
        'Collect the item from the lost & found desk. Bring your student ID with you.',
        claimId,
      ],
    );

    return { claimId, returnId: ret.rows[0]!.return_id, foundItemId: claim.found_item_id };
  });
}

/* -------------------------------------------------------------------------- */
/* Rejecting / cancelling                                                      */
/* -------------------------------------------------------------------------- */

/** Rejection releases the item back onto the shelf so someone else can claim it. */
export async function rejectClaim(staff: AuthUser, claimId: number, reviewNotes?: string) {
  return withTransaction(async (client) => {
    const result = await client.query<{
      status: string; found_item_id: number; claimant_id: number;
      lost_item_id: number | null; match_id: number | null; item_name: string;
    }>(
      `SELECT c.status, c.found_item_id, c.claimant_id, c.lost_item_id, c.match_id, f.item_name
         FROM claims c
         INNER JOIN found_items f ON f.found_item_id = c.found_item_id
        WHERE c.claim_id = $1 FOR UPDATE OF c`,
      [claimId],
    );

    const claim = result.rows[0];
    if (!claim) throw ApiError.notFound('That claim no longer exists.');
    if (claim.status !== 'PENDING') {
      throw ApiError.conflict(`This claim was already ${claim.status.toLowerCase()}.`);
    }

    await client.query(
      `UPDATE claims
          SET status = 'REJECTED', reviewed_by = $2, reviewed_at = NOW(), review_notes = $3
        WHERE claim_id = $1`,
      [claimId, staff.userId, reviewNotes ?? 'The details provided did not match the item.'],
    );

    // Does the item still have other matches? If so it goes back to MATCHED,
    // otherwise back to the plain UNCLAIMED shelf.
    const stillMatched = await client.query(
      `SELECT 1 FROM matches
        WHERE found_item_id = $1 AND status = 'POTENTIAL' LIMIT 1`,
      [claim.found_item_id],
    );

    await client.query(`UPDATE found_items SET status = $2 WHERE found_item_id = $1`, [
      claim.found_item_id,
      stillMatched.rowCount ? 'MATCHED' : 'UNCLAIMED',
    ]);

    if (claim.lost_item_id) {
      await client.query(
        `UPDATE lost_items SET status = 'MATCHED' WHERE lost_item_id = $1 AND status = 'CLAIMED'`,
        [claim.lost_item_id],
      );
    }
    if (claim.match_id) {
      await client.query(
        `UPDATE matches SET status = 'POTENTIAL' WHERE match_id = $1 AND status = 'CLAIMED'`,
        [claim.match_id],
      );
    }

    await client.query(
      `SELECT fn_notify($1, 'CLAIM_REJECTED', $2, $3, 'CLAIM', $4)`,
      [
        claim.claimant_id,
        `Your claim for "${claim.item_name}" was not approved`,
        reviewNotes ?? 'The details you provided did not match the item held at the desk.',
        claimId,
      ],
    );

    return { claimId };
  });
}

/** A student withdrawing their own claim. */
export async function cancelClaim(user: AuthUser, claimId: number) {
  return withTransaction(async (client) => {
    const result = await client.query<{
      status: string; claimant_id: number; found_item_id: number; lost_item_id: number | null;
      match_id: number | null;
    }>(
      `SELECT status, claimant_id, found_item_id, lost_item_id, match_id
         FROM claims WHERE claim_id = $1 FOR UPDATE`,
      [claimId],
    );

    const claim = result.rows[0];
    if (!claim) throw ApiError.notFound('That claim no longer exists.');
    if (claim.claimant_id !== user.userId) {
      throw ApiError.forbidden('You can only withdraw your own claims.');
    }
    if (claim.status !== 'PENDING') {
      throw ApiError.conflict('Only a claim that is still under review can be withdrawn.');
    }

    await client.query(`UPDATE claims SET status = 'CANCELLED' WHERE claim_id = $1`, [claimId]);

    const stillMatched = await client.query(
      `SELECT 1 FROM matches WHERE found_item_id = $1 AND status IN ('POTENTIAL','CLAIMED') LIMIT 1`,
      [claim.found_item_id],
    );
    await client.query(`UPDATE found_items SET status = $2 WHERE found_item_id = $1`, [
      claim.found_item_id,
      stillMatched.rowCount ? 'MATCHED' : 'UNCLAIMED',
    ]);

    if (claim.lost_item_id) {
      await client.query(
        `UPDATE lost_items SET status = 'MATCHED' WHERE lost_item_id = $1 AND status = 'CLAIMED'`,
        [claim.lost_item_id],
      );
    }
    if (claim.match_id) {
      await client.query(
        `UPDATE matches SET status = 'POTENTIAL' WHERE match_id = $1 AND status = 'CLAIMED'`,
        [claim.match_id],
      );
    }

    return { claimId };
  });
}

/* -------------------------------------------------------------------------- */
/* Verification                                                                */
/* -------------------------------------------------------------------------- */

export async function recordVerification(staff: AuthUser, input: {
  claimId: number; method: string; qrCode?: string; outcome: string; notes?: string;
}) {
  const claim = await queryOne<{ status: string; qr_code: string | null }>(
    `SELECT c.status, q.qr_code
       FROM claims c
       LEFT JOIN qr_tags q ON q.found_item_id = c.found_item_id
      WHERE c.claim_id = $1`,
    [input.claimId],
  );

  if (!claim) throw ApiError.notFound('That claim no longer exists.');
  if (claim.status !== 'PENDING') {
    throw ApiError.conflict('This claim has already been decided.');
  }

  // If a code was supplied it must be the code on THIS item.
  if (input.qrCode && claim.qr_code && input.qrCode !== claim.qr_code) {
    throw ApiError.badRequest('That QR code belongs to a different item.');
  }

  return claimRepo.insertVerification({ ...input, staffId: staff.userId });
}
