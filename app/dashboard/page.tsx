"use client";
import { useState } from "react";
import { useUser } from "@/lib/UserContext";

const ICONS: Record<string, string> = { breakfast: "🍳", lunch: "🥗", dinner: "🥩", snack: "🍎" };
const MEAL_LABELS: Record<string, string> = { breakfast: "Kahvaltı", lunch: "Öğle", dinner: "Akşam", snack: "Ara Öğün" };

function MealModal({ userId, onClose, onSuccess }: { userId: string; onClose: () => void; onSuccess: (s: any, m: any) => void }) {
  const [f, setF] = useState({ meal_name: "", meal_type: "breakfast", total_calories: "", protein_g: "", carbs_g: "", fat_g: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.meal_name || !f.total_calories) { setErr("Yemek adı ve kalori zorunludur."); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/meals", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, meal_name: f.meal_name, meal_type: f.meal_type, total_calories: +f.total_calories, protein_g: +(f.protein_g||0), carbs_g: +(f.carbs_g||0), fat_g: +(f.fat_g||0) }) });
      const d = await r.json();
      if (d.success) { onSuccess(d.data.summary, d.data.meals); onClose(); }
      else setErr(d.error ?? "Hata");
    } catch { setErr("Bağlantı hatası."); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-bold text-lg">🍽 Yemek Ekle</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl transition-colors">✕</button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input type="text" placeholder="Yemek Adı *" value={f.meal_name} onChange={e => setF({...f, meal_name: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500 transition-colors placeholder-gray-600" />
          <select value={f.meal_type} onChange={e => setF({...f, meal_type: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500">
            <option value="breakfast">🍳 Kahvaltı</option>
            <option value="lunch">🥗 Öğle</option>
            <option value="dinner">🥩 Akşam</option>
            <option value="snack">🍎 Ara Öğün</option>
          </select>
          <input type="number" placeholder="Kalori (kcal) *" value={f.total_calories} onChange={e => setF({...f, total_calories: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500 transition-colors placeholder-gray-600" />
          <div className="grid grid-cols-3 gap-2">
            {(["protein_g","carbs_g","fat_g"] as const).map(k => (
              <input key={k} type="number" placeholder={k==="protein_g"?"Protein g":k==="carbs_g"?"Karb g":"Yağ g"} value={f[k]} onChange={e => setF({...f,[k]:e.target.value})} className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-cyan-500 placeholder-gray-600" />
            ))}
          </div>
          {err && <p className="text-red-400 text-xs bg-red-950 border border-red-800 rounded-lg px-3 py-2">{err}</p>}
          <button type="submit" disabled={busy} className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold py-3 rounded-xl transition-colors mt-1">
            {busy ? "Kaydediliyor..." : "Kaydet →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user, stats, meals, setStats, setMeals, deleteMeal } = useUser();
  const [showForm, setShowForm] = useState(false);
  if (!user) return null;

  const consumed  = stats?.total_calories_consumed ?? 0;
  const target    = stats?.daily_calorie_target ?? user.daily_calorie_target;
  const burned    = stats?.total_calories_burned ?? 0;
  const remaining = Math.max(0, target - consumed + burned);
  const pct       = Math.min(100, Math.round((consumed / target) * 100));
  const overTarget = consumed > target;
  const barColor  = overTarget ? "bg-red-500" : pct < 70 ? "bg-green-500" : pct < 90 ? "bg-yellow-400" : "bg-red-400";

  const totalProt = meals.reduce((s, m) => s + (m.protein_g || 0), 0);
  const totalCarb = meals.reduce((s, m) => s + (m.carbs_g  || 0), 0);
  const totalFat  = meals.reduce((s, m) => s + (m.fat_g    || 0), 0);
  const macroSum  = totalProt + totalCarb + totalFat || 1;

  return (
    <div className="h-full flex flex-col p-4 md:p-6 gap-4 md:gap-5">

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-white font-bold text-xl">Merhaba, {user.full_name.split(" ")[0]}! 👋</h1>
          <p className="text-gray-500 text-sm">{new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm px-5 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-cyan-500/20">
          + Yemek Ekle
        </button>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5 min-h-0">

        {/* LEFT: Meals list — 2 cols on desktop */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">

          {/* Calorie Progress */}
          <div className={`border rounded-2xl p-5 flex-shrink-0 transition-colors ${overTarget ? "bg-red-950/20 border-red-500/30" : "bg-gray-900 border-gray-800"}`}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-white font-semibold">Günlük Kalori Takibi</span>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${overTarget ? "text-red-400 bg-red-500/10" : pct < 70 ? "text-green-400 bg-green-500/10" : "text-yellow-400 bg-yellow-400/10"}`}>{Math.round((consumed / target) * 100)}%</span>
            </div>
            
            {overTarget && (
              <div className="mb-3 text-red-400 text-xs font-medium flex items-center gap-1.5 bg-red-500/10 w-fit px-2 py-1 rounded-lg border border-red-500/20">
                <span>⚠️</span> Günlük kalori hedefini aştın!
              </div>
            )}

            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden mb-4">
              <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { l: "Tüketilen", v: consumed,  c: overTarget ? "text-red-400" : "text-white",   icon: "🔥" },
                { l: "Kalan",     v: remaining, c: overTarget ? "text-red-500" : remaining < 300 ? "text-yellow-400" : "text-green-400", icon: "⚡" },
                { l: "Yakılan",   v: burned,    c: "text-blue-400", icon: "💪" },
              ].map(s => (
                <div key={s.l} className="bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-lg mb-0.5">{s.icon}</p>
                  <p className={`font-bold text-base ${s.c}`}>{s.v}</p>
                  <p className="text-gray-500 text-xs">kcal · {s.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Meals list */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <h2 className="text-gray-400 text-xs font-semibold tracking-widest">BUGÜNKÜ ÖĞÜNLER</h2>
              <span className="text-gray-600 text-xs">{meals.length} öğün</span>
            </div>

            {meals.length === 0 ? (
              <div className="flex-1 bg-gray-900 border border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center text-center p-8">
                <div className="text-5xl mb-3">🍽</div>
                <p className="text-gray-400 font-medium">Henüz yemek kaydedilmedi</p>
                <p className="text-gray-600 text-sm mt-1">Bugün ne yedin?</p>
                <button onClick={() => setShowForm(true)} className="mt-4 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm px-5 py-2 rounded-xl hover:bg-cyan-500/20 transition-colors">
                  + İlk yemeği ekle
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                {meals.map(m => (
                  <div key={m.id} className="group flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 hover:border-gray-700 transition-colors flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl flex-shrink-0">{ICONS[m.meal_type] ?? "🍽"}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{m.meal_name}</p>
                      <p className="text-gray-500 text-xs">{MEAL_LABELS[m.meal_type] ?? m.meal_type}{m.protein_g > 0 ? ` · P:${m.protein_g}g K:${m.carbs_g}g Y:${m.fat_g}g` : ""}</p>
                    </div>
                    <span className="text-cyan-400 font-bold text-sm flex-shrink-0">{m.total_calories} kcal</span>
                    <button
                      onClick={async () => { if (!confirm(`"${m.meal_name}" silinsin mi?`)) return; const r = await fetch(`/api/meals?mealId=${m.id}&userId=${user.id}`, { method: "DELETE" }); if ((await r.json()).success) deleteMeal(m.id, m.total_calories); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all flex-shrink-0"
                    >🗑</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Stats sidebar */}
        <div className="flex flex-col gap-4">

          {/* User card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl flex-shrink-0">
              {user.gender === "male" ? "👨" : "👩"}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{user.full_name}</p>
              <p className="text-gray-500 text-xs truncate">{user.email}</p>
              <p className="text-cyan-400 text-xs mt-0.5">Hedef: {target} kcal/gün</p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "🏃", label: "Adım",    value: (stats?.step_count ?? 0).toLocaleString("tr-TR"), color: "text-blue-400" },
              { icon: "🍽", label: "Öğün",    value: `${meals.length}`,   color: "text-green-400" },
              { icon: "⚖️", label: "Kilo",    value: `${user.weight_kg}kg`, color: "text-purple-400" },
              { icon: "📏", label: "Boy",      value: `${user.height_cm}cm`, color: "text-orange-400" },
            ].map(s => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                <p className="text-xl mb-1">{s.icon}</p>
                <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
                <p className="text-gray-600 text-xs">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Macro breakdown */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex-1">
            <h3 className="text-gray-400 text-xs font-semibold mb-3 tracking-widest">MAKROLAR</h3>
            {meals.length > 0 ? (
              <>
                <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-3">
                  <div className="bg-blue-500 rounded-full" style={{ width: `${(totalProt/macroSum)*100}%` }}/>
                  <div className="bg-yellow-400 rounded-full" style={{ width: `${(totalCarb/macroSum)*100}%` }}/>
                  <div className="bg-red-400 rounded-full" style={{ width: `${(totalFat/macroSum)*100}%` }}/>
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Protein",       value: totalProt, color: "bg-blue-500",   tc: "text-blue-400" },
                    { label: "Karbonhidrat",  value: totalCarb, color: "bg-yellow-400", tc: "text-yellow-400" },
                    { label: "Yağ",           value: totalFat,  color: "bg-red-400",    tc: "text-red-400" },
                  ].map(m => (
                    <div key={m.label} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${m.color} flex-shrink-0`}/>
                      <span className="text-gray-400 text-xs flex-1">{m.label}</span>
                      <span className={`text-xs font-bold ${m.tc}`}>{m.value}g</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-gray-700 text-xs text-center py-4">Yemek ekle, makrolar görünür</p>
            )}
          </div>

          {/* Mini bar chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <h3 className="text-gray-400 text-xs font-semibold mb-3 tracking-widest">SON 5 GÜN</h3>
            <div className="flex items-end gap-2" style={{ height: 56 }}>
              {[
                { d: "Pzt", p: 82 }, { d: "Sal", p: 55 }, { d: "Çar", p: 91 },
                { d: "Per", p: 67 }, { d: "Bug", p: pct },
              ].map(({ d, p }) => (
                <div key={d} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-gray-800 rounded overflow-hidden relative flex-1">
                    <div className={`absolute bottom-0 w-full rounded transition-all duration-700 ${p > 90 ? "bg-red-500/70" : p > 70 ? "bg-yellow-400/70" : "bg-cyan-500/70"}`} style={{ height: `${p}%` }} />
                  </div>
                  <span className="text-gray-600 text-[10px] flex-shrink-0">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <MealModal userId={user.id} onClose={() => setShowForm(false)}
          onSuccess={(s, m) => { setStats(s); setMeals(m); setShowForm(false); }} />
      )}
    </div>
  );
}
