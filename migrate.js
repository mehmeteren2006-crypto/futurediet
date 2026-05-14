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
    await pool.query(`ALTER TABLE users ADD COLUMN goal_weight_kg DECIMAL(5,2) NULL AFTER weight_kg`);
    console.log("SUCCESS: Added goal_weight_kg");
  } catch(e) {
    console.log("SKIPPED goal_weight_kg: " + e.message);
  }
  
  const cols = [
    "password_hash VARCHAR(255) NULL",
    "age INT NULL",
    "height_cm DECIMAL(5,2) NULL",
    "weight_kg DECIMAL(5,2) NULL",
    "gender VARCHAR(10) NULL",
    "bmr INT NULL",
    "daily_calorie_target INT NULL"
  ];

  for (const col of cols) {
    const colName = col.split(' ')[0];
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN ${col}`);
      console.log(`SUCCESS: Added ${colName}`);
    } catch(e) {
      console.log(`SKIPPED ${colName}: ${e.message}`);
    }
  }

  process.exit(0);
}
run();
