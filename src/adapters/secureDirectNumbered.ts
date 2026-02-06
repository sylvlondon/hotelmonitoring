import type { Page } from 'playwright';
import { parseSecureDirectNumberedTitles } from '../parsers/secureDirectNumbered.js';
import type { CollectResult, HotelConfig } from '../types.js';
import { CollectError } from '../types.js';
import { addOneNight } from '../utils/date.js';
import { isCloudflareChallenge } from '../utils/cloudflare.js';

export async function collectSecureDirectNumbered(
  page: Page,
  hotel: HotelConfig,
  targetDate: string,
): Promise<CollectResult> {
  const departureDate = addOneNight(targetDate, hotel.timezone);
  await page.goto(hotel.booking_url, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  if (await isCloudflareChallenge(page)) {
    throw new CollectError(
      'CLOUDFLARE_CHALLENGE',
      'Cloudflare Turnstile détecté (anti-bot). Le scraping ne peut pas fonctionner sur GitHub-hosted runners.',
    );
  }

  await page.evaluate(
    ({ arrival, departure }) => {
      const setValue = (selectors: string[], value: string) => {
        for (const selector of selectors) {
          const input = document.querySelector<HTMLInputElement>(selector);
          if (input) {
            input.value = value;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
        }
      };

      setValue(['#hidden_arrival_date', 'input[name="hidden_arrival_date"]'], arrival);
      setValue(['#hidden_departure_date', 'input[name="hidden_departure_date"]'], departure);
      setValue(['#hidden_nb_nuit', 'input[name="hidden_nb_nuit"]'], '1');

      const globalObject = window as Window & { searchAction?: () => void };
      if (typeof globalObject.searchAction === 'function') {
        globalObject.searchAction();
      } else {
        const submit = document.querySelector<HTMLElement>('button[type="submit"], .btn-search, .search-button');
        submit?.click();
      }
    },
    { arrival: targetDate, departure: departureDate },
  );

  await page.waitForTimeout(3_000);

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
    .locator('.script-accommodation-service h3, .script-accommodation-service .title, .script-accommodation-service [class*="title"]')
    .allTextContents();

  const parsed = parseSecureDirectNumberedTitles(titles);

  if (parsed.count === 0) {
    throw new CollectError(
      'PARSE_EMPTY_NUMBERED',
      'Aucune chambre numérotée détectée sur secure_direct_numbered.',
    );
  }

  return {
    available_rooms_count: parsed.count,
    available_room_ids_or_categories: parsed.ids.join(','),
    status: 'ok',
  };
}
