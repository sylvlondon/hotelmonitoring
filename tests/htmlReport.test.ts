import { describe, expect, it } from 'vitest';
import { generateHtmlReport } from '../src/report/htmlReport.js';
import type { SheetRecord } from '../src/types.js';

describe('generateHtmlReport', () => {
  it('renders a table row and escapes html', () => {
    const records: SheetRecord[] = [
      {
        run_id: 'run-1',
        run_ts_utc: '2026-02-06T10:00:00.000Z',
        run_ts_local: '2026-02-06T11:00:00+01:00',
        hotel_id: 'h1',
        hotel_name: '<Hotel>',
        provider: 'secure_direct_numbered',
        target_date: '2026-02-07',
        available_rooms_count: 2,
        total_rooms: 8,
        occupancy_ratio: 0.25,
        available_room_ids_or_categories: '1,2',
        status: 'ok',
        error_code: '',
        error_message: '',
      },
    ];

    const html = generateHtmlReport(records, 'run-1');
    expect(html).toContain('Hotel Monitoring Report');
    expect(html).toContain('&lt;Hotel&gt;');
    expect(html).toContain('<td>2</td>');
  });
});
