"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatIDR } from "@/lib/currencies";
import { getMonthName } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#f97316", "#22c55e", "#ef4444", "#8b5cf6", "#ec4899", "#f59e0b", "#6b7280"];

export default function ReportsPage() {
  const supabase = createClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [viewMode, setViewMode] = useState<"personal" | "family">("family");
  const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; expense: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; icon: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from("profiles").select("family_id").eq("id", user.id).single();
    if (!profile?.family_id) return;

    let query = supabase
      .from("transactions")
      .select("*, categories(name, icon)")
      .eq("family_id", profile.family_id)
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`);

    if (viewMode === "personal") query = query.eq("user_id", user.id);

    const { data: txs } = await query;

    // Monthly summary
    const monthly: Record<number, { income: number; expense: number }> = {};
    for (let m = 1; m <= 12; m++) monthly[m] = { income: 0, expense: 0 };

    txs?.forEach((t) => {
      const m = new Date(t.date).getMonth() + 1;
      if (t.type === "income") monthly[m].income += t.amount_idr;
      else monthly[m].expense += t.amount_idr;
    });

    setMonthlyData(
      Object.entries(monthly).map(([m, v]) => ({
        month: getMonthName(Number(m)).slice(0, 3),
        income: v.income,
        expense: v.expense,
      }))
    );

    // Category breakdown (expense)
    const catMap: Record<string, { value: number; icon: string }> = {};
    txs?.filter((t) => t.type === "expense").forEach((t) => {
      const name = (t as any).categories?.name ?? "Lainnya";
      const icon = (t as any).categories?.icon ?? "💸";
      catMap[name] = { value: (catMap[name]?.value ?? 0) + t.amount_idr, icon };
    });

    setCategoryData(
      Object.entries(catMap)
        .map(([name, { value, icon }]) => ({ name, value, icon }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
    );

    setLoading(false);
  }, [supabase, year, viewMode]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalIncome = monthlyData.reduce((s, d) => s + d.income, 0);
  const totalExpense = monthlyData.reduce((s, d) => s + d.expense, 0);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Laporan Keuangan</h1>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          className="input w-auto"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <div className="flex gap-2">
          {(["family", "personal"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === m ? "bg-primary-600 text-white" : "bg-white text-gray-600 border border-gray-300"}`}
            >
              {m === "family" ? "👨‍👩‍👧‍👦 Keluarga" : "👤 Saya"}
            </button>
          ))}
        </div>
      </div>

      {/* Annual Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Total Pemasukan</p>
          <p className="font-bold text-green-600 text-sm">{formatIDR(totalIncome)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Total Pengeluaran</p>
          <p className="font-bold text-red-600 text-sm">{formatIDR(totalExpense)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Net</p>
          <p className={`font-bold text-sm ${totalIncome - totalExpense >= 0 ? "text-blue-600" : "text-orange-600"}`}>
            {formatIDR(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat...</div>
      ) : (
        <div className="space-y-6">
          {/* Monthly Bar Chart */}
          <div className="card">
            <h2 className="font-semibold text-gray-700 mb-4 text-sm">Pemasukan vs Pengeluaran Bulanan</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                <Tooltip formatter={(v: number) => formatIDR(v)} />
                <Bar dataKey="income" fill="#22c55e" name="Pemasukan" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" name="Pengeluaran" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Pie Chart */}
          {categoryData.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-700 mb-4 text-sm">Pengeluaran per Kategori</h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatIDR(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {categoryData.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-700">{c.icon} {c.name}</span>
                    </div>
                    <span className="font-medium text-gray-800">{formatIDR(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
