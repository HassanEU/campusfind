import { createApp } from './app.js';
import { env } from './config/env.js';
import { checkDatabase, closePool } from './db/pool.js';

async function main() {
  // Fail fast: if PostgreSQL is unreachable there is no point serving requests.
  const db = await checkDatabase();
  console.log(`[db] connected to ${env.db.host}:${env.db.port}/${env.db.database} (${db.latencyMs}ms)`);

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[api] CampusFind API listening on http://localhost:${env.port}/api`);
    console.log(`[api] environment: ${env.nodeEnv}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n[api] ${signal} received, shutting down...`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
    // Do not hang forever if a connection refuses to close.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('[api] failed to start:', error instanceof Error ? error.message : error);
  process.exit(1);
});
