// app/api/users/route.ts
// Kullanıcı kayıt ve profil yönetimi

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// BMR hesaplama — Harris-Benedict formülü
function calculateBMR(
  weight_kg: number,
  height_cm: number,
  age: number,
  gender: string
): number {
  if (gender === "male") {
    return Math.round(88.362 + 13.397 * weight_kg + 4.799 * height_cm - 5.677 * age);
  }
  return Math.round(447.593 + 9.247 * weight_kg + 3.098 * height_cm - 4.330 * age);
}

// ─────────────────────────────────────────────────────────────
// POST /api/users — Yeni kullanıcı kaydı
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      full_name,
      password_hash,
      age,
      height_cm,
      weight_kg,
      gender,
      dietary_preferences = [],
      sleep_start_time    = null,
      sleep_end_time      = null,
      activity_level      = 1.2,
    } = body;

    if (!email || !full_name || !password_hash || !age || !height_cm || !weight_kg || !gender) {
      return NextResponse.json(
        { success: false, error: "Zorunlu alanlar eksik." },
        { status: 400 }
      );
    }

    const bmr                  = calculateBMR(weight_kg, height_cm, age, gender);
    const daily_calorie_target = Math.round(bmr * activity_level);

    await pool.execute(
      `
      INSERT INTO users
        (id, email, full_name, password_hash, age, height_cm, weight_kg,
         gender, bmr, daily_calorie_target, dietary_preferences,
         sleep_start_time, sleep_end_time, activity_level)
      VALUES
        (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        email, full_name, password_hash, age, height_cm, weight_kg,
        gender, bmr, daily_calorie_target,
        JSON.stringify(dietary_preferences),
        sleep_start_time, sleep_end_time, activity_level,
      ]
    );

    return NextResponse.json(
      { success: true, data: { bmr, daily_calorie_target } },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { success: false, error: "Bu e-posta zaten kayıtlı." },
        { status: 409 }
      );
    }
    console.error("[POST /api/users]", err);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/users?userId=xxx — Kullanıcı profili
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const userId = new URL(req.url).searchParams.get("userId");

    // userId yoksa — Mock Login için tüm kullanıcıları listele
    if (!userId) {
      const [rows] = await pool.execute<any[]>(
        `SELECT id, full_name, email, age, gender, daily_calorie_target
         FROM users
         ORDER BY full_name ASC`
      );
      return NextResponse.json({ success: true, data: rows });
    }

    // userId varsa — tek kullanıcı profili döndür
    const [rows] = await pool.execute<any[]>(
      `SELECT
        id, email, full_name, age, height_cm, weight_kg, gender,
        bmr, daily_calorie_target, dietary_preferences,
        sleep_start_time, sleep_end_time, activity_level,
        created_at, updated_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Kullanıcı bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("[GET /api/users]", err);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/users — Profil güncelle (kısmi)
// ─────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const body   = await req.json();
    const userId = new URL(req.url).searchParams.get("userId") ?? body.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId gerekli." },
        { status: 400 }
      );
    }

    const allowed = [
      "full_name", "age", "height_cm", "weight_kg", "gender",
      "dietary_preferences", "sleep_start_time", "sleep_end_time", "activity_level",
    ];
    const updates: string[] = [];
    const values:  any[]    = [];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(
          key === "dietary_preferences" ? JSON.stringify(body[key]) : body[key]
        );
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "Güncellenecek alan yok." },
        { status: 400 }
      );
    }

    // BMR ve hedefi yeniden hesapla eğer fiziksel veriler değişmişse
    if (body.weight_kg || body.height_cm || body.age || body.gender || body.activity_level) {
      const [userRows] = await pool.execute<any[]>(
        `SELECT age, height_cm, weight_kg, gender, activity_level FROM users WHERE id = ? LIMIT 1`,
        [userId]
      );
      if (userRows.length > 0) {
        const u          = { ...userRows[0], ...body };
        const newBmr     = calculateBMR(u.weight_kg, u.height_cm, u.age, u.gender);
        const newTarget  = Math.round(newBmr * u.activity_level);
        updates.push("bmr = ?", "daily_calorie_target = ?");
        values.push(newBmr, newTarget);
      }
    }

    updates.push("updated_at = NOW()");
    values.push(userId);

    await pool.execute(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/users]", err);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
