"use client";
import { UserProvider } from "@/lib/UserContext";
import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV = [
  { href: "/dashboard",           icon: "🏠", label: "Ana Sayfa" },
  { href: "/dashboard/chat",      icon: "🤖", label: "AI Asistan" },
  { href: "/dashboard/analytics", icon: "📊", label: "Analiz" },
  { href: "/dashboard/settings",  icon: "⚙️", label: "Ayarlar" },
];

function Sidebar() {
  const path = usePathname();
  return (
    <aside className="hidden md:flex flex-col w-52 h-screen bg-gray-900 border-r border-gray-800 flex-shrink-0">
      <div className="px-5 py-5 border-b border-gray-800">
        <span className="text-lg font-bold text-white">🥗 <span className="text-cyan-400">Diet</span>AI</span>
      </div>
      <nav className="flex-1 p-3 flex flex-col gap-1 mt-1">
        {NAV.map(n => {
          const active = path === n.href || (n.href !== "/dashboard" && path.startsWith(n.href));
          return (
            <Link key={n.href} href={n.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}>
              <span>{n.icon}</span><span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-gray-800">
        <p className="text-gray-700 text-xs px-3">v1.0 · Qwen Local</p>
      </div>
    </aside>
  );
}

function BottomNav() {
  const path = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-gray-900 border-t border-gray-800 flex">
      {NAV.map(n => {
        const active = path === n.href || (n.href !== "/dashboard" && path.startsWith(n.href));
        return (
          <Link key={n.href} href={n.href} className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${active ? "text-cyan-400" : "text-gray-600"}`}>
            <span className="text-xl">{n.icon}</span>
            <span className="text-[10px]">{n.label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <div className="h-screen w-full flex overflow-hidden bg-gray-950 text-white">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
            <div className="min-h-full">
              {children}
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    </UserProvider>
  );
}
