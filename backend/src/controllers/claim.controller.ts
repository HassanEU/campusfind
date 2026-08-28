import type { RequestHandler } from 'express';
import * as claimRepo from '../repositories/claim.repository.js';
import * as claimService from '../services/claim.service.js';
import * as analyticsRepo from '../repositories/analytics.repository.js';
import { camelize } from '../utils/serialize.js';
import { ApiError } from '../utils/ApiError.js';
import { idParam } from '../validators/schemas.js';

export const list: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();

  // Students see only their own claims; staff see the whole review queue.
  const rows = req.user.role === 'STUDENT'
    ? await claimRepo.listClaimsForUser(req.user.userId)
    : await claimRepo.listClaimsForStaff(
        typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined,
      );

  res.json({ data: camelize(rows) });
};

export const getOne: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const id = idParam.parse(req.params.id);

  const claim = (await claimRepo.getClaim(id)) as { claimant_id?: number } | null;
  if (!claim) throw ApiError.notFound('That claim does not exist.');
  if (req.user.role === 'STUDENT' && claim.claimant_id !== req.user.userId) {
    throw ApiError.forbidden('This claim belongs to another student.');
  }

  const [verifications, history] = await Promise.all([
    claimRepo.getClaimVerifications(id),
    analyticsRepo.entityHistory('CLAIM', id),
  ]);

  res.json({
    claim: camelize(claim),
    verifications: camelize(verifications),
    history: camelize(history),
  });
};

export const create: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await claimService.submitClaim(req.user, req.body);
  const claim = await claimRepo.getClaim(result.claimId);
  res.status(201).json({ claim: camelize(claim) });
};

/**
 * One endpoint, three transitions.  Which one is allowed depends on the role:
 * a student may only CANCEL their own claim, staff may APPROVE or REJECT.
 */
export const decide: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const id = idParam.parse(req.params.id);
  const { action, reviewNotes } = req.body as { action: string; reviewNotes?: string };

  if (action === 'CANCEL') {
    await claimService.cancelClaim(req.user, id);
  } else {
    if (req.user.role === 'STUDENT') {
      throw ApiError.forbidden('Only lost & found staff can approve or reject a claim.');
    }
    if (action === 'APPROVE') {
      await claimService.approveClaim(req.user, id, reviewNotes);
    } else {
      await claimService.rejectClaim(req.user, id, reviewNotes);
    }
  }

  res.json({ claim: camelize(await claimRepo.getClaim(id)) });
};

export const verify: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const verification = await claimService.recordVerification(req.user, {
    claimId: req.body.claimId,
    method: req.body.method,
    qrCode: req.body.qrCode,
    outcome: req.body.outcome,
    notes: req.body.notes,
  });
  res.status(201).json({ verification: camelize(verification) });
};

export const returns: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const rows = req.user.role === 'STUDENT'
    ? await claimRepo.listReturnsForUser(req.user.userId)
    : await claimRepo.listReturnHistory();
  res.json({ data: camelize(rows) });
};
