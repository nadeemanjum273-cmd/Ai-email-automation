'use client';

import { useState } from 'react';
import { 
  Mail, 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  Calendar,
  AlertTriangle,
  Zap,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { Subscription, Profile } from '@/types/database';
import { resetDailyQuota } from '@/app/actions/admin';

interface QuotasTableProps {
  initialQuotas: (Subscription & { profiles?: Profile | null })[];
}

export function QuotasTable({ initialQuotas }: QuotasTableProps) {
  const [quotas, setQuotas] = useState(initialQuotas);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleResetQuota = async (subscriptionId: string, clientName: string) => {
    if (!confirm(`Reset daily quota for ${clientName} to 0 sent today?`)) return;

    setProcessingId(subscriptionId);
    const toastId = toast.loading(`Resetting daily quota for ${clientName}...`);

    try {
      const res = await resetDailyQuota(subscriptionId);
      if (res.success) {
        toast.success(`Daily quota reset to 0 for ${clientName}`, { id: toastId });
        setQuotas((prev) =>
          prev.map((q) => (q.id === subscriptionId ? { ...q, daily_emails_sent: 0 } : q))
        );
      } else {
        toast.error(res.error || 'Failed to reset quota', { id: toastId });
      }
    } catch {
      toast.error('Network error resetting quota', { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredQuotas = quotas.filter((q) => {
    const nameMatch = (q.profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = (q.profiles?.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return !searchQuery || nameMatch || emailMatch;
  });

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tenant name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
          />
        </div>
        <div className="text-xs text-slate-500">
          Total Subscriptions: <strong className="text-slate-900">{quotas.length}</strong>
        </div>
      </div>

      {/* Quotas Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Tenant</th>
                <th className="py-3.5 px-4">Plan</th>
                <th className="py-3.5 px-4">Daily Quota (50 Max)</th>
                <th className="py-3.5 px-4">Monthly Quota (1500 Max)</th>
                <th className="py-3.5 px-4">Subscription Expiry</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No active quotas found.
                  </td>
                </tr>
              ) : (
                filteredQuotas.map((sub) => {
                  const clientName = sub.profiles?.full_name || 'Tenant';
                  const email = sub.profiles?.email || 'N/A';
                  const dailySent = sub.daily_emails_sent || 0;
                  const dailyLimit = sub.daily_email_limit || 50;
                  const monthlySent = sub.monthly_emails_sent || 0;
                  const monthlyLimit = sub.monthly_email_limit || 1500;
                  const dailyPercent = Math.min(100, Math.round((dailySent / dailyLimit) * 100));
                  const monthlyPercent = Math.min(100, Math.round((monthlySent / monthlyLimit) * 100));
                  const isProcessing = processingId === sub.id;

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Tenant */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{clientName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{email}</div>
                      </td>

                      {/* Plan Name & Status */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{sub.plan_name}</div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                            sub.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>

                      {/* Daily Quota Meter */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-bold text-slate-800">
                            {dailySent} / {dailyLimit}
                          </span>
                          <span className="text-slate-400">{dailyPercent}%</span>
                        </div>
                        <div className="w-32 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              dailyPercent > 90
                                ? 'bg-rose-500'
                                : dailyPercent > 70
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${dailyPercent}%` }}
                          />
                        </div>
                      </td>

                      {/* Monthly Quota Meter */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-bold text-slate-800">
                            {monthlySent} / {monthlyLimit}
                          </span>
                          <span className="text-slate-400">{monthlyPercent}%</span>
                        </div>
                        <div className="w-32 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-sky-500 h-1.5 rounded-full"
                            style={{ width: `${monthlyPercent}%` }}
                          />
                        </div>
                      </td>

                      {/* Expiry */}
                      <td className="py-3.5 px-4 text-slate-600 font-mono">
                        {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleResetQuota(sub.id, clientName)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors disabled:opacity-50"
                          title="Reset daily sent count to 0"
                        >
                          {isProcessing ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          Reset Daily
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

