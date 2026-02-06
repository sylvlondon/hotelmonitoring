import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { SheetRecord } from '../types.js';

const DEFAULT_HTML_REPORT_PATH = process.env.HTML_REPORT_PATH ?? 'output/latest-report.html';

function esc(v: string): string {
  return v
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function generateHtmlReport(records: SheetRecord[], runId: string): string {
  const rows = records
    .map(
      (r) => `<tr>
<td>${esc(r.run_id)}</td>
<td>${esc(r.run_ts_local)}</td>
<td>${esc(r.hotel_name)}</td>
<td>${esc(r.target_date)}</td>
<td>${r.available_rooms_count}</td>
<td>${r.total_rooms}</td>
<td>${r.occupancy_ratio}</td>
<td>${esc(r.available_room_ids_or_categories)}</td>
<td>${esc(r.status)}</td>
<td>${esc(r.error_code)}</td>
<td>${esc(r.error_message)}</td>
</tr>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hotel Monitoring Report - ${esc(runId)}</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: "IBM Plex Sans", "Segoe UI", sans-serif; margin: 20px; background: #f6f8fb; color: #1f2937; }
    h1 { margin: 0 0 8px 0; }
    .meta { margin-bottom: 16px; color: #374151; }
    .wrap { overflow: auto; border: 1px solid #d1d5db; background: #fff; border-radius: 10px; }
    table { width: 100%; border-collapse: collapse; min-width: 1100px; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; vertical-align: top; font-size: 13px; }
    thead th { position: sticky; top: 0; background: #eaf1ff; color: #111827; }
    tr:nth-child(even) td { background: #fafafa; }
  </style>
</head>
<body>
  <h1>Hotel Monitoring Report</h1>
  <div class="meta">run_id: <code>${esc(runId)}</code> | rows: <strong>${records.length}</strong></div>
  <div class="wrap">
    <table>
      <thead>
        <tr>
          <th>run_id</th>
          <th>run_ts_local</th>
          <th>hotel_name</th>
          <th>target_date</th>
          <th>available_rooms_count</th>
          <th>total_rooms</th>
          <th>occupancy_ratio</th>
          <th>available_room_ids_or_categories</th>
          <th>status</th>
          <th>error_code</th>
          <th>error_message</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

export function writeHtmlReport(records: SheetRecord[], runId: string): string {
  const html = generateHtmlReport(records, runId);
  mkdirSync(dirname(DEFAULT_HTML_REPORT_PATH), { recursive: true });
  writeFileSync(DEFAULT_HTML_REPORT_PATH, html, 'utf8');
  return DEFAULT_HTML_REPORT_PATH;
}
