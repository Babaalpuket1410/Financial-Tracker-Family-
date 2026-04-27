-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Families table
create table families (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  family_id uuid references families(id) on delete set null,
  role text not null default 'member' check (role in ('admin', 'member')),
  avatar_url text,
  created_at timestamptz default now()
);

-- Categories
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text not null default '💰',
  color text not null default '#3b82f6',
  family_id uuid references families(id) on delete cascade,
  created_at timestamptz default now()
);

-- Transactions
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  amount numeric not null check (amount > 0),
  currency text not null default 'IDR',
  amount_idr numeric not null,
  category_id uuid references categories(id) on delete set null,
  description text,
  date date not null default current_date,
  type text not null check (type in ('income', 'expense')),
  created_at timestamptz default now()
);

-- Budgets
create table budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  amount numeric not null check (amount > 0),
  currency text not null default 'IDR',
  month integer not null check (month between 1 and 12),
  year integer not null,
  created_at timestamptz default now(),
  unique (family_id, category_id, month, year, user_id)
);

-- Savings Goals
create table savings_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  target_amount numeric not null check (target_amount > 0),
  current_amount numeric not null default 0 check (current_amount >= 0),
  currency text not null default 'IDR',
  deadline date,
  created_at timestamptz default now()
);

-- Reminders
create table reminders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  amount numeric check (amount > 0),
  currency text not null default 'IDR',
  due_date date not null,
  is_paid boolean not null default false,
  recurring text not null default 'none' check (recurring in ('none', 'monthly', 'yearly')),
  created_at timestamptz default now()
);

-- Row Level Security
alter table families enable row level security;
alter table profiles enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table savings_goals enable row level security;
alter table reminders enable row level security;

-- RLS Policies: Profiles
create policy "Users can view their own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);
create policy "Family members can view each other" on profiles for select using (
  family_id in (select family_id from profiles where id = auth.uid())
);

-- RLS Policies: Families
create policy "Family members can view their family" on families for select using (
  id in (select family_id from profiles where id = auth.uid())
);
create policy "Admins can update family" on families for update using (
  id in (select family_id from profiles where id = auth.uid() and role = 'admin')
);

-- RLS Policies: Categories
create policy "Family members can view categories" on categories for select using (
  family_id in (select family_id from profiles where id = auth.uid())
);
create policy "Admins can manage categories" on categories for all using (
  family_id in (select family_id from profiles where id = auth.uid() and role = 'admin')
);

-- RLS Policies: Transactions
create policy "Family members can view transactions" on transactions for select using (
  family_id in (select family_id from profiles where id = auth.uid())
);
create policy "Users can insert own transactions" on transactions for insert with check (
  auth.uid() = user_id and
  family_id in (select family_id from profiles where id = auth.uid())
);
create policy "Users can update own transactions" on transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions" on transactions for delete using (auth.uid() = user_id);

-- RLS Policies: Budgets
create policy "Family members can view budgets" on budgets for select using (
  family_id in (select family_id from profiles where id = auth.uid())
);
create policy "Members can manage own budgets" on budgets for all using (
  family_id in (select family_id from profiles where id = auth.uid())
);

-- RLS Policies: Savings Goals
create policy "Family members can view savings" on savings_goals for select using (
  family_id in (select family_id from profiles where id = auth.uid())
);
create policy "Users can manage own savings" on savings_goals for all using (auth.uid() = user_id);

-- RLS Policies: Reminders
create policy "Family members can view reminders" on reminders for select using (
  family_id in (select family_id from profiles where id = auth.uid())
);
create policy "Users can manage own reminders" on reminders for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'User'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Default categories (inserted when family is created via app)
-- These are seeded programmatically in the app
