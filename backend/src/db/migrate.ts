import fs from 'fs';
import path from 'path';
import { pool, query, isMemFallbackActive } from './pool';

export const runMigrations = async (): Promise<void> => {
  let migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    migrationsDir = path.join(process.cwd(), 'src', 'db', 'migrations');
  }
  
  if (!fs.existsSync(migrationsDir)) {
    console.error('[Migration] Directory not found:', migrationsDir);
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const checkRes = await query('SELECT 1 FROM schema_migrations WHERE migration_name = $1', [file]);
    if (checkRes.rows.length === 0) {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[Migration] Applying ${file}...`);
      }
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Split statements and skip CREATE EXTENSION statements if unsupported by pg-mem
        const statements = sql
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const stmt of statements) {
          try {
            await client.query(stmt);
          } catch (stmtErr) {
            if (process.env.NODE_ENV === 'test' || isMemFallbackActive()) {
              // In test mode / pg-mem fallback, ignore unsupported vector types & extension statements
              const lower = stmt.toLowerCase();
              if (
                lower.includes('create extension') ||
                lower.includes('using ivfflat') ||
                lower.includes('vector(')
              ) {
                if (lower.includes('create table') && lower.includes('vector(')) {
                  try {
                    const sanitizedStmt = stmt.replace(/VECTOR\(\d+\)/gi, 'TEXT');
                    await client.query(sanitizedStmt);
                  } catch (fallbackErr) {
                    // Ignore fallback failure in pg-mem
                  }
                }
                continue;
              }
            }
            throw stmtErr;
          }
        }

        await client.query('INSERT INTO schema_migrations (migration_name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        if (process.env.NODE_ENV !== 'test') {
          console.log(`[Migration] Applied ${file}`);
        }
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Migration] Failed on ${file}:`, err);
        throw err;
      } finally {
        client.release();
      }
    }
  }
};

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('[Migration] All migrations completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration] Migration error:', err);
      process.exit(1);
    });
}
