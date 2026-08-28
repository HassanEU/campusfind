import { query, queryAll, queryOne } from '../db/pool.js';
import type { QueryParam } from '../db/pool.js';
import type { ListQuery } from '../validators/schemas.js';

/* -------------------------------------------------------------------------- */
/* Filter builder                                                              */
/*                                                                            */
/* Filters are optional, so the WHERE clause has to be assembled at runtime.   */
/* Only the *placeholder* ($3, $4 ...) is ever concatenated into the SQL text; */
/* the user's value goes into the params array.  That keeps the query          */
/* parameterised even though its shape is dynamic.                            */
/* -------------------------------------------------------------------------- */
function buildFilters(
  q: ListQuery,
  opts: { userId?: number; statusColumnValues?: string[] },
) {
  const clauses: string[] = [];
  const params: QueryParam[] = [];

  if (opts.userId !== undefined) {
    params.push(opts.userId);
    clauses.push(`reported_by = $${params.length}`);
  }

  if (q.search) {
    params.push(`%${q.search}%`);
    const p = `$${params.length}`;
    clauses.push(`(item_name ILIKE ${p} OR description ILIKE ${p} OR COALESCE(brand,'') ILIKE ${p})`);
  }

  if (q.categoryId) {
    params.push(q.categoryId);
    clauses.push(`category_id = $${params.length}`);
  }

  if (q.locationId) {
    params.push(q.locationId);
    clauses.push(`location_id = $${params.length}`);
  }

  if (q.status && opts.statusColumnValues?.includes(q.status)) {
    params.push(q.status);
    clauses.push(`status = $${params.length}`);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

function orderBy(sort: ListQuery['sort']) {
  switch (sort) {
    case 'oldest':
      return 'created_at ASC';
    case 'name':
      return 'item_name ASC';
    default:
      return 'created_at DESC';
  }
}

/* -------------------------------------------------------------------------- */
/* Lost items                                                                  */
/* -------------------------------------------------------------------------- */

const LOST_STATUSES = ['ACTIVE', 'MATCHED', 'CLAIMED', 'RESOLVED'];

export async function listLostItems(q: ListQuery, userId?: number) {
  const { where, params } = buildFilters(q, { userId, statusColumnValues: LOST_STATUSES });

  const totalRow = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::bigint AS count FROM v_lost_items_detail ${where}`,
    params,
  );

  const offset = (q.page - 1) * q.pageSize;
  const rows = await queryAll(
    `SELECT d.*,
            -- Best available match for this report, so a list row can show
            -- "92% match" without a second round trip.
            (SELECT MAX(m.total_score) FROM matches m
              WHERE m.lost_item_id = d.lost_item_id AND m.status = 'POTENTIAL') AS best_match_score,
            (SELECT COUNT(*) FROM matches m
              WHERE m.lost_item_id = d.lost_item_id AND m.status = 'POTENTIAL') AS match_count
       FROM v_lost_items_detail d
       ${where}
      ORDER BY ${orderBy(q.sort)}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, q.pageSize, offset],
  );

  const total = totalRow?.count ?? 0;
  return { rows, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}

export function getLostItem(lostItemId: number) {
  return queryOne(
    `SELECT d.*,
            (SELECT COUNT(*) FROM matches m
              WHERE m.lost_item_id = d.lost_item_id AND m.status = 'POTENTIAL') AS match_count
       FROM v_lost_items_detail d
      WHERE d.lost_item_id = $1`,
    [lostItemId],
  );
}

export function insertLostItem(userId: number, input: {
  itemName: string; categoryId: number; locationId: number;
  brand?: string; color?: string; description: string;
  identifyingDetails?: string; lostDate: string; lostTimeApprox?: string;
}) {
  return queryOne<{ lost_item_id: number }>(
    `INSERT INTO lost_items (reported_by, item_name, category_id, location_id, brand, color,
                             description, identifying_details, lost_date, lost_time_approx)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING lost_item_id`,
    [
      userId, input.itemName, input.categoryId, input.locationId,
      input.brand ?? null, input.color ?? null, input.description,
      input.identifyingDetails ?? null, input.lostDate, input.lostTimeApprox ?? null,
    ],
  );
}

export function updateLostItemStatus(lostItemId: number, status: string) {
  return queryOne(
    `UPDATE lost_items SET status = $2 WHERE lost_item_id = $1
     RETURNING lost_item_id, status`,
    [lostItemId, status],
  );
}

/* -------------------------------------------------------------------------- */
/* Found items                                                                 */
/* -------------------------------------------------------------------------- */

const FOUND_STATUSES = ['UNCLAIMED', 'MATCHED', 'CLAIM_PENDING', 'VERIFIED', 'RETURNED'];

export async function listFoundItems(q: ListQuery, opts: { userId?: number; onlyAvailable?: boolean } = {}) {
  const { where, params } = buildFilters(q, {
    userId: opts.userId,
    statusColumnValues: FOUND_STATUSES,
  });

  // The public "browse" screen must only ever show collectable items.
  const availability = opts.onlyAvailable
    ? (where ? ' AND ' : 'WHERE ') + `status IN ('UNCLAIMED', 'MATCHED')`
    : '';

  const totalRow = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::bigint AS count FROM v_found_items_detail ${where}${availability}`,
    params,
  );

  const offset = (q.page - 1) * q.pageSize;
  const rows = await queryAll(
    `SELECT * FROM v_found_items_detail
     ${where}${availability}
     ORDER BY ${orderBy(q.sort)}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, q.pageSize, offset],
  );

  const total = totalRow?.count ?? 0;
  return { rows, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}

export function getFoundItem(foundItemId: number) {
  return queryOne(`SELECT * FROM v_found_items_detail WHERE found_item_id = $1`, [foundItemId]);
}

export function getFoundItemByQr(qrCode: string) {
  return queryOne(
    `SELECT d.*,
            c.claim_id, c.status AS claim_status, c.claim_details, c.submitted_at AS claim_submitted_at,
            cu.full_name AS claimant_name, cu.enrollment_no AS claimant_enrollment,
            cu.department AS claimant_department,
            li.identifying_details AS claimant_identifying_details
       FROM v_found_items_detail d
       -- LEFT JOIN: a scanned label is valid even when nobody has claimed it.
       LEFT JOIN claims     c  ON c.found_item_id = d.found_item_id AND c.status = 'PENDING'
       LEFT JOIN users      cu ON cu.user_id      = c.claimant_id
       LEFT JOIN lost_items li ON li.lost_item_id = c.lost_item_id
      WHERE d.qr_code = $1`,
    [qrCode],
  );
}

export function insertFoundItem(userId: number, input: {
  itemName: string; categoryId: number; locationId: number;
  brand?: string; color?: string; description: string;
  storageLocation?: string; foundDate: string; foundTimeApprox?: string;
}) {
  return queryOne<{ found_item_id: number }>(
    `INSERT INTO found_items (reported_by, item_name, category_id, location_id, brand, color,
                              description, storage_location, found_date, found_time_approx)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'Lost & Found Desk'), $9, $10)
     RETURNING found_item_id`,
    [
      userId, input.itemName, input.categoryId, input.locationId,
      input.brand ?? null, input.color ?? null, input.description,
      input.storageLocation ?? null, input.foundDate, input.foundTimeApprox ?? null,
    ],
  );
}

export function recordQrScan(qrCode: string) {
  return query(
    `UPDATE qr_tags
        SET scan_count = scan_count + 1, last_scanned_at = NOW()
      WHERE qr_code = $1`,
    [qrCode],
  );
}
