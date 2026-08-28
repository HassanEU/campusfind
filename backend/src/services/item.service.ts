import QRCode from 'qrcode';
import type { Request } from 'express';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import * as itemRepo from '../repositories/item.repository.js';
import * as matchRepo from '../repositories/match.repository.js';
import type { AuthUser } from '../types/index.js';
import type { FoundItemInput, LostItemInput } from '../validators/schemas.js';

const QR_CODE_PATTERN = /CF-FOUND-\d{6}/i;

/** Pulls the opaque identifier out of a typed code or a scanned URL. */
export function extractQrCode(raw: string): string | null {
  const match = raw.trim().toUpperCase().match(QR_CODE_PATTERN);
  return match ? match[0] : null;
}

/**
 * Origin the printed QR should open. PUBLIC_APP_URL wins when set (production
 * hostname); otherwise we use the host the browser actually used, so a LAN IP
 * during local testing encodes that IP rather than localhost.
 */
export function appOriginFromRequest(req: Request): string {
  if (env.publicAppUrl) return env.publicAppUrl;
  const origin = req.get('origin');
  if (origin) return origin.replace(/\/$/, '');
  const host = (req.get('x-forwarded-host') ?? req.get('host') ?? '').split(',')[0]?.trim();
  if (!host) return '';
  const proto = req.get('x-forwarded-proto') ?? (req.secure ? 'https' : 'http');
  return `${proto}://${host}`;
}

/** URL encoded into the QR image. The database still stores only CF-FOUND-######. */
export function qrScanUrl(qrCode: string, appOrigin: string): string {
  if (!appOrigin) return qrCode;
  return `${appOrigin.replace(/\/$/, '')}/staff/verify?code=${encodeURIComponent(qrCode)}`;
}

/**
 * Reporting a lost item immediately runs the matching engine against everything
 * currently on the shelf, so the student sees results on the very next screen
 * instead of waiting for a nightly job.
 */
export async function createLostItem(user: AuthUser, input: LostItemInput) {
  const created = await itemRepo.insertLostItem(user.userId, input);
  if (!created) throw new Error('Lost item insert returned no row');

  const matchesGenerated = await matchRepo.generateMatchesForLostItem(
    created.lost_item_id,
    env.matchThreshold,
  );

  const item = await itemRepo.getLostItem(created.lost_item_id);
  return { item, matchesGenerated };
}

/**
 * Reporting a found item does two extra things: the database trigger issues its
 * QR label, and the engine scores it against every open lost report.
 */
export async function createFoundItem(user: AuthUser, input: FoundItemInput, appOrigin = '') {
  const created = await itemRepo.insertFoundItem(user.userId, input);
  if (!created) throw new Error('Found item insert returned no row');

  const matchesGenerated = await matchRepo.generateMatchesForFoundItem(
    created.found_item_id,
    env.matchThreshold,
  );

  const item = await itemRepo.getFoundItem(created.found_item_id) as { qr_code?: string } | null;
  const qrDataUrl = item?.qr_code ? await renderQrDataUrl(item.qr_code, appOrigin) : null;

  return { item, matchesGenerated, qrDataUrl };
}

/**
 * The QR image is generated on demand from the code stored in the database.
 * The payload is a URL that opens the verification screen with that code, so a
 * phone camera can open it on the deployed host or a LAN IP. The code itself
 * never contains a name, email or item description.
 */
export function renderQrDataUrl(qrCode: string, appOrigin = '') {
  return QRCode.toDataURL(qrScanUrl(qrCode, appOrigin), {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
    color: { dark: '#0B1220', light: '#FFFFFF' },
  });
}

export async function getFoundItemQr(foundItemId: number, appOrigin = '') {
  const item = (await itemRepo.getFoundItem(foundItemId)) as
    | { qr_code: string | null; item_name: string; found_item_id: number }
    | null;

  if (!item) throw ApiError.notFound('That found item does not exist.');
  if (!item.qr_code) throw ApiError.notFound('No QR label has been issued for this item yet.');

  const scanUrl = qrScanUrl(item.qr_code, appOrigin);

  return {
    qrCode: item.qr_code,
    scanUrl,
    itemName: item.item_name,
    foundItemId: item.found_item_id,
    dataUrl: await renderQrDataUrl(item.qr_code, appOrigin),
  };
}

/**
 * QR lookup used by the staff verification screen.  Works identically whether
 * the code arrived from the camera, a typed identifier, or a scanned URL.
 */
export async function lookupByQr(rawCode: string) {
  const qrCode = extractQrCode(rawCode);
  if (!qrCode) {
    throw ApiError.badRequest('A CampusFind code looks like CF-FOUND-000125.');
  }

  const exists = await itemRepo.getFoundItemByQr(qrCode);

  if (!exists) {
    throw ApiError.notFound(
      `${qrCode} does not belong to any item registered with CampusFind.`,
    );
  }

  // Count the scan first, then re-read, so the response shows the scan that
  // just happened rather than the count from a moment ago.
  await itemRepo.recordQrScan(qrCode);
  return itemRepo.getFoundItemByQr(qrCode);
}

export async function closeLostItem(user: AuthUser, lostItemId: number, status: string) {
  const item = (await itemRepo.getLostItem(lostItemId)) as { reported_by: number; status: string } | null;

  if (!item) throw ApiError.notFound('That report does not exist.');
  if (item.reported_by !== user.userId && user.role === 'STUDENT') {
    throw ApiError.forbidden('You can only update your own reports.');
  }
  if (item.status === 'RESOLVED') {
    throw ApiError.conflict('This report is already closed.');
  }
  if (item.status === 'CLAIMED') {
    throw ApiError.conflict('Withdraw your claim before closing this report.');
  }

  return itemRepo.updateLostItemStatus(lostItemId, status);
}

/** Manual re-run of the matching engine, exposed on the report detail screen. */
export async function rescanMatches(user: AuthUser, lostItemId: number) {
  const item = (await itemRepo.getLostItem(lostItemId)) as { reported_by: number } | null;
  if (!item) throw ApiError.notFound('That report does not exist.');
  if (item.reported_by !== user.userId && user.role === 'STUDENT') {
    throw ApiError.forbidden('You can only re-scan your own reports.');
  }

  const generated = await matchRepo.generateMatchesForLostItem(lostItemId, env.matchThreshold);
  const matches = await matchRepo.listMatchesForLostItem(lostItemId);
  return { generated, matches };
}
