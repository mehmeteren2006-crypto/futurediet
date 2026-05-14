// app/api/chat/route.ts
// Ana AI Chat Endpoint — Diet Assistant
// Akış: İstek Al → Bağlam Yükle → Geçmiş Yükle → Prompt Oluştur → LLM Çağır → Kaydet → Döndür

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import OpenAI from "openai";
import type { UserContext } from "@/lib/types";

// Ollama yerel sunucusuna bağlan — OpenAI SDK'nın baseURL override özelliği kullanılır.
// Ollama bir API anahtarı gerektirmez; SDK zorunlu kıldığı için sabit bir değer verilir.
const openai = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1",
  apiKey:  "ollama", // Ollama bu değeri doğrulamaz, sadece SDK için gerekli
});

// Ollama'da çalışan model adı — `ollama list` komutuyla listelenebilir
const MODEL = process.env.OLLAMA_MODEL ?? "qwen";

// ─────────────────────────────────────────────────────────────
// YARDIMCI: Kullanıcı bağlamını + bugünkü yemekleri tek sorguda çek
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// YARDIMCI: Kullanıcı bağlamını + bugünkü yemekleri tek sorguda çek
// ─────────────────────────────────────────────────────────────
async function fetchUserContext(userId: string): Promise<UserContext | null> {
  const [rows] = await pool.execute<any[]>(
    `
    SELECT
      u.full_name,
      u.age,
      u.gender,
      u.weight_kg,
      u.height_cm,
      u.bmr,
      u.daily_calorie_target,
      u.dietary_preferences,
      u.sleep_start_time,
      u.sleep_end_time,
      u.activity_level,
      dl.total_calories_consumed,
      dl.total_calories_burned,
      dl.step_count,
      dl.sleep_duration_hrs,
      CONCAT(
        '[',
        COALESCE(
          GROUP_CONCAT(
            JSON_OBJECT(
              'meal',    m.meal_name,
              'type',    m.meal_type,
              'kcal',    m.total_calories,
              'protein', m.protein_g,
              'carbs',   m.carbs_g,
              'fat',     m.fat_g,
              'source',  m.entry_source
            )
            ORDER BY m.logged_at ASC
            SEPARATOR ','
          ),
          ''
        ),
        ']'
      ) AS meals_today
    FROM users u
    LEFT JOIN daily_logs dl
           ON dl.user_id = u.id
          AND dl.log_date = CURDATE()
    LEFT JOIN meals m
           ON m.daily_log_id = dl.id
    WHERE u.id = ?
    GROUP BY
      u.id, u.full_name, u.age, u.gender, u.weight_kg, u.height_cm,
      u.bmr, u.daily_calorie_target, u.dietary_preferences,
      u.sleep_start_time, u.sleep_end_time, u.activity_level,
      dl.id, dl.total_calories_consumed, dl.total_calories_burned,
      dl.step_count, dl.sleep_duration_hrs
    LIMIT 1
    `,
    [userId]
  );
  return rows.length > 0 ? (rows[0] as UserContext) : null;
}

// ─────────────────────────────────────────────────────────────
// YARDIMCI: Son N mesajı kronolojik sırayla getir
// ─────────────────────────────────────────────────────────────
async function fetchChatHistory(userId: string, limit = 10) {
  const [rows] = await pool.execute<any[]>(
    `
    SELECT sender_type, message_content
    FROM (
      SELECT sender_type, message_content, created_at
      FROM chat_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    ) AS recent
    ORDER BY recent.created_at ASC
    `,
    [userId, limit]
  );
  return rows as { sender_type: "user" | "ai"; message_content: string }[];
}

// ─────────────────────────────────────────────────────────────
// YARDIMCI: Kişiselleştirilmiş sistem promptunu oluştur
// ─────────────────────────────────────────────────────────────
function buildSystemPrompt(ctx: UserContext): string {
  const consumed  = ctx.total_calories_consumed ?? 0;
  const burned    = ctx.total_calories_burned   ?? 0;
  const remaining = Math.max(0, ctx.daily_calorie_target - consumed + burned);

  let preferences = "None specified";
  try {
    const prefs = JSON.parse(ctx.dietary_preferences ?? "[]");
    if (Array.isArray(prefs) && prefs.length > 0) preferences = prefs.join(", ");
  } catch { /* ignore */ }

  let mealsText = "None logged yet.";
  try {
    const meals = JSON.parse(ctx.meals_today);
    if (Array.isArray(meals) && meals.length > 0) mealsText = JSON.stringify(meals);
  } catch { /* ignore */ }

  const firstName = ctx.full_name.split(" ")[0];

  // Few-Shot prompting: concrete worked example so Qwen stops printing placeholders.
  return `You are a highly capable AI Dietitian.
User Name: ${ctx.full_name}
Daily Calorie Target: ${ctx.daily_calorie_target} kcal
Remaining Calories Today: ${remaining} kcal
Dietary Preferences: ${preferences}
Today's Meals So Far: ${mealsText}

TASK: Whenever the user asks for a diet, menu, or food recommendation, you MUST reply with a specific menu. DO NOT use abstract placeholders like [food name] or [kcal]. Give REAL food names and REAL calorie numbers that add up close to the user's ${ctx.daily_calorie_target} kcal daily target.

EXAMPLE OF A PERFECT RESPONSE (copy this style exactly, but adapt foods and calories to fit ${ctx.daily_calorie_target} kcal):
"Merhaba ${firstName}! İşte bugünkü hedefine uygun, lezzetli menün:
🍳 Sabah: 3 haşlanmış yumurta, 50g lor peyniri, 2 dilim tam buğday ekmeği, domates - 450 kcal
🥗 Öğle: 150g ızgara tavuk göğsü, 1 porsiyon karabuğday pilavı, bol yeşillikli salata - 600 kcal
🥩 Akşam: 200g fırın somon, haşlanmış brokoli, 1 kase yoğurt - 750 kcal
🍎 Ara Öğün: 1 avuç ceviz, 1 adet yeşil elma - 200 kcal
🔥 Toplam: Yaklaşık 2000 kcal. Afiyet olsun!"

STRICT RULE: Answer the user's message IN TURKISH ONLY. Do not write anything in English.`.trim();
}

