import type { RequestHandler } from 'express';
import * as analyticsRepo from '../repositories/analytics.repository.js';
import * as referenceRepo from '../repositories/reference.repository.js';
import * as userRepo from '../repositories/user.repository.js';
import * as itemService from '../services/item.service.js';
import { camelize } from '../utils/serialize.js';
import { ApiError } from '../utils/ApiError.js';
import { getQuery } from '../middleware/validate.js';
import { auditQuerySchema, idParam, qrCodeParam } from '../validators/schemas.js';
import { checkDatabase } from '../db/pool.js';
import { query } from '../db/pool.js';

/* --------------------------------- health --------------------------------- */

export const health: RequestHandler = async (_req, res) => {
  const db = await checkDatabase();
  res.json({ status: 'ok', database: db, timestamp: new Date().toISOString() });
};

/* ------------------------------ reference data ---------------------------- */

export const categories: RequestHandler = async (req, res) => {
  const includeInactive = req.user?.role === 'ADMIN' && req.query.all === 'true';
  res.json({ data: camelize(await referenceRepo.listCategories(includeInactive)) });
};

export const locations: RequestHandler = async (req, res) => {
  const includeInactive = req.user?.role === 'ADMIN' && req.query.all === 'true';
  res.json({ data: camelize(await referenceRepo.listLocations(includeInactive)) });
};

/* --------------------------------- QR ------------------------------------- */

/**
 * The lookup used by the staff verification screen.  Identical behaviour for a
 * camera scan and a code typed in by hand, which is what makes the manual
 * fallback genuinely usable when a camera is unavailable.
 */
export const lookupQr: RequestHandler = async (req, res) => {
  const parsed = qrCodeParam.safeParse(req.params.code);
  const code = parsed.success
    ? parsed.data
    : itemService.extractQrCode(String(req.params.code ?? ''));
  if (!code) {
    throw ApiError.badRequest('A CampusFind code looks like CF-FOUND-000125.');
  }
  res.json({ item: camelize(await itemService.lookupByQr(code)) });
};

/* ------------------------------- dashboards ------------------------------- */

export const studentDashboard: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();

  const [counters, matches, claims, notifications] = await Promise.all([
    analyticsRepo.studentDashboard(req.user.userId),
    query(
      `SELECT v.match_id, v.total_score, v.lost_item_name, v.found_item_name,
              v.found_location, v.found_date, v.match_status, v.lost_item_id
         FROM v_match_overview v
         INNER JOIN lost_items l ON l.lost_item_id = v.lost_item_id
        WHERE l.reported_by = $1 AND v.match_status = 'POTENTIAL'
        ORDER BY v.total_score DESC
        LIMIT 3`,
      [req.user.userId],
    ),
    query(
      `SELECT claim_id, status, found_item_name, submitted_at
         FROM v_claims_detail
        WHERE claimant_id = $1 AND status IN ('PENDING', 'APPROVED')
        ORDER BY submitted_at DESC LIMIT 3`,
      [req.user.userId],
    ),
    referenceRepo.listNotifications(req.user.userId, 5),
  ]);

  res.json(
    camelize({
      counters,
      topMatches: matches.rows,
      activeClaims: claims.rows,
      notifications,
    }),
  );
};

export const staffDashboard: RequestHandler = async (_req, res) => {
  const [counters, queue, recentReturns] = await Promise.all([
    analyticsRepo.staffDashboard(),
    query(
      `SELECT claim_id, claimant_name, found_item_name, qr_code, submitted_at, match_score
         FROM v_pending_claims ORDER BY submitted_at ASC LIMIT 6`,
    ),
    query(`SELECT * FROM v_return_history ORDER BY returned_at DESC LIMIT 5`),
  ]);

  res.json(camelize({ counters, queue: queue.rows, recentReturns: recentReturns.rows }));
};

