const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 4000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined
  });

  const [r] = await pool.query("UPDATE past_papers SET status='publish' WHERE id=2");
  console.log('Update result:', r);

  const [[{ count }]] = await pool.query("SELECT COUNT(*) AS count FROM past_papers WHERE status='publish'");
  console.log('Published count:', count);

  await pool.end();
  process.exit(0);
})();