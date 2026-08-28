import type { RequestHandler } from 'express';
import * as matchRepo from '../repositories/match.repository.js';
import { camelize } from '../utils/serialize.js';
import { ApiError } from '../utils/ApiError.js';
import { idParam } from '../validators/schemas.js';

/** The weights the engine uses, sent to the UI so the breakdown bars are labelled. */
const CRITERIA = [
  { key: 'category', label: 'Category', weight: 20, field: 'categoryScore' },
  { key: 'brand', label: 'Brand', weight: 20, field: 'brandScore' },
  { key: 'color', label: 'Colour', weight: 10, field: 'colorScore' },
  { key: 'location', label: 'Location', weight: 20, field: 'locationScore' },
  { key: 'time', label: 'Time proximity', weight: 15, field: 'timeScore' },
  { key: 'description', label: 'Description', weight: 15, field: 'descriptionScore' },
] as const;

function withBreakdown(match: Record<string, unknown>) {
  return {
    ...match,
    breakdown: CRITERIA.map((c) => {
      const earned = Number(match[c.field] ?? 0);
      return {
        key: c.key,
        label: c.label,
        earned,
        weight: c.weight,
        percent: Math.round((earned / c.weight) * 100),
      };
    }),
  };
}

export const listMine: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const rows = await matchRepo.listMatchesForUser(req.user.userId);
  res.json({ data: camelize<Record<string, unknown>[]>(rows).map(withBreakdown) });
};

export const getOne: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const id = idParam.parse(req.params.id);

  const match = (await matchRepo.getMatch(id)) as Record<string, unknown> | null;
  if (!match) throw ApiError.notFound('That match does not exist.');

  // A match belongs to the student who filed the lost report.
  if (req.user.role === 'STUDENT' && match.lost_reported_by !== req.user.userId) {
    throw ApiError.forbidden('This match belongs to another student.');
  }

  res.json({ match: withBreakdown(camelize<Record<string, unknown>>(match)) });
};

export const dismiss: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const id = idParam.parse(req.params.id);

  const match = (await matchRepo.getMatch(id)) as { lost_reported_by?: number } | null;
  if (!match) throw ApiError.notFound('That match does not exist.');
  if (req.user.role === 'STUDENT' && match.lost_reported_by !== req.user.userId) {
    throw ApiError.forbidden('This match belongs to another student.');
  }

  const updated = await matchRepo.dismissMatch(id);
  if (!updated) throw ApiError.conflict('This match can no longer be dismissed.');
  res.json(camelize({ match: updated }));
};
