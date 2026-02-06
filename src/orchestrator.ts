import { chromium } from 'playwright';
import { randomUUID } from 'node:crypto';
import { HOTELS, LOOKAHEAD_NIGHTS } from './config/hotels.js';
import { collectSecureDirectNumbered } from './adapters/secureDirectNumbered.js';
import { collectThaisCalendar } from './adapters/thaisCalendar.js';
import { collectSecureDirectStockCounter } from './adapters/secureDirectStockCounter.js';
import type { CollectResult, HotelConfig, SheetRecord } from './types.js';
import { CollectError } from './types.js';
import { buildTargetDates, formatRunTsLocal } from './utils/date.js';
import { withRetries } from './utils/retry.js';
import { insertRecords, getRecordsByRunId } from './storage/sqlite.js';
import { writeHtmlReport } from './report/htmlReport.js';
import { captureDebugArtifacts } from './utils/debugArtifacts.js';
import { addCloudflareClearanceCookie } from './utils/cookies.js';

function buildErrorRecord(
  runId: string,
  runTsUtc: string,
  targetDate: string,
  hotel: HotelConfig,
  errorCode: string,
  errorMessage: string,
): SheetRecord {
  return {
    run_id: runId,
    run_ts_utc: runTsUtc,
    run_ts_local: formatRunTsLocal(runTsUtc, hotel.timezone),
    hotel_id: hotel.hotel_id,
    hotel_name: hotel.hotel_name,
    provider: hotel.provider,
    target_date: targetDate,
    available_rooms_count: 0,
    total_rooms: hotel.total_rooms,
    occupancy_ratio: 0,
    available_room_ids_or_categories: '',
    status: 'error',
    error_code: errorCode,
    error_message: errorMessage,
  };
}

function buildSuccessRecord(
  runId: string,
  runTsUtc: string,
  targetDate: string,
  hotel: HotelConfig,
  result: CollectResult,
): SheetRecord {
  return {
    run_id: runId,
    run_ts_utc: runTsUtc,
    run_ts_local: formatRunTsLocal(runTsUtc, hotel.timezone),
    hotel_id: hotel.hotel_id,
    hotel_name: hotel.hotel_name,
    provider: hotel.provider,
    target_date: targetDate,
    available_rooms_count: result.available_rooms_count,
    total_rooms: hotel.total_rooms,
    occupancy_ratio:
      hotel.total_rooms > 0 ? Number((result.available_rooms_count / hotel.total_rooms).toFixed(4)) : 0,
    available_room_ids_or_categories: result.available_room_ids_or_categories,
    status: result.status,
    error_code: '',
    error_message: '',
  };
}

async function collectByProvider(
  page: Parameters<typeof collectSecureDirectNumbered>[0],
  hotel: HotelConfig,
  targetDate: string,
): Promise<CollectResult> {
  switch (hotel.provider) {
    case 'secure_direct_numbered':
      return collectSecureDirectNumbered(page, hotel, targetDate);
    case 'thais_calendar':
      return collectThaisCalendar(page, hotel, targetDate);
    case 'secure_direct_stock_counter':
      return collectSecureDirectStockCounter(page, hotel, targetDate);
    default:
      throw new CollectError('UNKNOWN_PROVIDER', `Provider non supporté: ${hotel.provider}`);
  }
}

export async function runMonitoring(): Promise<void> {
  const runId = randomUUID();
  const runTsUtc = new Date().toISOString();
  const targetDates = buildTargetDates(LOOKAHEAD_NIGHTS, process.env.TZ ?? 'Europe/Paris');
  const records: SheetRecord[] = [];

  const browser = await chromium.launch({ headless: true });

  try {
    for (const hotel of HOTELS) {
      for (const targetDate of targetDates) {
        try {
          const result = await withRetries(async (attempt) => {
            const context = await browser.newContext();
            await addCloudflareClearanceCookie(context);
            const page = await context.newPage();
            try {
              try {
                return await collectByProvider(page, hotel, targetDate);
              } catch (err) {
                await captureDebugArtifacts({
                  page,
                  hotelId: hotel.hotel_id,
                  provider: hotel.provider,
                  targetDate,
                  attempt,
                  label: 'collect_error',
                });
                throw err;
              }
            } finally {
              await context.close();
            }
          });

          records.push(buildSuccessRecord(runId, runTsUtc, targetDate, hotel, result));
        } catch (err) {
          if (err instanceof CollectError) {
            records.push(
              buildErrorRecord(runId, runTsUtc, targetDate, hotel, err.code, err.message),
            );
          } else {
            records.push(
              buildErrorRecord(
                runId,
                runTsUtc,
                targetDate,
                hotel,
                'UNHANDLED_ERROR',
                err instanceof Error ? err.message : String(err),
              ),
            );
          }
        }
      }
    }
  } finally {
    await browser.close();
  }

  insertRecords(records);
  const thisRunRecords = getRecordsByRunId(runId);
  const reportPath = writeHtmlReport(thisRunRecords, runId);
  console.log(
    `Run ${runId}: ${records.length} lignes inserees dans SQLite. Rapport HTML: ${reportPath}`,
  );
}
