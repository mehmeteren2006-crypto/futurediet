// app/api/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// GET /api/analytics?userId=xxx
// Returns energy balance & estimated weight change for Today / This Week / This Month
export async function GET(req: NextRequest) {
  try {
    const userId = new URL(req.url).searchParams.get("userId");
    if (!userId) return NextResponse.json({ success: false, error: "userId gerekli." }, { status: 400 });

    // ── 1. Fetch user BMR & calorie target ──────────────────────
    const [userRows] = await pool.execute<any[]>(
      `SELECT bmr, daily_calorie_target, activity_level, weight_kg FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    if (userRows.length === 0) return NextResponse.json({ success: false, error: "Kullanıcı bulunamadı." }, { status: 404 });

    const { bmr, daily_calorie_target, weight_kg } = userRows[0];

    // ── 2. TODAY ────────────────────────────────────────────────
    const [todayRows] = await pool.execute<any[]>(
      `SELECT
         COALESCE(SUM(total_calories_consumed), 0) AS consumed,
         COALESCE(SUM(total_calories_burned), 0)   AS burned
       FROM daily_logs
       WHERE user_id = ? AND log_date = CURDATE()`,
      [userId]
    );
    const today = todayRows[0];
    const todayBurned  = Number(today.burned);
    const todayNet     = Number(today.consumed) - todayBurned;
    const todayKg      = +(todayNet / 7700).toFixed(3);

    // ── 3. LAST 7 DAYS (Rolling) ──────────────────────────────
    const [weekRows] = await pool.execute<any[]>(
      `SELECT
         COALESCE(SUM(total_calories_consumed), 0) AS consumed,
         COALESCE(SUM(total_calories_burned), 0)   AS burned,
         COUNT(*)                                   AS days
       FROM daily_logs
       WHERE user_id = ?
         AND log_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
         AND log_date <= CURDATE()`,
      [userId]
    );
    const week = weekRows[0];
    const weekDays    = Math.max(1, week.days);
    const weekBurned  = Number(week.burned);
    const weekNet     = Number(week.consumed) - weekBurned;
    const weekKg      = +(weekNet / 7700).toFixed(3);

    // ── 4. LAST 30 DAYS (Rolling) ───────────────────────────────────────────
    const [monthRows] = await pool.execute<any[]>(
      `SELECT
         COALESCE(SUM(total_calories_consumed), 0) AS consumed,
         COALESCE(SUM(total_calories_burned), 0)   AS burned,
         COUNT(*)                                   AS days
       FROM daily_logs
       WHERE user_id = ?
         AND log_date >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
         AND log_date <= CURDATE()`,
      [userId]
    );
    const month = monthRows[0];
    const monthDays   = Math.max(1, month.days);
    const monthBurned = Number(month.burned);
    const monthNet    = Number(month.consumed) - monthBurned;
    const monthKg     = +(monthNet / 7700).toFixed(3);

    // ── 5. Last 7 days for mini chart ───────────────────────────
    const [chartRows] = await pool.execute<any[]>(
      `SELECT
         log_date,
         total_calories_consumed AS consumed,
         total_calories_burned AS burned
       FROM daily_logs
       WHERE user_id = ?
         AND log_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       ORDER BY log_date ASC`,
      [userId]
    );

    const chart = chartRows.map(r => ({
      date:     r.log_date,
      consumed: Number(r.consumed),
      burned:   Number(r.burned),
      net:      Number(r.consumed) - Number(r.burned),
    }));

    // ── 6. ALL TIME for Projected Weight ────────────────────────
    const [allTimeRows] = await pool.execute<any[]>(
      `SELECT
         COALESCE(SUM(total_calories_consumed), 0) AS consumed,
         COALESCE(SUM(total_calories_burned), 0)   AS burned,
         COUNT(*)                                   AS days
       FROM daily_logs
       WHERE user_id = ?`,
      [userId]
    );
    const allTime = allTimeRows[0];
    const allTimeDays   = Math.max(1, allTime.days);
    const allTimeBurned = Number(allTime.burned);
    const allTimeNet    = Number(allTime.consumed) - allTimeBurned;
    const projectedWeight = +(Number(weight_kg) + (allTimeNet / 7700)).toFixed(1);

    return NextResponse.json({
      success: true,
      data: {
        daily_calorie_target,
        bmr,
        projectedWeight,
        periods: [
          { label: "Bugün",       consumed: today.consumed, burned: todayBurned, net: todayNet, kg: todayKg,  days: 1 },
          { label: "Son 7 Gün",   consumed: week.consumed,  burned: weekBurned,  net: weekNet,  kg: weekKg,   days: weekDays },
          { label: "Son 30 Gün",  consumed: month.consumed, burned: monthBurned, net: monthNet, kg: monthKg,  days: monthDays },
        ],
        chart,
      },
    });
  } catch (err) {
    console.error("[GET /api/analytics]", err);
    return NextResponse.json({ success: false, error: "Sunucu hatası." }, { status: 500 });
  }
}
