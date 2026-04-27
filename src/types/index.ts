export type Currency = "IDR" | "USD" | "EUR" | "GBP" | "JPY" | "SGD" | "AUD" | "CNY";

export type TransactionType = "income" | "expense";

export type RecurringType = "none" | "monthly" | "yearly";

export interface Family {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  family_id: string | null;
  role: "admin" | "member";
  avatar_url: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  family_id: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  family_id: string;
  amount: number;
  currency: Currency;
  amount_idr: number;
  category_id: string;
  description: string | null;
  date: string;
  type: TransactionType;
  created_at: string;
  category?: Category;
  profile?: Profile;
}

export interface Budget {
  id: string;
  user_id: string | null;
  family_id: string;
  category_id: string;
  amount: number;
  currency: Currency;
  month: number;
  year: number;
  created_at: string;
  category?: Category;
  spent?: number;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  family_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: Currency;
  deadline: string | null;
  created_at: string;
  profile?: Profile;
}

export interface Reminder {
  id: string;
  user_id: string;
  family_id: string;
  title: string;
  amount: number | null;
  currency: Currency;
  due_date: string;
  is_paid: boolean;
  recurring: RecurringType;
  created_at: string;
  profile?: Profile;
}

export interface ExchangeRates {
  base: "IDR";
  rates: Record<Currency, number>;
}
