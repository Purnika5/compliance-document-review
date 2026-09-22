import { isSupabaseDatabase, shouldSkipMigrations } from '../src/db/migrate';
import { shouldSkipSeeding } from '../src/db/seed';

describe('Supabase Existing Database & Migration Bypass Gate', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isSupabaseDatabase()', () => {
    it('detects Supabase pooler URL in DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgresql://postgres.example:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
      expect(isSupabaseDatabase()).toBe(true);
    });

    it('detects Supabase direct domain in DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgresql://postgres:secret@db.abcxyz.supabase.co:5432/postgres';
      expect(isSupabaseDatabase()).toBe(true);
    });

    it('detects Supabase in SUPABASE_DB_URL', () => {
      delete process.env.DATABASE_URL;
      process.env.SUPABASE_DB_URL = 'postgresql://postgres:secret@db.abcxyz.supabase.co:5432/postgres';
      expect(isSupabaseDatabase()).toBe(true);
    });

    it('detects Supabase in DB_HOST', () => {
      delete process.env.DATABASE_URL;
      delete process.env.SUPABASE_DB_URL;
      process.env.DB_HOST = 'db.abcxyz.supabase.co';
      expect(isSupabaseDatabase()).toBe(true);
    });

    it('returns false for local postgres', () => {
      delete process.env.DATABASE_URL;
      delete process.env.SUPABASE_DB_URL;
      delete process.env.SUPABASE_URL;
      process.env.DB_HOST = 'localhost';
      expect(isSupabaseDatabase()).toBe(false);
    });
  });

  describe('shouldSkipMigrations()', () => {
    it('skips migrations when SKIP_MIGRATIONS=true', async () => {
      process.env.SKIP_MIGRATIONS = 'true';
      const check = await shouldSkipMigrations();
      expect(check.skip).toBe(true);
      expect(check.reason).toContain('configuration flag');
    });

    it('skips migrations when RUN_MIGRATIONS=false', async () => {
      process.env.RUN_MIGRATIONS = 'false';
      const check = await shouldSkipMigrations();
      expect(check.skip).toBe(true);
      expect(check.reason).toContain('configuration flag');
    });

    it('skips migrations when SUPABASE_EXISTING_DB=true', async () => {
      process.env.SUPABASE_EXISTING_DB = 'true';
      const check = await shouldSkipMigrations();
      expect(check.skip).toBe(true);
      expect(check.reason).toContain('SUPABASE_EXISTING_DB=true');
    });

    it('skips migrations in production mode if Supabase database has existing tables', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://postgres:secret@db.abcxyz.supabase.co:5432/postgres';

      const dbPool = require('../src/db/pool');
      const querySpy = jest.spyOn(dbPool, 'query').mockImplementation((async (...args: any[]) => {
        const text = args[0] || '';
        if (typeof text === 'string' && text.includes('information_schema.tables')) {
          return { rows: [{ table_name: 'users' }, { table_name: 'documents' }] } as any;
        }
        return { rows: [] } as any;
      }) as any);

      const check = await shouldSkipMigrations();
      querySpy.mockRestore();

      expect(check.skip).toBe(true);
      expect(check.reason).toContain('Existing database in Supabase detected');
    });
  });

  describe('shouldSkipSeeding()', () => {
    it('skips seeding when SKIP_SEEDING=true', async () => {
      process.env.SKIP_SEEDING = 'true';
      const check = await shouldSkipSeeding();
      expect(check.skip).toBe(true);
      expect(check.reason).toContain('SKIP_SEEDING=true');
    });

    it('skips seeding when SEED_DATABASE=false', async () => {
      process.env.SEED_DATABASE = 'false';
      const check = await shouldSkipSeeding();
      expect(check.skip).toBe(true);
      expect(check.reason).toContain('SEED_DATABASE=false');
    });

    it('skips seeding when SUPABASE_EXISTING_DB=true', async () => {
      process.env.SUPABASE_EXISTING_DB = 'true';
      const check = await shouldSkipSeeding();
      expect(check.skip).toBe(true);
      expect(check.reason).toContain('SUPABASE_EXISTING_DB=true');
    });

    it('skips mock seeding automatically when target is Supabase database', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://postgres:secret@db.abcxyz.supabase.co:5432/postgres';

      const check = await shouldSkipSeeding();
      expect(check.skip).toBe(true);
      expect(check.reason).toContain('Supabase database detected');
    });

    it('permits seeding on Supabase if FORCE_SEED=true', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://postgres:secret@db.abcxyz.supabase.co:5432/postgres';
      process.env.FORCE_SEED = 'true';

      const check = await shouldSkipSeeding();
      expect(check.skip).toBe(false);
    });
  });
});
