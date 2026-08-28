/**
 * The single fetch wrapper the whole app uses.
 *
 * Responsibilities:
 *   - attach the bearer token
 *   - turn a non-2xx response into a typed ApiError with a human message
 *   - surface field-level validation errors so forms can show them inline
 */

/**
 * Resolves the API base at runtime.
 *
 * Relative `/api` is the default so the same build works on localhost, a LAN
 * IP, and a deployed hostname — nginx (production) and Vite (dev) proxy it.
 * VITE_API_URL is only needed when the API is hosted on a different origin.
 */
function resolveApiBase(): string {
  const explicit = import.meta.env.VITE_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  return '/api';
}

const BASE_URL = resolveApiBase();
const TOKEN_KEY = 'campusfind.token';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, message: string, code = 'ERROR', fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = tokenStore.get();

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch {
    // fetch only rejects for network-level problems, so this is genuinely
    // "the server could not be reached" rather than an application error.
    throw new ApiError(0, 'Cannot reach the CampusFind server. Check your connection and try again.', 'NETWORK');
  }

  const text = await response.text();
  const payload = text ? safeParse(text) : {};

  if (!response.ok) {
    const error = (payload as { error?: { message?: string; code?: string; fields?: Record<string, string> } })
      .error;

    // An expired or revoked token: clear it so the app falls back to signed-out
    // rather than looping on 401s.
    if (response.status === 401 && token) {
      tokenStore.clear();
    }

    throw new ApiError(
      response.status,
      error?.message ?? 'Something went wrong. Please try again.',
      error?.code ?? 'ERROR',
      error?.fields,
    );
  }

  return payload as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/** Builds a query string, skipping empty values so URLs stay clean. */
export function qs(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}
