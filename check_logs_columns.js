const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v) env[k.trim()] = v.join('=').trim();
  });

  const pool = mysql.createPool({
    host: env.DB_HOST || 'localhost',
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'diet_assistant',
  });

  try {
    const [rows] = await pool.query('SHOW COLUMNS FROM daily_logs');
    console.log(rows.map(r => r.Field));
  } catch(e) {
    console.log(e.message);
  }

  process.exit(0);
}
run();