// ─────────────────────────────────────────────────────────────
// YARDIMCI: Her iki mesajı tek INSERT ile kaydet
// ─────────────────────────────────────────────────────────────
async function saveMessages(
  userId:     string,
  dailyLogId: string | null,
  userMsg:    string,
  aiMsg:      string
): Promise<void> {
  const estimateTokens = (t: string) => Math.ceil(t.split(/\s+/).length * 1.3);
  await pool.execute(
    `
    INSERT INTO chat_history
      (id, user_id, daily_log_id, message_content, sender_type, token_count, model_version)
    VALUES
      (UUID(), ?, ?, ?, 'user', ?, ?),
      (UUID(), ?, ?, ?, 'ai',   ?, ?)
    `,
    [
      userId, dailyLogId, userMsg, estimateTokens(userMsg), MODEL,
      userId, dailyLogId, aiMsg,   estimateTokens(aiMsg),   MODEL,
    ]
  );
}

// ─────────────────────────────────────────────────────────────
// POST /api/chat
// Body: { userId: string, message: string }
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // userId artık client'tan dinamik olarak geliyor
    const { userId, message } = body as { userId?: string; message?: string };

    if (!userId || !message?.trim()) {
      return NextResponse.json(
        { success: false, error: "userId ve message zorunludur." },
        { status: 400 }
      );
    }

    // 1. Kullanıcı bağlamı
    const userCtx = await fetchUserContext(userId);
    if (!userCtx) {
      return NextResponse.json(
        { success: false, error: "Kullanıcı bulunamadı." },
        { status: 404 }
      );
    }

    // 2. Sohbet geçmişi
    const history = await fetchChatHistory(userId, 10);

    // 3. System prompt
    const systemPrompt = buildSystemPrompt(userCtx);

    // 4. OpenAI mesaj dizisi
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.map((h) => ({
        role:    h.sender_type === "user" ? "user" : "assistant",
        content: h.message_content,
      } as OpenAI.Chat.ChatCompletionMessageParam)),
      { role: "user", content: message.trim() },
    ];

    // 5. LLM çağrısı
    // temperature: 0.6 — few-shot örnekli promptlarda daha düşük sıcaklık
    // tutarlı ve şablona sadık çıktı üretir.
    const completion = await openai.chat.completions.create({
      model:             MODEL,
      messages,
      temperature:       0.6,
      max_tokens:        700,
      frequency_penalty: 0.5,
      presence_penalty:  0.5,
    });
    const aiResponse =
      completion.choices[0]?.message?.content?.trim() ??
      "Üzgünüm, bir yanıt oluşturulamadı.";

    // 6. Daily log ID'yi bul
    const [logRows] = await pool.execute<any[]>(
      `SELECT id FROM daily_logs WHERE user_id = ? AND log_date = CURDATE() LIMIT 1`,
      [userId]
    );
    const dailyLogId: string | null = logRows[0]?.id ?? null;

    // 7. Her iki mesajı kaydet
    await saveMessages(userId, dailyLogId, message.trim(), aiResponse);

    // 8. Yanıtı döndür
    const consumed  = userCtx.total_calories_consumed ?? 0;
    const burned    = userCtx.total_calories_burned   ?? 0;
    const remaining = Math.max(0, userCtx.daily_calorie_target - consumed + burned);

    return NextResponse.json({
      success:  true,
      response: aiResponse,
      meta: {
        calories_remaining: remaining,
        step_count:         userCtx.step_count ?? 0,
        meals_logged: (() => {
          try { return JSON.parse(userCtx.meals_today).length; } catch { return 0; }
        })(),
      },
    });
  } catch (err) {
    console.error("[POST /api/chat]", err);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}

// GET /api/chat?userId=xxx&limit=20  — Sohbet geçmişini listele
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const limit  = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId gerekli." },
        { status: 400 }
      );
    }

    const [rows] = await pool.execute<any[]>(
      `
      SELECT id, sender_type, message_content, model_version, created_at
      FROM chat_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [userId, limit]
    );

    return NextResponse.json({ success: true, data: rows.reverse() });
  } catch (err) {
    console.error("[GET /api/chat]", err);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
