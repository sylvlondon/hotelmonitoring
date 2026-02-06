import type { Page } from 'playwright';
import { DateTime } from 'luxon';
import { parseThaisRoomTitles } from '../parsers/thaisCalendar.js';
import type { CollectResult, HotelConfig } from '../types.js';
import { CollectError } from '../types.js';
import { addOneNight } from '../utils/date.js';

function frenchMonthTitle(targetDate: string, timezone: string): string {
  // Ex: "février 2026" (site is fr-FR)
  const dt = DateTime.fromISO(targetDate, { zone: timezone });
  return dt.setLocale('fr').toFormat('LLLL yyyy');
}

async function clickDateInMonth(params: {
  page: Page;
  monthTitle: string;
  day: number;
}): Promise<boolean> {
  const { page, monthTitle, day } = params;
  const dayStr = String(day).padStart(2, '0');

  const month = page
    .locator('.t__calendar__month')
    .filter({ has: page.locator('.t__calendar__title', { hasText: monthTitle }) })
    .first();

  // Click an enabled day cell inside the right month.
  const cell = month
    .locator('.t__cell:not(.--disabled):not(.--past):not(.--hidden)')
    .filter({ has: month.locator('.t__cell__day', { hasText: dayStr }) })
    .first();

  if (!(await cell.isVisible().catch(() => false))) {
    return false;
  }

  await cell.click({ timeout: 10_000 });
  return true;
}

async function hasSelectedDates(page: Page): Promise<boolean> {
  const arrival = await page
    .locator('button[aria-label="Select start"] .t__search__placeholder')
    .first()
    .textContent()
    .catch(() => '');

  const departure = await page
    .locator('button[aria-label="Select end"] .t__search__placeholder')
    .first()
    .textContent()
    .catch(() => '');

  // When a date is selected, the placeholder "Quand ?" disappears.
  return !/Quand\s*\?/i.test(arrival ?? '') && !/Quand\s*\?/i.test(departure ?? '');
}

export async function collectThaisCalendar(
  page: Page,
  hotel: HotelConfig,
  targetDate: string,
): Promise<CollectResult> {
  const departureDate = addOneNight(targetDate, hotel.timezone);

  await page.goto(hotel.booking_url, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  // Open arrival picker and click arrival day.
  await page.locator('button[aria-label="Select start"]').first().click().catch(() => null);

  const arrivalMonth = frenchMonthTitle(targetDate, hotel.timezone);
  const arrivalDay = DateTime.fromISO(targetDate, { zone: hotel.timezone }).day;
  const okArrival = await clickDateInMonth({
    page,
    monthTitle: arrivalMonth,
    day: arrivalDay,
  });

  // Open departure picker and click departure day.
  await page.locator('button[aria-label="Select end"]').first().click().catch(() => null);

  const depMonth = frenchMonthTitle(departureDate, hotel.timezone);
  const depDay = DateTime.fromISO(departureDate, { zone: hotel.timezone }).day;
  const okDeparture = await clickDateInMonth({ page, monthTitle: depMonth, day: depDay });

  if (!okArrival || !okDeparture) {
    // Usually means min-stay restriction or disabled day.
    return {
      available_rooms_count: 0,
      available_room_ids_or_categories: '',
      status: 'no_availability',
    };
  }

  // Wait a bit for the engine to update.
  await page.waitForTimeout(3_000);

  const selected = await hasSelectedDates(page);
  if (!selected) {
    // We clicked but UI did not accept dates.
    return {
      available_rooms_count: 0,
      available_room_ids_or_categories: '',
      status: 'no_availability',
    };
  }

  // Attempt to find the room list titles.
  const roomTitleLocator = page.locator('h3', { hasText: /^\d+\s*-/ });
  await roomTitleLocator.first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => null);

  const titles = await roomTitleLocator.allTextContents();
  const parsed = parseThaisRoomTitles(titles);

  if (parsed.count === 0) {
    // Could be a legit no-availability for 1-night stays.
    const maybeNo = await page
      .locator('text=/plus de disponibilit[eé]s|aucune disponibilit[eé]s?/i')
      .first()
      .isVisible()
      .catch(() => false);

    if (maybeNo) {
      return {
        available_rooms_count: 0,
        available_room_ids_or_categories: '',
        status: 'no_availability',
      };
    }

    throw new CollectError('PARSE_EMPTY_THAIS', 'Room list not found after selecting dates.');
  }

  return {
    available_rooms_count: parsed.count,
    available_room_ids_or_categories: parsed.ids.join(','),
    status: 'ok',
  };
}
