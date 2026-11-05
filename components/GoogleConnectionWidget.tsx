'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertTriangle, RefreshCw, LogOut, Check } from 'lucide-react';
import { toast } from 'sonner';
import { disconnectGoogle } from '@/app/actions/campaign';

interface GoogleConnectionWidgetProps {
  isConnected: boolean;
  connectedEmail: string | null;
}

export function GoogleConnectionWidget({ isConnected, connectedEmail }: GoogleConnectionWidgetProps) {
  const router = useRouter();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Google account? You will need to reconnect to launch outreach campaigns.')) {
      return;
    }

    setIsDisconnecting(true);
    const toastId = toast.loading('Disconnecting Google account...');

    try {
      const res = await disconnectGoogle();
      if (res.success) {
        toast.success('Google account disconnected successfully.', { id: toastId });
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to disconnect account', { id: toastId });
      }
    } catch {
      toast.error('An unexpected error occurred', { id: toastId });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">
            Google Integration (Gmail & Sheets)
          </span>
          <div className="mt-1 flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate max-w-[180px] sm:max-w-[200px]" title={connectedEmail || ''}>
                  {connectedEmail}
                </span>
              </div>
            ) : (
              <span className="text-sm font-bold text-amber-600 flex items-center gap-1 font-sans">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                Not Connected
              </span>
            )}
          </div>
        </div>

        {/* Google Icon */}
        <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        {isConnected ? (
          <>
            <span className="text-[11px] text-emerald-600 font-semibold font-sans flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Gmail & Sheets Active
            </span>
            <button
              type="button"
              disabled={isDisconnecting}
              onClick={handleDisconnect}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              {isDisconnecting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>Disconnect</span>
            </button>
          </>
        ) : (
          <a
            href="/api/auth/google"
            className="w-full py-2 px-3 rounded-xl text-xs font-bold text-center text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <span>Connect Google Account (1-Click)</span>
          </a>
        )}
      </div>
    </div>
  );
}
