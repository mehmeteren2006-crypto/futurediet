"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── Canlı hesaplamalar ───────────────────────────────────────
function calcStats(weight: number, height: number, age: number, gender: string, activity: number) {
  if (!weight || !height || !age) return null;
  const bmi = weight / Math.pow(height / 100, 2);
  const bmr =
    gender === "male"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;
  const tdee       = Math.round(bmr * activity);
  const deficit    = Math.max(0, tdee - 500);
  const stepGoal   = Math.round(8000 + weight * 20);
  return { bmi: bmi.toFixed(1), bmr: Math.round(bmr), tdee, deficit, stepGoal };
}

// ── SVG İnsan Silueti ────────────────────────────────────────
function BodySVG({ hasHeight, hasWeight, hasAge }: {
  hasHeight: boolean; hasWeight: boolean; hasAge: boolean;
}) {
  return (
    <svg viewBox="0 0 160 390" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <filter id="cglow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="bodyfill" cx="50%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0"/>
        </radialGradient>
        <style>{`
          @keyframes scanline {
            0%   { transform: translateY(0px);   opacity: 0; }
            10%  { opacity: 0.7; }
            90%  { opacity: 0.7; }
            100% { transform: translateY(360px); opacity: 0; }
          }
          .scan { animation: scanline 4s ease-in-out infinite; }
        `}</style>
      </defs>

      {/* Scan line */}
      <rect className="scan" x="10" y="10" width="140" height="3"
        fill="url(#scanfill)" opacity="0"/>
      <defs>
        <linearGradient id="scanfill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#06b6d4" stopOpacity="0"/>
          <stop offset="50%"  stopColor="#06b6d4" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* ── Body outline ── */}
      <g filter="url(#cglow)" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">

        {/* Head */}
        <circle cx="80" cy="40" r="26" fill="url(#bodyfill)"
          stroke={hasAge ? "#4ade80" : "#22d3ee"} strokeWidth={hasAge ? "2" : "1.5"}/>

        {/* Neck */}
        <path d="M70,64 L68,78 M90,64 L92,78"/>

        {/* Torso */}
        <path d="M68,78 Q46,78 24,92 L22,210 Q50,220 80,218 Q110,220 138,210 L136,92 Q114,78 92,78 Z"
          fill="url(#bodyfill)" stroke={hasWeight ? "#4ade80" : "#22d3ee"} strokeWidth={hasWeight ? "2" : "1.5"}/>

        {/* Waist line highlight */}
        {hasWeight && (
          <line x1="22" y1="168" x2="138" y2="168"
            stroke="#4ade80" strokeWidth="1" strokeDasharray="5 3" opacity="0.7"/>
        )}

        {/* Height top marker */}
        {hasHeight && (
          <>
            <line x1="10" y1="14" x2="150" y2="14" stroke="#a78bfa" strokeWidth="1" strokeDasharray="4 3" opacity="0.6"/>
            <line x1="10" y1="376" x2="150" y2="376" stroke="#a78bfa" strokeWidth="1" strokeDasharray="4 3" opacity="0.6"/>
            <line x1="12" y1="14" x2="12" y2="376" stroke="#a78bfa" strokeWidth="1" opacity="0.4"/>
          </>
        )}

        {/* Left arm */}
        <path d="M24,98  Q4,140  8,196"/>
        <ellipse cx="9"   cy="206" rx="6" ry="10" transform="rotate(-12 9 206)"/>

        {/* Right arm */}
        <path d="M136,98 Q156,140 152,196"/>
        <ellipse cx="151" cy="206" rx="6" ry="10" transform="rotate(12 151 206)"/>

        {/* Left leg */}
        <path d="M62,218 Q58,295 54,368"/>
        <path d="M54,368 Q48,378 36,380"/>

        {/* Right leg */}
        <path d="M98,218 Q102,295 106,368"/>
        <path d="M106,368 Q112,378 124,380"/>
      </g>

      {/* Measurement dots */}
      {hasAge    && <circle cx="80" cy="14" r="4" fill="#4ade80" opacity="0.9"/>}
      {hasWeight && <circle cx="80" cy="168" r="5" fill="#4ade80" opacity="0.9"/>}
      {hasHeight && (
        <>
          <circle cx="12" cy="14"  r="3" fill="#a78bfa"/>
          <circle cx="12" cy="376" r="3" fill="#a78bfa"/>
        </>
      )}
    </svg>
  );
}

