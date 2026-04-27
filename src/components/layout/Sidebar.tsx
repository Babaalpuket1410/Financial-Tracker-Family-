"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/transactions", label: "Transaksi", icon: "💸" },
  { href: "/budget", label: "Budget", icon: "📋" },
  { href: "/reports", label: "Laporan", icon: "📈" },
  { href: "/savings", label: "Tabungan", icon: "🏦" },
  { href: "/reminders", label: "Tagihan", icon: "🔔" },
  { href: "/family", label: "Keluarga", icon: "👨‍👩‍👧‍👦" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <span className="font-bold text-gray-900 text-lg">Family Finance</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-primary-50 text-primary-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 w-full transition-colors"
        >
          <span>🚪</span>
          Keluar
        </button>
      </div>
    </aside>
  );
}
