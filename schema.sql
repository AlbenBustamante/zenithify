-- ============================================================
-- ZENITHIFY SAAS - SCHEMA.SQL
-- PostgreSQL + Supabase
-- Multi-tenant with Row Level Security (RLS)
-- Idempotent: Can be run multiple times without errors
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS (use IF NOT EXISTS for idempotency)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE billing_cycle AS ENUM ('monthly', 'yearly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE budget_period AS ENUM ('weekly', 'monthly', 'yearly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('task_due', 'plan_renewal', 'budget_alert', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  default_currency TEXT DEFAULT 'USD' CHECK (default_currency IN ('USD', 'VES')),
  timezone TEXT DEFAULT 'America/Caracas',
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES (predefined + user-created)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'both')),
  icon TEXT,
  color TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert predefined expense categories (ignore if exists)
INSERT INTO categories (name, type, icon, color, is_system)
SELECT 'Alimentación', 'expense', '🍽️', '#FF6B6B', true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Alimentación' AND is_system = true);

INSERT INTO categories (name, type, icon, color, is_system)
SELECT 'Transporte', 'expense', '🚗', '#4ECDC4', true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Transporte' AND is_system = true);

INSERT INTO categories (name, type, icon, color, is_system)
SELECT 'Vivienda', 'expense', '🏠', '#45B7D1', true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Vivienda' AND is_system = true);

INSERT INTO categories (name, type, icon, color, is_system)
SELECT 'Salud', 'expense', '💊', '#96CEB4', true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Salud' AND is_system = true);

INSERT INTO categories (name, type, icon, color, is_system)
SELECT 'Entretenimiento', 'expense', '🎬', '#FFEAA7', true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Entretenimiento' AND is_system = true);

INSERT INTO categories (name, type, icon, color, is_system)
SELECT 'Educación', 'expense', '📚', '#DDA0DD', true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Educación' AND is_system = true);

INSERT INTO categories (name, type, icon, color, is_system)
SELECT 'Servicios', 'expense', '💡', '#98D8C8', true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Servicios' AND is_system = true);

INSERT INTO categories (name, type, icon, color, is_system)
SELECT 'Otro Gasto', 'expense', '📦', '#B8B8B8', true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Otro Gasto' AND is_system = true);

INSERT INTO categories (name, type, icon, color, is_system)
SELECT 'Salario', 'income', '💰', '#6BCB77', true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Salario' AND is_system = true);

INSERT INTO categories (name, type, icon, color, is_system)
SELECT 'Freelance', 'income', '💻', '#4D96FF', true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Freelance' AND is_system = true);

INSERT INTO categories (name, type, icon, color, is_system)
SELECT 'Inversiones', 'income', '📈', '#FFD93D', true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Inversiones' AND is_system = true);

INSERT INTO categories (name, type, icon, color, is_system)
SELECT 'Regalo', 'income', '🎁', '#C9B1FF', true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Regalo' AND is_system = true);

INSERT INTO categories (name, type, icon, color, is_system)
SELECT 'Otro Ingreso', 'income', '💵', '#B8B8B8', true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Otro Ingreso' AND is_system = true);

-- ============================================================
-- EXPENSES (new schema with dual currency amounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_usd DECIMAL(12,2),
  amount_ves DECIMAL(12,2),
  exchange_rate DECIMAL(16,8) NOT NULL CHECK (exchange_rate > 0),
  description TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  expense_date DATE NOT NULL,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'divisas', 'transferencia')),
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (amount_usd IS NOT NULL OR amount_ves IS NOT NULL)
);

