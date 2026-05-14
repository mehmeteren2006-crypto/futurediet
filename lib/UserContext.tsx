"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export interface User { id: string; full_name: string; email: string; age: number; gender: string; weight_kg: number; height_cm: number; daily_calorie_target: number; bmr: number; activity_level: number; }
export interface Meal { id: string; meal_name: string; meal_type: string; total_calories: number; protein_g: number; carbs_g: number; fat_g: number; logged_at: string; }
export interface DailyStats { total_calories_consumed: number; total_calories_burned: number; step_count: number; daily_calorie_target: number; }

interface Ctx {
  user: User | null;
  stats: DailyStats | null;
  meals: Meal[];
  loading: boolean;
  refetch: () => Promise<void>;
  logout: () => void;
  setStats: (s: DailyStats) => void;
  setMeals: (m: Meal[]) => void;
  deleteMeal: (id: string, kcal: number) => void;
}

const UserCtx = createContext<Ctx | null>(null);
export const useUser = () => { const c = useContext(UserCtx); if (!c) throw new Error("useUser outside provider"); return c; };

export function UserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser]   = useState<User | null>(null);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async (uid: string) => {
    try {
      const [lr, mr] = await Promise.all([fetch(`/api/daily-logs?userId=${uid}`), fetch(`/api/meals?userId=${uid}`)]);
      const [ld, md] = await Promise.all([lr.json(), mr.json()]);
      if (ld.success && ld.data) setStats(ld.data);
      if (md.success && md.data) setMeals(md.data);
    } catch {}
  };

  const refetch = async () => { if (user) await fetchData(user.id); };

  const logout = () => {
    setUser(null); setStats(null); setMeals([]);
    localStorage.removeItem("dietActiveUser");
    router.push("/login");
  };

  const deleteMeal = (id: string, kcal: number) => {
    setMeals(p => p.filter(m => m.id !== id));
    setStats(p => p ? { ...p, total_calories_consumed: Math.max(0, p.total_calories_consumed - kcal) } : p);
  };

  useEffect(() => {
    const saved = localStorage.getItem("dietActiveUser");
    if (!saved) { router.replace("/login"); setLoading(false); return; }
    try { const u = JSON.parse(saved); setUser(u); fetchData(u.id); }
    catch { localStorage.removeItem("dietActiveUser"); router.replace("/login"); }
    finally { setLoading(false); }
  }, []);

  return (
    <UserCtx.Provider value={{ user, stats, meals, loading, refetch, logout, setStats, setMeals, deleteMeal }}>
      {children}
    </UserCtx.Provider>
  );
}
