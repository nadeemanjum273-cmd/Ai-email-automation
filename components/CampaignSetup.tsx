'use client';

import { useState } from 'react';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Clock, 
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchSheetColumns, saveCampaign } from '@/app/actions/campaign';
import { CampaignRunnerModal, CampaignPayload } from '@/components/CampaignRunnerModal';

interface CampaignSetupProps {
  isGoogleConnected: boolean;
  remainingDailyQuota: number;
}

export function CampaignSetup({ isGoogleConnected, remainingDailyQuota }: CampaignSetupProps) {
  // Step A: Sheet Details
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetId, setSheetId] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [isFetchingColumns, setIsFetchingColumns] = useState(false);

  // Step B: Column Mappings
  const [columnName, setColumnName] = useState('');
  const [columnEmail, setColumnEmail] = useState('');
  const [columnNiche, setColumnNiche] = useState('');
  const [columnStatus, setColumnStatus] = useState('');

  // Step C: Subject & Body Templates
  const [campaignTitle, setCampaignTitle] = useState('Client Outreach Campaign');
  const [subjectTemplate, setSubjectTemplate] = useState('Quick question regarding {{Company}}');
  const [bodyTemplate, setBodyTemplate] = useState(
    'Hi {{Name}},\n\nI was looking through {{Company}} and noticed your focus on {{Niche}}. We recently helped several similar businesses increase client acquisition with personalized outreach.\n\nWould you be open to a quick 5-minute chat sometime this week?\n\nBest regards,\nGrowth Outreach Team'
  );

  // Step D: Throttle & Launch
  const [batchSize, setBatchSize] = useState<number>(Math.min(10, Math.max(5, remainingDailyQuota)));
  const [isSaving, setIsSaving] = useState(false);
  const [campaignLaunched, setCampaignLaunched] = useState(false);
  const [isRunnerOpen, setIsRunnerOpen] = useState(false);
  const [runnerPayload, setRunnerPayload] = useState<CampaignPayload | null>(null);

  const handleFetchColumns = async () => {
    if (!sheetUrl.trim()) {
      toast.error('Please enter a Google Sheet URL or ID.');
      return;
    }

    if (!isGoogleConnected) {
      toast.error('Please connect your Google (Gmail & Sheets) account first.');
      return;
    }

    setIsFetchingColumns(true);
    const toastId = toast.loading('Reading Google Sheet columns...');

    try {
      const res = await fetchSheetColumns(sheetUrl.trim());

      if (res.success && res.columns) {
        setSheetId(res.sheetId || '');
        setSheetName(res.sheetName || 'Sheet1');
        setAvailableSheets(res.sheets || ['Sheet1']);
        setAvailableColumns(res.columns);

        // Auto-detect common column headers
        res.columns.forEach((col) => {
          const lower = col.toLowerCase();
          if (lower.includes('name') || lower.includes('contact') || lower.includes('client')) setColumnName(col);
          if (lower.includes('email') || lower.includes('mail')) setColumnEmail(col);
          if (lower.includes('niche') || lower.includes('category') || lower.includes('industry') || lower.includes('business'))
            setColumnNiche(col);
          if (lower.includes('status') || lower.includes('state')) setColumnStatus(col);
        });

        toast.success(`Successfully loaded ${res.columns.length} columns from Google Sheet.`, {
          id: toastId,
        });
      } else {
        toast.error(res.error || 'Failed to fetch columns', { id: toastId });
      }
    } catch {
      toast.error('Connection error occurred while fetching columns', { id: toastId });
    } finally {
      setIsFetchingColumns(false);
    }
  };

  const insertVariable = (variableTag: string) => {
    setBodyTemplate((prev) => `${prev} ${variableTag}`);
    toast.info(`Inserted ${variableTag} into template.`);
  };

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isGoogleConnected) {
      toast.error('A connected Google account is required.');
      return;
    }

    if (!sheetId || availableColumns.length === 0) {
      toast.error('Please load the Google Sheet columns first.');
      return;
    }

    if (!columnEmail) {
      toast.error('Selecting the Email column is required.');
      return;
    }

    if (!subjectTemplate.trim() || !bodyTemplate.trim()) {
      toast.error('Subject line and email body template are required.');
      return;
    }

    if (remainingDailyQuota <= 0) {
      toast.error("Today's daily sending quota has been fully used.");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Saving and queuing campaign...');

    try {
      const res = await saveCampaign({
        title: campaignTitle,
        sheetUrl,
        sheetId,
        sheetName,
        columnName,
        columnEmail,
        columnNiche,
        columnStatus,
        subjectTemplate,
        bodyTemplate,
        batchSize,
      });

      if (res.success) {
        toast.success(
          'Campaign saved! Opening execution terminal with 45-90s humanized spam protection delays.',
          { id: toastId, duration: 5000 }
        );
        setRunnerPayload({
          spreadsheetId: sheetId,
          sheetName: sheetName || 'Sheet1',
          columnMapping: {
            name: columnName,
            email: columnEmail,
            niche: columnNiche,
            status: columnStatus,
          },
          subjectTemplate,
          bodyTemplate,
          batchSize,
        });
        setIsRunnerOpen(true);
      } else {
        toast.error(res.error || 'Failed to save campaign', { id: toastId });
      }
    } catch {
      toast.error('Network error saving campaign', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">Campaign & Sheet Setup</h2>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Google Sheets Synchronization, Dynamic Niche Variables & Spam-Safe Throttling
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-sky-50 text-sky-700 border border-sky-200 font-semibold px-3 py-1.5 rounded-xl font-sans">
            Daily Quota Remaining: {remainingDailyQuota} / 50
          </span>
        </div>
      </div>

      {/* Google Warning If Not Connected */}
      {!isGoogleConnected && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold">Google Connection Required</h4>
            <p className="text-amber-800 leading-relaxed">
              To read sheet columns and dispatch emails from your genuine Gmail address, please connect your Google account in the top card first.
            </p>
          </div>
        </div>
      )}

      {campaignLaunched ? (
        <div className="py-8 text-center space-y-4">
          <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">Campaign Launched Successfully!</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Your outreach sequence has been queued. Emails will be dispatched from your connected Gmail with a humanized 45–90 second safety interval between each message.
          </p>
          <button
            type="button"
            onClick={() => setCampaignLaunched(false)}
            className="py-2.5 px-5 rounded-xl text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
          >
            Create Another Campaign
          </button>
        </div>
      ) : (
        <form onSubmit={handleLaunchCampaign} className="space-y-8">
          {/* STEP A: Google Sheet Input */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center font-sans">
                A
              </span>
              <h3 className="text-sm font-bold text-slate-800">Google Sheet URL or Spreadsheet ID</h3>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <FileSpreadsheet className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFM.../edit"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-slate-900"
                />
              </div>
              <button
                type="button"
                disabled={isFetchingColumns || !isGoogleConnected}
                onClick={handleFetchColumns}
                className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
              >
                {isFetchingColumns ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Fetching Columns...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Fetch Columns</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ensure the Google Sheet is shared with your connected Google account and that row 1 contains your header columns.
            </p>

            {availableColumns.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-wrap items-center gap-2 text-xs text-emerald-800 font-sans">
                <span className="font-bold">Detected Columns:</span>
                {availableColumns.map((col) => (
                  <span key={col} className="bg-white border border-emerald-300 px-2 py-0.5 rounded-md font-semibold text-emerald-700">
                    {col}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* STEP B: Dynamic Column Mapping */}
          <div className="space-y-4 border-t border-slate-100 pt-6">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center font-sans">
                B
              </span>
              <h3 className="text-sm font-bold text-slate-800">Dynamic Column Mapping</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Full Name Column */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Name Column *
                </label>
                <select
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  disabled={availableColumns.length === 0}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-sans disabled:opacity-50 text-slate-900"
                >
                  <option value="">Select Column</option>
                  {availableColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email Column */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Column (Required) *
                </label>
                <select
                  required
                  value={columnEmail}
                  onChange={(e) => setColumnEmail(e.target.value)}
                  disabled={availableColumns.length === 0}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-sans disabled:opacity-50 text-slate-900"
                >
                  <option value="">Select Column</option>
                  {availableColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Niche Column */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Customer Niche / Business Column *
                </label>
                <select
                  value={columnNiche}
                  onChange={(e) => setColumnNiche(e.target.value)}
                  disabled={availableColumns.length === 0}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-sans disabled:opacity-50 text-slate-900"
                >
                  <option value="">Select Column</option>
                  {availableColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Column */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Status Column *
                </label>
                <select
                  value={columnStatus}
                  onChange={(e) => setColumnStatus(e.target.value)}
                  disabled={availableColumns.length === 0}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-sans disabled:opacity-50 text-slate-900"
                >
                  <option value="">Select Column</option>
                  {availableColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* STEP C: Outreach Message & Personalization */}
          <div className="space-y-4 border-t border-slate-100 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center font-sans">
                  C
                </span>
                <h3 className="text-sm font-bold text-slate-800">Message & Dynamic Variables</h3>
              </div>

              {/* Variable Insertion Pills */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px]">Insert Tag:</span>
                <button
                  type="button"
                  onClick={() => insertVariable('{{Name}}')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono font-bold transition-colors"
                >
                  &#123;&#123;Name&#125;&#125;
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('{{Company}}')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono font-bold transition-colors"
                >
                  &#123;&#123;Company&#125;&#125;
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('{{Niche}}')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono font-bold transition-colors"
                >
                  &#123;&#123;Niche&#125;&#125;
                </button>
              </div>
            </div>

            {/* Campaign Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Campaign Name</label>
              <input
                type="text"
                required
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
              />
            </div>

            {/* Subject Line Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Subject Line (with Variables) *
              </label>
              <input
                type="text"
                required
                value={subjectTemplate}
                onChange={(e) => setSubjectTemplate(e.target.value)}
                placeholder="e.g. Quick question regarding {{Company}}"
                className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 font-semibold"
              />
            </div>

            {/* Body Copy Template */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email Body Copy / AI Template *
              </label>
              <textarea
                rows={6}
                required
                value={bodyTemplate}
                onChange={(e) => setBodyTemplate(e.target.value)}
                className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 leading-relaxed font-sans"
              />
            </div>
          </div>

          {/* STEP D: Daily Throttle & Launch */}
          <div className="space-y-4 border-t border-slate-100 pt-6">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center font-sans">
                D
              </span>
              <h3 className="text-sm font-bold text-slate-800">Daily Throttle & Launch</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Batch Size to Send Today (Min 5, Max {remainingDailyQuota})
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={5}
                    max={Math.max(5, remainingDailyQuota)}
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    disabled={remainingDailyQuota < 5}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                  <span className="font-mono font-black text-lg text-sky-600 bg-sky-50 border border-sky-200 px-3 py-1 rounded-xl">
                    {batchSize}
                  </span>
                </div>
              </div>

              {/* Anti-Spam Safety Notice */}
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-xs text-sky-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-sky-800">
                  <Clock className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>Anti-Spam Humanized Delay Policy</span>
                </div>
                <p className="text-[11px] text-sky-800/90 leading-relaxed">
                  The system will automatically enforce a 45 to 90-second humanized delay between each email to safeguard your domain reputation and prevent spam filters.
                </p>
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSaving || !isGoogleConnected || remainingDailyQuota <= 0}
                className="w-full py-4 px-6 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 active:scale-[0.99] transition-all shadow-lg shadow-sky-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Launching Campaign...
                  </span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Save & Launch Campaign</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Live Campaign Execution & Anti-Spam Progress Modal */}
      {runnerPayload && (
        <CampaignRunnerModal
          isOpen={isRunnerOpen}
          onClose={() => setIsRunnerOpen(false)}
          campaignPayload={runnerPayload}
        />
      )}
    </div>
  );
}
