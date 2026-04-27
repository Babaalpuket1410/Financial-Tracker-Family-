import type { Currency } from "@/types";

export const CURRENCIES: Record<Currency, { name: string; symbol: string; flag: string }> = {
  IDR: { name: "Rupiah", symbol: "Rp", flag: "🇮🇩" },
  USD: { name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  EUR: { name: "Euro", symbol: "€", flag: "🇪🇺" },
  GBP: { name: "Pound Sterling", symbol: "£", flag: "🇬🇧" },
  JPY: { name: "Japanese Yen", symbol: "¥", flag: "🇯🇵" },
  SGD: { name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬" },
  AUD: { name: "Australian Dollar", symbol: "A$", flag: "🇦🇺" },
  CNY: { name: "Yuan China", symbol: "¥", flag: "🇨🇳" },
};

// Approximate rates to IDR (update via API in production)
export const APPROXIMATE_RATES: Record<Currency, number> = {
  IDR: 1,
  USD: 16000,
  EUR: 17500,
  GBP: 20500,
  JPY: 105,
  SGD: 12000,
  AUD: 10500,
  CNY: 2200,
};

export function toIDR(amount: number, currency: Currency): number {
  return amount * APPROXIMATE_RATES[currency];
}

export function formatCurrency(amount: number, currency: Currency): string {
  const { symbol } = CURRENCIES[currency];
  if (currency === "IDR") {
    return `${symbol} ${amount.toLocaleString("id-ID")}`;
  }
  if (currency === "JPY") {
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  }
  return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}
