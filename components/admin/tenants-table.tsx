'use client';

import { useState } from 'react';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  Clock, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { Profile } from '@/types/database';
import { updateTenantStatus } from '@/app/actions/admin';

interface TenantsTableProps {
  initialTenants: Profile[];
}

export function TenantsTable({ initialTenants }: TenantsTableProps) {
  const [tenants, setTenants] = useState<Profile[]>(initialTenants);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'suspended') => {
    setProcessingId(userId);
    const toastId = toast.loading(`Updating tenant status to ${newStatus}...`);

    try {
      const res = await updateTenantStatus(userId, newStatus);
      if (res.success) {
        toast.success(`Tenant status updated to ${newStatus}`, { id: toastId });
        setTenants((prev) =>
          prev.map((t) => (t.id === userId ? { ...t, status: newStatus } : t))
        );
      } else {
        toast.error(res.error || 'Failed to update status', { id: toastId });
      }
    } catch {
      toast.error('Network error updating status', { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  const handlePromoteAdmin = async (userId: string, currentRole: string) => {
    const targetRole = currentRole === 'admin' ? 'client' : 'admin';
    if (!confirm(`Are you sure you want to change this user's role to ${targetRole}?`)) return;

    setProcessingId(userId);
    const toastId = toast.loading(`Updating role to ${targetRole}...`);

    try {
      const res = await updateTenantStatus(userId, 'active', targetRole);
      if (res.success) {
        toast.success(`Role updated to ${targetRole}!`, { id: toastId });
        setTenants((prev) =>
          prev.map((t) => (t.id === userId ? { ...t, role: targetRole, status: 'active' } : t))
        );
      } else {
        toast.error(res.error || 'Failed to update role', { id: toastId });
      }
    } catch {
      toast.error('Network error updating role', { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredTenants = tenants.filter((t) => {
    const nameMatch = (t.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = t.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = !searchQuery || nameMatch || emailMatch;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs text-slate-500">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Statuses ({tenants.length})</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Registered Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No tenants found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const isProcessing = processingId === tenant.id;

                  return (
                    <tr key={tenant.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{tenant.full_name || 'Client'}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{tenant.email}</div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {tenant.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            <ShieldCheck className="w-3 h-3 text-purple-600" /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Client
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {tenant.status === 'active' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <UserCheck className="w-3 h-3" /> Active
                          </span>
                        )}
                        {tenant.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                        {tenant.status === 'suspended' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertCircle className="w-3 h-3" /> Suspended
                          </span>
                        )}
                      </td>

                      {/* Registered Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {tenant.status !== 'active' ? (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleStatusChange(tenant.id, 'active')}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
                            >
                              Activate
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleStatusChange(tenant.id, 'suspended')}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                            >
                              Suspend
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handlePromoteAdmin(tenant.id, tenant.role)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors disabled:opacity-50"
                            title={tenant.role === 'admin' ? 'Demote to Client' : 'Promote to Admin'}
                          >
                            {tenant.role === 'admin' ? 'Demote' : 'Make Admin'}
                          </button>
                        </div>
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
