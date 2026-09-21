const { runMigrations } = require('../../db/migrate');

async function runMigration() {
  try {
    console.log('[Migration] Starting migration process...');
    await runMigrations();
    console.log('[Migration] Database migrations completed successfully.');
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
