import type { RequestHandler } from 'express';
import * as itemRepo from '../repositories/item.repository.js';
import * as matchRepo from '../repositories/match.repository.js';
import * as analyticsRepo from '../repositories/analytics.repository.js';
import * as itemService from '../services/item.service.js';
import { getQuery } from '../middleware/validate.js';
import { camelize } from '../utils/serialize.js';
import { ApiError } from '../utils/ApiError.js';
import { idParam, type ListQuery } from '../validators/schemas.js';

/* ------------------------------- lost items ------------------------------- */

export const listLost: RequestHandler = async (req, res) => {
  const q = getQuery<ListQuery>(req);
  // scope=mine restricts the query to the signed-in student's own reports.
  const userId = q.scope === 'mine' ? req.user?.userId : undefined;
  if (q.scope === 'mine' && !userId) throw ApiError.unauthorized();

  const { rows, total, totalPages } = await itemRepo.listLostItems(q, userId);
  res.json({ data: camelize(rows), page: q.page, pageSize: q.pageSize, total, totalPages });
};

export const getLost: RequestHandler = async (req, res) => {
  const id = idParam.parse(req.params.id);
  const item = await itemRepo.getLostItem(id);
  if (!item) throw ApiError.notFound('That lost report does not exist.');

  const [matches, history] = await Promise.all([
    matchRepo.listMatchesForLostItem(id),
    analyticsRepo.entityHistory('LOST_ITEM', id),
  ]);

  res.json({ item: camelize(item), matches: camelize(matches), history: camelize(history) });
};

export const createLost: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await itemService.createLostItem(req.user, req.body);
  res.status(201).json(camelize(result));
};

export const updateLost: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const id = idParam.parse(req.params.id);
  const updated = await itemService.closeLostItem(req.user, id, req.body.status);
  res.json(camelize({ item: updated }));
};

export const rescan: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const id = idParam.parse(req.params.id);
  res.json(camelize(await itemService.rescanMatches(req.user, id)));
};

/* ------------------------------ found items ------------------------------- */

export const listFound: RequestHandler = async (req, res) => {
  const q = getQuery<ListQuery>(req);
  const userId = q.scope === 'mine' ? req.user?.userId : undefined;
  if (q.scope === 'mine' && !userId) throw ApiError.unauthorized();

  // Students browsing the public catalogue only ever see collectable items;
  // staff and admins can see everything, including returned ones.
  const onlyAvailable = !req.user || req.user.role === 'STUDENT';

  const { rows, total, totalPages } = await itemRepo.listFoundItems(q, {
    userId,
    onlyAvailable: onlyAvailable && q.scope !== 'mine',
  });

  // A found item's QR code is an operational detail; students do not need it.
  const data = camelize<Record<string, unknown>[]>(rows);
  if (onlyAvailable) {
    for (const row of data) {
      delete row.qrCode;
      delete row.reporterName;
      delete row.storageLocation;
    }
  }

  res.json({ data, page: q.page, pageSize: q.pageSize, total, totalPages });
};

export const getFound: RequestHandler = async (req, res) => {
  const id = idParam.parse(req.params.id);
  const item = (await itemRepo.getFoundItem(id)) as Record<string, unknown> | null;
  if (!item) throw ApiError.notFound('That found item does not exist.');

  const history = req.user && req.user.role !== 'STUDENT'
    ? await analyticsRepo.entityHistory('FOUND_ITEM', id)
    : [];

  const payload = camelize<Record<string, unknown>>(item);
  if (!req.user || req.user.role === 'STUDENT') {
    delete payload.qrCode;
    delete payload.reporterName;
  }

  res.json({ item: payload, history: camelize(history) });
};

export const createFound: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const origin = itemService.appOriginFromRequest(req);
  const result = await itemService.createFoundItem(req.user, req.body, origin);
  res.status(201).json(camelize(result));
};

export const getFoundQr: RequestHandler = async (req, res) => {
  const id = idParam.parse(req.params.id);
  const origin = itemService.appOriginFromRequest(req);
  res.json(await itemService.getFoundItemQr(id, origin));
};