export const adminAnalytics: RequestHandler = async (_req, res) => {
  const [stats, overTime, byCategory, byLocation, quality, topCategories] = await Promise.all([
    analyticsRepo.platformStats(),
    analyticsRepo.reportsOverTime(30),
    analyticsRepo.categoryStats(),
    analyticsRepo.locationStats(),
    analyticsRepo.matchQualityBuckets(),
    analyticsRepo.topLostCategories(6),
  ]);

  res.json(
    camelize({ stats, reportsOverTime: overTime, byCategory, byLocation, matchQuality: quality, topCategories }),
  );
};

/** Public counters for the landing page — no authentication required. */
export const publicStats: RequestHandler = async (_req, res) => {
  const stats = (await analyticsRepo.platformStats()) as Record<string, unknown> | null;
  const recent = await query(
    `SELECT item_name, category_name, location_name, found_date
       FROM v_available_found_items ORDER BY created_at DESC LIMIT 6`,
  );
  res.json(camelize({ stats, recentFound: recent.rows }));
};

/* ------------------------------ notifications ----------------------------- */

export const listNotifications: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  res.json({ data: camelize(await referenceRepo.listNotifications(req.user.userId)) });
};

export const readNotification: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const id = idParam.parse(req.params.id);
  const updated = await referenceRepo.markNotificationRead(req.user.userId, id);
  if (!updated) throw ApiError.notFound('That notification does not exist.');
  res.json(camelize({ notification: updated }));
};

export const readAllNotifications: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const updated = await referenceRepo.markAllNotificationsRead(req.user.userId);
  res.json({ updated: updated.length });
};

/* ---------------------------------- admin --------------------------------- */

export const auditLogs: RequestHandler = async (req, res) => {
  const q = getQuery<typeof auditQuerySchema._output>(req);
  const { rows, total, totalPages } = await analyticsRepo.auditTrail(q);
  res.json({ data: camelize(rows), page: q.page, pageSize: q.pageSize, total, totalPages });
};

export const listUsers: RequestHandler = async (_req, res) => {
  res.json({ data: camelize(await userRepo.listUsers()) });
};

export const updateUser: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const id = idParam.parse(req.params.id);

  if (id === req.user.userId) {
    throw ApiError.badRequest('You cannot change your own role or status.');
  }

  const updated = await userRepo.updateUser(id, req.body);
  if (!updated) throw ApiError.notFound('That user does not exist.');

  await query(
    `SELECT fn_write_audit($1, 'USER_UPDATED', 'USER', $2, $3::jsonb)`,
    [req.user.userId, id, JSON.stringify(req.body)],
  );

  res.json(camelize({ user: updated }));
};

export const createCategory: RequestHandler = async (req, res) => {
  const created = await referenceRepo.createCategory(req.body);
  res.status(201).json(camelize({ category: created }));
};

export const updateCategory: RequestHandler = async (req, res) => {
  const id = idParam.parse(req.params.id);
  const updated = await referenceRepo.updateCategory(id, req.body);
  if (!updated) throw ApiError.notFound('That category does not exist.');
  await query(`SELECT fn_write_audit($1, 'CATEGORY_UPDATED', 'CATEGORY', $2)`, [
    req.user?.userId ?? null, id,
  ]);
  res.json(camelize({ category: updated }));
};

export const createLocation: RequestHandler = async (req, res) => {
  const created = await referenceRepo.createLocation(req.body);
  res.status(201).json(camelize({ location: created }));
};

export const updateLocation: RequestHandler = async (req, res) => {
  const id = idParam.parse(req.params.id);
  const updated = await referenceRepo.updateLocation(id, req.body);
  if (!updated) throw ApiError.notFound('That location does not exist.');
  await query(`SELECT fn_write_audit($1, 'LOCATION_UPDATED', 'LOCATION', $2)`, [
    req.user?.userId ?? null, id,
  ]);
  res.json(camelize({ location: updated }));
};
