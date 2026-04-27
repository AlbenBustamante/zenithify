-- ============================================================
-- ZENITHIFY SAAS - SCHEMA.SQL
-- PostgreSQL + Supabase
-- Multi-tenant with Row Level Security (RLS)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE billing_cycle AS ENUM ('monthly', 'yearly');
CREATE TYPE budget_period AS ENUM ('weekly', 'monthly', 'yearly');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE notification_type AS ENUM ('task_due', 'plan_renewal', 'budget_alert', 'system');

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
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
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'both')),
  icon TEXT,
  color TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert predefined expense categories
INSERT INTO categories (name, type, icon, color, is_system) VALUES
  ('Alimentación', 'expense', '🍽️', '#FF6B6B', true),
  ('Transporte', 'expense', '🚗', '#4ECDC4', true),
  ('Vivienda', 'expense', '🏠', '#45B7D1', true),
  ('Salud', 'expense', '💊', '#96CEB4', true),
  ('Entretenimiento', 'expense', '🎬', '#FFEAA7', true),
  ('Educación', 'expense', '📚', '#DDA0DD', true),
  ('Servicios', 'expense', '💡', '#98D8C8', true),
  ('Otro Gasto', 'expense', '📦', '#B8B8B8', true);

-- Insert predefined income categories
INSERT INTO categories (name, type, icon, color, is_system) VALUES
  ('Salario', 'income', '💰', '#6BCB77', true),
  ('Freelance', 'income', '💻', '#4D96FF', true),
  ('Inversiones', 'income', '📈', '#FFD93D', true),
  ('Regalo', 'income', '🎁', '#C9B1FF', true),
  ('Otro Ingreso', 'income', '💵', '#B8B8B8', true);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'VES')),
  description TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  expense_date DATE NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INCOMES
-- ============================================================
CREATE TABLE public.incomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'VES')),
  description TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  income_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BUDGETS
-- ============================================================
CREATE TABLE public.budgets (
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
CREATE TABLE public.plans (
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
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  priority task_priority DEFAULT 'medium',
  status task_status DEFAULT 'pending',
  category_id UUID REFERENCES categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BOOKMARKS
-- ============================================================
CREATE TABLE public.bookmarks (
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
CREATE TABLE public.exchange_rates (
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
CREATE TABLE public.notifications (
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
CREATE TABLE public.user_quotas (
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
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- CATEGORIES (system = true OR user_id matches)
CREATE POLICY "Users can view categories" ON categories
  FOR SELECT USING (
    is_system = true OR auth.uid() = user_id
  );

CREATE POLICY "Users can insert own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id AND is_system = false);

-- EXPENSES
CREATE POLICY "Users can manage own expenses" ON expenses
  FOR ALL USING (auth.uid() = user_id);

-- INCOMES
CREATE POLICY "Users can manage own incomes" ON incomes
  FOR ALL USING (auth.uid() = user_id);

-- BUDGETS
CREATE POLICY "Users can manage own budgets" ON budgets
  FOR ALL USING (auth.uid() = user_id);

-- PLANS
CREATE POLICY "Users can manage own plans" ON plans
  FOR ALL USING (auth.uid() = user_id);

-- TASKS
CREATE POLICY "Users can manage own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id);

-- BOOKMARKS
CREATE POLICY "Users can manage own bookmarks" ON bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- EXCHANGE RATES
CREATE POLICY "Users can manage own exchange rates" ON exchange_rates
  FOR ALL USING (auth.uid() = user_id);

-- NOTIFICATIONS
CREATE POLICY "Users can manage own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- USER QUOTAS
CREATE POLICY "Users can view own quotas" ON user_quotas
  FOR SELECT USING (auth.uid() = user_id);

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

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incomes_updated_at
  BEFORE UPDATE ON incomes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookmarks_updated_at
  BEFORE UPDATE ON bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  INSERT INTO public.user_quotas (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    RETURN TRUE; -- Allow if quota record doesn't exist yet
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
  
  -- Reset if new month
  IF v_reset_date < CURRENT_DATE THEN
    RETURN TRUE; -- Allow, quota reset trigger will handle it
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
CREATE INDEX idx_expenses_user_date ON expenses(user_id, expense_date DESC);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_incomes_user_date ON incomes(user_id, income_date DESC);
CREATE INDEX idx_incomes_category ON incomes(category_id);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_user_due ON tasks(user_id, due_date);
CREATE INDEX idx_plans_user_next_billing ON plans(user_id, next_billing_date);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);

-- ============================================================
-- VIEWS (for dashboard statistics)
-- ============================================================
CREATE VIEW public.monthly_summary AS
SELECT 
  user_id,
  DATE_TRUNC('month', expense_date) AS month,
  SUM(CASE WHEN currency = 'USD' THEN amount 
           WHEN currency = 'VES' THEN amount / COALESCE(er.rate, 1)
      END) AS total_usd_expenses,
  SUM(CASE WHEN currency = 'USD' THEN amount 
           WHEN currency = 'VES' THEN amount / COALESCE(er.rate, 1)
      END) AS total_usd_incomes
FROM expenses e
LEFT JOIN exchange_rates er ON er.user_id = e.user_id 
  AND er.from_currency = 'VES' AND er.to_currency = 'USD'
GROUP BY user_id, DATE_TRUNC('month', expense_date);
