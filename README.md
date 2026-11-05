# AI Email coldreach - Multi-Tenant Cold Outreach SaaS

Phase 1 of our multi-tenant cold email outreach SaaS built using **Next.js 14+ (App Router)**, **TypeScript**, **Tailwind CSS**, **Lucide-React**, and **@supabase/ssr**.

---

## 🎯 Target Business Model

| Configuration | Value | Details |
| :--- | :--- | :--- |
| **Plan Price** | `PKR 3,000 / Month` | 30-day recurring subscription cycle |
| **Daily Quota** | `50 Emails / Day` | Daily limit per tenant with automated reset |
| **Monthly Quota** | `1,500 Emails / Month` | Monthly capacity per tenant |
| **Pakistani Payments** | JazzCash, Easypaisa, Local Bank Transfer | Manual TID and screenshot submission |
| **Access Gate** | Admin Approval Required | New clients stay `pending` until admin approves proof |

---

## 📂 Project Architecture

```
├── app/
│   ├── actions/
│   │   └── admin.ts              # Server actions: getPendingRequests, approveUserPayment, rejectUserPayment
│   ├── admin/
│   │   ├── layout.tsx            # Admin sidebar navigation & quota monitors
│   │   └── requests/
│   │       └── page.tsx          # Admin Verification Panel (Server Component)
│   ├── dashboard/
│   │   └── page.tsx              # Tenant dashboard with live 50/day and 1,500/mo quota tracking
│   ├── onboarding/
│   │   ├── payment/page.tsx      # Client payment submission (TID & Screenshot)
│   │   └── status/page.tsx       # Pending/Rejected status screen for clients
│   ├── login/page.tsx            # Tenant registration & sign in
│   ├── globals.css               # Tailwind CSS base styles
│   ├── layout.tsx                # Root layout with Sonner toast notifications
│   └── page.tsx                  # Marketing / landing page
├── components/
│   └── admin/
│       └── requests-table.tsx    # Interactive Admin Table (Approve, Reject, Screenshot viewer, Copy TID)
├── lib/
│   └── supabase/
│       ├── client.ts             # Browser Supabase client (@supabase/ssr)
│       ├── server.ts             # Server Supabase client with cookie storage (@supabase/ssr)
│       ├── middleware.ts         # Session update & route authorization logic
│       └── admin.ts              # Service Role Supabase client (bypasses RLS for admin approvals)
├── supabase/
│   └── schema.sql                # Complete PostgreSQL schema, RLS policies, and triggers
├── types/
│   └── database.ts               # End-to-end typed Supabase Database schema definitions
├── middleware.ts                 # Next.js Edge Middleware route protection
└── .env.example                  # Environment variable configuration template
```

---

## 🚀 Setup & Installation

### 1. Database Schema Setup (Supabase)
Run the migration file located at [supabase/schema.sql](file:///c:/Users/HP-PC/Desktop/Antigravity/Email%20cold%20reach/supabase/schema.sql) in your Supabase SQL Editor. It creates:
- `public.profiles`: Stores client/admin roles and account statuses (`pending`, `active`, `suspended`).
- `public.subscriptions`: Tracks plan limits (50 daily / 1,500 monthly) and 30-day expiration timestamps.
- `public.payment_requests`: Stores transaction IDs (TID), screenshot URLs, and admin review audit trails.
- RLS Policies & automatic profile creation triggers on user signup.

### 2. Environment Variables (.env.local)
Copy `.env.example` to `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 3. Creating Your First Admin Account
After registering via `/login`, promote your account to admin in Supabase SQL editor:
```sql
UPDATE public.profiles
SET role = 'admin', status = 'active'
WHERE email = 'your-email@domain.com';
```

---

## 🛡️ Middleware Protection Rules

- **/admin/\***: Requires an authenticated user with `role === 'admin'`. Unauthorized clients are redirected to `/dashboard`.
- **/dashboard/\***: Requires an authenticated user with `status === 'active'`. Clients with `status === 'pending'` or `'suspended'` are redirected to `/onboarding/status`.

