"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types";

const ICONS = ["🍽️","🥤","☕","🛒","🚗","🛵","✈️","🚌","🏠","💡","💧","🔧","📱","💊","🏥","💪","🏫","📚","👗","👟","💄","🎮","🎬","🎵","🏖️","👨‍👩‍👧","🎁","🐾","💼","💰","📈","🏦","💸","🔔","🧾","📦"];
const COLORS = ["#3b82f6","#22c55e","#ef4444","#f97316","#8b5cf6","#ec4899","#f59e0b","#6b7280","#14b8a6","#06b6d4"];

const DEFAULT_EXPENSE = [
  { name: "Makan & Minum", icon: "🍽️", color: "#f97316" },
  { name: "Transportasi", icon: "🚗", color: "#3b82f6" },
  { name: "Belanja", icon: "🛒", color: "#ec4899" },
  { name: "Tagihan & Utilitas", icon: "💡", color: "#f59e0b" },
  { name: "Kesehatan", icon: "💊", color: "#22c55e" },
  { name: "Pendidikan", icon: "📚", color: "#8b5cf6" },
  { name: "Hiburan", icon: "🎮", color: "#06b6d4" },
  { name: "Olahraga", icon: "💪", color: "#14b8a6" },
  { name: "Perawatan Diri", icon: "💄", color: "#ec4899" },
  { name: "Keluarga & Sosial", icon: "👨‍👩‍👧", color: "#f97316" },
  { name: "Liburan & Travel", icon: "✈️", color: "#3b82f6" },
  { name: "Cicilan & Pinjaman", icon: "🏦", color: "#ef4444" },
  { name: "Langganan Digital", icon: "📱", color: "#6b7280" },
  { name: "Perbaikan & Renovasi", icon: "🔧", color: "#f59e0b" },
  { name: "Lainnya", icon: "📦", color: "#6b7280" },
];

const DEFAULT_INCOME = [
  { name: "Gaji", icon: "💼", color: "#22c55e" },
  { name: "Bonus & THR", icon: "🎁", color: "#f59e0b" },
  { name: "Investasi", icon: "📈", color: "#3b82f6" },
  { name: "Bisnis", icon: "🏢", color: "#8b5cf6" },
  { name: "Transfer Masuk", icon: "💸", color: "#14b8a6" },
  { name: "Lainnya", icon: "💰", color: "#6b7280" },
];

export default function CategoriesPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"expense" | "income">("expense");
  const [showForm, setShowForm] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState({ name: "", icon: "📦", color: "#6b7280", type: "expense" as "expense" | "income" });
  const [submitting, setSubmitting] = useState(false);
  const [seedingDefaults, setSeedingDefaults] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from("profiles").select("family_id, role").eq("id", user.id).single();
    if (!profile?.family_id) { setLoading(false); return; }

    setFamilyId(profile.family_id);
    setIsAdmin(profile.role === "admin");

    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .eq("family_id", profile.family_id)
      .order("type")
      .order("name");

    setCategories(cats ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId) return;
    setSubmitting(true);

    const { error } = await supabase.from("categories").insert({
      family_id: familyId,
      name: form.name,
      icon: form.icon,
      color: form.color,
      type: tab,
    });

    if (!error) {
      setForm({ name: "", icon: "📦", color: "#6b7280", type: "expense" });
      setShowForm(false);
      loadData();
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus kategori ini? Transaksi yang sudah ada tidak akan terhapus.")) return;
    await supabase.from("categories").delete().eq("id", id);
    loadData();
  }

  async function handleSeedDefaults() {
    if (!familyId) return;
    setSeedingDefaults(true);
    const defaults = [
      ...DEFAULT_EXPENSE.map(c => ({ ...c, type: "expense", family_id: familyId })),
      ...DEFAULT_INCOME.map(c => ({ ...c, type: "income", family_id: familyId })),
    ];
    await supabase.from("categories").insert(defaults);
    loadData();
    setSeedingDefaults(false);
  }

  const filtered = categories.filter(c => c.type === tab);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kategori</h1>
        {isAdmin && (
          <div className="flex gap-2">
            {categories.length === 0 && (
              <button onClick={handleSeedDefaults} disabled={seedingDefaults} className="btn-secondary text-sm">
                {seedingDefaults ? "Menambahkan..." : "✨ Tambah Default"}
              </button>
            )}
            <button onClick={() => setShowForm(true)} className="btn-primary">+ Tambah</button>
          </div>
        )}
      </div>

      {/* Tab */}
      <div className="flex gap-2 mb-4">
        {(["expense", "income"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-primary-600 text-white" : "bg-white text-gray-600 border border-gray-300"}`}
          >
            {t === "expense" ? "💸 Pengeluaran" : "💰 Pemasukan"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">🗂️</p>
          <p className="mb-3">Belum ada kategori {tab === "expense" ? "pengeluaran" : "pemasukan"}</p>
          {isAdmin && categories.length === 0 && (
            <button onClick={handleSeedDefaults} disabled={seedingDefaults} className="btn-secondary text-sm mx-auto">
              {seedingDefaults ? "Menambahkan..." : "✨ Tambah Kategori Default"}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map(c => (
            <div key={c.id} className="card flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: c.color + "20" }}>
                  {c.icon}
                </div>
                <span className="text-sm font-medium text-gray-800">{c.name}</span>
              </div>
              {isAdmin && (
                <button onClick={() => handleDelete(c.id)} className="text-gray-300 hover:text-red-500 text-lg flex-shrink-0">×</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Tambah Kategori</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nama Kategori</label>
                <input
                  type="text"
                  className="input"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Makan siang, gym, dll"
                />
              </div>
              <div>
                <label className="label">Icon</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {ICONS.map(ic => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setForm({ ...form, icon: ic })}
                      className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-colors ${form.icon === ic ? "bg-primary-100 ring-2 ring-primary-400" : "bg-gray-100 hover:bg-gray-200"}`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Warna</label>
                <div className="flex gap-2 mt-1">
                  {COLORS.map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setForm({ ...form, color: col })}
                      className={`w-8 h-8 rounded-full transition-transform ${form.color === col ? "scale-125 ring-2 ring-offset-1 ring-gray-400" : ""}`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>
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
