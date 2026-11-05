# 🚀 Production Deployment & Operations Guide

This guide provides end-to-end instructions for deploying the **ColdReach AI Cold Outreach CRM SaaS** to **Vercel** and connecting it with **Supabase**, **Google Cloud OAuth (Gmail & Sheets API)**, and **Google Gemini AI**.

---

## 📋 Table of Contents
1. [Git Repository Setup](#1-git-repository-setup)
2. [Database Deployment (Supabase)](#2-database-deployment-supabase)
3. [Vercel Production Deployment](#3-vercel-production-deployment)
4. [Google Cloud OAuth 2.0 Production Setup](#4-google-cloud-oauth-20-production-setup)
5. [Automated Daily Quota Reset Cron](#5-automated-daily-quota-reset-cron)
6. [Promoting Your Admin Account](#6-promoting-your-admin-account)
7. [Running Local Test Simulations](#7-running-local-test-simulations)

---

## 1. Git Repository Setup

If you make any changes to your code, commit and push them to your GitHub repository:

```bash
git add .
git commit -m "Update: Production configuration and cron assets"
git push origin main
```

*(Note: Sensitive files like `.env.local` and `.env` are protected by `.gitignore` and are never committed).*

---

## 2. Database Deployment (Supabase)

1. Log in to [Supabase](https://supabase.com) and create or open your production project.
2. In the Supabase Dashboard, open the **SQL Editor**.
3. Copy the contents of [`supabase/schema.sql`](file:///c:/Users/HP-PC/Desktop/Antigravity/Email%20cold%20reach/supabase/schema.sql) and run the script. This creates:
   - `profiles` table (tenant accounts and admin roles)
   - `subscriptions` table (daily 50 and monthly 1,500 email limits)
   - `payment_requests` table (Pakistani payment verification: JazzCash, Easypaisa, Bank Transfer)
   - `google_connections` table (secure Gmail and Google Sheets OAuth tokens)
   - `campaigns` table
   - Row-Level Security (RLS) policies and automatic profile creation triggers
   - Storage bucket `payment_proofs` with public read access
4. Go to **Project Settings** > **API** and copy:
   - **Project URL**
   - **anon / public key**
   - **service_role key** (secret)

---

## 3. Vercel Production Deployment

### Option A: 1-Click Vercel Dashboard Import
1. Visit [Vercel](https://vercel.com) and click **"Add New..."** > **"Project"**.
2. Select your repository: `nadeemanjum273-cmd/Ai-email-automation`.
3. Under **Environment Variables**, add the following production variables:

| Variable Name | Description | Example / Production Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | `https://xyzproject.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Public Key | `sb_publishable_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Secret | `sb_secret_...` |
| `NEXT_PUBLIC_APP_URL` | Your deployed Vercel domain | `https://ai-email-automation.vercel.app` |
| `GOOGLE_CLIENT_ID` | Google OAuth Web Client ID | `3759...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-...` |
| `GOOGLE_REDIRECT_URI` | Google OAuth Redirect URI | `https://your-domain.vercel.app/api/auth/google/callback` |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` (or `AQ.Ab8...`) |
| `CRON_SECRET` | Secret token to secure cron route | Any random 32-character string |
| `NEXT_PUBLIC_PLAN_PRICE_PKR`| Standard Plan Price | `3000` |
| `NEXT_PUBLIC_DAILY_EMAIL_QUOTA` | Max Daily Emails | `50` |
| `NEXT_PUBLIC_MONTHLY_EMAIL_QUOTA` | Max Monthly Emails | `1500` |

4. Click **Deploy**. Vercel will build and launch your application.

---

## 4. Google Cloud OAuth 2.0 Production Setup

To enable your tenants to connect their genuine Gmail accounts and Google Sheets:

1. Open [Google Cloud Console](https://console.cloud.google.com).
2. Ensure both **Gmail API** and **Google Sheets API** are enabled:
   - Go to **APIs & Services** > **Library**
   - Search for **Gmail API** and click **Enable**.
   - Search for **Google Sheets API** and click **Enable**.
3. Configure the **OAuth Consent Screen**:
   - User Type: **External**
   - App Name: `ColdReach Outreach CRM`
   - User Support Email: your email
   - Scopes:
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/spreadsheets`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Test Users: Add the emails of accounts testing the app while in Testing mode, or publish to Production.
4. Update **Credentials**:
   - Go to **Credentials** > Click your OAuth 2.0 Client ID.
   - Under **Authorized JavaScript origins**, add:
     - `http://localhost:3000` (for local development)
     - `https://your-domain.vercel.app` (your production domain)
   - Under **Authorized redirect URIs**, add:
     - `http://localhost:3000/api/auth/google/callback`
     - `https://your-domain.vercel.app/api/auth/google/callback`
   - Click **Save**.

---

## 5. Automated Daily Quota Reset Cron

Tenants are capped at 50 emails per day. Daily quotas automatically reset at 00:00 UTC.

### Method A: Vercel Cron (Built-in)
The included [`vercel.json`](file:///c:/Users/HP-PC/Desktop/Antigravity/Email%20cold%20reach/vercel.json) automatically registers the cron job:
```json
{
  "crons": [
    {
      "path": "/api/cron/reset-quotas",
      "schedule": "0 0 * * *"
    }
  ]
}
```
Vercel will trigger `/api/cron/reset-quotas` every day at midnight UTC.

### Method B: External Cron (e.g. cron-job.org)
If deploying outside Vercel or using a free cron monitor:
1. Create a free account at [cron-job.org](https://cron-job.org).
2. Create a new cron job:
   - URL: `https://your-domain.vercel.app/api/cron/reset-quotas`
   - Schedule: `Every day at 00:00 UTC`
   - Headers: Add `Authorization: Bearer YOUR_CRON_SECRET`

---

## 6. Promoting Your Admin Account

To access the manual payment verification panel (`/admin/requests`) and approve client subscriptions:

Run the included admin provisioning script:
```bash
npx tsx scripts/seed-admin.ts your-admin-email@domain.com
```

This will:
- Set `role = 'admin'`
- Set `status = 'active'`
- Grant immediate unrestricted access to `/admin/requests`.

---

## 7. Running Local Test Simulations

You can simulate the full multi-tenant pipeline (Gemini AI personalization, 45–90s anti-spam throttling, and quota tracking) locally anytime:

```bash
# Fast mode (2-second simulated delay):
npx tsx scripts/test-pipeline.ts --fast

# Full production mode (realistic 45–90s randomized delay):
npx tsx scripts/test-pipeline.ts
```
