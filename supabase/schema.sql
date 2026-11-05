-- =========================================================================
-- Multi-Tenant Cold Outreach CRM SaaS - Database Migration (Phase 1, 2 & 3)
-- Plan: PKR 3,000/Month | Quotas: 50 Daily / 1,500 Monthly Emails
-- Payment Methods: JazzCash, Easypaisa, Local Bank Transfer
-- Google OAuth 2.0 Integration & Sheet Outreach Campaigns
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Tenants and Admins)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. SUBSCRIPTIONS TABLE (Quotas & Expiration)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    plan_name TEXT NOT NULL DEFAULT 'Standard PKR 3,000/Month',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'canceled')),
    daily_email_limit INTEGER NOT NULL DEFAULT 50,
    monthly_email_limit INTEGER NOT NULL DEFAULT 1500,
    daily_emails_sent INTEGER NOT NULL DEFAULT 0,
    monthly_emails_sent INTEGER NOT NULL DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. PAYMENT REQUESTS TABLE (TID & Screenshot Proofs)
CREATE TABLE IF NOT EXISTS public.payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL DEFAULT 3000,
    currency TEXT NOT NULL DEFAULT 'PKR',
    payment_method TEXT NOT NULL CHECK (payment_method IN ('JazzCash', 'Easypaisa', 'Bank Transfer')),
    sender_number TEXT,
    transaction_id TEXT NOT NULL,
    screenshot_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. GOOGLE CONNECTIONS TABLE (OAuth 2.0 Gmail & Sheets tokens)
CREATE TABLE IF NOT EXISTS public.google_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    google_email TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    is_connected BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. CAMPAIGNS TABLE (Google Sheets Outreach Campaigns)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Cold Email Campaign',
    sheet_url TEXT NOT NULL,
    sheet_id TEXT NOT NULL,
    sheet_name TEXT NOT NULL DEFAULT 'Sheet1',
    column_name TEXT NOT NULL,
    column_email TEXT NOT NULL,
    column_niche TEXT NOT NULL,
    column_status TEXT NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    batch_size INTEGER NOT NULL DEFAULT 10,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for high-performance queries
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_user ON public.payment_requests(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_requests_tid ON public.payment_requests(transaction_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_google_connections_user ON public.google_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user ON public.campaigns(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR PROFILES
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins have full access to profiles" ON public.profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS POLICIES FOR SUBSCRIPTIONS
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins have full access to subscriptions" ON public.subscriptions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS POLICIES FOR PAYMENT REQUESTS
CREATE POLICY "Users can view own payment requests" ON public.payment_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payment requests" ON public.payment_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins have full access to payment requests" ON public.payment_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS POLICIES FOR GOOGLE CONNECTIONS
CREATE POLICY "Users can view own google connection" ON public.google_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own google connection" ON public.google_connections FOR ALL USING (auth.uid() = user_id);

-- RLS POLICIES FOR CAMPAIGNS
CREATE POLICY "Users can view own campaigns" ON public.campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own campaigns" ON public.campaigns FOR ALL USING (auth.uid() = user_id);

-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, phone, role, status)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Client User'),
        new.email,
        new.raw_user_meta_data->>'phone',
        COALESCE(new.raw_user_meta_data->>'role', 'client'),
        'pending'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STORAGE BUCKET FOR PAYMENT PROOFS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment_proofs', 'payment_proofs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access To Proofs" ON storage.objects FOR SELECT USING (bucket_id = 'payment_proofs');
CREATE POLICY "Authenticated Users & Anons Can Upload Proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment_proofs');
