import type { Page } from 'playwright';
import { parseSecureDirectStockCounter } from '../parsers/secureDirectStockCounter.js';
import type { CollectResult, HotelConfig } from '../types.js';
import { CollectError } from '../types.js';
import { addOneNight } from '../utils/date.js';

export async function collectSecureDirectStockCounter(
  page: Page,
  hotel: HotelConfig,
  targetDate: string,
): Promise<CollectResult> {
  const departureDate = addOneNight(targetDate, hotel.timezone);
  await page.goto(hotel.booking_url, { waitUntil: 'domcontentloaded', timeout: 60_000 });

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
      }
    },
    { arrival: targetDate, departure: departureDate },
  );

  await page.waitForTimeout(3_000);

  const checkAllButton = page.locator('button, a', {
    hasText: /V[ée]rifier toutes les disponibilit[ée]s/i,
  });
  if (await checkAllButton.first().isVisible().catch(() => false)) {
    await checkAllButton.first().click();
    await page.waitForTimeout(2_000);
  }

  const showRatesButtons = page.locator('button, a', {
    hasText: /Voir tous les tarifs/i,
  });
  const buttonCount = await showRatesButtons.count();
  for (let i = 0; i < buttonCount; i += 1) {
    await showRatesButtons.nth(i).click().catch(() => null);
  }

  await page.waitForTimeout(2_000);

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

  const categories = await page.evaluate(() => {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.script-accommodation-service, .accommodation-card, [class*="accommodation"]',
      ),
    );

    return cards.map((card, index) => {
      const title =
        card.querySelector<HTMLElement>('h2, h3, .title, [class*="title"]')?.textContent?.trim() ??
        `category_${index + 1}`;

      return {
        category: title,
        text: card.textContent ?? '',
      };
    });
  });

  if (categories.length === 0) {
    throw new CollectError(
      'PARSE_EMPTY_CATEGORY',
      'Aucune catégorie détectée sur secure_direct_stock_counter.',
    );
  }

  const parsed = parseSecureDirectStockCounter(categories, hotel.total_rooms);

  if (parsed.sumBeforeCap === 0) {
    throw new CollectError(
      'MISSING_STOCK_COUNTER',
      'Compteurs "Plus que N disponible(s)" introuvables ou à zéro.',
    );
  }

  return {
    available_rooms_count: parsed.availableCount,
    available_room_ids_or_categories: parsed.csv,
    status: parsed.availableCount > 0 ? 'ok' : 'no_availability',
  };
}
