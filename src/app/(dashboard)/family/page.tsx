"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

export default function FamilyPage() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile & { families: { name: string } | null } | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUser({ id: user.id, email: user.email ?? "" });

    const { data: prof } = await supabase
      .from("profiles")
      .select("*, families(name)")
      .eq("id", user.id)
      .single();

    setProfile(prof as any);
    setFamilyName((prof as any)?.families?.name ?? "");

    if (prof?.family_id) {
      const { data: mems } = await supabase
        .from("profiles")
        .select("*")
        .eq("family_id", prof.family_id)
        .order("created_at");
      setMembers(mems ?? []);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleUpdateFamilyName(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.family_id) return;
    setSaving(true);
    await supabase.from("families").update({ name: familyName }).eq("id", profile.family_id);
    setMessage("Nama keluarga berhasil diperbarui!");
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
    loadData();
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.from("profiles").update({ full_name: profile?.full_name }).eq("id", currentUser!.id);
    setMessage("Profil berhasil diperbarui!");
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleGenerateInvite() {
    if (!profile?.family_id) return;
    // In production, you'd generate a secure invite token.
    // For simplicity, we show the family ID as invite code.
    setInviteLink(`Kode undangan keluarga: ${profile.family_id}\n\nBagikan kode ini kepada anggota keluarga. Mereka daftar akun baru dan masukkan kode ini di halaman profil mereka.`);
  }

  async function handleJoinFamily(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);

    // Check if family exists
    const { data: family } = await supabase.from("families").select("id, name").eq("id", inviteEmail.trim()).single();

    if (!family) {
      setMessage("Kode keluarga tidak valid.");
      setSaving(false);
      return;
    }

    await supabase.from("profiles").update({ family_id: family.id, role: "member" }).eq("id", currentUser.id);
    setMessage(`Berhasil bergabung ke keluarga ${family.name}!`);
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
    loadData();
  }

  async function handleChangeRole(memberId: string, newRole: "admin" | "member") {
    await supabase.from("profiles").update({ role: newRole }).eq("id", memberId);
    loadData();
  }

  async function handleDeleteFamily() {
    if (!confirm(`Hapus keluarga "${(profile as any)?.families?.name}"? Semua data transaksi, budget, tabungan, dan tagihan keluarga akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.`)) return;
    setSaving(true);
    const { error } = await supabase.rpc("delete_family_for_user");
    if (error) {
      setMessage("Gagal menghapus keluarga: " + error.message);
    } else {
      window.location.href = "/dashboard";
    }
    setSaving(false);
  }

  if (loading) return <div className="p-6 text-center text-gray-400">Memuat...</div>;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Keluarga</h1>

      {message && (
        <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-2 text-sm">{message}</div>
      )}

      {/* My Profile */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-3">Profil Saya</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-3">
          <div>
            <label className="label">Nama Lengkap</label>
            <input
              type="text"
              className="input"
              value={profile?.full_name ?? ""}
              onChange={(e) => setProfile(profile ? { ...profile, full_name: e.target.value } : null)}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input bg-gray-50 text-gray-400 cursor-not-allowed" value={currentUser?.email} disabled />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>Simpan Profil</button>
        </form>
      </div>

      {/* Family Info */}
      {profile?.family_id ? (
        <>
          <div className="card">
            <h2 className="font-semibold text-gray-700 mb-3">Nama Keluarga</h2>
            <form onSubmit={handleUpdateFamilyName} className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                disabled={profile.role !== "admin"}
              />
              {profile.role === "admin" && (
                <button type="submit" className="btn-primary" disabled={saving}>Simpan</button>
              )}
            </form>
          </div>

          {/* Members */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-700">Anggota Keluarga ({members.length})</h2>
              {profile.role === "admin" && (
                <button onClick={handleGenerateInvite} className="btn-secondary text-sm py-1.5">
                  🔗 Kode Undangan
                </button>
              )}
            </div>

            {inviteLink && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-sm text-blue-800 whitespace-pre-wrap">{inviteLink}</div>
            )}

            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {m.full_name}
                      {m.id === currentUser?.id && " (Saya)"}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.role === "admin" ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-600"}`}>
                      {m.role === "admin" ? "Admin" : "Anggota"}
                    </span>
                  </div>
                  {profile.role === "admin" && m.id !== currentUser?.id && (
                    <button
                      onClick={() => handleChangeRole(m.id, m.role === "admin" ? "member" : "admin")}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      {m.role === "admin" ? "Jadikan Anggota" : "Jadikan Admin"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          {profile.role === "admin" && (
            <div className="card border border-red-200">
              <h2 className="font-semibold text-red-600 mb-1">Zona Berbahaya</h2>
              <p className="text-xs text-gray-500 mb-3">Menghapus keluarga akan menghapus semua data transaksi, budget, tabungan, dan tagihan secara permanen.</p>
              <button
                onClick={handleDeleteFamily}
                disabled={saving}
                className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
              >
                🗑️ Hapus Keluarga
              </button>
            </div>
          )}
        </>
      ) : (
        /* Join Family */
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-3">Bergabung ke Keluarga</h2>
          <p className="text-sm text-gray-500 mb-3">Masukkan kode undangan dari admin keluarga.</p>
          <form onSubmit={handleJoinFamily} className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Masukkan kode undangan..."
              required
            />
            <button type="submit" className="btn-primary" disabled={saving}>Bergabung</button>
          </form>
        </div>
      )}
    </div>
  );
}
