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
  const byHotel = new Map<string, SheetRecord[]>();
  for (const r of records) {
    const key = `${r.hotel_id}::${r.hotel_name}`;
    const arr = byHotel.get(key) ?? [];
    arr.push(r);
    byHotel.set(key, arr);
  }

  const hotelSections = Array.from(byHotel.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, rows]) => {
      const sample = rows[0];
      const stats = rows.reduce(
        (acc, r) => {
          acc[r.status] += 1;
          return acc;
        },
        { ok: 0, no_availability: 0, error: 0 } as Record<string, number>,
      );

      const trs = rows
        .sort((a, b) => a.target_date.localeCompare(b.target_date))
        .map((r) => {
          const avail =
            r.status === 'error' ? '<span class="na">N/A</span>' : String(r.available_rooms_count);
          const total = r.status === 'error' ? '<span class="na">N/A</span>' : String(r.total_rooms);
          const ratio =
            r.status === 'error' ? '<span class="na">N/A</span>' : String(r.occupancy_ratio);

          const details =
            r.status === 'error'
              ? `<details class="err"><summary>${esc(r.error_code || 'error')}</summary><pre>${esc(
                  r.error_message || '',
                )}</pre></details>`
              : '';

          return `<tr class="s-${esc(r.status)}">
  <td class="mono">${esc(r.target_date)}</td>
  <td>${avail}</td>
  <td>${total}</td>
  <td>${ratio}</td>
  <td class="mono">${esc(r.available_room_ids_or_categories || '')}</td>
  <td><span class="badge b-${esc(r.status)}">${esc(r.status)}</span></td>
  <td>${details}</td>
</tr>`;
        })
        .join('\n');

      return `<section class="hotel">
  <header class="hotel-h">
    <div>
      <h2>${esc(sample.hotel_name)}</h2>
      <div class="sub">hotel_id: <code>${esc(sample.hotel_id)}</code> | provider: <code>${esc(
        sample.provider,
      )}</code></div>
    </div>
    <div class="stats">
      <span class="badge b-ok">ok: ${stats.ok}</span>
      <span class="badge b-no_availability">no_availability: ${stats.no_availability}</span>
      <span class="badge b-error">error: ${stats.error}</span>
    </div>
  </header>
  <div class="wrap">
    <table>
      <thead>
        <tr>
          <th>target_date</th>
          <th>available</th>
          <th>total</th>
          <th>ratio</th>
          <th>ids/categories</th>
          <th>status</th>
          <th>error</th>
        </tr>
      </thead>
      <tbody>
        ${trs}
      </tbody>
    </table>
  </div>
</section>`;
    })
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
    h1 { margin: 0 0 6px 0; }
    h2 { margin: 0; font-size: 18px; }
    .meta { margin-bottom: 18px; color: #374151; }
    .hotel { margin: 14px 0 22px; }
    .hotel-h { display: flex; gap: 12px; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .sub { color: #4b5563; font-size: 12px; margin-top: 4px; }
    .stats { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
    .wrap { overflow: auto; border: 1px solid #d1d5db; background: #fff; border-radius: 12px; }
    table { width: 100%; border-collapse: collapse; min-width: 900px; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; vertical-align: top; font-size: 13px; }
    thead th { position: sticky; top: 0; background: #eaf1ff; color: #111827; }
    tr:nth-child(even) td { background: #fafafa; }
    tr.s-error td { background: #fff5f5; }
    tr.s-ok td { background: #f6fffb; }
    .badge { display:inline-block; border-radius: 999px; padding: 3px 8px; font-size: 12px; border: 1px solid #d1d5db; background: #fff; }
    .b-ok { border-color: #86efac; background: #dcfce7; }
    .b-no_availability { border-color: #e5e7eb; background: #f3f4f6; }
    .b-error { border-color: #fecaca; background: #fee2e2; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .na { color: #6b7280; }
    details.err summary { cursor: pointer; color: #991b1b; }
    details.err pre { margin: 8px 0 0; white-space: pre-wrap; font-size: 12px; color: #111827; background: #fff; border: 1px solid #fecaca; border-radius: 10px; padding: 8px; }
  </style>
</head>
<body>
  <h1>Hotel Monitoring Report</h1>
  <div class="meta">run_id: <code>${esc(runId)}</code> | rows: <strong>${records.length}</strong></div>
  ${hotelSections}
</body>
</html>`;
}

export function writeHtmlReport(records: SheetRecord[], runId: string): string {
  const html = generateHtmlReport(records, runId);
  mkdirSync(dirname(DEFAULT_HTML_REPORT_PATH), { recursive: true });
  writeFileSync(DEFAULT_HTML_REPORT_PATH, html, 'utf8');
  return DEFAULT_HTML_REPORT_PATH;
}
