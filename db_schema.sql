


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."billing_cycle" AS ENUM (
    'monthly',
    'yearly'
);


ALTER TYPE "public"."billing_cycle" OWNER TO "postgres";


CREATE TYPE "public"."budget_period" AS ENUM (
    'weekly',
    'monthly',
    'yearly'
);


ALTER TYPE "public"."budget_period" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'task_due',
    'plan_renewal',
    'budget_alert',
    'system'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."task_priority" AS ENUM (
    'low',
    'medium',
    'high'
);


ALTER TYPE "public"."task_priority" OWNER TO "postgres";


CREATE TYPE "public"."task_status" AS ENUM (
    'pending',
    'in_progress',
    'completed'
);


ALTER TYPE "public"."task_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_quota"("p_user_id" "uuid", "p_resource" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."check_quota"("p_user_id" "uuid", "p_resource" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_quota"("p_user_id" "uuid", "p_resource" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."decrement_quota"("p_user_id" "uuid", "p_resource" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  INSERT INTO public.user_quotas (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_quota"("p_user_id" "uuid", "p_resource" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."increment_quota"("p_user_id" "uuid", "p_resource" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bookmarks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "url" "text" NOT NULL,
    "description" "text",
    "category_id" "uuid",
    "favicon_url" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bookmarks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."budgets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "period" "public"."budget_period" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "category_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "budgets_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "budgets_currency_check" CHECK (("currency" = ANY (ARRAY['USD'::"text", 'VES'::"text"])))
);


ALTER TABLE "public"."budgets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "icon" "text",
    "color" "text",
    "is_system" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "categories_type_check" CHECK (("type" = ANY (ARRAY['expense'::"text", 'income'::"text", 'both'::"text"])))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exchange_rates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "from_currency" "text" NOT NULL,
    "to_currency" "text" NOT NULL,
    "rate" numeric(16,8) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "exchange_rates_rate_check" CHECK (("rate" > (0)::numeric))
);


ALTER TABLE "public"."exchange_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "category_id" "uuid",
    "expense_date" "date" NOT NULL,
    "receipt_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "amount_usd" numeric(12,2),
    "amount_ves" numeric(12,2),
    "exchange_rate" numeric(16,8) DEFAULT 500 NOT NULL,
    "payment_method" "text" DEFAULT 'cash'::"text",
    CONSTRAINT "expenses_exchange_rate_check" CHECK (("exchange_rate" > (0)::numeric)),
    CONSTRAINT "expenses_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['cash'::"text", 'card'::"text", 'divisas'::"text", 'transferencia'::"text"])))
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."incomes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "category_id" "uuid",
    "income_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "amount_usd" numeric(12,2),
    "amount_ves" numeric(12,2),
    "exchange_rate" numeric(16,8) DEFAULT 500 NOT NULL,
    "income_method" "text" DEFAULT 'salario'::"text",
    CONSTRAINT "incomes_exchange_rate_check" CHECK (("exchange_rate" > (0)::numeric)),
    CONSTRAINT "incomes_income_method_check" CHECK (("income_method" = ANY (ARRAY['salario'::"text", 'remesa'::"text", 'freelance'::"text", 'inversiones'::"text", 'regalo'::"text", 'venta'::"text", 'premio'::"text", 'becas'::"text", 'herencia'::"text", 'otro'::"text"])))
);


ALTER TABLE "public"."incomes" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."monthly_summary" AS
 SELECT "e"."user_id",
    "date_trunc"('month'::"text", ("e"."expense_date")::timestamp with time zone) AS "month",
    "sum"(COALESCE("e"."amount_usd", ("e"."amount_ves" / NULLIF("e"."exchange_rate", (0)::numeric)))) AS "total_usd_expenses",
    "sum"(COALESCE("i"."amount_usd", ("i"."amount_ves" / NULLIF("i"."exchange_rate", (0)::numeric)))) AS "total_usd_incomes"
   FROM ("public"."expenses" "e"
     LEFT JOIN "public"."incomes" "i" ON ((("i"."user_id" = "e"."user_id") AND ("date_trunc"('month'::"text", ("i"."income_date")::timestamp with time zone) = "date_trunc"('month'::"text", ("e"."expense_date")::timestamp with time zone)))))
  GROUP BY "e"."user_id", ("date_trunc"('month'::"text", ("e"."expense_date")::timestamp with time zone));


ALTER VIEW "public"."monthly_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "billing_cycle" "public"."billing_cycle" NOT NULL,
    "next_billing_date" "date" NOT NULL,
    "category_id" "uuid",
    "url" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "plans_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "plans_currency_check" CHECK (("currency" = ANY (ARRAY['USD'::"text", 'VES'::"text"])))
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "default_currency" "text" DEFAULT 'USD'::"text",
    "timezone" "text" DEFAULT 'America/Caracas'::"text",
    "is_premium" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "profiles_default_currency_check" CHECK (("default_currency" = ANY (ARRAY['USD'::"text", 'VES'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "due_date" timestamp with time zone,
    "priority" "public"."task_priority" DEFAULT 'medium'::"public"."task_priority",
    "status" "public"."task_status" DEFAULT 'pending'::"public"."task_status",
    "category_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "parent_task_id" "uuid"
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_quotas" (
    "user_id" "uuid" NOT NULL,
    "expenses_count" integer DEFAULT 0,
    "expenses_reset_at" "date" DEFAULT CURRENT_DATE,
    "incomes_count" integer DEFAULT 0,
    "incomes_reset_at" "date" DEFAULT CURRENT_DATE,
    "tasks_count" integer DEFAULT 0,
    "tasks_reset_at" "date" DEFAULT CURRENT_DATE,
    "bookmarks_count" integer DEFAULT 0,
    "bookmarks_reset_at" "date" DEFAULT CURRENT_DATE,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_quotas" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_user_id_from_currency_to_currency_key" UNIQUE ("user_id", "from_currency", "to_currency");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."incomes"
    ADD CONSTRAINT "incomes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_quotas"
    ADD CONSTRAINT "user_quotas_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "idx_expenses_category" ON "public"."expenses" USING "btree" ("category_id");



CREATE INDEX "idx_expenses_user_date" ON "public"."expenses" USING "btree" ("user_id", "expense_date" DESC);



CREATE INDEX "idx_incomes_category" ON "public"."incomes" USING "btree" ("category_id");



CREATE INDEX "idx_incomes_user_date" ON "public"."incomes" USING "btree" ("user_id", "income_date" DESC);



CREATE INDEX "idx_notifications_user_read" ON "public"."notifications" USING "btree" ("user_id", "is_read");



CREATE INDEX "idx_plans_user_next_billing" ON "public"."plans" USING "btree" ("user_id", "next_billing_date");



CREATE INDEX "idx_tasks_parent" ON "public"."tasks" USING "btree" ("parent_task_id");



CREATE INDEX "idx_tasks_user_due" ON "public"."tasks" USING "btree" ("user_id", "due_date");



CREATE INDEX "idx_tasks_user_status" ON "public"."tasks" USING "btree" ("user_id", "status");



CREATE OR REPLACE TRIGGER "update_bookmarks_updated_at" BEFORE UPDATE ON "public"."bookmarks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_budgets_updated_at" BEFORE UPDATE ON "public"."budgets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_expenses_updated_at" BEFORE UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_incomes_updated_at" BEFORE UPDATE ON "public"."incomes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_plans_updated_at" BEFORE UPDATE ON "public"."plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."incomes"
    ADD CONSTRAINT "incomes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."incomes"
    ADD CONSTRAINT "incomes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_quotas"
    ADD CONSTRAINT "user_quotas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Users can delete own categories" ON "public"."categories" FOR DELETE USING ((("auth"."uid"() = "user_id") AND ("is_system" = false)));



CREATE POLICY "Users can insert own categories" ON "public"."categories" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own bookmarks" ON "public"."bookmarks" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own budgets" ON "public"."budgets" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own exchange rates" ON "public"."exchange_rates" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own expenses" ON "public"."expenses" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own incomes" ON "public"."incomes" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own notifications" ON "public"."notifications" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own plans" ON "public"."plans" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own tasks" ON "public"."tasks" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own categories" ON "public"."categories" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own quotas" ON "public"."user_quotas" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view categories" ON "public"."categories" FOR SELECT USING ((("is_system" = true) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own quotas" ON "public"."user_quotas" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."bookmarks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budgets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exchange_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."incomes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_quotas" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."check_quota"("p_user_id" "uuid", "p_resource" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_quota"("p_user_id" "uuid", "p_resource" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_quota"("p_user_id" "uuid", "p_resource" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_quota"("p_user_id" "uuid", "p_resource" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_quota"("p_user_id" "uuid", "p_resource" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_quota"("p_user_id" "uuid", "p_resource" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_quota"("p_user_id" "uuid", "p_resource" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_quota"("p_user_id" "uuid", "p_resource" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_quota"("p_user_id" "uuid", "p_resource" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."bookmarks" TO "anon";
GRANT ALL ON TABLE "public"."bookmarks" TO "authenticated";
GRANT ALL ON TABLE "public"."bookmarks" TO "service_role";



GRANT ALL ON TABLE "public"."budgets" TO "anon";
GRANT ALL ON TABLE "public"."budgets" TO "authenticated";
GRANT ALL ON TABLE "public"."budgets" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."exchange_rates" TO "anon";
GRANT ALL ON TABLE "public"."exchange_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."exchange_rates" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."incomes" TO "anon";
GRANT ALL ON TABLE "public"."incomes" TO "authenticated";
GRANT ALL ON TABLE "public"."incomes" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_summary" TO "anon";
GRANT ALL ON TABLE "public"."monthly_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_summary" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."user_quotas" TO "anon";
GRANT ALL ON TABLE "public"."user_quotas" TO "authenticated";
GRANT ALL ON TABLE "public"."user_quotas" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































