import { createClient } from '@/lib/supabase/server';
import { getAuthorizedClientForUser } from '@/lib/google';
import { validateUserQuota, incrementQuotaUsage } from '@/lib/quota';
import { fetchPendingLeads, updateSheetRowStatus, ColumnMapping } from '@/lib/sheets-sync';
import { generatePersonalizedEmail } from '@/lib/ai-personalizer';
import { sendGmailMessage } from '@/lib/gmail-sender';

export const dynamic = 'force-dynamic';

interface StartCampaignPayload {
  spreadsheetId: string;
  sheetName?: string;
  columnMapping: ColumnMapping;
  subjectTemplate: string;
  bodyTemplate: string;
  batchSize?: number;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized. Please log in.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: StartCampaignPayload;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const {
    spreadsheetId,
    sheetName = 'Sheet1',
    columnMapping,
    subjectTemplate,
    bodyTemplate,
    batchSize = 10,
  } = body;

  if (!spreadsheetId || !columnMapping?.email || !subjectTemplate || !bodyTemplate) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters (spreadsheetId, email column, templates).' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 1. Validate Quota and Subscription
  const quota = await validateUserQuota(user.id);
  if (!quota.canSend || quota.remainingDaily <= 0 || quota.remainingMonthly <= 0) {
    return new Response(
      JSON.stringify({
        error: quota.error || 'Email quota exceeded. Daily max is 50, monthly max is 1,500.',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 2. Obtain Authorized Google Client
  let authClient;
  let googleEmail = '';
  try {
    const authData = await getAuthorizedClientForUser(user.id);
    authClient = authData.oauth2Client;
    googleEmail = authData.connection.google_email;
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Google account not connected or authorized.',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 3. Establish Streaming SSE Response
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (eventData: Record<string, unknown>) => {
        try {
          const payload = `data: ${JSON.stringify(eventData)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Controller might already be closed by client disconnect
        }
      };

      try {
        // Enforce hard daily quota ceiling
        const effectiveLimit = Math.min(
          Number(batchSize) || 10,
          quota.remainingDaily,
          quota.remainingMonthly,
          50
        );

        sendEvent({
          type: 'status',
          message: `Reading Google Sheet and finding pending leads (Batch target: ${effectiveLimit})...`,
        });

        // Fetch un-sent leads from Google Sheet
        const { leads, totalPendingInSheet } = await fetchPendingLeads(
          authClient,
          spreadsheetId,
          sheetName,
          columnMapping,
          effectiveLimit
        );

        if (leads.length === 0) {
          sendEvent({
            type: 'complete',
            sentCount: 0,
            failedCount: 0,
            total: 0,
            message: 'No pending leads found in the selected sheet. All rows are already marked as Sent or missing emails.',
          });
          controller.close();
          return;
        }

        sendEvent({
          type: 'init',
          totalFound: totalPendingInSheet,
          batchCount: leads.length,
          remainingDaily: quota.remainingDaily,
          message: `Found ${leads.length} pending lead(s) for this batch. Starting cold email sequence...`,
        });

        let sentSuccessCount = 0;
        let failedCount = 0;
        let currentRemainingDaily = quota.remainingDaily;

        for (let idx = 0; idx < leads.length; idx++) {
          if (req.signal.aborted) {
            sendEvent({
              type: 'aborted',
              message: 'Campaign execution stopped by user.',
            });
            break;
          }

          const item = leads[idx];
          const prospectName = item.lead.name || 'Prospect';
          const prospectCompany = item.lead.company || item.lead.niche || 'Target Business';
          const recipientEmail = item.lead.email || '';

          // Step 1: Personalizing Email with Gemini AI
          sendEvent({
            type: 'step',
            step: 'personalizing',
            rowNumber: item.rowNumber,
            current: idx + 1,
            total: leads.length,
            leadName: prospectName,
            company: prospectCompany,
            email: recipientEmail,
            message: `Row ${item.rowNumber}: Personalizing email for ${prospectCompany} (${prospectName})...`,
          });

          const personalized = await generatePersonalizedEmail({
            lead: item.lead,
            subjectTemplate,
            bodyTemplate,
          });

          // Step 2: Send via Gmail
          sendEvent({
            type: 'step',
            step: 'sending',
            rowNumber: item.rowNumber,
            current: idx + 1,
            total: leads.length,
            leadName: prospectName,
            company: prospectCompany,
            email: recipientEmail,
            isAiGenerated: personalized.isAiGenerated,
            message: `Row ${item.rowNumber}: Dispatching email via Gmail to ${recipientEmail}...`,
          });

          const sendResult = await sendGmailMessage({
            authClient,
            to: recipientEmail,
            subject: personalized.subject,
            htmlBody: personalized.body,
            fromEmail: googleEmail,
          });

          if (sendResult.success) {
            sentSuccessCount++;
            currentRemainingDaily = Math.max(0, currentRemainingDaily - 1);

            // Increment quota in Supabase
            await incrementQuotaUsage(user.id, 1);

            // Step 3: Update Google Sheet Status
            sendEvent({
              type: 'step',
              step: 'sheet_sync',
              rowNumber: item.rowNumber,
              current: idx + 1,
              total: leads.length,
              message: `Row ${item.rowNumber}: Updating Google Sheet row status to 'Sent'...`,
            });

            await updateSheetRowStatus(
              authClient,
              spreadsheetId,
              sheetName,
              item.rowNumber,
              item.statusColIndex,
              'Sent',
              new Date().toISOString(),
              personalized.body
            );

            sendEvent({
              type: 'lead_completed',
              rowNumber: item.rowNumber,
              current: idx + 1,
              total: leads.length,
              email: recipientEmail,
              messageId: sendResult.messageId,
              remainingDaily: currentRemainingDaily,
              message: `Row ${item.rowNumber}: Email successfully sent and Google Sheet updated!`,
            });
          } else {
            failedCount++;
            sendEvent({
              type: 'lead_failed',
              rowNumber: item.rowNumber,
              current: idx + 1,
              total: leads.length,
              email: recipientEmail,
              error: sendResult.error,
              message: `Row ${item.rowNumber}: Failed to send to ${recipientEmail} (${sendResult.error})`,
            });
          }

          // Anti-Spam Humanized Delay between 45 and 90 seconds (Skip delay after the last lead)
          const isLastLead = idx === leads.length - 1;
          if (!isLastLead && !req.signal.aborted) {
            // Randomized 45 to 90 seconds
            const delaySeconds = Math.floor(Math.random() * (90 - 45 + 1)) + 45;

            sendEvent({
              type: 'delay_start',
              delaySeconds,
              nextRowNumber: leads[idx + 1].rowNumber,
              message: `Row ${item.rowNumber}: Email sent via Gmail! Waiting ${delaySeconds} seconds (Anti-Spam Delay)...`,
            });

            for (let sec = delaySeconds; sec > 0; sec--) {
              if (req.signal.aborted) break;
              sendEvent({
                type: 'delay_tick',
                secondsRemaining: sec,
                totalDelay: delaySeconds,
              });
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            sendEvent({
              type: 'delay_end',
              message: 'Anti-spam interval finished. Proceeding to next lead...',
            });
          }
        }

        // Final completion event
        sendEvent({
          type: 'complete',
          sentCount: sentSuccessCount,
          failedCount,
          total: leads.length,
          remainingDaily: currentRemainingDaily,
          message: `Campaign batch completed! ${sentSuccessCount} email(s) successfully delivered, ${failedCount} failed.`,
        });
      } catch (pipelineErr: unknown) {
        console.error('Campaign execution pipeline error:', pipelineErr);
        sendEvent({
          type: 'error',
          message:
            pipelineErr instanceof Error
              ? pipelineErr.message
              : 'Unexpected error during campaign execution.',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

