import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import routes from './routes/index.js';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

/** True for loopback and RFC1918 addresses used during LAN testing. */
function isPrivateHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
  return false;
}

function isAllowedOrigin(origin: string): boolean {
  if (env.corsOrigins.includes(origin) || env.corsOrigins.includes('*')) return true;
  try {
    const url = new URL(origin);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? isPrivateHost(url.hostname)
      : false;
  } catch {
    return false;
  }
}

export function createApp() {
  const app = express();

  // Behind the compose network the API sees a proxy address; trusting one hop
  // keeps express-rate-limit counting real clients.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Sensible security headers. The API serves JSON only, so the restrictive
  // cross-origin resource policy costs nothing.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Same-origin (nginx / Vite proxy) never sends a cross-origin Origin.
  // Listed origins, localhost, and private LAN IPs are allowed so a phone on
  // the same network can open a printed QR label during local testing.
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );

  // A 1 MB body is far more than any CampusFind form needs.
  app.use(express.json({ limit: '1mb' }));

  // A broad safety net; individual sensitive routes add their own tighter limit.
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  );

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
