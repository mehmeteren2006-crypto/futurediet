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
    const hash = "$2b$10$9n4vfTbTTdJnC0GGSaytD.X6BwwjeUbPZOhyGIf17T6udZO.nOQdu"; // 123456
    await pool.query(`UPDATE users SET password_hash = ? WHERE email = ?`, [hash, 'deneme@diyet.com']);
    console.log("SUCCESS: Password hash updated to 123456");
  } catch(e) {
    console.log("HATA: " + e.message);
  }

  process.exit(0);
}
run();
