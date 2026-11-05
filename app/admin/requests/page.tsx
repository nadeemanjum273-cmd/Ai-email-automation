import { getPendingRequests } from '@/app/actions/admin';
import { RequestsTable } from '@/components/admin/requests-table';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminRequestsPage() {
  const result = await getPendingRequests();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Pending Payment Approvals
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pakistani payment methods verification (JazzCash, Easypaisa, Bank Transfer). Approving a client instantly unlocks their daily 50 / monthly 1,500 email quota.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/requests"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh List
          </Link>
        </div>
      </div>

      {/* Backend Error Display if any */}
      {!result.success && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-rose-900">Database Connection Notice</h4>
            <p className="text-xs text-rose-700 mt-0.5">
              {result.error || 'Failed to load requests from Supabase.'}
            </p>
            <p className="text-xs text-rose-600 mt-2">
              Ensure you have applied the Supabase migration script (available in <code>supabase/schema.sql</code>) and added your <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and <code>SUPABASE_SERVICE_ROLE_KEY</code> to <code>.env.local</code>.
            </p>
          </div>
        </div>
      )}

      {/* Requests Table Client Component */}
      <RequestsTable initialRequests={result.data || []} />
    </div>
  );
}

