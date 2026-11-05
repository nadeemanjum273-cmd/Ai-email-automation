'use client';

import { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Search, 
  Filter, 
  Clock, 
  Copy, 
  Check, 
  AlertCircle,
  Eye,
  X,
  CreditCard,
  Building2,
  Smartphone,
  RefreshCw,
  BadgeAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { PaymentRequest } from '@/types/database';
import { approveUserPayment, rejectUserPayment } from '@/app/actions/admin';

interface RequestsTableProps {
  initialRequests: PaymentRequest[];
}

export function RequestsTable({ initialRequests }: RequestsTableProps) {
  const [requests, setRequests] = useState<PaymentRequest[]>(initialRequests);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Screenshot modal state
  const [selectedScreenshot, setSelectedScreenshot] = useState<{
    url: string;
    tid: string;
    clientName: string;
  } | null>(null);

  // Reject modal state
  const [rejectModalData, setRejectModalData] = useState<{
    paymentId: string;
    clientName: string;
    tid: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [copiedTid, setCopiedTid] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTid(text);
    toast.info(`TID copied: ${text}`);
    setTimeout(() => setCopiedTid(null), 2000);
  };

  const handleApprove = async (paymentId: string, userId: string, clientName: string) => {
    if (!confirm(`Are you sure you want to approve payment for ${clientName}? This will activate their subscription (PKR 3,000/mo, 50 daily / 1500 monthly emails).`)) {
      return;
    }

    setProcessingId(paymentId);
    const toastId = toast.loading(`Approving payment for ${clientName}...`);

    try {
      const res = await approveUserPayment(paymentId, userId);

      if (res.success) {
        toast.success(`Payment approved! ${clientName} is now active with 50 daily / 1,500 monthly email quota.`, {
          id: toastId,
        });
        // Optimistically remove from pending list
        setRequests((prev) => prev.filter((r) => r.id !== paymentId));
      } else {
        toast.error(`Approval failed: ${res.error || 'Unknown error'}`, {
          id: toastId,
        });
      }
    } catch {
      toast.error('Network or server error during approval', { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (paymentId: string, clientName: string, tid: string) => {
    setRejectModalData({ paymentId, clientName, tid });
    setRejectReason('');
  };

  const submitReject = async () => {
    if (!rejectModalData) return;
    if (!rejectReason.trim()) {
      toast.error('Please specify a rejection reason for the client.');
      return;
    }

    const { paymentId, clientName } = rejectModalData;
    setProcessingId(paymentId);
    const toastId = toast.loading(`Rejecting payment for ${clientName}...`);

    try {
      const res = await rejectUserPayment(paymentId, rejectReason.trim());

      if (res.success) {
        toast.success(`Payment proof rejected. Admin notes saved.`, {
          id: toastId,
        });
        setRequests((prev) => prev.filter((r) => r.id !== paymentId));
        setRejectModalData(null);
      } else {
        toast.error(`Rejection failed: ${res.error || 'Unknown error'}`, {
          id: toastId,
        });
      }
    } catch {
      toast.error('Network error during rejection', { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    const profile = req.profiles;
    const nameMatch = profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
    const emailMatch = profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
    const tidMatch = req.transaction_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = !searchQuery || nameMatch || emailMatch || tidMatch;

    const matchesMethod =
      methodFilter === 'all' || req.payment_method.toLowerCase() === methodFilter.toLowerCase();

    return matchesSearch && matchesMethod;
  });

  const getMethodBadge = (method: string) => {
    switch (method.toLowerCase()) {
      case 'jazzcash':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Smartphone className="w-3.5 h-3.5 text-amber-600" />
            JazzCash
          </span>
        );
      case 'easypaisa':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            Easypaisa
          </span>
        );
      case 'bank transfer':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            Bank Transfer
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Pending Verifications
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{requests.length}</div>
            <div className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Awaiting admin review
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Subscription Price
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">PKR 3,000</div>
            <div className="text-xs text-slate-500 mt-1">Billed every 30 days</div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Allocated Quota / Tenant
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">50 / Day</div>
            <div className="text-xs text-slate-500 mt-1">1,500 Emails / Month</div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client name, email, or TID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-slate-800"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <Filter className="w-4 h-4 text-slate-400" /> Method:
          </div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Payment Methods</option>
            <option value="jazzcash">JazzCash</option>
            <option value="easypaisa">Easypaisa</option>
            <option value="bank transfer">Local Bank Transfer</option>
          </select>
        </div>
      </div>

      {/* Modern Pending Client Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-4">Client Name</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4">Transaction ID (TID)</th>
                <th className="py-3.5 px-4 text-center">Screenshot Proof</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto flex flex-col items-center">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-slate-700">No Pending Requests</p>
                      <p className="text-xs text-slate-400 mt-1">
                        All client payment proofs have been reviewed and approved.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const client = req.profiles;
                  const clientName = client?.full_name || 'Client';
                  const isProcessing = processingId === req.id;

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Client Name */}
                      <td className="py-4 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-xs">
                            {clientName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div>{clientName}</div>
                            <div className="text-[11px] font-normal text-slate-400">
                              Registered:{' '}
                              {new Date(req.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-4 text-slate-600 font-mono text-xs">
                        {client?.email || 'N/A'}
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-4 text-slate-600 text-xs">
                        {client?.phone || (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </td>

                      {/* Method */}
                      <td className="py-4 px-4">
                        <div>{getMethodBadge(req.payment_method)}</div>
                        {req.sender_number && (
                          <div className="text-[11px] text-slate-500 font-mono mt-1">
                            From: {req.sender_number}
                          </div>
                        )}
                      </td>

                      {/* Transaction ID */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold text-slate-800 border border-slate-200">
                            {req.transaction_id}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(req.transaction_id)}
                            className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                            title="Copy TID"
                          >
                            {copiedTid === req.transaction_id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Screenshot Link */}
                      <td className="py-4 px-4 text-center">
                        {req.screenshot_url ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedScreenshot({
                                  url: req.screenshot_url,
                                  tid: req.transaction_id,
                                  clientName,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-md transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Proof
                            </button>
                            <a
                              href={req.screenshot_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-slate-400 hover:text-slate-600"
                              title="Open original in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No image</span>
                        )}
                      </td>

                      {/* Action buttons (Approve / Reject) */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleApprove(req.id, req.user_id, clientName)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5" />
                            )}
                            Approve
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() =>
                              openRejectModal(req.id, clientName, req.transaction_id)
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
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

      {/* Screenshot Viewer Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">
                  Payment Proof Verification
                </h3>
                <p className="text-xs text-slate-500">
                  Client: {selectedScreenshot.clientName} | TID: {selectedScreenshot.tid}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScreenshot(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedScreenshot.url}
                alt={`Proof for ${selectedScreenshot.tid}`}
                className="max-h-[65vh] w-auto rounded-lg object-contain border border-slate-300 shadow-md"
              />
            </div>
            <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center text-xs">
              <span className="text-slate-500">
                Confirm amount of <strong>PKR 3,000</strong> matches the bank account statement.
              </span>
              <a
                href={selectedScreenshot.url}
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 hover:underline flex items-center gap-1 font-medium"
              >
                Open Full Resolution <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center gap-2">
                <BadgeAlert className="w-5 h-5 text-rose-600" />
                <h3 className="font-semibold text-slate-900 text-sm">
                  Reject Payment Proof
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalData(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-xs text-slate-600">
                You are rejecting payment verification for{' '}
                <strong className="text-slate-900">{rejectModalData.clientName}</strong> (TID:{' '}
                <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-rose-700">
                  {rejectModalData.tid}
                </code>
                ). Please write a reason that will be displayed to the user:
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Quick preset reasons:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Transaction ID not found in account',
                    'Screenshot is blurry or unreadable',
                    'Amount does not match PKR 3,000 plan',
                    'Duplicate transaction ID submitted',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectReason(preset)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md transition-colors text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin Notes / Reason:
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g., We could not locate this TID in our JazzCash merchant statement. Please re-upload with genuine receipt."
                  className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 focus:bg-white text-slate-900"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  The client will remain in <strong>pending</strong> state and can re-submit a new TID and screenshot from their onboarding portal.
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalData(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReject}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

