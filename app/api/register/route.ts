// app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      full_name,
      email,
      password,
      age,
      height_cm,
      weight_kg,
      gender,
      activity_level = 1.375, // hafif aktif (varsayılan)
    } = body;

    // Zorunlu alan kontrolü
    if (!full_name || !email || !password || !age || !height_cm || !weight_kg || !gender) {
      return NextResponse.json(
        { success: false, error: "Tüm alanlar zorunludur." },
        { status: 400 }
      );
    }

    // E-posta benzersizlik kontrolü
    const [existing] = await pool.execute<any[]>(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    if ((existing as any[]).length > 0) {
      return NextResponse.json(
        { success: false, error: "Bu e-posta adresi zaten kullanımda." },
        { status: 409 }
      );
    }

    // Şifre hash'leme
    const password_hash = await bcryptjs.hash(password, 12);

    // BMR — Mifflin-St Jeor Denklemi
    const w = Number(weight_kg);
    const h = Number(height_cm);
    const a = Number(age);
    const bmr = Math.round(
      gender === "male"
        ? 10 * w + 6.25 * h - 5 * a + 5
        : 10 * w + 6.25 * h - 5 * a - 161
    );

    const daily_calorie_target = Math.round(bmr * Number(activity_level));

    // Kullanıcıyı kaydet
    await pool.execute(
      `INSERT INTO users
         (id, email, full_name, password_hash, age, height_cm, weight_kg,
          gender, bmr, daily_calorie_target, activity_level)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email, full_name, password_hash,
        a, h, w, gender,
        bmr, daily_calorie_target, Number(activity_level),
      ]
    );

    return NextResponse.json(
      { success: true, data: { bmr, daily_calorie_target } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/register]", err);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
