"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatIDR, toIDR, CURRENCIES } from "@/lib/currencies";
import { getCurrentMonth, getMonthName } from "@/lib/utils";
import type { Budget, Category, Currency } from "@/types";

const CURRENCY_LIST = Object.keys(CURRENCIES) as Currency[];

export default function BudgetPage() {
  const supabase = createClient();
  const { month, year } = getCurrentMonth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [spentMap, setSpentMap] = useState<Record<string, number>>({});
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ category_id: "", amount: "", currency: "IDR" as Currency, scope: "personal" });
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from("profiles").select("family_id").eq("id", user.id).single();
    if (!profile?.family_id) return;

    const [{ data: buds }, { data: cats }, { data: txs }] = await Promise.all([
      supabase.from("budgets").select("*, categories(name, icon, color)").eq("family_id", profile.family_id).eq("month", month).eq("year", year),
      supabase.from("categories").select("*").eq("family_id", profile.family_id).eq("type", "expense"),
      supabase.from("transactions").select("category_id, amount_idr").eq("family_id", profile.family_id).eq("type", "expense")
        .gte("date", `${year}-${String(month).padStart(2, "0")}-01`)
        .lt("date", `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}-01`),
    ]);

    const spent: Record<string, number> = {};
    txs?.forEach((t) => {
      if (t.category_id) spent[t.category_id] = (spent[t.category_id] ?? 0) + t.amount_idr;
    });

    setBudgets(buds ?? []);
    setCategories(cats ?? []);
    setSpentMap(spent);
    setLoading(false);
  }, [supabase, month, year]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("family_id").eq("id", user.id).single();

    await supabase.from("budgets").upsert({
      family_id: profile?.family_id,
      user_id: form.scope === "personal" ? user.id : null,
      category_id: form.category_id,
      amount: Number(form.amount),
      currency: form.currency,
      month,
      year,
    }, { onConflict: "family_id,category_id,month,year,user_id" });

    setForm({ category_id: "", amount: "", currency: "IDR", scope: "personal" });
    setShowForm(false);
    loadData();
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus budget ini?")) return;
    await supabase.from("budgets").delete().eq("id", id);
    loadData();
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget</h1>
          <p className="text-sm text-gray-500">{getMonthName(month)} {year}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Tambah</button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat...</div>
      ) : budgets.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">📋</p>
          <p>Belum ada budget bulan ini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => {
            const budgetIDR = toIDR(b.amount, b.currency as Currency);
            const spent = spentMap[b.category_id] ?? 0;
            const pct = Math.min((spent / budgetIDR) * 100, 100);
            const over = spent > budgetIDR;

            return (
              <div key={b.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{(b as any).categories?.icon}</span>
                    <span className="font-medium text-gray-800 text-sm">{(b as any).categories?.name}</span>
                    {!b.user_id && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Keluarga</span>}
                  </div>
                  <button onClick={() => handleDelete(b.id)} className="text-gray-300 hover:text-red-500 text-lg">×</button>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Terpakai: {formatIDR(spent)}</span>
                  <span className={over ? "text-red-600 font-semibold" : ""}>Budget: {formatIDR(budgetIDR)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${over ? "bg-red-500" : pct > 80 ? "bg-orange-400" : "bg-green-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {over && <p className="text-xs text-red-600 mt-1">Melebihi budget {formatIDR(spent - budgetIDR)}</p>}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Tambah Budget</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Kategori</label>
                <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required>
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="label">Jumlah Budget</label>
                  <input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="0" placeholder="0" />
                </div>
                <div>
                  <label className="label">Mata Uang</label>
                  <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}>
                    {CURRENCY_LIST.map((c) => <option key={c} value={c}>{CURRENCIES[c].flag} {c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Berlaku untuk</label>
                <select className="input" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
                  <option value="personal">Saya Sendiri</option>
                  <option value="family">Seluruh Keluarga</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Batal</button>
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
