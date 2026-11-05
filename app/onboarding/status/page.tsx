import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Smartphone, 
  Building2, 
  CreditCard, 
  HelpCircle,
  LogOut 
} from 'lucide-react';
import Link from 'next/link';
import { PaymentRequest, Profile } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function OnboardingStatusPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch client profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .returns<Profile[]>()
    .maybeSingle();

  // If already active, redirect them to dashboard
  if (profile?.status === 'active') {
    redirect('/dashboard');
  }

  // Fetch latest payment request
  const { data: latestPayment } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .returns<PaymentRequest[]>()
    .maybeSingle();

  const isRejected = latestPayment?.status === 'rejected';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-black text-white text-xl shadow-lg">
            CR
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Account Activation & Quota Status
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            ColdReach Multi-Tenant CRM SaaS • PKR 3,000 / month
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Status Banner */}
          {isRejected ? (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-rose-800">
              <div className="flex items-center gap-2 font-semibold text-rose-900">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Payment Proof Rejected by Admin
              </div>
              <p className="text-xs text-rose-700 mt-1">
                Admin Note: <strong>{latestPayment?.admin_notes || 'Invalid transaction details'}</strong>
              </p>
              <p className="text-xs text-rose-600 mt-2">
                Please verify your transaction in your banking app and submit a new payment proof below.
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800">
              <div className="flex items-center gap-2 font-semibold text-amber-900">
                <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                Payment Verification Pending
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Thank you for submitting your payment proof! Our Pakistani finance admin is verifying your transaction ID.
              </p>
              <p className="text-xs text-amber-600 mt-2">
                Approval typically completes within <strong>15–60 minutes</strong> during working hours.
              </p>
            </div>
          )}

          {/* Submitted Request Summary */}
          {latestPayment && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
              <div className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                Submission Details
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-semibold text-slate-800">{latestPayment.payment_method}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Transaction ID (TID):</span>
                <code className="font-mono font-bold text-slate-900">{latestPayment.transaction_id}</code>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Amount:</span>
                <span className="font-semibold text-slate-800">PKR {Number(latestPayment.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Submitted At:</span>
                <span className="text-slate-800">
                  {new Date(latestPayment.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Quota Unlock Preview */}
          <div className="border border-slate-200 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Features Unlocked Upon Approval
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100">
                <div className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> 50 Emails / Day
                </div>
                <div className="text-[11px] text-emerald-600 mt-0.5">Automated warm-up & delivery</div>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100">
                <div className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> 1,500 Emails / Mo
                </div>
                <div className="text-[11px] text-emerald-600 mt-0.5">Multi-tenant inbox rotation</div>
              </div>
            </div>
          </div>

          {/* Payment Instructions Details */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-sky-600" /> Payment Accounts Reference
            </h4>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-600" />
                  <span><strong>JazzCash:</strong> 0300-1234567</span>
                </div>
                <span className="text-[11px] text-slate-400">Title: ColdReach SaaS</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span><strong>Easypaisa:</strong> 0345-9876543</span>
                </div>
                <span className="text-[11px] text-slate-400">Title: ColdReach SaaS</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span><strong>Meezan Bank:</strong> 01020304050607</span>
                </div>
                <span className="text-[11px] text-slate-400">IBAN: PK64MEZN0001020304050607</span>
              </div>
            </div>
          </div>

          {/* Re-submit proof if rejected or missing */}
          {(!latestPayment || isRejected) && (
            <div className="pt-2">
              <Link
                href="/onboarding/payment"
                className="block w-full py-2.5 text-center text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-sm"
              >
                Submit New Payment Proof
              </Link>
            </div>
          )}

          {/* Help & Logout */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-1 text-slate-500">
              <HelpCircle className="w-4 h-4" /> Need urgent assistance? WhatsApp +92-300-1234567
            </div>
            <Link href="/login" className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
