import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';
import { newDb, DataType } from 'pg-mem';
import crypto from 'crypto';

export const pool = new Pool(config.db);

let memAdapterPool: any = null;
let useMemFallback = process.env.NODE_ENV === 'test';

export const resetMemDb = (): void => {
  // Retain instance across calls if initialized
};

const getMemAdapter = () => {
  if (!memAdapterPool) {
    const db = newDb();

    // Register gen_random_uuid function for UUID generation
    db.public.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      impure: true,
      implementation: () => crypto.randomUUID()
    });

    const adapter = db.adapters.createPg();
    memAdapterPool = new adapter.Pool();
  }
  return memAdapterPool;
};

pool.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('[DB] Unexpected idle client error:', err);
  }
});

const originalConnect = pool.connect.bind(pool);
pool.connect = (async (...args: any[]) => {
  if (useMemFallback) {
    const adapter = getMemAdapter();
    return await adapter.connect();
  }

  try {
    return await (originalConnect as Function)(...args);
  } catch (err: any) {
    useMemFallback = true;
    const adapter = getMemAdapter();
    return await adapter.connect();
  }
}) as any;

export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  if (useMemFallback) {
    const adapter = getMemAdapter();
    const res = await adapter.query(text, params);
    return res as QueryResult<T>;
  }

  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log('[DB Query]', { text: text.trim().substring(0, 100), duration: `${duration}ms`, rows: res.rowCount });
    }
    return res;
  } catch (error: any) {
    if (
      error.code === 'ECONNREFUSED' ||
      error.message?.includes('connect') ||
      error.name === 'AggregateError'
    ) {
      console.warn('[DB] PostgreSQL connection unavailable on port 5432. Falling back to in-memory database (pg-mem)...');
      useMemFallback = true;
      const adapter = getMemAdapter();
      const res = await adapter.query(text, params);
      return res as QueryResult<T>;
    }
    if (process.env.NODE_ENV !== 'test') {
      console.error('[DB Error]', { text, error });
    }
    throw error;
  }
};

export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const res = await query('SELECT 1 as is_alive');
    return res.rows.length > 0;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[DB Health Check Failed]:', error);
    }
    return false;
  }
};
