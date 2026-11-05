import { getAllTenants } from '@/app/actions/admin';
import { TenantsTable } from '@/components/admin/tenants-table';
import { Users, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const result = await getAllTenants();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tenants & Clients</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage registered clients, tenant account statuses, and administrative permissions
          </p>
        </div>
        <div>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh List
          </Link>
        </div>
      </div>

      <TenantsTable initialTenants={result.data || []} />
    </div>
  );
}
