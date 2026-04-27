"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Mode = "new" | "join";

export default function RegisterPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("new");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Pendaftaran gagal.");
      setLoading(false);
      return;
    }

    // Sign in immediately to get valid session
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Akun dibuat tapi gagal login otomatis. Coba masuk manual.");
      setLoading(false);
      return;
    }

    if (mode === "new") {
      // Create new family
      const { error: familyError } = await supabase.rpc("create_family_for_user", {
        family_name: familyName,
      });

      if (familyError) {
        setError("Gagal membuat keluarga: " + familyError.message);
        setLoading(false);
        return;
      }
    } else {
      // Join existing family
      const { data: family, error: familyError } = await supabase
        .from("families")
        .select("id, name")
        .eq("id", inviteCode.trim())
        .single();

      if (familyError || !family) {
        setError("Kode undangan tidak valid. Pastikan kode yang dimasukkan benar.");
        setLoading(false);
        return;
      }

      const { error: joinError } = await supabase
        .from("profiles")
        .update({ family_id: family.id, role: "member" })
        .eq("id", data.user.id);

      if (joinError) {
        setError("Gagal bergabung ke keluarga: " + joinError.message);
        setLoading(false);
        return;
      }
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 py-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">💰</div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Akun</h1>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-5 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === "new" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            Buat Keluarga Baru
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === "join" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            Gabung Keluarga
          </button>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="label">Nama Lengkap</label>
            <input type="text" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Nama lengkap" />
          </div>

          {mode === "new" ? (
            <div>
              <label className="label">Nama Keluarga</label>
              <input type="text" className="input" value={familyName} onChange={(e) => setFamilyName(e.target.value)} required placeholder="Keluarga Santoso" />
            </div>
          ) : (
            <div>
              <label className="label">Kode Undangan</label>
              <input type="text" className="input" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required placeholder="Paste kode dari admin keluarga" />
              <p className="text-xs text-gray-400 mt-1">Minta kode dari admin keluarga di menu Keluarga → Kode Undangan</p>
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="nama@email.com" />
          </div>

          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min. 6 karakter" minLength={6} />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Memproses..." : mode === "new" ? "Daftar & Buat Keluarga" : "Daftar & Gabung Keluarga"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-primary-600 font-medium hover:underline">Masuk</Link>
        </p>
      </div>
    </div>
  );
}
