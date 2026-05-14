"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "ai";
  content: string;
}

interface Meta {
  calories_remaining: number;
  step_count: number;
  meals_logged: number;
}

// Demo user — gerçek auth eklenince burası kaldırılır
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content:
        "Merhaba! Ben AI diyetisyeninizim. Bugünkü beslenme durumunuzu, öğünlerinizi veya kalori hedefinizi sormak için buradayım. Nasıl yardımcı olabilirim?",
    },
  ]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [meta, setMeta]     = useState<Meta | null>(null);
  const bottomRef           = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const res  = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId: DEMO_USER_ID, message: text }),
      });
      const data = await res.json();

      if (data.success) {
        setMessages((prev) => [...prev, { role: "ai", content: data.response }]);
        setMeta(data.meta);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: `Hata: ${data.error}` },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "Bağlantı hatası. Lütfen tekrar deneyin." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-page">
      {/* Üst bilgi barı */}
      {meta && (
        <div className="meta-bar">
          <span>🔥 Kalan: <strong>{meta.calories_remaining} kcal</strong></span>
          <span>👟 Adım: <strong>{meta.step_count.toLocaleString()}</strong></span>
          <span>🍽 Öğün: <strong>{meta.meals_logged}</strong></span>
        </div>
      )}

      {/* Mesaj alanı */}
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`bubble ${msg.role}`}>
            <span className="avatar">{msg.role === "ai" ? "🤖" : "👤"}</span>
            <p>{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="bubble ai">
            <span className="avatar">🤖</span>
            <p className="typing">Yazıyor<span>...</span></p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Giriş alanı */}
      <div className="input-bar">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Mesajınızı yazın... (Enter ile gönderin)"
          rows={2}
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          {loading ? "⏳" : "Gönder →"}
        </button>
      </div>
    </div>
  );
}
