"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
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

    // Sign in immediately to get a valid session
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Akun dibuat tapi gagal login otomatis. Coba masuk manual.");
      setLoading(false);
      return;
    }

    // Create family via secure function
    const { data: familyId, error: familyError } = await supabase
      .rpc("create_family_for_user", { family_name: familyName });

    if (familyError) {
      setError("Gagal membuat keluarga: " + familyError.message);
      setLoading(false);
      return;
    }

    // Seed default categories
    await seedDefaultCategories(supabase, familyId);

    router.push("/dashboard");
    router.refresh();
  }

  async function seedDefaultCategories(supabase: ReturnType<typeof createClient>, familyId: string) {
    const categories = [
      { name: "Gaji", type: "income", icon: "💼", color: "#22c55e" },
      { name: "Freelance", type: "income", icon: "💻", color: "#16a34a" },
      { name: "Investasi", type: "income", icon: "📈", color: "#15803d" },
      { name: "Lainnya (Pemasukan)", type: "income", icon: "💰", color: "#166534" },
      { name: "Makan & Minum", type: "expense", icon: "🍽️", color: "#f97316" },
      { name: "Transport", type: "expense", icon: "🚗", color: "#f59e0b" },
      { name: "Belanja", type: "expense", icon: "🛒", color: "#8b5cf6" },
      { name: "Kesehatan", type: "expense", icon: "🏥", color: "#ef4444" },
      { name: "Pendidikan", type: "expense", icon: "📚", color: "#3b82f6" },
      { name: "Hiburan", type: "expense", icon: "🎮", color: "#ec4899" },
      { name: "Tagihan", type: "expense", icon: "📄", color: "#6b7280" },
      { name: "Lainnya (Pengeluaran)", type: "expense", icon: "💸", color: "#9ca3af" },
    ];

    await supabase.from("categories").insert(
      categories.map((c) => ({ ...c, family_id: familyId }))
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 py-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">💰</div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Akun</h1>
          <p className="text-sm text-gray-500 mt-1">Buat akun dan keluarga baru</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="label">Nama Lengkap</label>
            <input
              type="text"
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Budi Santoso"
            />
          </div>
          <div>
            <label className="label">Nama Keluarga</label>
            <input
              type="text"
              className="input"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              required
              placeholder="Keluarga Santoso"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nama@email.com"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Min. 6 karakter"
              minLength={6}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Mendaftar..." : "Daftar"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-primary-600 font-medium hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
