import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

export interface SendGmailMessageOptions {
  authClient: OAuth2Client;
  to: string;
  subject: string;
  htmlBody: string;
  fromName?: string;
  fromEmail?: string;
}

export interface SendGmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Encodes a string into standard base64url format required by Google Gmail API.
 */
function toBase64Url(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Sends a single cold email using the connected user's authorized Gmail OAuth2 client.
 * Properly formats MIME RFC 2822 headers and UTF-8 encoding.
 * Catches any dispatch errors per-lead without terminating the campaign pipeline.
 */
export async function sendGmailMessage({
  authClient,
  to,
  subject,
  htmlBody,
  fromName,
  fromEmail,
}: SendGmailMessageOptions): Promise<SendGmailResult> {
  try {
    if (!to || !to.includes('@')) {
      return { success: false, error: `Invalid recipient email address: "${to}"` };
    }

    const gmail = google.gmail({ version: 'v1', auth: authClient });

    // Format RFC 2047 subject for non-ASCII characters & symbols
    const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;

    // Convert newlines to HTML paragraphs/breaks if plain text is provided
    const formattedHtml = htmlBody.includes('<p>') || htmlBody.includes('<br>')
      ? htmlBody
      : htmlBody
          .split('\n\n')
          .map((p) => `<p style="margin: 0 0 12px 0; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #1e293b;">${p.replace(/\n/g, '<br/>')}</p>`)
          .join('');

    const headers: string[] = [
      `To: ${to.trim()}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
    ];

    if (fromEmail) {
      if (fromName) {
        const encodedFromName = `=?UTF-8?B?${Buffer.from(fromName, 'utf-8').toString('base64')}?=`;
        headers.push(`From: ${encodedFromName} <${fromEmail}>`);
      } else {
        headers.push(`From: <${fromEmail}>`);
      }
    }

    const mimeMessage = `${headers.join('\r\n')}\r\n\r\n${formattedHtml}`;
    const raw = toBase64Url(mimeMessage);

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw,
      },
    });

    const messageId = response.data.id || undefined;

    return {
      success: true,
      messageId,
    };
  } catch (error: unknown) {
    console.error(`Gmail dispatch error for ${to}:`, error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown Gmail API sending error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

