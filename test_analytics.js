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
    const userId = 'test-deneme-uuid-1';
    
    // 1
    const [userRows] = await pool.execute(`SELECT bmr, daily_calorie_target, activity_level, weight_kg FROM users WHERE id = ? LIMIT 1`, [userId]);
    console.log("User:", userRows[0]);
    const { bmr, daily_calorie_target, weight_kg } = userRows[0];

    // 2
    const [todayRows] = await pool.execute(`SELECT COALESCE(SUM(total_calories_consumed), 0) AS consumed, COALESCE(SUM(total_calories_burned), 0) AS burned FROM daily_logs WHERE user_id = ? AND log_date = CURDATE()`, [userId]);
    console.log("Today:", todayRows[0]);

    // 3
    const [weekRows] = await pool.execute(`SELECT COALESCE(SUM(total_calories_consumed), 0) AS consumed, COALESCE(SUM(total_calories_burned), 0) AS burned, COUNT(*) AS days FROM daily_logs WHERE user_id = ? AND log_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AND log_date <= CURDATE()`, [userId]);
    console.log("Week:", weekRows[0]);

    // 4
    const [monthRows] = await pool.execute(`SELECT COALESCE(SUM(total_calories_consumed), 0) AS consumed, COALESCE(SUM(total_calories_burned), 0) AS burned, COUNT(*) AS days FROM daily_logs WHERE user_id = ? AND MONTH(log_date) = MONTH(CURDATE()) AND YEAR(log_date) = YEAR(CURDATE())`, [userId]);
    console.log("Month:", monthRows[0]);

    // 5
    const [chartRows] = await pool.execute(`SELECT log_date, total_calories_consumed AS consumed, total_calories_burned AS burned FROM daily_logs WHERE user_id = ? AND log_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) ORDER BY log_date ASC`, [userId]);
    console.log("Chart:", chartRows.length);

    // 6
    const [allTimeRows] = await pool.execute(`SELECT COALESCE(SUM(total_calories_consumed), 0) AS consumed, COALESCE(SUM(total_calories_burned), 0) AS burned, COUNT(*) AS days FROM daily_logs WHERE user_id = ?`, [userId]);
    console.log("All time:", allTimeRows[0]);

    const allTime = allTimeRows[0];
    const allTimeDays   = Math.max(1, allTime.days);
    const allTimeBurned = Number(allTime.burned);
    const allTimeNet    = Number(allTime.consumed) - allTimeBurned;
    const projectedWeight = +(weight_kg + (allTimeNet / 7700)).toFixed(1);
    console.log("Projected weight:", projectedWeight);

  } catch(e) {
    console.log("HATA:", e.message);
  }

  process.exit(0);
}
run();
