import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('PostgreSQL database pool connected');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export default pool;
