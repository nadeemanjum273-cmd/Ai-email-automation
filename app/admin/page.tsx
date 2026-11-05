import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { 
  Users, 
  CreditCard, 
  Mail, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const adminSupabase = createAdminClient();

  // 1. Fetch tenant counts
  const { count: totalTenants } = await adminSupabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: activeTenants } = await adminSupabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  const { count: pendingRequests } = await adminSupabase
    .from('payment_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { data: subscriptions } = await adminSupabase
    .from('subscriptions')
    .select('daily_emails_sent, daily_email_limit, monthly_emails_sent, monthly_email_limit');

  const totalDailySent = (subscriptions || []).reduce((acc, s) => acc + (s.daily_emails_sent || 0), 0);
  const totalDailyCapacity = (subscriptions || []).reduce((acc, s) => acc + (s.daily_email_limit || 50), 0);

  return (
    <div className="space-y-8">
      {/* Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time analytics, tenant activity, and platform quota utilization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/requests"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-colors shadow-sm"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Review Pending Requests ({pendingRequests || 0})</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tenants */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Registered
            </div>
            <div className="text-3xl font-black text-slate-900 mt-1">{totalTenants || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Platform Accounts</div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Active Tenants */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Tenants
            </div>
            <div className="text-3xl font-black text-emerald-600 mt-1">{activeTenants || 0}</div>
            <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Quota Enabled
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pending Approvals
            </div>
            <div className="text-3xl font-black text-amber-600 mt-1">{pendingRequests || 0}</div>
            <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Requires Action
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Daily Emails Dispatched */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Daily Email Traffic
            </div>
            <div className="text-3xl font-black text-sky-600 mt-1">
              {totalDailySent}{' '}
              <span className="text-sm font-semibold text-slate-400 font-mono">/ {totalDailyCapacity || 50}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Emails sent today</div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200">
            <Mail className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/requests"
          className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all space-y-3"
        >
          <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors flex items-center justify-between">
            <span>Payment Proofs Hub</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Verify transaction IDs and screenshots submitted by new tenants. Approve with 1 click to unlock sending quotas.
          </p>
        </Link>

        <Link
          href="/admin/users"
          className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all space-y-3"
        >
          <div className="h-10 w-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors flex items-center justify-between">
            <span>Tenants & Clients</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Manage tenant accounts, activate or suspend platform access, and manage administrative privileges.
          </p>
        </Link>

        <Link
          href="/admin/quotas"
          className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all space-y-3"
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors flex items-center justify-between">
            <span>Quota Limits & Reset</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Monitor daily (50) and monthly (1,500) email consumption, review reset dates, and trigger manual quota resets.
          </p>
        </Link>
      </div>
    </div>
  );
}

