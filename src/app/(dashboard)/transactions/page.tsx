"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatIDR, CURRENCIES } from "@/lib/currencies";
import type { Transaction, Category, Currency, TransactionType } from "@/types";

const CURRENCY_LIST = Object.keys(CURRENCIES) as Currency[];

export default function TransactionsPage() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  // Form state
  const [form, setForm] = useState({
    type: "expense" as TransactionType,
    amount: "",
    currency: "IDR" as Currency,
    category_id: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from("profiles").select("family_id").eq("id", user.id).single();
    if (!profile?.family_id) { setLoading(false); return; }

    const [{ data: txs }, { data: cats }] = await Promise.all([
      supabase
        .from("transactions")
        .select("*, categories(name, icon, color), profiles(full_name)")
        .eq("family_id", profile.family_id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("categories").select("*").eq("family_id", profile.family_id).order("name"),
    ]);

    setTransactions((txs as Transaction[]) ?? []);
    setCategories(cats ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    const { data: profile } = await supabase.from("profiles").select("family_id").eq("id", user.id).single();
    if (!profile?.family_id) {
      setSubmitError("Profil tidak memiliki keluarga. Pastikan akun sudah terhubung ke keluarga.");
      setSubmitting(false);
      return;
    }

    const { toIDR } = await import("@/lib/currencies");
    const amount_idr = toIDR(Number(form.amount), form.currency);

    const { error: insertError } = await supabase.from("transactions").insert({
      user_id: user.id,
      family_id: profile.family_id,
      amount: Number(form.amount),
      currency: form.currency,
      amount_idr,
      category_id: form.category_id || null,
      description: form.description || null,
      date: form.date,
      type: form.type,
    });

    if (insertError) {
      setSubmitError("Gagal menyimpan: " + insertError.message);
      setSubmitting(false);
      return;
    }

    setForm({ type: "expense", amount: "", currency: "IDR", category_id: "", description: "", date: new Date().toISOString().split("T")[0] });
    setShowForm(false);
    loadData();
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus transaksi ini?")) return;
    await supabase.from("transactions").delete().eq("id", id);
    loadData();
  }

  const filtered = filter === "all" ? transactions : transactions.filter((t) => t.type === filter);
  const filteredCats = categories.filter((c) => c.type === form.type);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transaksi</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Tambah</button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(["all", "income", "expense"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-primary-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"}`}
          >
            {f === "all" ? "Semua" : f === "income" ? "Pemasukan" : "Pengeluaran"}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">📭</p>
          <p>Belum ada transaksi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx) => (
            <div key={tx.id} className="card flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{(tx as any).categories?.icon ?? "💸"}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{tx.description || (tx as any).categories?.name || "Transaksi"}</p>
                  <p className="text-xs text-gray-400">{(tx as any).profiles?.full_name} · {tx.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`font-semibold text-sm ${tx.type === "income" ? "text-green-600" : "text-red-600"}`}>
                    {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount, tx.currency as Currency)}
                  </p>
                  {tx.currency !== "IDR" && (
                    <p className="text-xs text-gray-400">{formatIDR(tx.amount_idr)}</p>
                  )}
                </div>
                <button onClick={() => handleDelete(tx.id)} className="text-gray-300 hover:text-red-500 transition-colors text-lg">×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Tambah Transaksi</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type */}
              <div className="flex gap-2">
                {(["expense", "income"] as TransactionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, type: t, category_id: "" })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.type === t ? (t === "income" ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300") : "bg-white text-gray-600 border-gray-300"}`}
                  >
                    {t === "income" ? "💰 Pemasukan" : "💸 Pengeluaran"}
                  </button>
                ))}
              </div>

              {/* Amount + Currency */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="label">Jumlah</label>
                  <input
                    type="number"
                    className="input"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                    min="0"
                    step="any"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="label">Mata Uang</label>
                  <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}>
                    {CURRENCY_LIST.map((c) => (
                      <option key={c} value={c}>{CURRENCIES[c].flag} {c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="label">Kategori</label>
                <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">-- Pilih Kategori --</option>
                  {filteredCats.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="label">Keterangan (opsional)</label>
                <input
                  type="text"
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Makan siang, bayar listrik, dll"
                />
              </div>

              {/* Date */}
              <div>
                <label className="label">Tanggal</label>
                <input
                  type="date"
                  className="input"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>

              {submitError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{submitError}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Batal</button>
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
