import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Verificranje da radi
export async function testDbConnection() {
  await pool.query("SELECT 1");
  console.log("DB connected");
}

export default pool;
