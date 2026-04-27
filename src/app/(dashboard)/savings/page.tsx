"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatIDR, toIDR, CURRENCIES } from "@/lib/currencies";
import type { SavingsGoal, Currency } from "@/types";

const CURRENCY_LIST = Object.keys(CURRENCIES) as Currency[];

export default function SavingsPage() {
  const supabase = createClient();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showAddFund, setShowAddFund] = useState<SavingsGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", target_amount: "", currency: "IDR" as Currency, deadline: "", scope: "personal" });
  const [fundAmount, setFundAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("family_id").eq("id", user.id).single();
    if (!profile?.family_id) return;

    const { data } = await supabase
      .from("savings_goals")
      .select("*, profiles(full_name)")
      .eq("family_id", profile.family_id)
      .order("created_at", { ascending: false });

    setGoals((data as SavingsGoal[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("family_id").eq("id", user.id).single();

    await supabase.from("savings_goals").insert({
      user_id: user.id,
      family_id: profile?.family_id,
      name: form.name,
      target_amount: Number(form.target_amount),
      current_amount: 0,
      currency: form.currency,
      deadline: form.deadline || null,
    });

    setForm({ name: "", target_amount: "", currency: "IDR", deadline: "", scope: "personal" });
    setShowForm(false);
    loadData();
    setSubmitting(false);
  }

  async function handleAddFund(e: React.FormEvent) {
    e.preventDefault();
    if (!showAddFund) return;
    setSubmitting(true);

    const newAmount = showAddFund.current_amount + Number(fundAmount);
    await supabase.from("savings_goals").update({ current_amount: newAmount }).eq("id", showAddFund.id);

    setFundAmount("");
    setShowAddFund(null);
    loadData();
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus goal tabungan ini?")) return;
    await supabase.from("savings_goals").delete().eq("id", id);
    loadData();
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tabungan & Goals</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Tambah</button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat...</div>
      ) : goals.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">🏦</p>
          <p>Belum ada goal tabungan</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {goals.map((g) => {
            const targetIDR = toIDR(g.target_amount, g.currency as Currency);
            const currentIDR = toIDR(g.current_amount, g.currency as Currency);
            const pct = Math.min((currentIDR / targetIDR) * 100, 100);
            const done = currentIDR >= targetIDR;

            return (
              <div key={g.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{g.name}</h3>
                    <p className="text-xs text-gray-400">{(g as any).profiles?.full_name}</p>
                    {g.deadline && <p className="text-xs text-gray-400">Target: {g.deadline}</p>}
                  </div>
                  <div className="flex gap-1">
                    {!done && (
                      <button onClick={() => setShowAddFund(g)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200 transition-colors">+ Dana</button>
                    )}
                    <button onClick={() => handleDelete(g.id)} className="text-gray-300 hover:text-red-500 text-lg">×</button>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{formatCurrency(g.current_amount, g.currency as Currency)}</span>
                    <span>{formatCurrency(g.target_amount, g.currency as Currency)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${done ? "bg-green-500" : "bg-primary-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${done ? "text-green-600" : "text-primary-600"}`}>
                    {pct.toFixed(1)}%
                  </span>
                  {done ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Tercapai! 🎉</span>
                  ) : (
                    <span className="text-xs text-gray-400">
                      Sisa: {formatCurrency(g.target_amount - g.current_amount, g.currency as Currency)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Goal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Tambah Goal Tabungan</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nama Goal</label>
                <input type="text" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Liburan ke Bali, DP Rumah, dll" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="label">Target</label>
                  <input type="number" className="input" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} required min="0" placeholder="0" />
                </div>
                <div>
                  <label className="label">Mata Uang</label>
                  <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}>
                    {CURRENCY_LIST.map((c) => <option key={c} value={c}>{CURRENCIES[c].flag} {c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Deadline (opsional)</label>
                <input type="date" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Batal</button>
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Fund Modal */}
      {showAddFund && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-1">Tambah Dana</h2>
            <p className="text-sm text-gray-500 mb-4">{showAddFund.name}</p>
            <form onSubmit={handleAddFund} className="space-y-4">
              <div>
                <label className="label">Jumlah ({showAddFund.currency})</label>
                <input type="number" className="input" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} required min="0" placeholder="0" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAddFund(null)} className="btn-secondary flex-1">Batal</button>
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
