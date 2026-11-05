'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Mail, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Smartphone, 
  Building2, 
  Clock, 
  Sparkles, 
  AlertTriangle,
  FileSpreadsheet,
  Send
} from 'lucide-react';
import { RequestAccessModal } from '@/components/RequestAccessModal';

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-sky-500 selection:text-white">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 border-b border-sky-800/40 px-4 py-2 text-center text-xs text-sky-200 flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span>New Feature: Real-time Google Sheets Sync & 50 Daily Spam-Protected Emails via Gmail.</span>
      </div>

      {/* Modern Header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center font-black text-white text-lg shadow-lg">
            CR
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-tight">AI Email coldreach</h1>
              <span className="text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded-full">
                SaaS Platform
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Automated Cold Email Outreach for Local Clients</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all"
          >
            Client Sign In
          </Link>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 transition-all shadow-md shadow-sky-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Request Access</span>
          </button>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-20 space-y-16">
        <section className="text-center space-y-6 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-400/20">
            <Zap className="w-3.5 h-3.5" />
            <span>100% Primary Inbox Delivery • Zero Spam • Live Google Sheets Sync</span>
          </div>

          {/* Catchy Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight sm:leading-snug text-slate-100">
            Hyper-Personalized Automated Cold Emails for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-teal-300">
              Local Clients
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-slate-300 text-sm sm:text-lg max-w-3xl mx-auto leading-relaxed">
            Connect your target prospects directly from Google Sheets and automatically dispatch niche-tailored, personalized emails through your verified Gmail account with humanized anti-spam intervals.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 transition-all shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2 group"
            >
              <span>Request Access</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-sm font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 transition-all flex items-center justify-center gap-2"
            >
              <span>Already registered? Sign In</span>
            </Link>
          </div>

          {/* Payment Providers Bar */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
            <span>Seamless manual payment methods:</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-amber-500/30 text-amber-300">
              <Smartphone className="w-3.5 h-3.5 text-amber-400" /> JazzCash
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-emerald-500/30 text-emerald-300">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> Easypaisa
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-blue-500/30 text-blue-300">
              <Building2 className="w-3.5 h-3.5 text-blue-400" /> Meezan Bank Transfer
            </span>
          </div>
        </section>

        {/* How It Works Visual Flow */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider">Automated Outreach Engine</h3>
            <h2 className="text-2xl sm:text-3xl font-bold">How It Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-emerald-400">Step 1: Google Sheets Sync</div>
              <h4 className="text-sm font-bold text-white">Import Leads Live</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your sheet with Name, Email, Niche, and Status columns. The system synchronizes in real time.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-sky-400">Step 2: AI Personalization</div>
              <h4 className="text-sm font-bold text-white">Niche Tailoring</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generate subject lines and body copy personalized to each prospect&apos;s specific industry and business niche.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-amber-400">Step 3: Spam Guard Delay</div>
              <h4 className="text-sm font-bold text-white">45–90s Safety Interval</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                A humanized delay between each dispatched message keeps your domain safe from spam filters and blacklists.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Send className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-indigo-400">Step 4: Inbox Delivery</div>
              <h4 className="text-sm font-bold text-white">50 Daily / 1,500 Monthly</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                High-deliverability emails landed right in the primary inbox, converting local prospects into booked calls.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing & Quota Card (Highlighted) */}
        <section className="max-w-xl mx-auto">
          <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-sky-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-sky-500/10 space-y-6">
            {/* Top Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">
              Starter Plan for Agencies
            </div>

            <div className="text-center pt-2">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                Standard Professional Plan
              </span>
              <div className="text-4xl sm:text-5xl font-black text-white mt-2 font-sans">
                PKR 3,000 <span className="text-sm font-normal text-slate-400">/ Month</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">30-day recurring access with automated quota tracking</p>
            </div>

            {/* Limits highlight grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-4 text-center">
                <div className="text-xs text-slate-400">Daily Sending Quota</div>
                <div className="text-2xl font-black text-emerald-400 mt-0.5">50 Emails</div>
                <div className="text-[11px] text-slate-400 mt-1">Safe Warmup & Delivery</div>
              </div>
              <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-4 text-center">
                <div className="text-xs text-slate-400">Monthly Capacity</div>
                <div className="text-2xl font-black text-sky-400 mt-0.5">1,500 Emails</div>
                <div className="text-[11px] text-slate-400 mt-1">Multi-Tenant Rotation</div>
              </div>
            </div>

            {/* Feature Checklist */}
            <div className="space-y-3 border-t border-slate-800 pt-4 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>1-Click Google Sheets Sync:</strong> Automated header mapping (Name, Email, Niche, Status)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>AI-Generated Niche Personalization:</strong> Tailored body copy for each prospect</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>45–90s Spam Guard Delay:</strong> Automated humanized pauses protecting domain health</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Local Payment Methods:</strong> Pay easily via JazzCash, Easypaisa, or Local Bank Transfer</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Fast Admin Verification:</strong> Proof approved within 15–60 minutes during business hours</span>
              </div>
            </div>

            {/* Card CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full py-3.5 px-6 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2"
              >
                <span>Request Access & Submit Payment Proof</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Important Instructions & Terms Box */}
        <section className="bg-amber-950/30 border border-amber-600/30 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5 text-amber-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="text-base sm:text-lg font-bold">Important Instructions & Terms of Use</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-amber-100/90 leading-relaxed">
            <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-4 space-y-1.5">
              <div className="font-bold text-amber-300">1. Account Approval Process</div>
              <p className="text-slate-300">
                Your account will be activated once the admin verifies your submitted payment proof and Transaction ID (TID). Unapproved accounts remain in a pending state.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-4 space-y-1.5">
              <div className="font-bold text-amber-300">2. Domain Safety Guard</div>
              <p className="text-slate-300">
                To prevent spam detection, the system enforces a 45 to 90-second humanized pause between each email. Respect the 50/day limit to protect your domain reputation.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-4 space-y-1.5">
              <div className="font-bold text-amber-300">3. Google Sheet Formatting</div>
              <p className="text-slate-300">
                Your spreadsheet must include columns for Name, Email, Niche, and Status starting from row A1 to ensure automated column mapping and synchronization.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-4 space-y-1.5">
              <div className="font-bold text-rose-300">4. Zero-Tolerance Spam Policy</div>
              <p className="text-slate-300">
                Any illegal content, phishing, or abusive bulk spamming will result in immediate permanent account suspension without prior warning.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span>© 2026 AI Email coldreach. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <span className="text-slate-700">•</span>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="hover:text-white transition-colors"
            >
              Pricing & Access
            </button>
            <span className="text-slate-700">•</span>
            <span className="text-slate-400">WhatsApp Support: +923017642273</span>
          </div>
        </footer>
      </main>

      {/* Manual Payment & Request Access Modal */}
      <RequestAccessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
