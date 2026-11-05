import Link from 'next/link';
import { 
  Users, 
  CreditCard, 
  Mail, 
  ShieldCheck, 
  BarChart3, 
  CheckCircle2, 
  LogOut 
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-lg shadow-lg">
            CR
          </div>
          <div>
            <h1 className="font-semibold text-base leading-tight">ColdReach CRM</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60 mt-0.5">
              <ShieldCheck className="w-3 h-3" /> Admin Portal
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Client Verification
          </div>
          <Link
            href="/admin/requests"
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium bg-sky-600/20 text-sky-300 border border-sky-500/30 transition-all hover:bg-sky-600/30"
          >
            <span className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-sky-400" />
              Payment Proofs
            </span>
            <span className="inline-flex items-center justify-center text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/20">
              New
            </span>
          </Link>

          <div className="pt-6 px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Platform Management
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
          >
            <BarChart3 className="w-4 h-4 text-slate-400" />
            Overview
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
          >
            <Users className="w-4 h-4 text-slate-400" />
            Tenants & Clients
          </Link>
          <Link
            href="/admin/quotas"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
          >
            <Mail className="w-4 h-4 text-slate-400" />
            Quota Limits
          </Link>
        </nav>

        {/* Business Model Summary Card in Sidebar */}
        <div className="p-4 m-4 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
          <div className="text-slate-400 font-medium">Standard Plan Config</div>
          <div className="text-white font-bold text-sm mt-1">PKR 3,000 / month</div>
          <div className="mt-2.5 space-y-1 text-slate-300 text-[11px]">
            <div className="flex justify-between">
              <span>Daily Quota:</span>
              <span className="font-semibold text-emerald-400">50 Emails</span>
            </div>
            <div className="flex justify-between">
              <span>Monthly Quota:</span>
              <span className="font-semibold text-emerald-400">1,500 Emails</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" /> Switch to Tenant View
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Admin Approval Hub</h2>
            <p className="text-xs text-slate-500">Review pending Pakistani client payment proofs & grant platform access</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
              JazzCash • Easypaisa • Local Bank
            </span>
          </div>
        </header>
        <div className="p-6 md:p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}

