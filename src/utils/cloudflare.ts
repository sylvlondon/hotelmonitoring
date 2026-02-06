import type { Page } from 'playwright';

export async function isCloudflareChallenge(page: Page): Promise<boolean> {
  const title = await page.title().catch(() => '');
  if (/just a moment/i.test(title)) {
    return true;
  }

  // Turnstile challenge page marker.
  const hasTurnstile = await page
    .locator('input[name="cf-turnstile-response"], script[src*="challenges.cloudflare.com/turnstile"]')
    .first()
    .isVisible()
    .catch(() => false);

  return hasTurnstile;
}

