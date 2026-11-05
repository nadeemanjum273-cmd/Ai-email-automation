import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { LeadData } from '@/lib/ai-personalizer';

export interface ColumnMapping {
  name?: string;
  email: string;
  niche?: string;
  status?: string;
  company?: string;
}

export interface SheetLeadRow {
  rowNumber: number; // 1-based row number in Google Sheet (e.g. 2, 3...)
  lead: LeadData;
  statusColIndex: number;
  statusColLetter: string;
  originalStatus: string;
}

export interface FetchPendingLeadsResult {
  leads: SheetLeadRow[];
  sheetName: string;
  totalPendingInSheet: number;
  statusColIndex: number;
  statusColLetter: string;
}

/**
 * Converts 0-based column index to spreadsheet column letters (A, B, C... Z, AA, AB...).
 */
export function getColumnLetter(colIndex: number): string {
  let letter = '';
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Reads the specified Google Sheet, locates header columns based on mapping,
 * and fetches rows where the Status is not yet 'Sent'.
 * Limits results to the requested batch limit (capped at remaining daily quota).
 */
export async function fetchPendingLeads(
  authClient: OAuth2Client,
  spreadsheetId: string,
  sheetName: string,
  columnMapping: ColumnMapping,
  limit: number
): Promise<FetchPendingLeadsResult> {
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  // Clean sheet name for A1 notation
  const targetSheet = sheetName?.trim() || 'Sheet1';
  const range = `'${targetSheet}'!A1:ZZ`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: 'FORMATTED_VALUE',
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    return {
      leads: [],
      sheetName: targetSheet,
      totalPendingInSheet: 0,
      statusColIndex: 0,
      statusColLetter: 'A',
    };
  }

  // Row 1 contains column headers
  const headers = rows[0].map((h: unknown) => String(h ?? '').trim());

  const findColIndex = (mappedColName?: string, fallbackKeywords: string[] = []): number => {
    if (mappedColName) {
      const idx = headers.findIndex(
        (h) => h.toLowerCase() === mappedColName.trim().toLowerCase()
      );
      if (idx !== -1) return idx;
    }
    for (const kw of fallbackKeywords) {
      const idx = headers.findIndex((h) => h.toLowerCase().includes(kw));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const nameIdx = findColIndex(columnMapping.name, ['name', 'full name', 'client']);
  const emailIdx = findColIndex(columnMapping.email, ['email', 'mail']);
  const nicheIdx = findColIndex(columnMapping.niche, ['niche', 'industry', 'category']);
  const companyIdx = findColIndex(columnMapping.company, ['company', 'business', 'org']);
  let statusIdx = findColIndex(columnMapping.status, ['status', 'state']);

  if (emailIdx === -1) {
    throw new Error(
      `Required email column "${columnMapping.email}" was not found in the spreadsheet headers.`
    );
  }

  // If status column doesn't exist, place it right after the last column
  if (statusIdx === -1) {
    statusIdx = headers.length;
    // Append header title "Status" asynchronously
    try {
      const headerCell = `'${targetSheet}'!${getColumnLetter(statusIdx)}1`;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: headerCell,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['Status']],
        },
      });
    } catch (err) {
      console.warn('Could not auto-create Status header column in sheet:', err);
    }
  }

  const statusColLetter = getColumnLetter(statusIdx);
  const pendingRows: SheetLeadRow[] = [];
  let totalPending = 0;

  // Iterate over data rows (starting from row index 1 which corresponds to Google Sheet row 2)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1; // 1-based row in Google Sheets

    const email = row[emailIdx] ? String(row[emailIdx]).trim() : '';
    // Skip empty emails or invalid formats
    if (!email || !email.includes('@')) {
      continue;
    }

    const currentStatus = row[statusIdx] ? String(row[statusIdx]).trim() : '';

    // If status already indicates sent, skip this lead
    const normalizedStatus = currentStatus.toLowerCase();
    if (normalizedStatus === 'sent' || normalizedStatus.startsWith('sent')) {
      continue;
    }

    totalPending++;

    if (pendingRows.length < limit) {
      const name = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : '';
      const niche = nicheIdx !== -1 && row[nicheIdx] ? String(row[nicheIdx]).trim() : '';
      const company = companyIdx !== -1 && row[companyIdx] ? String(row[companyIdx]).trim() : '';

      pendingRows.push({
        rowNumber,
        originalStatus: currentStatus,
        statusColIndex: statusIdx,
        statusColLetter,
        lead: {
          name,
          email,
          niche,
          company,
        },
      });
    }
  }

  return {
    leads: pendingRows,
    sheetName: targetSheet,
    totalPendingInSheet: totalPending,
    statusColIndex: statusIdx,
    statusColLetter,
  };
}

/**
 * Updates a specific row in the Google Sheet with Status = 'Sent',
 * along with timestamp and optionally a preview of the generated copy.
 */
export async function updateSheetRowStatus(
  authClient: OAuth2Client,
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  statusColIndex: number,
  status: string = 'Sent',
  timestamp: string = new Date().toISOString().replace('T', ' ').substring(0, 19),
  generatedCopy?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const targetSheet = sheetName?.trim() || 'Sheet1';

    const colLetter = getColumnLetter(statusColIndex);
    const range = `'${targetSheet}'!${colLetter}${rowNumber}`;

    // Update Status cell
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[status]],
      },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error(`Failed to update sheet row ${rowNumber}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update Google Sheet',
    };
  }
}

