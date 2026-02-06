import type { Page } from 'playwright';
import type { CollectResult, HotelConfig } from '../types.js';
import { CollectError } from '../types.js';
import { addOneNight } from '../utils/date.js';

type ThaisConfig = {
  hotel?: {
    room_types?: Array<{ id: number; label: string }>;
  };
};

type ThaisAvailability = {
  date: string;
  room_type_id: number;
  availability: number;
};

function parseRoomNumber(label: string): string | null {
  const m = label.trim().match(/^(\d+)\s*-/);
  return m ? m[1] : null;
}

export async function collectThaisCalendar(
  page: Page,
  hotel: HotelConfig,
  targetDate: string,
): Promise<CollectResult> {
  const departureDate = addOneNight(targetDate, hotel.timezone);

  // The Thaïs public APIs return 403 to non-browser clients; using Playwright's request context
  // after a normal page load provides the right headers/cookies.
  await page.goto(hotel.booking_url, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  const base = new URL(hotel.booking_url).origin;
  const configUrl = `${base}/hub/api/booking-engine/config?&lang=FR`;
  const availUrl = `${base}/hub/api/booking-engine/availabilities?&from=${targetDate}&to=${departureDate}`;

  const configResp = await page.request.get(configUrl);
  if (!configResp.ok()) {
    throw new CollectError('THAIS_API_ERROR', `Config API HTTP ${configResp.status()}`);
  }
  const cfg = (await configResp.json()) as ThaisConfig;
  const roomTypes = cfg.hotel?.room_types ?? [];
  if (roomTypes.length === 0) {
    throw new CollectError('THAIS_NO_ROOM_TYPES', 'Config API: room_types introuvables.');
  }

  const availResp = await page.request.get(availUrl);
  if (!availResp.ok()) {
    throw new CollectError('THAIS_API_ERROR', `Availabilities API HTTP ${availResp.status()}`);
  }
  const av = (await availResp.json()) as ThaisAvailability[];

  const availByRoomType = new Map<number, number>();
  for (const item of av) {
    if (item.date !== targetDate) continue;
    const prev = availByRoomType.get(item.room_type_id) ?? 0;
    availByRoomType.set(item.room_type_id, Math.max(prev, Number(item.availability ?? 0)));
  }

  const availableIds: string[] = [];
  for (const rt of roomTypes) {
    const stock = availByRoomType.get(rt.id) ?? 0;
    if (stock > 0) {
      availableIds.push(parseRoomNumber(rt.label) ?? String(rt.id));
    }
  }

  availableIds.sort((a, b) => Number(a) - Number(b));
  const count = Math.min(availableIds.length, hotel.total_rooms);

  return {
    available_rooms_count: count,
    available_room_ids_or_categories: availableIds.join(','),
    status: count > 0 ? 'ok' : 'no_availability',
  };
}
