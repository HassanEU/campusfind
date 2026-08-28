import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import * as auth from '../controllers/auth.controller.js';
import * as items from '../controllers/item.controller.js';
import * as matches from '../controllers/match.controller.js';
import * as claims from '../controllers/claim.controller.js';
import * as misc from '../controllers/misc.controller.js';

import { authenticate, optionalAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  auditQuerySchema, categorySchema, claimDecisionSchema, claimSchema, foundItemSchema,
  listQuerySchema, locationSchema, loginSchema, lostItemSchema, lostItemUpdateSchema,
  registerSchema, staffSetupSchema, userUpdateSchema, verificationSchema,
} from '../validators/schemas.js';

const router = Router();

/**
 * Sign-in and sign-up are the endpoints worth brute-forcing, so they get their
 * own tighter limit than the rest of the API.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a few minutes.' } },
});

/** QR lookups are cheap but should not be enumerable at speed. */
const qrLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Slow down a moment before scanning again.' } },
});

/* --------------------------------- public --------------------------------- */

router.get('/health', misc.health);
router.get('/stats/public', misc.publicStats);

router.post('/auth/register', authLimiter, validateBody(registerSchema), auth.register);
router.post('/auth/staff-setup', authLimiter, validateBody(staffSetupSchema), auth.staffSetup);
router.post('/auth/login', authLimiter, validateBody(loginSchema), auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', authenticate, auth.me);

router.get('/categories', optionalAuth, misc.categories);
router.get('/locations', optionalAuth, misc.locations);

/* -------------------------------- lost items ------------------------------- */

router.get('/lost-items', optionalAuth, validateQuery(listQuerySchema), items.listLost);
router.post('/lost-items', authenticate, validateBody(lostItemSchema), items.createLost);
router.get('/lost-items/:id', authenticate, items.getLost);
router.patch('/lost-items/:id', authenticate, validateBody(lostItemUpdateSchema), items.updateLost);
router.post('/lost-items/:id/rescan', authenticate, items.rescan);

/* ------------------------------- found items ------------------------------- */

router.get('/found-items', optionalAuth, validateQuery(listQuerySchema), items.listFound);
router.post('/found-items', authenticate, validateBody(foundItemSchema), items.createFound);
router.get('/found-items/:id', optionalAuth, items.getFound);
router.get('/found-items/:id/qr', authenticate, items.getFoundQr);

/* --------------------------------- matches -------------------------------- */

router.get('/matches', authenticate, matches.listMine);
router.get('/matches/:id', authenticate, matches.getOne);
router.post('/matches/:id/dismiss', authenticate, matches.dismiss);

/* ---------------------------------- claims -------------------------------- */

router.get('/claims', authenticate, claims.list);
router.post('/claims', authenticate, validateBody(claimSchema), claims.create);
router.get('/claims/:id', authenticate, claims.getOne);
router.patch('/claims/:id', authenticate, validateBody(claimDecisionSchema), claims.decide);

/* ------------------------- QR + desk-side verification --------------------- */

router.get('/qr/:code', authenticate, requireRole('STAFF'), qrLimiter, misc.lookupQr);
router.post(
  '/verifications',
  authenticate,
  requireRole('STAFF'),
  validateBody(verificationSchema),
  claims.verify,
);
router.get('/returns', authenticate, claims.returns);

/* ------------------------------- dashboards -------------------------------- */

router.get('/dashboard/student', authenticate, misc.studentDashboard);
router.get('/dashboard/staff', authenticate, requireRole('STAFF'), misc.staffDashboard);

/* ----------------------------- notifications ------------------------------- */

router.get('/notifications', authenticate, misc.listNotifications);
router.patch('/notifications/:id/read', authenticate, misc.readNotification);
router.post('/notifications/read-all', authenticate, misc.readAllNotifications);

/* ---------------------------------- admin ---------------------------------- */

const adminOnly = [authenticate, requireRole('ADMIN')] as const;

router.get('/admin/analytics', authenticate, requireRole('STAFF'), misc.adminAnalytics);
router.get('/admin/audit-logs', authenticate, requireRole('STAFF'),
  validateQuery(auditQuerySchema), misc.auditLogs);
router.get('/admin/users', ...adminOnly, misc.listUsers);
router.patch('/admin/users/:id', ...adminOnly, validateBody(userUpdateSchema), misc.updateUser);
router.post('/admin/categories', ...adminOnly, validateBody(categorySchema), misc.createCategory);
router.patch('/admin/categories/:id', ...adminOnly, validateBody(categorySchema.partial()), misc.updateCategory);
router.post('/admin/locations', ...adminOnly, validateBody(locationSchema), misc.createLocation);
router.patch('/admin/locations/:id', ...adminOnly, validateBody(locationSchema.partial()), misc.updateLocation);

export default router;
