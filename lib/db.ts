import { Pool, QueryResult, PoolClient } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __socrmPool: Pool | undefined;
}

function createPool() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // สำคัญสำหรับ Vercel / serverless: อย่าเปิด connection ไว้เยอะเกินจำเป็น
    max: process.env.NODE_ENV === 'production' ? 5 : 10,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
  });

  pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err);
  });

  return pool;
}

const pool = global.__socrmPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  global.__socrmPool = pool;
}

function isRetryableDbError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();

  return (
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === '57P01' ||
    message.includes('connection terminated unexpectedly') ||
    message.includes('connection terminated due to connection timeout') ||
    message.includes('terminating connection')
  );
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const start = Date.now();

  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { duration, rows: res.rowCount });
    return res;
  } catch (error: any) {
    if (isRetryableDbError(error)) {
      console.warn('Retrying PostgreSQL query after transient error:', error?.message || error);
      await sleep(300);
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query after retry', { duration, rows: res.rowCount });
      return res;
    }

    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export default pool;
