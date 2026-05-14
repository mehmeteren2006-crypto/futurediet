// app/api/daily-logs/route.ts
// Günlük kayıt yönetimi — adım sayısı, uyku, kalori güncelleme

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// ─────────────────────────────────────────────────────────────
// GET /api/daily-logs?userId=xxx&date=YYYY-MM-DD
// Belirli günün özetini getir (AI context loader ile aynı mantık)
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const date   = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId gerekli." },
        { status: 400 }
      );
    }

    const [rows] = await pool.execute<any[]>(
      `
      SELECT
        dl.id,
        dl.log_date,
        dl.total_calories_consumed,
        dl.total_calories_burned,
        dl.step_count,
        dl.sleep_duration_hrs,
        dl.actual_sleep_start,
        dl.actual_sleep_end,
        u.daily_calorie_target,
        u.bmr,
        (u.daily_calorie_target - dl.total_calories_consumed + dl.total_calories_burned)
          AS net_calories_remaining
      FROM daily_logs dl
      INNER JOIN users u ON u.id = dl.user_id
      WHERE dl.user_id = ? AND dl.log_date = ?
      LIMIT 1
      `,
      [userId, date]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: true, data: null },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("[GET /api/daily-logs]", err);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/daily-logs — Adım sayısı, uyku veya kalori güncelle
// Body: { userId, step_count?, calories_burned?, sleep_start?, sleep_end? }
// ─────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const conn = await pool.getConnection();
  try {
    const body = await req.json();
    const {
      userId,
      step_count,
      calories_burned,
      sleep_start,
      sleep_end,
    } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId gerekli." },
        { status: 400 }
      );
    }

    await conn.beginTransaction();

    // Bugünkü log yoksa oluştur
    await conn.execute(
      `
      INSERT INTO daily_logs (id, user_id, log_date)
      VALUES (UUID(), ?, CURDATE())
      ON DUPLICATE KEY UPDATE id = id
      `,
      [userId]
    );

    const updates: string[] = [];
    const values:  any[]    = [];

    if (step_count != null) {
      // Adım sayısından ekstra kalori hesapla: ~0.04 kcal/adım (ortalama)
      const stepCalories = Math.round(step_count * 0.04);
      updates.push("step_count = ?", "total_calories_burned = total_calories_burned + ?");
      values.push(step_count, stepCalories);
    }

    if (calories_burned != null) {
      updates.push("total_calories_burned = total_calories_burned + ?");
      values.push(calories_burned);
    }

    if (sleep_start != null) {
      updates.push("actual_sleep_start = ?");
      values.push(sleep_start);
    }

    if (sleep_end != null) {
      updates.push("actual_sleep_end = ?");
      values.push(sleep_end);

      // Uyku süresini hesapla
      if (sleep_start != null) {
        const start     = new Date(sleep_start).getTime();
        const end       = new Date(sleep_end).getTime();
        const diffHrs   = parseFloat(((end - start) / 3_600_000).toFixed(2));
        updates.push("sleep_duration_hrs = ?");
        values.push(diffHrs);
      }
    }

    if (updates.length > 0) {
      values.push(userId);
      await conn.execute(
        `UPDATE daily_logs SET ${updates.join(", ")} WHERE user_id = ? AND log_date = CURDATE()`,
        values
      );
    }

    await conn.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error("[PATCH /api/daily-logs]", err);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/daily-logs/history?userId=xxx&days=7
// Son N günün istatistikleri (grafik için)
// ─────────────────────────────────────────────────────────────
export async function HEAD(req: NextRequest) {
  // /api/daily-logs/history rotası için geçici yer tutucu
  return new NextResponse(null, { status: 200 });
}
