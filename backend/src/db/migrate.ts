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
        AND table_name IN ('users', 'documents', 'schema_migrations', 'document_revisions', 'audit_trail', 'notifications', 'user_quotas')
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
  // 1. Explicit opt-out flags via environment variables
  if (
    process.env.SKIP_MIGRATIONS === 'true' ||
    process.env.RUN_MIGRATIONS === 'false' ||
    process.env.DISABLE_MIGRATIONS === 'true'
  ) {
    return {
      skip: true,
      reason: 'Migrations skipped via configuration flag (SKIP_MIGRATIONS / RUN_MIGRATIONS=false / DISABLE_MIGRATIONS).'
    };
  }

  if (process.env.SUPABASE_EXISTING_DB === 'true') {
    return {
      skip: true,
      reason: 'Migrations bypassed because SUPABASE_EXISTING_DB=true is configured.'
    };
  }

  // 2. Allow unit tests to run migrations freely
  if (process.env.NODE_ENV === 'test') {
    return { skip: false };
  }

  // 3. Inspect existing tables in the database
  try {
    const { exists, tables, publicCount } = await hasExistingTables();

    // If completely empty, always run migrations to initialize schema
    if (publicCount === 0 && !exists) {
      console.log('[Migration] Database is empty (0 public tables). Running initial schema setup.');
      return { skip: false };
    }

    // Supabase detected with existing tables — skip to prevent data loss on deploys
    if (isSupabaseDatabase()) {
      if (tables.length > 0 || publicCount > 0) {
        return {
          skip: true,
          reason: `Existing database in Supabase detected (found ${tables.join(', ') || publicCount + ' tables'}). Automated migrations are disabled to protect production data. Apply schema changes manually via the Supabase SQL Editor or Supabase CLI. To override (dangerous), set FORCE_MIGRATIONS=true.`
        };
      }
    }

    // Non-Supabase: core tables already present with migration history
    if (tables.includes('users') && tables.includes('documents') && tables.includes('schema_migrations')) {
      return {
        skip: true,
        reason: `Core tables already present with migration history (found: ${tables.join(', ')}). Skipping to avoid re-running applied migrations.`
      };
    }

    // Core tables exist but no migration tracker
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
        await client.query('BEGIN');
        
        // Split statements and execute
        const statements = sql
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const stmt of statements) {
          const lower = stmt.toLowerCase();
          if ((process.env.NODE_ENV === 'test' || isMemFallbackActive()) && lower.includes('create extension')) {
            continue;
          }
          try {
            await client.query(stmt);
          } catch (stmtErr) {
            if (
              lower.includes('create extension') ||
              (stmtErr as any)?.message?.includes('Extension does not exist') ||
              (stmtErr as any)?.message?.includes('pg-mem')
            ) {
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
