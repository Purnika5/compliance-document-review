import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';

export const pool = new Pool(config.db);

pool.on('error', (err) => {
  console.error('[DB] Unexpected idle client error:', err);
});

export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (config.env === 'development') {
      console.log('[DB Query]', { text: text.trim().substring(0, 100), duration: `${duration}ms`, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[DB Error]', { text, error });
    }
    throw error;
  }
};

export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const res = await pool.query('SELECT 1 as is_alive');
    return res.rows.length > 0;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[DB Health Check Failed]:', error);
    }
    return false;
  }
};
