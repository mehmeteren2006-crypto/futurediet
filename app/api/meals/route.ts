// app/api/meals/route.ts
// Yemek CRUD — Vision AI veya manuel giriş

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// ─────────────────────────────────────────────────────────────
// POST /api/meals
// Yeni yemek ekle + daily_log'u güncelle (upsert)
// Body: { userId, meal_name, meal_type, total_calories, protein_g, carbs_g, fat_g, fiber_g?, image_url?, is_vegetarian?, entry_source? }
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const conn = await pool.getConnection();
  try {
    const body = await req.json();
    const {
      userId,
      meal_name,
      meal_type,
      total_calories,
      protein_g    = 0,
      carbs_g      = 0,
      fat_g        = 0,
      fiber_g      = 0,
      image_url    = null,
      is_vegetarian = false,
      entry_source  = "manual",
    } = body;

    if (!userId || !meal_name || !meal_type || total_calories == null) {
      return NextResponse.json(
        { success: false, error: "userId, meal_name, meal_type ve total_calories zorunludur." },
        { status: 400 }
      );
    }

    await conn.beginTransaction();

    // 1. Bugün için daily_log'u bul veya oluştur (UPSERT)
    await conn.execute(
      `
      INSERT INTO daily_logs (id, user_id, log_date)
      VALUES (UUID(), ?, CURDATE())
      ON DUPLICATE KEY UPDATE id = id
      `,
      [userId]
    );

    const [logRows] = await conn.execute<any[]>(
      `SELECT id FROM daily_logs WHERE user_id = ? AND log_date = CURDATE() LIMIT 1`,
      [userId]
    );
    const dailyLogId: string = logRows[0].id;

    // 2. Yemeği ekle
    await conn.execute(
      `
      INSERT INTO meals
        (id, daily_log_id, meal_name, meal_type, total_calories,
         protein_g, carbs_g, fat_g, fiber_g, image_url, is_vegetarian, entry_source)
      VALUES
        (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        dailyLogId, meal_name, meal_type, total_calories,
        protein_g, carbs_g, fat_g, fiber_g,
        image_url, is_vegetarian ? 1 : 0, entry_source,
      ]
    );

    // 3. daily_log toplam kalorilerini artır
    await conn.execute(
      `
      UPDATE daily_logs
      SET total_calories_consumed = total_calories_consumed + ?
      WHERE id = ?
      `,
      [total_calories, dailyLogId]
    );

    await conn.commit();

    // Güncel özeti tek sorguda döndür — frontend state'ini yeniden fetch'e gerek kalmadan günceller
    const [summary] = await pool.execute<any[]>(
      `SELECT
         dl.total_calories_consumed,
         dl.total_calories_burned,
         dl.step_count,
         u.daily_calorie_target
       FROM daily_logs dl
       INNER JOIN users u ON u.id = dl.user_id
       WHERE dl.id = ? LIMIT 1`,
      [dailyLogId]
    );

    const [mealList] = await pool.execute<any[]>(
      `SELECT id, meal_name, meal_type, total_calories, protein_g, carbs_g, fat_g, logged_at
       FROM meals WHERE daily_log_id = ? ORDER BY logged_at ASC`,
      [dailyLogId]
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          daily_log_id:    dailyLogId,
          summary:         summary[0] ?? null,
          meals:           mealList,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    await conn.rollback();
    console.error("[POST /api/meals]", err);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/meals?userId=xxx&date=YYYY-MM-DD
// Belirli günün yemeklerini listele
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
        m.id, m.meal_name, m.meal_type, m.total_calories,
        m.protein_g, m.carbs_g, m.fat_g, m.fiber_g,
        m.image_url, m.is_vegetarian, m.entry_source, m.logged_at
      FROM meals m
      INNER JOIN daily_logs dl ON dl.id = m.daily_log_id
      WHERE dl.user_id = ? AND dl.log_date = ?
      ORDER BY m.logged_at ASC
      `,
      [userId, date]
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error("[GET /api/meals]", err);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/meals?mealId=xxx&userId=xxx
// Yemeği sil + daily_log kalorisini geri al
// ─────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const conn = await pool.getConnection();
  try {
    const { searchParams } = new URL(req.url);
    const mealId = searchParams.get("mealId");
    const userId = searchParams.get("userId");

    if (!mealId || !userId) {
      return NextResponse.json(
        { success: false, error: "mealId ve userId gerekli." },
        { status: 400 }
      );
    }

    await conn.beginTransaction();

    // Silinecek yemeğin kalorisini al
    const [mealRows] = await conn.execute<any[]>(
      `SELECT total_calories, daily_log_id FROM meals WHERE id = ? LIMIT 1`,
      [mealId]
    );
    if (mealRows.length === 0) {
      await conn.rollback();
      return NextResponse.json(
        { success: false, error: "Yemek bulunamadı." },
        { status: 404 }
      );
    }

    const { total_calories, daily_log_id } = mealRows[0];

    // Yemeği sil
    await conn.execute(`DELETE FROM meals WHERE id = ?`, [mealId]);

    // daily_log kalorisini geri al
    await conn.execute(
      `
      UPDATE daily_logs
      SET total_calories_consumed = GREATEST(0, total_calories_consumed - ?)
      WHERE id = ?
      `,
      [total_calories, daily_log_id]
    );

    await conn.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error("[DELETE /api/meals]", err);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}