-- ============================================================
-- INCOMES (new schema with dual currency amounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_usd DECIMAL(12,2),
  amount_ves DECIMAL(12,2),
  exchange_rate DECIMAL(16,8) NOT NULL CHECK (exchange_rate > 0),
  description TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  income_date DATE NOT NULL,
  income_method TEXT DEFAULT 'salario' CHECK (income_method IN ('salario', 'remesa', 'freelance', 'inversiones', 'regalo', 'venta', 'premio', 'becas', 'herencia', 'otro')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (amount_usd IS NOT NULL OR amount_ves IS NOT NULL)
);

-- ============================================================
-- BUDGETS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'VES')),
  period budget_period NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  category_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PLANS (subscriptions: Netflix, Spotify, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'VES')),
  billing_cycle billing_cycle NOT NULL,
  next_billing_date DATE NOT NULL,
  category_id UUID REFERENCES categories(id),
  url TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  priority task_priority DEFAULT 'medium',
  status task_status DEFAULT 'pending',
  category_id UUID REFERENCES categories(id),
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BOOKMARKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  favicon_url TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXCHANGE RATES (user-defined custom rates)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate DECIMAL(16,8) NOT NULL CHECK (rate > 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, from_currency, to_currency)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER USAGE QUOTAS (for Freemium limits)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_quotas (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  expenses_count INTEGER DEFAULT 0,
  expenses_reset_at DATE DEFAULT CURRENT_DATE,
  incomes_count INTEGER DEFAULT 0,
  incomes_reset_at DATE DEFAULT CURRENT_DATE,
  tasks_count INTEGER DEFAULT 0,
  tasks_reset_at DATE DEFAULT CURRENT_DATE,
  bookmarks_count INTEGER DEFAULT 0,
  bookmarks_reset_at DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- CATEGORIES (system = true OR user_id matches)
DROP POLICY IF EXISTS "Users can view categories" ON categories;
CREATE POLICY "Users can view categories" ON categories
  FOR SELECT USING (
    is_system = true OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
CREATE POLICY "Users can insert own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own categories" ON categories;
CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own categories" ON categories;
CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id AND is_system = false);

-- EXPENSES
DROP POLICY IF EXISTS "Users can manage own expenses" ON expenses;
CREATE POLICY "Users can manage own expenses" ON expenses
  FOR ALL USING (auth.uid() = user_id);

-- INCOMES
DROP POLICY IF EXISTS "Users can manage own incomes" ON incomes;
CREATE POLICY "Users can manage own incomes" ON incomes
  FOR ALL USING (auth.uid() = user_id);

-- BUDGETS
DROP POLICY IF EXISTS "Users can manage own budgets" ON budgets;
CREATE POLICY "Users can manage own budgets" ON budgets
  FOR ALL USING (auth.uid() = user_id);

-- PLANS
DROP POLICY IF EXISTS "Users can manage own plans" ON plans;
CREATE POLICY "Users can manage own plans" ON plans
  FOR ALL USING (auth.uid() = user_id);

-- TASKS
DROP POLICY IF EXISTS "Users can manage own tasks" ON tasks;
CREATE POLICY "Users can manage own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id);

-- BOOKMARKS
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON bookmarks;
CREATE POLICY "Users can manage own bookmarks" ON bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- EXCHANGE RATES
DROP POLICY IF EXISTS "Users can manage own exchange rates" ON exchange_rates;
CREATE POLICY "Users can manage own exchange rates" ON exchange_rates
  FOR ALL USING (auth.uid() = user_id);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can manage own notifications" ON notifications;
CREATE POLICY "Users can manage own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- USER QUOTAS
DROP POLICY IF EXISTS "Users can view own quotas" ON user_quotas;
CREATE POLICY "Users can view own quotas" ON user_quotas
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own quotas" ON user_quotas;
CREATE POLICY "Users can update own quotas" ON user_quotas
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at (drop first then create)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_incomes_updated_at ON incomes;
CREATE TRIGGER update_incomes_updated_at
  BEFORE UPDATE ON incomes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookmarks_updated_at ON bookmarks;
CREATE TRIGGER update_bookmarks_updated_at
  BEFORE UPDATE ON bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_quotas (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Quota check function
CREATE OR REPLACE FUNCTION check_quota(p_user_id UUID, p_resource TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_quota user_quotas;
  v_is_premium BOOLEAN;
  v_current_count INTEGER;
  v_reset_date DATE;
BEGIN
  SELECT * INTO v_quota FROM user_quotas WHERE user_id = p_user_id;
  SELECT is_premium INTO v_is_premium FROM profiles WHERE user_id = p_user_id;

  IF v_is_premium THEN
    RETURN TRUE;
  END IF;

  IF v_quota IS NULL THEN
    RETURN TRUE;
  END IF;

  CASE p_resource
    WHEN 'expense' THEN
      v_current_count := v_quota.expenses_count;
      v_reset_date := v_quota.expenses_reset_at;
    WHEN 'income' THEN
      v_current_count := v_quota.incomes_count;
      v_reset_date := v_quota.incomes_reset_at;
    WHEN 'task' THEN
      v_current_count := v_quota.tasks_count;
      v_reset_date := v_quota.tasks_reset_at;
    WHEN 'bookmark' THEN
      v_current_count := v_quota.bookmarks_count;
      v_reset_date := v_quota.bookmarks_reset_at;
  END CASE;

  IF v_reset_date < CURRENT_DATE THEN
    RETURN TRUE;
  END IF;

  CASE p_resource
    WHEN 'expense' THEN RETURN v_current_count < 15;
    WHEN 'income' THEN RETURN v_current_count < 15;
    WHEN 'task' THEN RETURN v_current_count < 30;
    WHEN 'bookmark' THEN RETURN v_current_count < 10;
  END CASE;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment quota counter
CREATE OR REPLACE FUNCTION increment_quota(p_user_id UUID, p_resource TEXT)
RETURNS VOID AS $$
DECLARE
  v_reset_date DATE;
BEGIN
  v_reset_date := CURRENT_DATE;

  CASE p_resource
    WHEN 'expense' THEN
      UPDATE user_quotas
      SET expenses_count = expenses_count + 1,
          expenses_reset_at = v_reset_date,
          updated_at = NOW()
      WHERE user_id = p_user_id;

    WHEN 'income' THEN
      UPDATE user_quotas
      SET incomes_count = incomes_count + 1,
          incomes_reset_at = v_reset_date,
          updated_at = NOW()
      WHERE user_id = p_user_id;

    WHEN 'task' THEN
      UPDATE user_quotas
      SET tasks_count = tasks_count + 1,
          tasks_reset_at = v_reset_date,
          updated_at = NOW()
      WHERE user_id = p_user_id;

    WHEN 'bookmark' THEN
      UPDATE user_quotas
      SET bookmarks_count = bookmarks_count + 1,
          bookmarks_reset_at = v_reset_date,
          updated_at = NOW()
      WHERE user_id = p_user_id;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement quota counter
CREATE OR REPLACE FUNCTION decrement_quota(p_user_id UUID, p_resource TEXT)
RETURNS VOID AS $$
DECLARE
  v_reset_date DATE;
BEGIN
  v_reset_date := CURRENT_DATE;

  CASE p_resource
    WHEN 'expense' THEN
      UPDATE user_quotas
      SET expenses_count = GREATEST(0, expenses_count - 1),
          expenses_reset_at = v_reset_date,
          updated_at = NOW()
      WHERE user_id = p_user_id;

    WHEN 'income' THEN
      UPDATE user_quotas
      SET incomes_count = GREATEST(0, incomes_count - 1),
          incomes_reset_at = v_reset_date,
          updated_at = NOW()
      WHERE user_id = p_user_id;

    WHEN 'task' THEN
      UPDATE user_quotas
      SET tasks_count = GREATEST(0, tasks_count - 1),
          tasks_reset_at = v_reset_date,
          updated_at = NOW()
      WHERE user_id = p_user_id;

    WHEN 'bookmark' THEN
      UPDATE user_quotas
      SET bookmarks_count = GREATEST(0, bookmarks_count - 1),
          bookmarks_reset_at = v_reset_date,
          updated_at = NOW()
      WHERE user_id = p_user_id;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- INDEXES
-- ============================================================
DROP INDEX IF EXISTS idx_expenses_user_date;
CREATE INDEX idx_expenses_user_date ON expenses(user_id, expense_date DESC);

DROP INDEX IF EXISTS idx_expenses_category;
CREATE INDEX idx_expenses_category ON expenses(category_id);

DROP INDEX IF EXISTS idx_incomes_user_date;
CREATE INDEX idx_incomes_user_date ON incomes(user_id, income_date DESC);

DROP INDEX IF EXISTS idx_incomes_category;
CREATE INDEX idx_incomes_category ON incomes(category_id);

DROP INDEX IF EXISTS idx_tasks_user_status;
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);

DROP INDEX IF EXISTS idx_tasks_user_due;
CREATE INDEX idx_tasks_user_due ON tasks(user_id, due_date);

DROP INDEX IF EXISTS idx_tasks_parent;
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);

DROP INDEX IF EXISTS idx_plans_user_next_billing;
CREATE INDEX idx_plans_user_next_billing ON plans(user_id, next_billing_date);

DROP INDEX IF EXISTS idx_notifications_user_read;
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);

-- ============================================================
-- VIEWS (for dashboard statistics)
-- ============================================================
DROP VIEW IF EXISTS public.monthly_summary;
CREATE VIEW public.monthly_summary AS
SELECT
  e.user_id,
  DATE_TRUNC('month', e.expense_date) AS month,
  SUM(COALESCE(e.amount_usd, e.amount_ves / NULLIF(e.exchange_rate, 0))) AS total_usd_expenses,
  SUM(COALESCE(i.amount_usd, i.amount_ves / NULLIF(i.exchange_rate, 0))) AS total_usd_incomes
FROM expenses e
LEFT JOIN incomes i ON i.user_id = e.user_id AND DATE_TRUNC('month', i.income_date) = DATE_TRUNC('month', e.expense_date)
GROUP BY e.user_id, DATE_TRUNC('month', e.expense_date);