// ── Adım 1: Hesap Bilgileri ───────────────────────────────────
function Step1({
  data, setData, onNext, error,
}: {
  data: { full_name: string; email: string; password: string; confirm: string };
  setData: (d: any) => void;
  onNext: () => void;
  error: string;
}) {
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData((p: any) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-5">
      <div className="text-center mb-2">
        <div className="text-4xl mb-2">🥗</div>
        <h1 className="text-2xl font-bold text-white">Diet Assistant</h1>
        <p className="text-cyan-400 text-sm mt-1">Yeni hesap oluştur</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 justify-center">
        <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-xs font-bold text-slate-950">1</div>
        <div className="h-px w-16 bg-slate-700"/>
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">2</div>
      </div>
      <p className="text-center text-slate-400 text-xs -mt-2">Hesap Bilgileri</p>

      <div className="flex flex-col gap-3">
        {[
          { key: "full_name", label: "Ad Soyad",  type: "text",     placeholder: "Ahmet Yılmaz" },
          { key: "email",     label: "E-posta",    type: "email",    placeholder: "ahmet@mail.com" },
          { key: "password",  label: "Şifre",      type: "password", placeholder: "En az 8 karakter" },
          { key: "confirm",   label: "Şifre (tekrar)", type: "password", placeholder: "Şifreyi tekrar gir" },
        ].map(({ key, label, type, placeholder }) => (
          <div key={key}>
            <label className="text-slate-400 text-xs font-medium block mb-1">{label}</label>
            <input
              type={type}
              placeholder={placeholder}
              value={(data as any)[key]}
              onChange={set(key)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500 transition-colors placeholder-slate-600"
            />
          </div>
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-xs bg-red-950/60 border border-red-800 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        onClick={onNext}
        className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 rounded-xl transition-colors mt-1"
      >
        Devam Et →
      </button>

      <p className="text-center text-slate-600 text-xs">
        Zaten hesabın var mı?{" "}
        <Link href="/" className="text-cyan-400 hover:text-cyan-300">Giriş yap</Link>
      </p>
    </div>
  );
}

// ── Adım 2: Fiziksel Profil ───────────────────────────────────
function Step2({
  data, setData, onBack, onSubmit, submitting, error,
}: {
  data: { age: string; height_cm: string; weight_kg: string; gender: "male" | "female"; activity_level: string };
  setData: (d: any) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string;
}) {
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setData((p: any) => ({ ...p, [k]: e.target.value }));

  const stats = useMemo(() =>
    calcStats(
      Number(data.weight_kg), Number(data.height_cm),
      Number(data.age), data.gender, Number(data.activity_level)
    ),
    [data.weight_kg, data.height_cm, data.age, data.gender, data.activity_level]
  );

  const hasH = !!data.height_cm;
  const hasW = !!data.weight_kg;
  const hasA = !!data.age;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-5">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Fiziksel Profil</h2>
        <p className="text-slate-400 text-sm">Sağlıklı hedefler için verilerini gir</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 justify-center">
        <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-300">1</div>
        <div className="h-px w-16 bg-cyan-500"/>
        <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-xs font-bold text-slate-950">2</div>
      </div>
      <p className="text-center text-slate-400 text-xs -mt-2">Fiziksel Ölçüler</p>

      {/* 3-column body schema */}
      <div className="grid grid-cols-[1fr_180px_1fr] gap-4 items-center min-h-[380px]">

        {/* ── Sol: Boy ── */}
        <div className="flex flex-col items-end gap-6 pr-2">
          <div className="w-full">
            <label className="text-purple-400 text-xs font-semibold mb-1 flex items-center gap-1 justify-end">
              📏 Boy (cm)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="175"
                value={data.height_cm}
                onChange={set("height_cm")}
                className="flex-1 bg-slate-800 border border-purple-800 focus:border-purple-400 rounded-xl px-3 py-3 text-white text-sm outline-none transition-colors text-right placeholder-slate-600"
              />
              {/* connector line */}
              <div className="flex-none w-6 h-px border-t-2 border-dashed border-purple-500/50"/>
            </div>
          </div>

          {/* Gender */}
          <div className="w-full">
            <label className="text-slate-400 text-xs font-semibold mb-2 block text-right">Cinsiyet</label>
            <div className="flex justify-end gap-2">
              {(["male", "female"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setData((p: any) => ({ ...p, gender: g }))}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    data.gender === g
                      ? "bg-cyan-500 border-cyan-400 text-slate-950"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:border-cyan-600"
                  }`}
                >
                  {g === "male" ? "👨 Erkek" : "👩 Kadın"}
                </button>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="w-full">
            <label className="text-slate-400 text-xs font-semibold mb-1 block text-right">Aktivite Seviyesi</label>
            <select
              value={data.activity_level}
              onChange={set("activity_level")}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="1.2">🛋 Hareketsiz</option>
              <option value="1.375">🚶 Hafif Aktif</option>
              <option value="1.55">🏃 Orta Aktif</option>
              <option value="1.725">💪 Çok Aktif</option>
              <option value="1.9">🏆 Sporcu</option>
            </select>
          </div>
        </div>

        {/* ── Orta: SVG Siluet ── */}
        <div className="relative flex items-center justify-center">
          <div className="w-[160px] h-[390px]">
            <BodySVG hasHeight={hasH} hasWeight={hasW} hasAge={hasA}/>
          </div>
        </div>

        {/* ── Sağ: Kilo + Yaş + İstatistikler ── */}
        <div className="flex flex-col gap-4 pl-2">

          {/* Weight */}
          <div>
            <label className="text-green-400 text-xs font-semibold mb-1 flex items-center gap-1">
              <span className="w-4 h-px border-t-2 border-dashed border-green-500/50 inline-block"/>
              ⚖️ Kilo (kg)
            </label>
            <input
              type="number"
              placeholder="75"
              value={data.weight_kg}
              onChange={set("weight_kg")}
              className="w-full bg-slate-800 border border-green-900 focus:border-green-400 rounded-xl px-3 py-3 text-white text-sm outline-none transition-colors placeholder-slate-600"
            />
          </div>

          {/* Age */}
          <div>
            <label className="text-cyan-400 text-xs font-semibold mb-1 flex items-center gap-1">
              <span className="w-4 h-px border-t-2 border-dashed border-cyan-500/50 inline-block"/>
              🎂 Yaş
            </label>
            <input
              type="number"
              placeholder="28"
              value={data.age}
              onChange={set("age")}
              className="w-full bg-slate-800 border border-cyan-900 focus:border-cyan-400 rounded-xl px-3 py-3 text-white text-sm outline-none transition-colors placeholder-slate-600"
            />
          </div>

          {/* Live stats */}
          <div className={`rounded-xl border p-3 transition-all duration-300 ${
            stats ? "bg-slate-800/80 border-cyan-900" : "bg-slate-900 border-slate-800 opacity-50"
          }`}>
            <p className="text-cyan-400 text-xs font-bold mb-2">📊 Tahmini Hedefler</p>
            {stats ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">BMI</span>
                  <span className={`text-xs font-bold ${
                    Number(stats.bmi) < 18.5 ? "text-blue-400" :
                    Number(stats.bmi) < 25   ? "text-green-400" :
                    Number(stats.bmi) < 30   ? "text-yellow-400" : "text-red-400"
                  }`}>{stats.bmi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">BMR</span>
                  <span className="text-white text-xs font-bold">{stats.bmr} kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">Günlük Hedef</span>
                  <span className="text-cyan-400 text-xs font-bold">{stats.tdee} kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">Zayıflama Hedefi</span>
                  <span className="text-green-400 text-xs font-bold">{stats.deficit} kcal</span>
                </div>
                <div className="h-px bg-slate-700 my-1"/>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">Günlük Adım</span>
                  <span className="text-purple-400 text-xs font-bold">{stats.stepGoal.toLocaleString("tr-TR")} 👟</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-600 text-xs">Bilgileri doldur...</p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-xs bg-red-950/60 border border-red-800 rounded-lg px-3 py-2 text-center">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-colors border border-slate-700"
        >
          ← Geri
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold py-3 rounded-xl transition-colors"
        >
          {submitting ? "Kaydediliyor..." : "🚀 Hesap Oluştur"}
        </button>
      </div>
    </div>
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep]         = useState<1 | 2>(1);
  const [error, setError]       = useState("");
  const [submitting, setSub]    = useState(false);

  const [step1, setStep1] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [step2, setStep2] = useState({
    age: "", height_cm: "", weight_kg: "",
    gender: "male" as "male" | "female",
    activity_level: "1.375",
  });

  const goToStep2 = () => {
    setError("");
    if (!step1.full_name || !step1.email || !step1.password) { setError("Tüm alanlar zorunludur."); return; }
    if (step1.password.length < 8) { setError("Şifre en az 8 karakter olmalıdır."); return; }
    if (step1.password !== step1.confirm) { setError("Şifreler eşleşmiyor."); return; }
    if (!step1.email.includes("@")) { setError("Geçerli bir e-posta girin."); return; }
    setStep(2);
  };

  const handleSubmit = async () => {
    setError("");
    if (!step2.age || !step2.height_cm || !step2.weight_kg) { setError("Tüm fiziksel alanlar zorunludur."); return; }

    setSub(true);
    try {
      const res = await fetch("/api/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...step1, ...step2 }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/?registered=1");
      } else {
        setError(data.error ?? "Bir hata oluştu.");
      }
    } catch {
      setError("Sunucu bağlantı hatası.");
    } finally {
      setSub(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 py-8">
      {/* Arka plan efekti */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-900/10 rounded-full blur-3xl"/>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl"/>
      </div>

      <div className={`relative z-10 w-full transition-all duration-300 ${step === 1 ? "max-w-md" : "max-w-4xl"}`}>
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {step === 1 ? (
            <Step1 data={step1} setData={setStep1} onNext={goToStep2} error={error}/>
          ) : (
            <Step2
              data={step2} setData={setStep2}
              onBack={() => { setStep(1); setError(""); }}
              onSubmit={handleSubmit}
              submitting={submitting}
              error={error}
            />
          )}
        </div>
      </div>
    </div>
  );
}
