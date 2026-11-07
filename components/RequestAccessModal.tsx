'use client';

import { useState, useRef } from 'react';
import { 
  X, 
  CheckCircle2, 
  Upload, 
  Copy, 
  Check, 
  Smartphone, 
  Building2, 
  ShieldCheck, 
  ArrowLeft, 
  ArrowRight, 
  Trash2,
  Lock,
  Mail,
  User,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';
import { PaymentMethod } from '@/types/database';
import { submitAccessRequest } from '@/app/actions/auth';
import Link from 'next/link';

interface RequestAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RequestAccessModal({ isOpen, onClose }: RequestAccessModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: User details
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2 & 3: Payment details & proof
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('JazzCash');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState<string>('');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${key} copied: ${text}`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB.');
      return;
    }

    setScreenshotFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setScreenshotPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const validateStep1 = () => {
    if (!fullName.trim()) {
      toast.error('Please enter your full name or company name.');
      return false;
    }
    if (!phone.trim()) {
      toast.error('Please enter your phone or WhatsApp number.');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return false;
    }
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!screenshotPreview) {
      toast.error('Please upload your payment receipt screenshot.');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;

    setIsSubmitting(true);
    const toastId = toast.loading('Submitting access request and payment proof...');

    // Auto-generate unique transaction reference ID and sender number from phone
    const generatedTid = 'TID-' + Math.floor(10000000 + Math.random() * 90000000);

    try {
      const res = await submitAccessRequest({
        fullName,
        phone,
        email,
        password,
        paymentMethod,
        senderNumber: phone || '0301-7642273',
        transactionId: generatedTid,
        screenshotBase64: screenshotPreview || undefined,
        screenshotFileName,
      });

      if (res.success) {
        toast.success(
          res.message || 'Your request and payment proof have been received. You will be able to log in once admin approves your request.',
          { id: toastId, duration: 6000 }
        );
        setCurrentStep(4);
      } else {
        toast.error(res.error || 'Failed to submit request', { id: toastId });
      }
    } catch {
      toast.error('Network error occurred. Please try again.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setCurrentStep(1);
    setFullName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setScreenshotPreview(null);
    setScreenshotFileName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden text-left transition-all animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md text-base">
              CR
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Request Platform Access</h2>
              <p className="text-xs text-sky-300 font-sans mt-0.5">
                AI Email coldreach • PKR 3,000 / Month Standard Plan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        {currentStep < 4 && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
              <span className={currentStep >= 1 ? 'text-sky-600 font-bold' : ''}>1. Account Details</span>
              <span className={currentStep >= 2 ? 'text-sky-600 font-bold' : ''}>2. Payment Options</span>
              <span className={currentStep >= 3 ? 'text-sky-600 font-bold' : ''}>3. Proof Verification</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className={`h-1.5 rounded-full transition-all ${currentStep >= 1 ? 'bg-sky-600' : 'bg-slate-200'}`} />
              <div className={`h-1.5 rounded-full transition-all ${currentStep >= 2 ? 'bg-sky-600' : 'bg-slate-200'}`} />
              <div className={`h-1.5 rounded-full transition-all ${currentStep >= 3 ? 'bg-sky-600' : 'bg-slate-200'}`} />
            </div>
          </div>
        )}

        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto">
          {/* STEP 1: Account Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 text-xs text-sky-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Enter your contact details so our admin team can verify your payment receipt screenshot and activate your account immediately. Contact: <strong>+923077978277</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Name / Agency Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nadeem Anjum (Growth Leads)"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Phone / WhatsApp Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="03017642273"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="you@youragency.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Set Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <span>Continue to Payment Options</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Payment Accounts Display */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Fee Announcement Badge */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-emerald-900">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">Standard Monthly Fee:</div>
                  <div className="text-lg font-black text-emerald-700 font-sans">PKR 3,000 / Month</div>
                </div>
                <div className="text-right text-[11px] text-emerald-800 font-sans">
                  50 Daily Emails<br />1,500 Monthly Quota
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Please transfer <strong>PKR 3,000</strong> to any of the verified accounts below and take a screenshot of your transfer:
              </p>

              {/* Payment Accounts Cards */}
              <div className="space-y-3">
                {/* JazzCash */}
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-900">JazzCash</div>
                      <div className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                        0301-7642273
                      </div>
                      <div className="text-[11px] text-slate-600">Account Title: Nadeem Anjum</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('03017642273', 'JazzCash Number')}
                    className="p-2 text-xs font-semibold bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg transition-colors flex items-center gap-1 font-sans"
                  >
                    {copiedKey === 'JazzCash Number' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'JazzCash Number' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Easypaisa */}
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-900">Easypaisa</div>
                      <div className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                        0301-7642273
                      </div>
                      <div className="text-[11px] text-slate-600">Account Title: Nadeem Anjum</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('03017642273', 'Easypaisa Number')}
                    className="p-2 text-xs font-semibold bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1 font-sans"
                  >
                    {copiedKey === 'Easypaisa Number' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'Easypaisa Number' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Bank Transfer (Faysal Bank) */}
                <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-900">Faysal Bank (RAAST / IBAN)</div>
                      <div className="font-mono text-xs font-bold text-slate-900 mt-0.5">
                        PK33FAYS3810525000001140
                      </div>
                      <div className="text-[11px] text-slate-600">Account Title: Nadeem Anjum</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('PK33FAYS3810525000001140', 'Faysal Bank IBAN')}
                    className="p-2 text-xs font-semibold bg-white hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg transition-colors flex items-center gap-1 font-sans"
                  >
                    {copiedKey === 'Faysal Bank IBAN' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'Faysal Bank IBAN' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="w-1/3 py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-2/3 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>I Have Paid, Upload Screenshot</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Payment Proof Submission */}
          {currentStep === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Method Used *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['JazzCash', 'Easypaisa', 'Bank Transfer'] as PaymentMethod[]).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all text-center ${
                        paymentMethod === m
                          ? 'bg-sky-50 border-sky-600 text-sky-700 ring-2 ring-sky-500/30'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Screenshot Upload with preview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Receipt Screenshot Proof *
                </label>
                
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!screenshotPreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-sky-500 bg-slate-50 hover:bg-sky-50/50 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
                  >
                    <div className="h-12 w-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-700">
                      Click here to upload your payment receipt screenshot
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans">
                      PNG, JPG, JPEG (Max 5MB)
                    </div>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={screenshotPreview}
                        alt="Proof Preview"
                        className="h-16 w-16 object-cover rounded-lg border border-slate-300"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800 line-clamp-1">
                          {screenshotFileName || 'payment_proof.jpg'}
                        </div>
                        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" /> Screenshot attached
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotPreview(null);
                        setScreenshotFileName('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setCurrentStep(2)}
                  className="w-1/3 py-3 px-3 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-2/3 py-3 px-4 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting Request...
                    </span>
                  ) : (
                    <span>Submit Payment Proof</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Success Screen */}
          {currentStep === 4 && (
            <div className="py-6 text-center space-y-4">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">
                  Request Submitted Successfully!
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Your payment receipt screenshot has been received. You will be able to log in once our admin approves your verification.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 text-left space-y-2 max-w-sm mx-auto">
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-mono font-bold text-slate-900">{email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-amber-600 font-bold">Pending Admin Review</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center max-w-sm mx-auto">
                <Link
                  href="/login"
                  onClick={resetAndClose}
                  className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 transition-colors"
                >
                  Go to Sign In
                </Link>
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
