import { queryAll, queryOne } from '../db/pool.js';

/** Headline counters for the landing page and the admin dashboard. */
export function platformStats() {
  return queryOne(`SELECT * FROM fn_platform_stats()`);
}

/** The six numbers on the student dashboard, in one round trip. */
export function studentDashboard(userId: number) {
  return queryOne(`SELECT * FROM fn_student_dashboard($1)`, [userId]);
}

/** Everything the staff desk needs to know at a glance. */
export function staffDashboard() {
  return queryOne(
    `SELECT
        (SELECT COUNT(*) FROM claims WHERE status = 'PENDING')                     AS pending_claims,
        (SELECT COUNT(*) FROM found_items WHERE status IN ('UNCLAIMED','MATCHED')) AS items_in_storage,
        (SELECT COUNT(*) FROM found_items WHERE status = 'CLAIM_PENDING')          AS awaiting_verification,
        (SELECT COUNT(*) FROM return_records WHERE returned_at >= NOW() - INTERVAL '7 days') AS returned_this_week,
        (SELECT COUNT(*) FROM found_items WHERE created_at >= NOW() - INTERVAL '7 days')     AS new_this_week,
        (SELECT ROUND(AVG(returned_at::date - f.found_date), 1)
           FROM return_records r
           INNER JOIN found_items f ON f.found_item_id = r.found_item_id)          AS avg_days_to_return`,
  );
}

export function reportsOverTime(days: number) {
  return queryAll(`SELECT * FROM fn_reports_over_time($1)`, [days]);
}

export function categoryStats() {
  return queryAll(`SELECT * FROM v_category_stats ORDER BY (lost_count + found_count) DESC`);
}

export function locationStats() {
  return queryAll(`SELECT * FROM v_location_stats ORDER BY total_reports DESC`);
}

/**
 * "Which categories go missing most often, and how often do we get them back?"
 *
 * GROUP BY + HAVING + aggregate + CASE in one query: only categories with at
 * least one lost report are considered, so empty categories do not pad the
 * chart with meaningless zero rows.
 */
export function topLostCategories(limit = 6) {
  return queryAll(
    `SELECT c.name              AS category_name,
            COUNT(l.lost_item_id) AS lost_count,
            COUNT(l.lost_item_id) FILTER (WHERE l.status = 'RESOLVED') AS resolved_count,
            CASE
              WHEN COUNT(l.lost_item_id) = 0 THEN 0
              ELSE ROUND(100.0 * COUNT(l.lost_item_id) FILTER (WHERE l.status = 'RESOLVED')
                         / COUNT(l.lost_item_id), 1)
            END AS resolved_rate
       FROM categories c
       LEFT JOIN lost_items l ON l.category_id = c.category_id
      GROUP BY c.category_id, c.name
     HAVING COUNT(l.lost_item_id) > 0
      ORDER BY lost_count DESC
      LIMIT $1`,
    [limit],
  );
}

/** Where do people lose the most things? Used by the admin location chart. */
export function hotspotLocations(limit = 6) {
  return queryAll(
    `SELECT loc.name AS location_name, loc.building,
            COUNT(l.lost_item_id)  AS lost_count,
            COUNT(f.found_item_id) AS found_count
       FROM locations loc
       LEFT JOIN lost_items  l ON l.location_id  = loc.location_id
       LEFT JOIN found_items f ON f.location_id  = loc.location_id
      GROUP BY loc.location_id, loc.name, loc.building
     HAVING COUNT(l.lost_item_id) + COUNT(f.found_item_id) > 0
      ORDER BY lost_count DESC, found_count DESC
      LIMIT $1`,
    [limit],
  );
}

/** Score distribution: how confident is the matching engine overall? */
export function matchQualityBuckets() {
  return queryAll(
    `SELECT CASE
              WHEN total_score >= 90 THEN '90-100'
              WHEN total_score >= 75 THEN '75-89'
              WHEN total_score >= 60 THEN '60-74'
              ELSE 'Below 60'
            END AS bucket,
            COUNT(*) AS match_count
       FROM matches
      GROUP BY bucket
      ORDER BY MIN(total_score) DESC`,
  );
}

export async function auditTrail(opts: {
  page: number; pageSize: number; action?: string; entityType?: string;
}) {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (opts.action) {
    params.push(opts.action);
    clauses.push(`action = $${params.length}`);
  }
  if (opts.entityType) {
    params.push(opts.entityType);
    clauses.push(`entity_type = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const totalRow = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::bigint AS count FROM v_audit_trail ${where}`,
    params,
  );

  const rows = await queryAll(
    `SELECT * FROM v_audit_trail ${where}
      ORDER BY created_at DESC, audit_id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, opts.pageSize, (opts.page - 1) * opts.pageSize],
  );

  const total = totalRow?.count ?? 0;
  return { rows, total, totalPages: Math.max(1, Math.ceil(total / opts.pageSize)) };
}

/** The full history of one entity, used by the "activity" timeline on detail pages. */
export function entityHistory(entityType: string, entityId: number) {
  return queryAll(
    `SELECT * FROM v_audit_trail
      WHERE entity_type = $1 AND entity_id = $2
      ORDER BY created_at ASC`,
    [entityType, entityId],
  );
}
