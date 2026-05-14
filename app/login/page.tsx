"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) { setError("Tüm alanlar zorunludur."); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem("dietActiveUser", JSON.stringify(data.data));
        router.push("/");
      } else {
        setError(data.error ?? "Giriş başarısız.");
      }
    } catch {
      setError("Sunucu bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Arka plan blur efekti */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-cyan-900/10 rounded-full blur-3xl"/>
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-blue-900/10 rounded-full blur-3xl"/>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Kart */}
        <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 shadow-2xl">

          {/* Logo & başlık */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🥗</div>
            <h1 className="text-2xl font-bold text-white">Diet Assistant</h1>
            <p className="text-slate-500 text-sm mt-1">Hesabına giriş yap</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* E-posta */}
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">
                E-posta
              </label>
              <input
                type="email"
                placeholder="ahmet@mail.com"
                value={form.email}
                onChange={set("email")}
                autoComplete="email"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500 transition-colors placeholder-slate-600"
              />
            </div>

            {/* Şifre */}
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">
                Şifre
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={set("password")}
                autoComplete="current-password"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500 transition-colors placeholder-slate-600"
              />
            </div>

            {/* Hata */}
            {error && (
              <div className="bg-red-950/60 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Giriş Butonu */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold py-3 rounded-xl transition-all active:scale-95 mt-1"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap →"}
            </button>
          </form>

          {/* Kayıt linki */}
          <p className="text-center text-slate-600 text-sm mt-6">
            Hesabın yok mu?{" "}
            <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              Kayıt Ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
