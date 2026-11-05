'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  Square, 
  Terminal, 
  RefreshCw,
  Sparkles,
  ArrowRight,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ColumnMapping } from '@/lib/sheets-sync';

export interface CampaignPayload {
  spreadsheetId: string;
  sheetName: string;
  columnMapping: ColumnMapping;
  subjectTemplate: string;
  bodyTemplate: string;
  batchSize: number;
}

interface CampaignRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignPayload: CampaignPayload;
}

interface LogEntry {
  id: string;
  timestamp: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'delay';
}

export function CampaignRunnerModal({
  isOpen,
  onClose,
  campaignPayload,
}: CampaignRunnerModalProps) {
  const router = useRouter();

  const [status, setStatus] = useState<'running' | 'delaying' | 'completed' | 'aborted' | 'error'>('running');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [currentLeadIdx, setCurrentLeadIdx] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [totalDelaySeconds, setTotalDelaySeconds] = useState(0);
  const [currentRecipient, setCurrentRecipient] = useState<string | null>(null);
  const [currentCompany, setCurrentCompany] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const logTerminalRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll logs terminal
  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (text: string, type: LogEntry['type'] = 'info') => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: timeStr,
        text,
        type,
      },
    ]);
  };

  const handleStopCampaign = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      addLog('Campaign execution was interrupted by user.', 'warning');
      setStatus('aborted');
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setStatus('running');
    setLogs([]);
    setTotalLeads(0);
    setCurrentLeadIdx(0);
    setSentCount(0);
    setFailedCount(0);
    setRemainingSeconds(0);
    setCurrentRecipient(null);
    setCurrentCompany(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    addLog('Initializing campaign execution pipeline...', 'info');

    async function runPipeline() {
      try {
        const response = await fetch('/api/campaign/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(campaignPayload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server responded with status ${response.status}`);
        }

        if (!response.body) {
          throw new Error('ReadableStream not supported by server response.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;

            const jsonStr = trimmed.slice(6);
            try {
              const event = JSON.parse(jsonStr);

              switch (event.type) {
                case 'status':
                  addLog(event.message, 'info');
                  break;

                case 'init':
                  setTotalLeads(event.batchCount || 0);
                  addLog(event.message, 'info');
                  break;

                case 'step':
                  setCurrentLeadIdx(event.current);
                  setCurrentRecipient(event.email);
                  setCurrentCompany(event.company);

                  if (event.step === 'personalizing') {
                    addLog(event.message, 'info');
                  } else if (event.step === 'sending') {
                    addLog(
                      `${event.message}${event.isAiGenerated ? ' (AI Personalization applied)' : ''}`,
                      'info'
                    );
                  } else if (event.step === 'sheet_sync') {
                    addLog(event.message, 'info');
                  }
                  break;

                case 'lead_completed':
                  setSentCount((prev) => prev + 1);
                  addLog(event.message, 'success');
                  break;

                case 'lead_failed':
                  setFailedCount((prev) => prev + 1);
                  addLog(event.message, 'error');
                  break;

                case 'delay_start':
                  setStatus('delaying');
                  setRemainingSeconds(event.delaySeconds);
                  setTotalDelaySeconds(event.delaySeconds);
                  addLog(event.message, 'delay');
                  break;

                case 'delay_tick':
                  setRemainingSeconds(event.secondsRemaining);
                  if (event.totalDelay) setTotalDelaySeconds(event.totalDelay);
                  break;

                case 'delay_end':
                  setStatus('running');
                  setRemainingSeconds(0);
                  addLog(event.message, 'info');
                  break;

                case 'aborted':
                  setStatus('aborted');
                  addLog(event.message, 'warning');
                  break;

                case 'complete':
                  setStatus('completed');
                  addLog(event.message, 'success');
                  break;

                case 'error':
                  setStatus('error');
                  addLog(`Error: ${event.message}`, 'error');
                  break;
              }
            } catch (parseErr) {
              console.warn('Failed to parse SSE event:', jsonStr, parseErr);
            }
          }
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          setStatus('aborted');
        } else {
          setStatus('error');
          addLog(err instanceof Error ? err.message : 'Unknown pipeline error', 'error');
        }
      }
    }

    runPipeline();

    return () => {
      controller.abort();
    };
  }, [isOpen, campaignPayload]);

  if (!isOpen) return null;

  const progressPercent =
    totalLeads > 0 ? Math.min(100, Math.round(((sentCount + failedCount) / totalLeads) * 100)) : 0;

  const delayProgressPercent =
    totalDelaySeconds > 0
      ? Math.max(0, Math.min(100, Math.round(((totalDelaySeconds - remainingSeconds) / totalDelaySeconds) * 100)))
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Campaign Execution Pipeline</h3>
                {status === 'running' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-400 border border-sky-400/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-ping" />
                    Sending
                  </span>
                )}
                {status === 'delaying' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-400/30">
                    <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                    Anti-Spam Delay
                  </span>
                )}
                {status === 'completed' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Finished
                  </span>
                )}
                {status === 'aborted' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-700 text-slate-300">
                    Stopped
                  </span>
                )}
                {status === 'error' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-400/30">
                    <AlertCircle className="w-3 h-3" />
                    Failed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Target: {campaignPayload.batchSize} Emails • 45–90s Safety Throttle • Gemini AI Personalized
              </p>
            </div>
          </div>

          {(status === 'completed' || status === 'aborted' || status === 'error') && (
            <button
              onClick={() => {
                onClose();
                router.refresh();
              }}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Progress Overview Bar */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">
                Batch Progress: {sentCount + failedCount} of {totalLeads} processed
              </span>
              <span className="font-mono font-bold text-sky-400">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 pt-1">
              <span className="text-emerald-400 font-semibold">✓ {sentCount} Sent</span>
              {failedCount > 0 && <span className="text-rose-400 font-semibold">✗ {failedCount} Failed</span>}
              <span>Remaining: {Math.max(0, totalLeads - (sentCount + failedCount))}</span>
            </div>
          </div>

          {/* Active Status Display Banner */}
          {status === 'delaying' && (
            <div className="bg-amber-950/50 border border-amber-500/40 rounded-2xl p-4 text-amber-200 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <span>Anti-Spam Humanized Delay Active</span>
                </div>
                <div className="font-mono text-xl font-black text-amber-300">
                  {remainingSeconds}s
                </div>
              </div>
              <p className="text-xs text-amber-100/90 leading-relaxed">
                Waiting for the safety interval to complete before dispatching the next email to protect your Gmail reputation and prevent spam filters.
              </p>
              {/* Delay countdown sub-progress */}
              <div className="w-full bg-amber-950 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-400 h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${delayProgressPercent}%` }}
                />
              </div>
            </div>
          )}

          {status === 'running' && currentRecipient && (
            <div className="bg-sky-950/40 border border-sky-500/30 rounded-2xl p-4 text-sky-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-sky-300 text-xs">
                <Sparkles className="w-4 h-4 text-sky-400 animate-spin" />
                <span>Currently Processing Lead #{currentLeadIdx}</span>
              </div>
              <div className="text-sm font-semibold text-white">
                {currentCompany ? `${currentCompany} • ` : ''}
                <span className="text-sky-300 font-mono text-xs">{currentRecipient}</span>
              </div>
            </div>
          )}

          {/* Live Terminal Log */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                <Terminal className="w-3.5 h-3.5 text-sky-400" />
                <span>Live Dispatch Terminal</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">{logs.length} events logged</span>
            </div>

            <div
              ref={logTerminalRef}
              className="bg-slate-950 border border-slate-800 rounded-2xl p-4 h-56 overflow-y-auto font-mono text-xs space-y-1.5 text-left scrollbar-thin scrollbar-thumb-slate-800"
            >
              {logs.length === 0 ? (
                <div className="text-slate-600 italic">Waiting for pipeline events...</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                    {log.type === 'success' && <span className="text-emerald-400">✓ {log.text}</span>}
                    {log.type === 'error' && <span className="text-rose-400">✗ {log.text}</span>}
                    {log.type === 'warning' && <span className="text-amber-400">! {log.text}</span>}
                    {log.type === 'delay' && <span className="text-amber-300 font-semibold">⏱ {log.text}</span>}
                    {log.type === 'info' && <span className="text-slate-300">{log.text}</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="p-5 sm:p-6 border-t border-slate-800/80 bg-slate-950/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {status === 'running' || status === 'delaying' ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                Campaign is actively running... Anti-spam delay is active to protect domain reputation.
              </span>
            ) : status === 'completed' ? (
              <span className="text-emerald-400 font-semibold">
                ✓ Batch complete. Google Sheet rows updated to &apos;Sent&apos;.
              </span>
            ) : status === 'aborted' ? (
              <span className="text-slate-400">Execution halted. Unsent leads remain in sheet.</span>
            ) : (
              <span className="text-rose-400">Execution stopped due to error.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {(status === 'running' || status === 'delaying') && (
              <button
                type="button"
                onClick={handleStopCampaign}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 transition-colors flex items-center justify-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Campaign</span>
              </button>
            )}

            {(status === 'completed' || status === 'aborted' || status === 'error') && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.refresh();
                }}
                className="w-full sm:w-auto py-2.5 px-6 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Close & Refresh Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

