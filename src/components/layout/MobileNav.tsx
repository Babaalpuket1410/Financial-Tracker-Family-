"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/transactions", label: "Transaksi", icon: "💸" },
  { href: "/budget", label: "Budget", icon: "📋" },
  { href: "/reports", label: "Laporan", icon: "📈" },
  { href: "/savings", label: "Tabungan", icon: "🏦" },
  { href: "/reminders", label: "Tagihan", icon: "🔔" },
  { href: "/categories", label: "Kategori", icon: "🗂️" },
  { href: "/family", label: "Keluarga", icon: "👨‍👩‍👧" },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex overflow-x-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium min-w-[64px] transition-colors",
              pathname === item.href
                ? "text-primary-600"
                : "text-gray-500"
            )}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="truncate w-full text-center">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
