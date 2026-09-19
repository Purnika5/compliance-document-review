import { app } from './app';
import { config } from './config';
import { checkDatabaseConnection, pool } from './db/pool';
import { runMigrations } from './db/migrate';
import { seedDatabase } from './db/seed';

const startServer = async () => {
  try {
    await runMigrations();
    try {
      await seedDatabase();
    } catch (seedErr) {
      console.warn('[Server] Warning: Automatic seeding encountered an error (skipping):', seedErr);
    }

    const isDbConnected = await checkDatabaseConnection();
    if (!isDbConnected) {
      console.warn('[Server] Warning: Database connection check failed during startup.');
    }

    const server = app.listen(config.port, () => {
      console.log(`[Server] API listening on port ${config.port} (${config.env})`);
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n[Server] ${signal} received, closing HTTP server...`);
      server.close(async () => {
        try {
          await pool.end();
          process.exit(0);
        } catch (err) {
          console.error('[Server] Error closing database pool:', err);
          process.exit(1);
        }
      });

      setTimeout(() => {
        console.error('[Server] Force exit: shutdown timed out');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('[Server] Fatal startup error:', error);
    process.exit(1);
  }
};

startServer();
