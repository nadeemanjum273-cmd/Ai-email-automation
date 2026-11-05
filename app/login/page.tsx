'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { Profile } from '@/types/database';
import { RequestAccessModal } from '@/components/RequestAccessModal';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const [suspendedNotice, setSuspendedNotice] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setPendingNotice(null);
    setSuspendedNotice(null);
    setLoading(true);

    const toastId = toast.loading('Authenticating credentials...');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        toast.error(
          `Login failed: ${error.message === 'Invalid login credentials' ? 'Invalid email or password' : error.message}`,
          { id: toastId }
        );
        setLoading(false);
        return;
      }

      if (!data.user) {
        toast.error('User account record not found.', { id: toastId });
        setLoading(false);
        return;
      }

      // Check profile status
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status, full_name')
        .eq('id', data.user.id)
        .returns<Pick<Profile, 'role' | 'status' | 'full_name'>[]>()
        .maybeSingle();

      // Guard checks:
      if (profile?.status === 'pending') {
        const pendingMsg = 'Your account is currently pending admin verification. Once verified, you will be granted access.';
        setPendingNotice(pendingMsg);
        toast.info(pendingMsg, { id: toastId, duration: 8000 });
        setLoading(false);
        return;
      }

      if (profile?.status === 'suspended') {
        const suspendedMsg = 'Your account has been suspended. Please contact admin support.';
        setSuspendedNotice(suspendedMsg);
        toast.error(suspendedMsg, { id: toastId, duration: 8000 });
        setLoading(false);
        return;
      }

      // If active
      toast.success('Welcome back! Login successful.', { id: toastId });
      
      if (profile?.role === 'admin') {
        router.push('/admin/requests');
      } else {
        router.push('/dashboard');
      }
    } catch {
      toast.error('Network connection error. Please try again.', { id: toastId });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-sky-500 selection:text-white">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))] pointer-events-none" />

      <div className="max-w-md w-full mx-auto space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
              CR
            </div>
          </Link>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Log In to ColdReach
          </h2>
          <p className="text-xs text-slate-400">
            ColdReach Outreach CRM • Automated & Multi-Tenant Access
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm space-y-5">
          {/* Friendly Pending Notice Alert Box */}
          {pendingNotice && (
            <div className="rounded-2xl bg-amber-950/60 border border-amber-500/40 p-4 text-amber-200 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                <Clock className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                <span>Account Pending Verification</span>
              </div>
              <p className="text-xs text-amber-100/90 leading-relaxed">
                {pendingNotice}
              </p>
              <div className="pt-1 flex gap-2">
                <Link
                  href="/onboarding/status"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 underline"
                >
                  <span>View your payment proof status</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {/* Suspended Notice Alert Box */}
          {suspendedNotice && (
            <div className="rounded-2xl bg-rose-950/60 border border-rose-500/40 p-4 text-rose-200 space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-rose-300 text-sm">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Account Suspended</span>
              </div>
              <p className="text-xs text-rose-100/90 leading-relaxed">
                {suspendedNotice}
              </p>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-950/80 border border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-white font-mono placeholder:text-slate-600 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-950/80 border border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-white font-mono placeholder:text-slate-600 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 transition-all shadow-md shadow-sky-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying credentials...
                </span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* New User Section */}
          <div className="pt-3 border-t border-slate-800 text-center space-y-3">
            <div className="text-xs text-slate-400">
              Don&apos;t have an account yet?
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-sky-300 bg-sky-950/50 hover:bg-sky-900/50 border border-sky-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Request Access & Submit Payment Proof</span>
            </button>
          </div>
        </div>

        {/* Back Link & Support */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-2">
          <Link href="/" className="hover:text-slate-300 transition-colors flex items-center gap-1">
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-1 text-slate-400">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Support: +92-300-1234567</span>
          </div>
        </div>
      </div>

      {/* Request Access Modal */}
      <RequestAccessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}