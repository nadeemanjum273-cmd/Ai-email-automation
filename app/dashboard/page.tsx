import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { 
  Mail, 
  CheckCircle2, 
  Calendar, 
  ShieldCheck, 
  Zap, 
  AlertTriangle,
  LogOut,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { GoogleConnection, Profile, Subscription } from '@/types/database';
import { validateUserQuota } from '@/lib/quota';
import { GoogleConnectionWidget } from '@/components/GoogleConnectionWidget';
import { CampaignSetup } from '@/components/CampaignSetup';

export const dynamic = 'force-dynamic';

interface DashboardProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const adminSupabase = createAdminClient();

  // 1. Fetch Profile
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .returns<Profile[]>()
    .maybeSingle();

  // Guardrail 1: Pending users redirect to onboarding status
  if (!profile || profile.status === 'pending') {
    redirect('/onboarding/status');
  }

  // Guardrail 2: Suspended notice
  if (profile.status === 'suspended') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-rose-200 shadow-xl text-center space-y-4">
          <div className="h-16 w-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Account Suspended</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your account has been temporarily suspended due to anti-spam compliance or billing review. Please contact the administrator for reactivation.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="py-2.5 px-6 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors inline-block"
            >
              Sign Out
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Quota validation & automatic daily reset check
  const quota = await validateUserQuota(user.id);

  // 3. Fetch Subscription for plan name and expiry
  const { data: subscription } = await adminSupabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .returns<Subscription[]>()
    .maybeSingle();

  // 4. Fetch Google Connection
  const { data: googleConnection } = await adminSupabase
    .from('google_connections')
    .select('*')
    .eq('user_id', user.id)
    .returns<GoogleConnection[]>()
    .maybeSingle();

  const isGoogleConnected = Boolean(googleConnection?.is_connected);
  const connectedGoogleEmail = googleConnection?.google_email || null;

  // Quota Calculations
  const dailySent = quota.dailySent;
  const dailyLimit = quota.dailyLimit || 50;
  const monthlySent = quota.monthlySent;
  const monthlyLimit = quota.monthlyLimit || 1500;
  const remainingDaily = quota.remainingDaily;
  const remainingMonthly = quota.remainingMonthly;

  const dailyPercentage = Math.min(100, Math.round((dailySent / dailyLimit) * 100));
  const monthlyPercentage = Math.min(100, Math.round((monthlySent / monthlyLimit) * 100));

  // Daily Progress color coding:
  // green < 70%, yellow 70-90%, red > 90%
  const getProgressColor = (percent: number) => {
    if (percent < 70) return 'bg-emerald-500';
    if (percent <= 90) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const formattedExpiry = subscription?.expires_at
    ? new Date(subscription.expires_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Active (30 Days)';

  const googleParam = searchParams?.google;
  const errorParam = searchParams?.error;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-sm">
            CR
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-800 text-base leading-tight">ColdReach CRM</h1>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                Active Tenant
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Client Outreach & Quota Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {profile.role === 'admin' && (
            <Link
              href="/admin/requests"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Panel</span>
            </Link>
          )}

          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-800">{profile.full_name || 'Client'}</div>
            <div className="text-[11px] text-slate-400 font-mono">{profile.email}</div>
          </div>

          <form action="/login" method="GET">
            <button
              type="submit"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Google Connected Alert Banner */}
        {googleParam === 'connected' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-emerald-900 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Google Account (Gmail & Sheets) successfully connected! You can now configure and launch campaigns.</span>
            </div>
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
            >
              Dismiss
            </Link>
          </div>
        )}

        {/* Error Alert Banner if any */}
        {errorParam && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between text-rose-900 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{String(errorParam)}</span>
            </div>
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
            >
              Dismiss
            </Link>
          </div>
        )}

        {/* Top Header Welcome Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified & Active Account
            </div>
            <h2 className="text-2xl sm:text-3xl font-black">
              Welcome back, {profile.full_name || 'Client'}!
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
              Your Starter Monthly Plan is active with a daily limit of 50 emails and direct Google Sheets automation.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl text-xs space-y-1 text-left min-w-[200px]">
            <div className="text-slate-400">Subscription Expiry:</div>
            <div className="text-base font-bold text-sky-400 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> {formattedExpiry}
            </div>
            <div className="text-[11px] text-emerald-400">Starter PKR 3,000 / Month</div>
          </div>
        </div>

        {/* 1. Live Quota Widgets Grid (Top Section) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Daily Quota Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Daily Sending Quota
                </span>
                <div className="text-3xl font-black text-slate-900 mt-1">
                  {dailySent} <span className="text-sm font-semibold text-slate-400 font-mono">/ {dailyLimit}</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                <Mail className="w-5 h-5" />
              </div>
            </div>

            <div>
              {/* Progress bar with dynamic color */}
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor(dailyPercentage)}`}
                  style={{ width: `${dailyPercentage}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-xs mt-2">
                <span className="font-bold text-slate-700">
                  Remaining today: {remainingDaily} emails
                </span>
                <span className="text-slate-400 text-[11px]">{dailyPercentage}% used</span>
              </div>
            </div>
          </div>

          {/* Card 2: Monthly Quota Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Monthly Quota (1,500 Max)
                </span>
                <div className="text-3xl font-black text-slate-900 mt-1">
                  {monthlySent} <span className="text-sm font-semibold text-slate-400 font-mono">/ {monthlyLimit}</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Zap className="w-5 h-5" />
              </div>
            </div>

            <div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${monthlyPercentage}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-xs mt-2">
                <span className="font-bold text-slate-700">
                  Remaining this month: {remainingMonthly} emails
                </span>
                <span className="text-slate-400 text-[11px]">{monthlyPercentage}% used</span>
              </div>
            </div>
          </div>

          {/* Card 3: Plan & Expiry Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Plan & Subscription
                </span>
                <div className="text-xl font-black text-slate-900 mt-1">
                  Starter 3000 PKR
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
              <div className="text-slate-500 flex justify-between">
                <span>Billing Cycle:</span>
                <span className="font-bold text-slate-800">30 Days</span>
              </div>
              <div className="text-slate-500 flex justify-between">
                <span>Renewal Date:</span>
                <span className="font-bold text-sky-600">{formattedExpiry}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Google Connection Card */}
          <GoogleConnectionWidget
            isConnected={isGoogleConnected}
            connectedEmail={connectedGoogleEmail}
          />
        </div>

        {/* 2. Campaign & Sheet Setup Component */}
        <CampaignSetup
          isGoogleConnected={isGoogleConnected}
          remainingDailyQuota={remainingDaily}
        />
      </main>
    </div>
  );
}