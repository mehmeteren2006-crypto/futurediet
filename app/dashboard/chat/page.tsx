"use client";
import { useState, useRef, useEffect } from "react";
import { useUser } from "@/lib/UserContext";

interface Msg { role: "user" | "ai"; content: string; }

const QUICK_PROMPTS = [
  "Bugün için bir yemek öner 🍽",
  "Kalan kalorimle ne yiyebilirim? ⚡",
  "Yarın için diyet programı yap 📋",
  "Protein almam için ne önerirsin? 💪",
];

export default function ChatPage() {
  const { user, stats, meals } = useUser();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const textareaRef             = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (user) setMessages([{
      role: "ai",
      content: `Merhaba ${user.full_name.split(" ")[0]}! 👋\n\nBugün ${stats?.total_calories_consumed ?? 0} kcal tükettiniz, ${Math.max(0,(stats?.daily_calorie_target ?? user.daily_calorie_target)-(stats?.total_calories_consumed??0))} kcal hakkınız kaldı.\n\nMenü önerisi, kalori hesabı veya beslenme soruları için buradayım!`
    }]);
  }, [user?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading || !user) return;
    setMessages(p => [...p, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, message: msg }),
      });
      const d = await r.json();
      setMessages(p => [...p, { role: "ai", content: d.success ? d.response : `Hata: ${d.error}` }]);
    } catch { setMessages(p => [...p, { role: "ai", content: "Bağlantı hatası." }]); }
    finally { setLoading(false); }
  };

  if (!user) return null;

  return (
    <div className="h-full flex flex-col min-h-0">

      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/60 flex items-center gap-4 flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xl">🤖</div>
        <div className="flex-1">
          <p className="text-white font-semibold">AI Diyetisyen</p>
          <p className="text-green-400 text-xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"/>
            Çevrimiçi · Qwen Local
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-600">
          <span>🔥 {stats?.total_calories_consumed ?? 0} kcal</span>
          <span>⚡ {Math.max(0,(stats?.daily_calorie_target??user.daily_calorie_target)-(stats?.total_calories_consumed??0))} kalan</span>
          <span>🍽 {meals.length} öğün</span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 md:px-8 lg:px-16 xl:px-32 py-6 flex flex-col gap-4">

        {/* Quick prompts — shown when only 1 message (greeting) */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {QUICK_PROMPTS.map(q => (
              <button key={q} onClick={() => send(q)}
                className="text-sm text-gray-400 hover:text-cyan-400 bg-gray-900 hover:bg-cyan-500/5 border border-gray-800 hover:border-cyan-500/30 px-4 py-2 rounded-xl transition-all">
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-sm flex-shrink-0 mt-1">
              {msg.role === "ai" ? "🤖" : user.gender === "male" ? "👨" : "👩"}
            </div>
            <div className={`max-w-[70%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === "ai"
                ? "bg-gray-900 border border-gray-800 text-gray-100 rounded-tl-sm"
                : "bg-cyan-600 text-white font-medium rounded-tr-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-sm">🤖</div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-tl-sm px-5 py-3.5 flex gap-1.5 items-center">
              {[0,150,300].map(d => <span key={d} className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="px-4 md:px-8 lg:px-16 xl:px-32 py-4 border-t border-gray-800 bg-gray-950 flex-shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Mesajını yaz... (Enter ile gönder, Shift+Enter yeni satır)"
            rows={2}
            disabled={loading}
            className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl text-gray-100 text-sm px-5 py-4 resize-none outline-none placeholder-gray-600 focus:border-cyan-500 transition-colors disabled:opacity-50"
          />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-base px-6 py-4 rounded-2xl h-fit transition-all active:scale-95 shadow-lg shadow-cyan-500/20">
            →
          </button>
        </div>
        <p className="text-gray-700 text-xs mt-2 text-center">Qwen · Yerel AI · Veriler şifreli tutulmaz</p>
      </div>
    </div>
  );
}
