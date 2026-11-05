import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Outreach CRM - Multi-Tenant Cold Email SaaS',
  description: 'Enterprise cold outreach platform with automated quota management and client verification.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}

