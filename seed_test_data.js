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
    console.log("Adding user...");
    await pool.query(`
      INSERT INTO users (id, email, full_name, password_hash, age, height_cm, weight_kg, goal_weight_kg, gender, bmr, daily_calorie_target)
      VALUES ('test-deneme-uuid-1', 'deneme@diyet.com', 'Test Kilo Veren', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 25, 175, 80.0, 70.0, 'male', 1800, 1500)
      ON DUPLICATE KEY UPDATE full_name='Test Kilo Veren';
    `);
    console.log("User added.");

    console.log("Adding daily logs...");
    const values = [
      ['2026-04-02', 1500, 2100], ['2026-04-03', 1450, 2150], ['2026-04-04', 1600, 2050],
      ['2026-04-05', 1520, 2100], ['2026-04-06', 1480, 2200], ['2026-04-07', 1550, 2100],
      ['2026-04-08', 1400, 2300], ['2026-04-09', 1650, 2000], ['2026-04-10', 1500, 2100],
      ['2026-04-11', 1450, 2150], ['2026-04-12', 1700, 2050], ['2026-04-13', 1520, 2100],
      ['2026-04-14', 1480, 2200], ['2026-04-15', 1550, 2100], ['2026-04-16', 1400, 2300],
      ['2026-04-17', 1650, 2000], ['2026-04-18', 1500, 2100], ['2026-04-19', 1450, 2150],
      ['2026-04-20', 1600, 2050], ['2026-04-21', 1520, 2100], ['2026-04-22', 1480, 2200],
      ['2026-04-23', 1550, 2100], ['2026-04-24', 1400, 2300], ['2026-04-25', 1650, 2000],
      ['2026-04-26', 1500, 2100], ['2026-04-27', 1450, 2150], ['2026-04-28', 1600, 2050],
      ['2026-04-29', 1520, 2100], ['2026-04-30', 1480, 2200], ['2026-05-01', 1550, 2100]
    ];

    for (const val of values) {
      await pool.query(`
        INSERT INTO daily_logs (id, user_id, log_date, total_calories_consumed, total_calories_burned)
        VALUES (UUID(), 'test-deneme-uuid-1', ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          total_calories_consumed = VALUES(total_calories_consumed),
          total_calories_burned = VALUES(total_calories_burned)
      `, [val[0], val[1], val[2]]);
    }
    console.log("Daily logs added.");

  } catch(e) {
    console.log("HATA: " + e.message);
  }

  process.exit(0);
}
run();
