import { getAllQuotas } from '@/app/actions/admin';
import { QuotasTable } from '@/components/admin/quotas-table';
import { Mail, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminQuotasPage() {
  const result = await getAllQuotas();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tenant Quota Limits</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track daily 50 and monthly 1,500 email limits across all active tenants with manual quota reset controls
          </p>
        </div>
        <div>
          <Link
            href="/admin/quotas"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh List
          </Link>
        </div>
      </div>

      <QuotasTable initialQuotas={result.data || []} />
    </div>
  );
}
