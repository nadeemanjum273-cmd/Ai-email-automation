'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { PaymentMethod } from '@/types/database';

export default function SubmitPaymentProofPage() {
  const router = useRouter();
  const supabase = createClient();

  const [method, setMethod] = useState<PaymentMethod>('JazzCash');
  const [transactionId, setTransactionId] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId.trim()) {
      toast.error('Please enter the Transaction ID (TID).');
      return;
    }
    if (!screenshotUrl.trim()) {
      toast.error('Please provide a screenshot proof URL.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Submitting payment proof...');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be signed in to submit payment proof.', { id: toastId });
        router.push('/login');
        return;
      }

      const { error } = await supabase.from('payment_requests').insert({
        user_id: user.id,
        amount: 3000,
        currency: 'PKR',
        payment_method: method,
        transaction_id: transactionId.trim(),
        screenshot_url: screenshotUrl.trim(),
        status: 'pending' as const,
      });

      if (error) {
        toast.error(`Submission failed: ${error.message}`, { id: toastId });
      } else {
        toast.success('Payment proof submitted successfully! Awaiting admin review.', {
          id: toastId,
        });
        router.push('/onboarding/status');
      }
    } catch {
      toast.error('Unexpected error submitting proof', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full mx-auto space-y-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-black text-white text-xl shadow-lg">
            CR
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Submit Payment Proof
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Standard Plan: <strong>PKR 3,000 / Month</strong> (50 Daily / 1,500 Monthly Emails)
          </p>
        </div>

        {/* Bank & Wallet Accounts Box */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-sky-400" />
            Transfer PKR 3,000 To Any Account Below:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Smartphone className="w-3.5 h-3.5" /> JazzCash
              </div>
              <div className="font-mono text-sm font-semibold mt-1">0300-1234567</div>
              <div className="text-[11px] text-slate-400 mt-0.5">ColdReach SaaS</div>
            </div>

            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Smartphone className="w-3.5 h-3.5" /> Easypaisa
              </div>
              <div className="font-mono text-sm font-semibold mt-1">0345-9876543</div>
              <div className="text-[11px] text-slate-400 mt-0.5">ColdReach SaaS</div>
            </div>

            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
              <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                <Building2 className="w-3.5 h-3.5" /> Meezan Bank
              </div>
              <div className="font-mono text-xs font-semibold mt-1">01020304050607</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Title: ColdReach</div>
            </div>
          </div>
        </div>

        {/* Submission Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5"
        >
          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Select Payment Method Used
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['JazzCash', 'Easypaisa', 'Bank Transfer'] as const).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all text-center ${
                    method === m
                      ? 'bg-sky-50 border-sky-600 text-sky-700 ring-1 ring-sky-600'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* TID Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Transaction ID (TID)
            </label>
            <input
              type="text"
              required
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. 1293847501"
              className="w-full text-sm font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Found on the SMS receipt or banking app confirmation screen.
            </p>
          </div>

          {/* Screenshot URL Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Payment Screenshot Proof (Public URL)
            </label>
            <input
              type="url"
              required
              value={screenshotUrl}
              onChange={(e) => setScreenshotUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... or Supabase storage URL"
              className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Provide a direct image URL or upload to Supabase storage / image host.
            </p>
          </div>

          <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-xs text-sky-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <span>
              Once submitted, our admin team verifies the TID against bank records. Your daily 50 and monthly 1,500 email limits will be unlocked immediately upon approval.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? 'Submitting Proof...' : 'Submit Payment Proof for Verification'}
          </button>
        </form>
      </div>
    </div>
  );
}
