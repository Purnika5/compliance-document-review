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
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        let hasVector = false;
        try {
          const extRes = await client.query("SELECT 1 FROM pg_available_extensions WHERE name = 'vector'");
          hasVector = extRes.rows.length > 0;
        } catch {
          hasVector = false;
        }

        await client.query('BEGIN');
        
        let processedSql = sql;
        if (!hasVector || process.env.NODE_ENV === 'test' || isMemFallbackActive()) {
          // Remove vector extension creation and fallback VECTOR(dim) to TEXT
          processedSql = processedSql
            .replace(/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+vector\s*;/gi, '')
            .replace(/VECTOR\(\d+\)/gi, 'TEXT');
        }

        // Split statements and execute
        const statements = processedSql
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const stmt of statements) {
          const lower = stmt.toLowerCase();
          if ((!hasVector || process.env.NODE_ENV === 'test' || isMemFallbackActive()) && lower.includes('using ivfflat')) {
            continue;
          }
          if ((process.env.NODE_ENV === 'test' || isMemFallbackActive()) && lower.includes('create extension')) {
            continue;
          }
          try {
            await client.query(stmt);
          } catch (stmtErr) {
            if (
              lower.includes('create extension') ||
              lower.includes('using ivfflat') ||
              lower.includes('vector(') ||
              (stmtErr as any)?.message?.includes('Extension does not exist') ||
              (stmtErr as any)?.message?.includes('pg-mem')
            ) {
              // If VECTOR type table creation failed in pg-mem, attempt sanitized schema replacing VECTOR(128) with TEXT
              if (lower.includes('create table') && lower.includes('vector(')) {
                try {
                  const sanitizedStmt = stmt.replace(/VECTOR\(\d+\)/gi, 'TEXT');
                  await client.query(sanitizedStmt);
                } catch (fallbackErr) {
                  // Ignore fallback failure in pg-mem mode
                }
              }
              continue;
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
