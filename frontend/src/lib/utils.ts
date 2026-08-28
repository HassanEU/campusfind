import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';

/** Merge Tailwind classes so later utilities reliably win over earlier ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ------------------------------- formatting ------------------------------- */

export function formatDate(value?: string | null, pattern = 'd MMM yyyy') {
  if (!value) return '—';
  const date = typeof value === 'string' ? parseISO(value) : value;
  return isValid(date) ? format(date, pattern) : '—';
}

export function formatDateTime(value?: string | null) {
  return formatDate(value, "d MMM yyyy 'at' HH:mm");
}

export function formatRelative(value?: string | null) {
  if (!value) return '—';
  const date = parseISO(value);
  if (!isValid(date)) return '—';
  return `${formatDistanceToNowStrict(date)} ago`;
}

/** '16:30:00' -> '16:30'. Times are optional throughout the product. */
export function formatTime(value?: string | null) {
  if (!value) return null;
  return value.slice(0, 5);
}

export function initials(name?: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** 'CLAIM_PENDING' -> 'Claim pending' */
export function humanizeStatus(status?: string | null) {
  if (!status) return '';
  const lower = status.replace(/_/g, ' ').toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * A match's score decides its visual weight: strong matches earn the success
 * colour, weak ones stay neutral so nobody is nudged into a bad claim.
 */
export function scoreTone(score: number): 'success' | 'info' | 'warning' | 'muted' {
  if (score >= 85) return 'success';
  if (score >= 70) return 'info';
  if (score >= 55) return 'warning';
  return 'muted';
}

export function scoreLabel(score: number) {
  if (score >= 90) return 'Very strong match';
  if (score >= 75) return 'Strong match';
  if (score >= 60) return 'Possible match';
  return 'Weak match';
}

/**
 * Accepts a raw CF-FOUND-###### code or a URL that contains one (the payload
 * printed on QR labels). Returns the identifier or null.
 */
export function parseCampusFindCode(raw: string): string | null {
  const match = raw.trim().toUpperCase().match(/CF-FOUND-\d{6}/);
  return match ? match[0] : null;
}
