import { configDotenv } from 'dotenv';
import { neon } from '@neondatabase/serverless';

configDotenv();

if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL não encontrada no arquivo .env');
}

export const sql = neon(process.env.DATABASE_URL);

//teste de conexão
(async () => {
  try {
    const result = await sql`SELECT NOW()`;
    console.log('✅ Conexão com o banco estabelecida:', result[0].now);
  } catch (error) {
    console.error('❌ Erro ao conectar no banco:', error);
  }
})();
