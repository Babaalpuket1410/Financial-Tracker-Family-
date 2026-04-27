import { createClient } from "@/lib/supabase/server";
import { formatIDR } from "@/lib/currencies";
import { getMonthName, getCurrentMonth } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { month, year } = getCurrentMonth();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, families(name)")
    .eq("id", user.id)
    .single();

  const familyId = profile?.family_id;

  // This month transactions for the whole family
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("family_id", familyId)
    .gte("date", `${year}-${String(month).padStart(2, "0")}-01`)
    .lte("date", `${year}-${String(month).padStart(2, "0")}-31`);

  const totalIncome = transactions?.filter((t) => t.type === "income").reduce((s, t) => s + t.amount_idr, 0) ?? 0;
  const totalExpense = transactions?.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount_idr, 0) ?? 0;
  const balance = totalIncome - totalExpense;

  // My own stats
  const myIncome = transactions?.filter((t) => t.user_id === user.id && t.type === "income").reduce((s, t) => s + t.amount_idr, 0) ?? 0;
  const myExpense = transactions?.filter((t) => t.user_id === user.id && t.type === "expense").reduce((s, t) => s + t.amount_idr, 0) ?? 0;

  // Unpaid reminders
  const { data: reminders } = await supabase
    .from("reminders")
    .select("*")
    .eq("family_id", familyId)
    .eq("is_paid", false)
    .lte("due_date", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
    .order("due_date");

  // Recent transactions
  const recentTx = transactions?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Halo, {profile?.full_name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm">
          {(profile as any)?.families?.name} · {getMonthName(month)} {year}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <p className="text-xs text-green-700 font-medium mb-1">Pemasukan Keluarga</p>
          <p className="text-xl font-bold text-green-800">{formatIDR(totalIncome)}</p>
        </div>
        <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <p className="text-xs text-red-700 font-medium mb-1">Pengeluaran Keluarga</p>
          <p className="text-xl font-bold text-red-800">{formatIDR(totalExpense)}</p>
        </div>
        <div className={`card bg-gradient-to-br border ${balance >= 0 ? "from-blue-50 to-blue-100 border-blue-200" : "from-orange-50 to-orange-100 border-orange-200"}`}>
          <p className={`text-xs font-medium mb-1 ${balance >= 0 ? "text-blue-700" : "text-orange-700"}`}>Saldo Bersih</p>
          <p className={`text-xl font-bold ${balance >= 0 ? "text-blue-800" : "text-orange-800"}`}>{formatIDR(balance)}</p>
        </div>
      </div>

      {/* My Stats */}
      <div className="card mb-6">
        <h2 className="font-semibold text-gray-700 mb-3 text-sm">Keuangan Saya Bulan Ini</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Pemasukan</p>
            <p className="font-semibold text-green-600">{formatIDR(myIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pengeluaran</p>
            <p className="font-semibold text-red-600">{formatIDR(myExpense)}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700 text-sm">Transaksi Terbaru</h2>
            <Link href="/transactions" className="text-xs text-primary-600 hover:underline">Lihat semua</Link>
          </div>
          {recentTx && recentTx.length > 0 ? (
            <div className="space-y-2">
              {recentTx.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{tx.description || "Tanpa keterangan"}</p>
                    <p className="text-xs text-gray-400">{tx.date}</p>
                  </div>
                  <span className={`text-sm font-semibold ${tx.type === "income" ? "text-green-600" : "text-red-600"}`}>
                    {tx.type === "income" ? "+" : "-"}{formatIDR(tx.amount_idr)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Belum ada transaksi bulan ini</p>
          )}
        </div>

        {/* Upcoming Reminders */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700 text-sm">Tagihan Mendatang</h2>
            <Link href="/reminders" className="text-xs text-primary-600 hover:underline">Lihat semua</Link>
          </div>
          {reminders && reminders.length > 0 ? (
            <div className="space-y-2">
              {reminders.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.title}</p>
                    <p className="text-xs text-gray-400">Jatuh tempo: {r.due_date}</p>
                  </div>
                  {r.amount && (
                    <span className="text-sm font-semibold text-orange-600">{formatIDR(r.amount)}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Tidak ada tagihan mendatang</p>
          )}
        </div>
      </div>

      {/* Quick Add */}
      <div className="mt-6">
        <Link
          href="/transactions?new=1"
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          <span>+</span> Tambah Transaksi
        </Link>
      </div>
    </div>
  );
}
