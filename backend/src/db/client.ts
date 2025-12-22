import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in .env file');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 60000, // Aumentado para 60s (NeonDB cold start)
  keepAlive: true, // Mantém a conexão viva
});

// Tratamento de erro no pool para evitar crash do backend
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // Não lança erro, apenas loga. O pool tentará reconectar.
});

export const db = {
  query: async (text: string, params?: any[]): Promise<QueryResult> => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      return res;
    } catch (error) {
      console.error('Error executing query', { text, error });
      throw error;
    }
  },
  getClient: async () => {
    const client = await pool.connect();
    return client;
  }
};