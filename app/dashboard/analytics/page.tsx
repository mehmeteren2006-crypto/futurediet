"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/UserContext";

interface Period {
  label: string;
  consumed: number;
  burned: number;
  net: number;
  kg: number;
  days: number;
}

interface ChartPoint {
  date: string;
  consumed: number;
  burned: number;
  net: number;
}

interface AnalyticsData {
  daily_calorie_target: number;
  bmr: number;
  projectedWeight: number;
  periods: Period[];
  chart: ChartPoint[];
}

function BodySVG({ gender }: { gender: string }) {
  const c = gender === "female" ? "#f9a8d4" : "#22d3ee";
  return (
    <svg viewBox="0 0 160 390" fill="none" className="w-full h-full">
      <defs>
        <filter id="ag2"><feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <radialGradient id="abf2" cx="50%" cy="35%" r="55%"><stop offset="0%" stopColor={c} stopOpacity="0.08"/><stop offset="100%" stopColor="#0f172a" stopOpacity="0"/></radialGradient>
        <style>{`@keyframes sc2{0%{transform:translateY(0);opacity:0}10%{opacity:.6}90%{opacity:.6}100%{transform:translateY(360px);opacity:0}}.sc2{animation:sc2 4s ease-in-out infinite}`}</style>
        <linearGradient id="asg2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={c} stopOpacity="0"/><stop offset="50%" stopColor={c} stopOpacity="0.7"/><stop offset="100%" stopColor={c} stopOpacity="0"/></linearGradient>
      </defs>
      <rect className="sc2" x="10" y="8" width="140" height="2" fill="url(#asg2)"/>
      <g filter="url(#ag2)" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="80" cy="40" r="26" fill="url(#abf2)"/>
        <path d="M70,64 L68,78 M90,64 L92,78"/>
        <path d="M68,78 Q46,78 24,92 L22,210 Q50,220 80,218 Q110,220 138,210 L136,92 Q114,78 92,78 Z" fill="url(#abf2)"/>
        <path d="M24,98 Q4,140 8,196"/><ellipse cx="9" cy="206" rx="6" ry="10" transform="rotate(-12 9 206)"/>
        <path d="M136,98 Q156,140 152,196"/><ellipse cx="151" cy="206" rx="6" ry="10" transform="rotate(12 151 206)"/>
        <path d="M62,218 Q58,295 54,368"/><path d="M54,368 Q48,378 36,380"/>
        <path d="M98,218 Q102,295 106,368"/><path d="M106,368 Q112,378 124,380"/>
      </g>
    </svg>
  );
}

function kgColor(kg: number) {
  if (kg < -0.01) return "text-green-400";
  if (kg >  0.01) return "text-red-400";
  return "text-gray-400";
}
function kgBg(kg: number) {
  if (kg < -0.01) return "bg-green-500/10 border-green-500/20";
  if (kg >  0.01) return "bg-red-500/10 border-red-500/20";
  return "bg-gray-800/50 border-gray-700/30";
}
function netColor(net: number) {
  if (net < 0) return "text-green-400";
  if (net > 0) return "text-orange-400";
  return "text-gray-400";
}

