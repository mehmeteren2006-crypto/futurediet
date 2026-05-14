// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "E-posta ve şifre zorunludur." },
        { status: 400 }
      );
    }

    // Kullanıcıyı DB'den çek
    const [rows] = await pool.execute<any[]>(
      `SELECT
         id, email, full_name, password_hash,
         age, gender, weight_kg, height_cm,
         daily_calorie_target, bmr, activity_level
       FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    if ((rows as any[]).length === 0) {
      // Timing attack'ı önlemek için yanlış şifre hash'i de karşılaştır
      await bcryptjs.compare(password, "$2b$12$invalidhashfortimingprotection000000000000000");
      return NextResponse.json(
        { success: false, error: "E-posta veya şifre hatalı." },
        { status: 401 }
      );
    }

    const user = (rows as any[])[0];
    const match = await bcryptjs.compare(password, user.password_hash);

    if (!match) {
      return NextResponse.json(
        { success: false, error: "E-posta veya şifre hatalı." },
        { status: 401 }
      );
    }

    // password_hash'i yanıttan çıkar
    const { password_hash: _, ...safeUser } = user;

    return NextResponse.json({ success: true, data: safeUser });
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
