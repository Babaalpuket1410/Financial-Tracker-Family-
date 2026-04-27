"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, CURRENCIES } from "@/lib/currencies";
import type { Reminder, Currency, RecurringType } from "@/types";

const CURRENCY_LIST = Object.keys(CURRENCIES) as Currency[];

export default function RemindersPage() {
  const supabase = createClient();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"upcoming" | "paid" | "all">("upcoming");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    amount: "",
    currency: "IDR" as Currency,
    due_date: "",
    recurring: "none" as RecurringType,
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("family_id").eq("id", user.id).single();
    if (!profile?.family_id) return;

    const { data } = await supabase
      .from("reminders")
      .select("*")
      .eq("family_id", profile.family_id)
      .order("due_date");

    setReminders((data as Reminder[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }
    const { data: profile } = await supabase.from("profiles").select("family_id").eq("id", user.id).single();
    if (!profile?.family_id) { setSubmitting(false); return; }

    const { error } = await supabase.from("reminders").insert({
      user_id: user.id,
      family_id: profile.family_id,
      title: form.title,
      amount: form.amount ? Number(form.amount) : null,
      currency: form.currency,
      due_date: form.due_date,
      recurring: form.recurring,
    });

    if (!error) {
      setForm({ title: "", amount: "", currency: "IDR", due_date: "", recurring: "none" });
      setShowForm(false);
      loadData();
    }
    setSubmitting(false);
  }

  async function togglePaid(r: Reminder) {
    await supabase.from("reminders").update({ is_paid: !r.is_paid }).eq("id", r.id);

    // If recurring and marking as paid, create next occurrence
    if (!r.is_paid && r.recurring !== "none") {
      const nextDate = new Date(r.due_date);
      if (r.recurring === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
      else nextDate.setFullYear(nextDate.getFullYear() + 1);

      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("family_id").eq("id", user!.id).single();

      await supabase.from("reminders").insert({
        user_id: r.user_id,
        family_id: profile?.family_id,
        title: r.title,
        amount: r.amount,
        currency: r.currency,
        due_date: nextDate.toISOString().split("T")[0],
        recurring: r.recurring,
        is_paid: false,
      });
    }

    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus reminder ini?")) return;
    await supabase.from("reminders").delete().eq("id", id);
    loadData();
  }

  const today = new Date().toISOString().split("T")[0];
  const filtered = reminders.filter((r) => {
    if (filter === "upcoming") return !r.is_paid;
    if (filter === "paid") return r.is_paid;
    return true;
  });

  function getDueBadge(r: Reminder) {
    if (r.is_paid) return { label: "Lunas", color: "bg-green-100 text-green-700" };
    if (r.due_date < today) return { label: "Terlambat!", color: "bg-red-100 text-red-700" };
    const diff = Math.ceil((new Date(r.due_date).getTime() - Date.now()) / 86400000);
    if (diff <= 3) return { label: `${diff} hari lagi`, color: "bg-orange-100 text-orange-700" };
    return { label: `${diff} hari lagi`, color: "bg-gray-100 text-gray-600" };
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tagihan & Reminder</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Tambah</button>
      </div>

      <div className="flex gap-2 mb-4">
        {(["upcoming", "paid", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-primary-600 text-white" : "bg-white text-gray-600 border border-gray-300"}`}
          >
            {f === "upcoming" ? "Belum Lunas" : f === "paid" ? "Lunas" : "Semua"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">🔔</p>
          <p>Tidak ada tagihan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const badge = getDueBadge(r);
            return (
              <div key={r.id} className={`card flex items-center gap-3 ${r.is_paid ? "opacity-60" : ""}`}>
                <button
                  onClick={() => togglePaid(r)}
                  className={`w-6 h-6 rounded-full border-2 flex-shrink-0 transition-colors ${r.is_paid ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-green-400"}`}
                >
                  {r.is_paid && <span className="text-white text-xs flex items-center justify-center w-full h-full">✓</span>}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-medium text-sm ${r.is_paid ? "line-through text-gray-400" : "text-gray-800"}`}>{r.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                    {r.recurring !== "none" && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        {r.recurring === "monthly" ? "🔄 Bulanan" : "🔄 Tahunan"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{r.due_date}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.amount && (
                    <span className="text-sm font-semibold text-gray-700">{formatCurrency(r.amount, r.currency as Currency)}</span>
                  )}
                  <button onClick={() => handleDelete(r.id)} className="text-gray-300 hover:text-red-500 text-lg">×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Tambah Tagihan</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nama Tagihan</label>
                <input type="text" className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Listrik, WiFi, dll" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="label">Jumlah (opsional)</label>
                  <input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} min="0" placeholder="0" />
                </div>
                <div>
                  <label className="label">Mata Uang</label>
                  <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}>
                    {CURRENCY_LIST.map((c) => <option key={c} value={c}>{CURRENCIES[c].flag} {c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Jatuh Tempo</label>
                <input type="date" className="input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required />
              </div>
              <div>
                <label className="label">Berulang</label>
                <select className="input" value={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.value as RecurringType })}>
                  <option value="none">Tidak Berulang</option>
                  <option value="monthly">Setiap Bulan</option>
                  <option value="yearly">Setiap Tahun</option>
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
