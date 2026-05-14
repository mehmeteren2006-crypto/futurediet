"use client";
import { useState } from "react";
import { useUser } from "@/lib/UserContext";

export default function SettingsPage() {
  const { user, logout } = useUser();
  const [form, setForm]     = useState({ weight_kg: user?.weight_kg?.toString() ?? "", height_cm: user?.height_cm?.toString() ?? "", age: user?.age?.toString() ?? "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState("");

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(""); setSaved(false);
    try {
      const r = await fetch(`/api/users?userId=${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight_kg: +form.weight_kg, height_cm: +form.height_cm, age: +form.age }),
      });
      const d = await r.json();
      if (d.success) {
        localStorage.setItem("dietActiveUser", JSON.stringify({ ...user, weight_kg: +form.weight_kg, height_cm: +form.height_cm, age: +form.age }));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else setError(d.error ?? "Kayıt hatası.");
    } catch { setError("Bağlantı hatası."); }
    finally { setSaving(false); }
  };

  const bmi = +(user.weight_kg / Math.pow(user.height_cm / 100, 2)).toFixed(1);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        <div>
          <h1 className="text-white font-bold text-xl">Ayarlar</h1>
          <p className="text-gray-500 text-sm">Profil ve uygulama ayarları</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT: Profile card */}
          <div className="flex flex-col gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center text-center gap-3">
              <div className="w-20 h-20 rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 flex items-center justify-center text-4xl">
                {user.gender === "male" ? "👨" : "👩"}
              </div>
              <div>
                <p className="text-white font-bold text-lg">{user.full_name}</p>
                <p className="text-gray-500 text-sm">{user.email}</p>
              </div>
              <div className="w-full grid grid-cols-2 gap-2 mt-2">
                {[
                  { l: "BMI",   v: bmi.toString(),         c: bmi < 25 ? "text-green-400" : "text-yellow-400" },
                  { l: "BMR",   v: `${user.bmr}`,           c: "text-cyan-400" },
                  { l: "Hedef", v: `${user.daily_calorie_target}`, c: "text-white" },
                  { l: "TDEE",  v: `${Math.round(user.bmr * user.activity_level)}`, c: "text-purple-400" },
                ].map(s => (
                  <div key={s.l} className="bg-gray-800 rounded-xl p-2 text-center">
                    <p className={`font-bold text-sm ${s.c}`}>{s.v}</p>
                    <p className="text-gray-600 text-xs">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Danger zone */}
            <div className="bg-gray-900 border border-red-900/40 rounded-2xl p-5">
              <h2 className="text-white font-semibold mb-1">Oturum</h2>
              <p className="text-gray-500 text-sm mb-4">Çıkış yapılırsa tekrar giriş gerekir.</p>
              <button onClick={logout} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all active:scale-95">
                🚪 Çıkış Yap
              </button>
            </div>
          </div>

          {/* RIGHT: Update form */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <form onSubmit={handleSave} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-5">
              <h2 className="text-white font-semibold text-lg">Fiziksel Ölçüler</h2>
              <p className="text-gray-500 text-sm -mt-3">Verilerini güncellediğinde BMR ve kalori hedefin otomatik yeniden hesaplanır.</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { key: "weight_kg", label: "Kilo (kg)",  placeholder: "75",  icon: "⚖️" },
                  { key: "height_cm", label: "Boy (cm)",   placeholder: "175", icon: "📏" },
                  { key: "age",       label: "Yaş",         placeholder: "28",  icon: "🎂" },
                ].map(({ key, label, placeholder, icon }) => (
                  <div key={key}>
                    <label className="text-gray-400 text-xs font-medium block mb-1.5">{icon} {label}</label>
                    <input
                      type="number"
                      placeholder={placeholder}
                      value={(form as any)[key]}
                      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500 transition-colors placeholder-gray-600"
                    />
                  </div>
                ))}
              </div>

              {error && <p className="text-red-400 text-sm bg-red-950/60 border border-red-800 rounded-xl px-4 py-3">{error}</p>}
              {saved  && <p className="text-green-400 text-sm bg-green-950/60 border border-green-800 rounded-xl px-4 py-3">✓ Bilgiler güncellendi. BMR ve kalori hedefiniz yeniden hesaplandı.</p>}

              <button type="submit" disabled={saving} className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold py-3 rounded-xl transition-all active:scale-95">
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </form>

            {/* App info */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-4">Uygulama Hakkında</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { l: "Versiyon",  v: "1.0.0" },
                  { l: "AI Model",  v: "Qwen Local" },
                  { l: "Veritabanı", v: "MySQL" },
                  { l: "Framework", v: "Next.js 15" },
                ].map(s => (
                  <div key={s.l} className="bg-gray-800 rounded-xl p-3">
                    <p className="text-white font-semibold text-sm">{s.v}</p>
                    <p className="text-gray-500 text-xs">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
