import type { Page } from 'playwright';
import { parseThaisRoomTitles } from '../parsers/thaisCalendar.js';
import type { CollectResult, HotelConfig } from '../types.js';
import { CollectError } from '../types.js';
import { addOneNight, toFrenchDate } from '../utils/date.js';

export async function collectThaisCalendar(
  page: Page,
  hotel: HotelConfig,
  targetDate: string,
): Promise<CollectResult> {
  const departureDate = addOneNight(targetDate, hotel.timezone);
  const arrivalFr = toFrenchDate(targetDate, hotel.timezone);
  const departureFr = toFrenchDate(departureDate, hotel.timezone);

  await page.goto(hotel.booking_url, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  await page.evaluate(
    ({ arrivalIso, departureIso, arrivalText, departureText }) => {
      const setDate = (needle: string, iso: string, fr: string) => {
        const input = Array.from(document.querySelectorAll<HTMLInputElement>('input')).find((el) =>
          (el.name + el.id + el.placeholder).toLowerCase().includes(needle),
        );
        if (input) {
          input.value = input.type === 'date' ? iso : fr;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      };

      setDate('arriv', arrivalIso, arrivalText);
      setDate('checkin', arrivalIso, arrivalText);
      setDate('depart', departureIso, departureText);
      setDate('checkout', departureIso, departureText);

      const submit = Array.from(document.querySelectorAll<HTMLElement>('button, a')).find((el) =>
        /voir|disponibilit|rechercher|search|tarif/i.test(el.textContent ?? ''),
      );
      submit?.click();
    },
    {
      arrivalIso: targetDate,
      departureIso: departureDate,
      arrivalText: arrivalFr,
      departureText: departureFr,
    },
  );

  await page.waitForTimeout(4_000);

  const noAvailability = await page
    .locator('text=/plus de disponibilit[eé]s|aucune disponibilit[eé]/i')
    .first()
    .isVisible()
    .catch(() => false);

  if (noAvailability) {
    return {
      available_rooms_count: 0,
      available_room_ids_or_categories: '',
      status: 'no_availability',
    };
  }

  const titles = await page
    .locator('h3, .room-title, [class*="room"] h3')
    .allTextContents();

  const parsed = parseThaisRoomTitles(titles);

  if (parsed.count === 0) {
    throw new CollectError(
      'PARSE_EMPTY_THAIS',
      'Aucune chambre numérotée détectée sur thais_calendar.',
    );
  }

  return {
    available_rooms_count: parsed.count,
    available_room_ids_or_categories: parsed.ids.join(','),
    status: 'ok',
  };
}
