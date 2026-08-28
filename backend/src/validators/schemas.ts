import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Shared primitives                                                          */
/* -------------------------------------------------------------------------- */

export const idParam = z.coerce.number().int().positive();

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date picker to choose a valid date.')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'That date does not exist.')
  .refine((value) => new Date(value + 'T00:00:00Z') <= new Date(), 'The date cannot be in the future.');

const optionalTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour time such as 16:30.')
  .optional()
  .or(z.literal('').transform(() => undefined));

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be under ${max} characters.`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined));

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export const registerSchema = z.object({
  fullName: trimmed(2, 120, 'Your name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(160),
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .max(72, 'Passwords are limited to 72 characters.')
    .regex(/[a-z]/, 'Include at least one lowercase letter.')
    .regex(/[A-Z]/, 'Include at least one uppercase letter.')
    .regex(/[0-9]/, 'Include at least one number.'),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,20}$/, 'Enter a valid phone number.')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  enrollmentNo: optionalText(30),
  department: optionalText(80),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export const staffSetupSchema = registerSchema.extend({
  setupSecret: z.string().min(8, 'Enter the staff setup key.'),
});

/* -------------------------------------------------------------------------- */
/* Items                                                                       */
/* -------------------------------------------------------------------------- */

export const lostItemSchema = z.object({
  itemName: trimmed(2, 120, 'The item name'),
  categoryId: z.coerce.number().int().positive('Choose a category.'),
  locationId: z.coerce.number().int().positive('Choose where you last saw it.'),
  brand: optionalText(60),
  color: optionalText(40),
  description: trimmed(15, 2000, 'The description'),
  identifyingDetails: optionalText(1000),
  lostDate: isoDate,
  lostTimeApprox: optionalTime,
});

export const foundItemSchema = z.object({
  itemName: trimmed(2, 120, 'The item name'),
  categoryId: z.coerce.number().int().positive('Choose a category.'),
  locationId: z.coerce.number().int().positive('Choose where you found it.'),
  brand: optionalText(60),
  color: optionalText(40),
  description: trimmed(15, 2000, 'The description'),
  storageLocation: optionalText(120),
  foundDate: isoDate,
  foundTimeApprox: optionalTime,
});

export const lostItemUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'RESOLVED']),
});

/* -------------------------------------------------------------------------- */
/* Claims & verification                                                       */
/* -------------------------------------------------------------------------- */

export const claimSchema = z.object({
  foundItemId: z.coerce.number().int().positive(),
  lostItemId: z.coerce.number().int().positive().optional(),
  matchId: z.coerce.number().int().positive().optional(),
  claimDetails: trimmed(
    15,
    1000,
    'Your proof of ownership',
  ),
});

export const claimDecisionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'CANCEL']),
  reviewNotes: optionalText(1000),
});

export const verificationSchema = z.object({
  claimId: z.coerce.number().int().positive(),
  method: z.enum(['QR_SCAN', 'MANUAL_ID', 'VISUAL']),
  qrCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^CF-FOUND-\d{6}$/, 'A CampusFind code looks like CF-FOUND-000125.')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  outcome: z.enum(['PASSED', 'FAILED']),
  notes: optionalText(1000),
});

export const qrCodeParam = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^CF-FOUND-\d{6}$/, 'A CampusFind code looks like CF-FOUND-000125.');

/* -------------------------------------------------------------------------- */
/* Listing / filtering                                                         */
/* -------------------------------------------------------------------------- */

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  search: z.string().trim().max(120).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional(),
  status: z.string().trim().max(20).optional(),
  scope: z.enum(['mine', 'all']).default('all'),
  sort: z.enum(['newest', 'oldest', 'name']).default('newest'),
});

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  action: z.string().trim().max(30).optional(),
  entityType: z.string().trim().max(20).optional(),
});

/* -------------------------------------------------------------------------- */
/* Admin reference data                                                        */
/* -------------------------------------------------------------------------- */

export const categorySchema = z.object({
  name: trimmed(2, 60, 'The category name'),
  icon: optionalText(40),
  description: optionalText(200),
  isActive: z.boolean().optional(),
});

export const locationSchema = z.object({
  name: trimmed(2, 80, 'The location name'),
  building: trimmed(2, 80, 'The building'),
  floorLabel: optionalText(30),
  description: optionalText(200),
  isActive: z.boolean().optional(),
});

export const userUpdateSchema = z.object({
  roleId: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type StaffSetupInput = z.infer<typeof staffSetupSchema>;
export type LostItemInput = z.infer<typeof lostItemSchema>;
export type FoundItemInput = z.infer<typeof foundItemSchema>;
export type ClaimInput = z.infer<typeof claimSchema>;
export type ClaimDecisionInput = z.infer<typeof claimDecisionSchema>;
export type VerificationInput = z.infer<typeof verificationSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