function getObesityClass(bmi: number) {
  if (bmi < 18.5) return { label: "Zayıf", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" };
  if (bmi < 25) return { label: "Normal", color: "text-green-400 bg-green-500/10 border-green-500/30" };
  if (bmi < 30) return { label: "Fazla Kilolu", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" };
  if (bmi < 35) return { label: "1. Derece Obez", color: "text-orange-400 bg-orange-500/10 border-orange-500/30" };
  if (bmi < 40) return { label: "2. Derece Obez", color: "text-red-400 bg-red-500/10 border-red-500/30" };
  return { label: "3. Derece Obez", color: "text-red-500 bg-red-600/10 border-red-600/30" };
}

export default function AnalyticsPage() {
  const { user, stats, meals } = useUser();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadingA, setLoadingA]   = useState(true);
  const [activeTab, setActiveTab] = useState<number>(0); // 0=Bugün, 1=Son 7 Gün, 2=Son 30 Gün

  useEffect(() => {
    if (!user) return;
    fetch(`/api/analytics?userId=${user.id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setAnalytics(d.data); })
      .catch(() => {})
      .finally(() => setLoadingA(false));
  }, [user?.id]);

  if (!user) return null;

  const currentWeight = analytics?.projectedWeight ?? user.weight_kg;
  const bmi       = +(currentWeight / Math.pow(user.height_cm / 100, 2)).toFixed(1);
  const obesity   = getObesityClass(bmi);

  const consumed  = stats?.total_calories_consumed ?? 0;
  const target    = stats?.daily_calorie_target ?? user.daily_calorie_target;
  const steps     = stats?.step_count ?? 0;
  const tdee      = Math.round(user.bmr * user.activity_level);
  const overTarget = consumed > target;

  const totalProt = meals.reduce((s, m) => s + (m.protein_g || 0), 0);
  const totalCarb = meals.reduce((s, m) => s + (m.carbs_g  || 0), 0);
  const totalFat  = meals.reduce((s, m) => s + (m.fat_g    || 0), 0);
  const macroSum  = totalProt + totalCarb + totalFat || 1;

  // Chart max for scaling bars
  const chartMax = analytics?.chart.length
    ? Math.max(...analytics.chart.flatMap(p => [p.consumed, p.burned]), 1)
    : 1;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      <div className="flex-shrink-0">
        <h1 className="text-white font-bold text-xl">Analiz & Vücut</h1>
        <p className="text-gray-500 text-sm">Enerji dengesi, kilo tahmini ve vücut ölçülerin</p>
      </div>

      {/* ── Over-target warning ── */}
      {overTarget && (
        <div className="flex-shrink-0 bg-red-950/50 border border-red-500/30 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-red-400 font-semibold text-sm">Günlük kalori hedefini aştın!</p>
            <p className="text-red-500/70 text-xs">{consumed} kcal tüketildi · Hedef: {target} kcal · Fazla: +{consumed - target} kcal</p>
          </div>
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT: Body + BMI */}
        <div className="flex flex-col gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col items-center relative">
            {loadingA && <div className="absolute top-4 right-4 w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"/>}
            <div className="w-36 h-52 mb-4"><BodySVG gender={user.gender}/></div>
            <p className="text-gray-400 text-xs mb-1">Vücut Kütle İndeksi</p>
            <p className="text-5xl font-bold text-white">{bmi}</p>
            <div className={`mt-2 px-3 py-1 rounded-lg border text-sm font-semibold ${obesity.color}`}>
              {obesity.label}
            </div>
            <div className="mt-4 flex gap-0.5 h-1.5 rounded-full overflow-hidden w-full">
              <div className="flex-1 bg-blue-500/50"/><div className="flex-1 bg-green-500/50"/><div className="flex-1 bg-yellow-400/50"/><div className="flex-1 bg-orange-500/50"/><div className="flex-1 bg-red-500/50"/>
            </div>
          </div>

          {/* Measurements */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 grid grid-cols-2 gap-2">
            {[
              { l: "Boy",    v: `${user.height_cm} cm`, i: "📏" },
              { l: "Kilo",   v: `${currentWeight} kg`,  i: "⚖️" },
              { l: "BMR",    v: `${user.bmr} kcal`,      i: "🔥" },
              { l: "TDEE",   v: `${tdee} kcal`,          i: "⚡" },
              { l: "Adım",   v: steps.toLocaleString("tr-TR"), i: "👟" },
              { l: "Öğün",   v: `${meals.length}`,        i: "🍽" },
            ].map(s => (
              <div key={s.l} className={`bg-gray-800 rounded-xl p-2.5 ${s.l === "Kilo" ? "ring-1 ring-cyan-500/50 bg-cyan-900/10" : ""}`}>
                <p className="text-base mb-0.5">{s.i}</p>
                <p className={`font-bold text-xs ${s.l === "Kilo" ? "text-cyan-400" : "text-white"}`}>{s.v}</p>
                <p className="text-gray-600 text-[10px]">{s.l}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 text-center px-2">Bu değer, sisteme girdiğiniz kalori verilerine göre hesaplanmış anlık simülasyondur.</p>
        </div>

        {/* MIDDLE: Energy Balance Tabbed Table + Weight Cards */}
        <div className="flex flex-col gap-4">
          
          {/* Weight change horizontal cards */}
          <div className="flex flex-col gap-3">
            <h3 className="text-white font-semibold flex items-center gap-2">🏋️ Tahmini Kilo Değişimi</h3>
            {loadingA ? (
              <div className="flex items-center justify-center py-8 bg-gray-900 border border-gray-800 rounded-2xl">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {analytics?.periods.map(p => (
                  <div key={p.label} className={`flex flex-col border rounded-xl p-3 ${kgBg(p.kg)}`}>
                    <p className="text-white text-sm font-medium mb-1">{p.label}</p>
                    <p className={`text-xl font-bold ${kgColor(p.kg)}`}>
                      {p.kg > 0 ? "+" : ""}{p.kg.toFixed(2)} kg
                    </p>
                    <p className="text-gray-500 text-[10px] mt-1">{p.days} günde</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold">⚖️ Enerji Dengesi</h3>
              {/* Tabs */}
              <div className="flex bg-gray-800 rounded-lg p-1">
                {["Bugün", "7 Gün", "30 Gün"].map((t, i) => (
                  <button key={t} onClick={() => setActiveTab(i)} className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${activeTab === i ? "bg-cyan-600 text-white shadow-sm" : "text-gray-400 hover:text-white"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            
            {loadingA ? (
              <div className="flex-1 flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-800 flex-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800/80 text-gray-400 text-xs">
                      <th className="text-left px-4 py-3 font-semibold">Dönem</th>
                      <th className="text-right px-3 py-3 font-semibold">Alınan</th>
                      <th className="text-right px-3 py-3 font-semibold">Yakılan</th>
                      <th className="text-right px-4 py-3 font-semibold">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics?.periods.map((p, i) => (
                      <tr key={p.label} className={`border-t border-gray-800 transition-colors ${i === activeTab ? "bg-cyan-900/20" : i % 2 === 0 ? "bg-gray-900" : "bg-gray-900/50"}`}>
                        <td className="px-4 py-3 text-gray-300 font-medium">{p.label}</td>
                        <td className="px-3 py-3 text-right text-gray-400">{p.consumed.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-blue-400">{p.burned.toLocaleString()}</td>
                        <td className={`px-4 py-3 text-right font-bold ${netColor(p.net)}`}>
                          {p.net > 0 ? "+" : ""}{p.net.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Macro + 7-day chart */}
        <div className="flex flex-col gap-4">
          {/* Calorie ring */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-gray-400 text-xs font-semibold mb-4 tracking-widest">KALORİ HEDEFİ</h3>
            <div className="relative flex items-center justify-center mb-4">
              <svg viewBox="0 0 120 120" className="w-28 h-28 -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#1f2937" strokeWidth="10"/>
                <circle cx="60" cy="60" r="50" fill="none"
                  stroke={overTarget ? "#ef4444" : "#06b6d4"} strokeWidth="10"
                  strokeDasharray={`${Math.min(100,(consumed/target)*100) * 3.14} 314`}
                  strokeLinecap="round" className="transition-all duration-700"/>
              </svg>
              <div className="absolute text-center">
                <p className={`font-bold text-lg leading-tight ${overTarget ? "text-red-400" : "text-white"}`}>{Math.min(100,Math.round((consumed/target)*100))}%</p>
                <p className="text-gray-500 text-[10px]">doldu</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-800 rounded-xl p-2 text-center"><p className={`font-bold ${overTarget ? "text-red-400" : "text-white"}`}>{consumed}</p><p className="text-gray-500">Tüketilen</p></div>
              <div className="bg-gray-800 rounded-xl p-2 text-center"><p className={`font-bold ${overTarget ? "text-red-400" : "text-green-400"}`}>{Math.max(0,target-consumed)}</p><p className="text-gray-500">Kalan</p></div>
            </div>
          </div>

          {/* Macro breakdown */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-gray-400 text-xs font-semibold mb-4 tracking-widest">MAKRO DAĞILIMI</h3>
            {meals.length > 0 ? (
              <div className="flex flex-col gap-3">
                {[
                  { l: "Protein",      v: totalProt, pct: (totalProt/macroSum)*100, bar: "bg-blue-500",   tc: "text-blue-400" },
                  { l: "Karbonhidrat", v: totalCarb, pct: (totalCarb/macroSum)*100, bar: "bg-yellow-400", tc: "text-yellow-400" },
                  { l: "Yağ",          v: totalFat,  pct: (totalFat/macroSum)*100,  bar: "bg-red-400",    tc: "text-red-400" },
                ].map(m => (
                  <div key={m.l}>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-400 text-xs">{m.l}</span>
                      <span className={`text-xs font-bold ${m.tc}`}>{m.v}g</span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${m.bar} transition-all duration-700`} style={{ width: `${m.pct}%` }}/>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-700 text-sm text-center py-4">Öğün ekle, makrolar görünsün</p>
            )}
          </div>

          {/* 7-day chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex-1">
            <h3 className="text-gray-400 text-xs font-semibold mb-4 tracking-widest">SON 7 GÜN (ALINAN vs YAKILAN)</h3>
            {analytics?.chart && analytics.chart.length > 0 ? (
              <div className="flex items-end gap-1.5" style={{ height: 80 }}>
                {analytics.chart.map((pt, i) => {
                  const cPct = Math.round((pt.consumed / chartMax) * 100);
                  const bPct = Math.round((pt.burned   / chartMax) * 100);
                  const dayLabel = new Date(pt.date).toLocaleDateString("tr-TR", { weekday: "short" });
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full flex gap-0.5 items-end" style={{ height: 60 }}>
                        <div className="flex-1 bg-cyan-500/70 rounded-t transition-all" style={{ height: `${cPct}%` }} title={`Alınan: ${pt.consumed} kcal`}/>
                        <div className="flex-1 bg-blue-500/50 rounded-t transition-all" style={{ height: `${bPct}%` }} title={`Yakılan: ${pt.burned} kcal`}/>
                      </div>
                      <span className="text-[9px] text-gray-600">{dayLabel}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-700 text-xs text-center py-6">Yeterli veri yok</p>
            )}
            <div className="flex gap-4 mt-3 justify-center">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-cyan-500/70"/><span className="text-[10px] text-gray-500">Alınan</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500/50"/><span className="text-[10px] text-gray-500">Yakılan</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
