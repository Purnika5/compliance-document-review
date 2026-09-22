import fs from 'fs';
import path from 'path';
import { pool, query, isMemFallbackActive } from './pool';
import { config } from '../config';

/**
 * Detects if the current database connection targets a Supabase instance.
 */
export const isSupabaseDatabase = (): boolean => {
  const dbUrl = (
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    config.db.connectionString ||
    ''
  ).toLowerCase();
  const dbHost = (
    process.env.DB_HOST ||
    config.db.host ||
    ''
  ).toLowerCase();

  return (
    dbUrl.includes('supabase.co') ||
    dbUrl.includes('supabase.com') ||
    dbUrl.includes('pooler.supabase') ||
    dbUrl.includes('supabase.in') ||
    dbUrl.includes('supabase.net') ||
    dbHost.includes('supabase') ||
    Boolean(process.env.SUPABASE_URL)
  );
};

/**
 * Checks for existing public tables in the database.
 */
export const hasExistingTables = async (): Promise<{ exists: boolean; tables: string[]; publicCount: number }> => {
  try {
    const res = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('users', 'documents', 'schema_migrations', 'rules', 'document_revisions', 'audit_trail', 'notifications')
    `);
    const tables: string[] = res.rows.map((r: any) => r.table_name);

    let publicCount = tables.length;
    try {
      const countRes = await query(`
        SELECT count(*)::int as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      publicCount = countRes.rows[0]?.count || tables.length;
    } catch {
      // ignore
    }

    return { exists: tables.length > 0 || publicCount > 0, tables, publicCount };
  } catch (err) {
    return { exists: false, tables: [], publicCount: 0 };
  }
};

/**
 * Determines whether database migrations should be skipped.
 */
export const shouldSkipMigrations = async (): Promise<{ skip: boolean; reason?: string }> => {
  // 1. Explicit skip flags
  if (
    process.env.SKIP_MIGRATIONS === 'true' ||
    process.env.RUN_MIGRATIONS === 'false' ||
    process.env.DISABLE_MIGRATIONS === 'true' ||
    process.env.SUPABASE_EXISTING_DB === 'true'
  ) {
    return {
      skip: true,
      reason: 'Automated migrations skipped via configuration flag (SKIP_MIGRATIONS=true / RUN_MIGRATIONS=false / SUPABASE_EXISTING_DB=true).'
    };
  }

  const isSupabase = isSupabaseDatabase();

  // 2. Allow unit tests and in-memory fallbacks to run unless connected to Supabase
  if (!isSupabase && (process.env.NODE_ENV === 'test' || isMemFallbackActive())) {
    return { skip: false };
  }

  try {
    const { exists, tables, publicCount } = await hasExistingTables();

    // 3. Supabase existing database detection
    if (isSupabase) {
      if (tables.length > 0) {
        return {
          skip: true,
          reason: `Existing database in Supabase detected (found existing tables: ${tables.join(', ')}). Bypassing automated migrations to preserve existing schema and data.`
        };
      }
      if (publicCount > 0) {
        return {
          skip: true,
          reason: `Existing database in Supabase detected with ${publicCount} public table(s). Bypassing automated migrations to prevent schema conflicts.`
        };
      }
    }

    // 4. Non-Supabase: Core tables already present without migration tracker
    if (tables.includes('users') && tables.includes('documents') && !tables.includes('schema_migrations')) {
      return {
        skip: true,
        reason: 'Existing database with core tables (users, documents) detected without migration history table. Bypassing migrations to prevent table collision.'
      };
    }
  } catch (checkErr: any) {
    console.warn('[Migration] Warning while inspecting database schema:', checkErr?.message || checkErr);
  }

  return { skip: false };
};

export const runMigrations = async (): Promise<void> => {
  const skipCheck = await shouldSkipMigrations();
  if (skipCheck.skip) {
    console.log(`[Migration] ${skipCheck.reason}`);
    return;
  }

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
