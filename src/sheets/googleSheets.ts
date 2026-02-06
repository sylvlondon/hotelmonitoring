import { google, sheets_v4 } from 'googleapis';
import type { SheetRecord } from '../types.js';

const TAB_NAME = process.env.GOOGLE_SHEET_TAB ?? 'monitoring_raw';

const HEADERS = [
  'run_id',
  'run_ts_utc',
  'run_ts_local',
  'hotel_id',
  'hotel_name',
  'provider',
  'target_date',
  'available_rooms_count',
  'total_rooms',
  'occupancy_ratio',
  'available_room_ids_or_categories',
  'status',
  'error_code',
  'error_message',
];

function parseServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON');
  }

  try {
    return JSON.parse(raw) as { client_email: string; private_key: string };
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON must be valid JSON string');
  }
}

export async function buildSheetsClient(): Promise<sheets_v4.Sheets> {
  const creds = parseServiceAccount();
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

async function ensureTabAndHeader(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = meta.data.sheets?.some((s) => s.properties?.title === TAB_NAME);

  if (!existing) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: TAB_NAME } } }],
      },
    });
  }

  const currentHeader = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB_NAME}!1:1`,
  });

  if (!currentHeader.data.values || currentHeader.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TAB_NAME}!A1:N1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
  }
}

function toRow(r: SheetRecord): (string | number)[] {
  return [
    r.run_id,
    r.run_ts_utc,
    r.run_ts_local,
    r.hotel_id,
    r.hotel_name,
    r.provider,
    r.target_date,
    r.available_rooms_count,
    r.total_rooms,
    r.occupancy_ratio,
    r.available_room_ids_or_categories,
    r.status,
    r.error_code,
    r.error_message,
  ];
}

export async function appendRecords(records: SheetRecord[]): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEET_ID');
  }

  if (records.length === 0) {
    return;
  }

  const sheets = await buildSheetsClient();
  await ensureTabAndHeader(sheets, spreadsheetId);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${TAB_NAME}!A:N`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: records.map(toRow),
    },
  });
}
