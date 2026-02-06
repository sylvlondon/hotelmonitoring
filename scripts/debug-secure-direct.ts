import { chromium } from 'playwright';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { addCloudflareClearanceCookie } from '../src/utils/cookies.js';
import { isCloudflareChallenge } from '../src/utils/cloudflare.js';

const URL =
  process.env.DEBUG_URL ??
  'https://www.secure-direct-hotel-booking.com/module_booking_engine/index.php?id_etab=46249f1124e703947d3298deefeb8493&langue=francais';

const PROFILE_DIR =
  process.env.SECURE_DIRECT_PROFILE_DIR ?? join(homedir(), '.config', 'hotelmonitoring', 'chrome-profile');

async function main(): Promise<void> {
  const mode = process.env.MODE ?? 'ephemeral';
  const headless = process.env.HEADLESS !== '0';

  if (mode === 'persistent') {
    const context = await chromium.launchPersistentContext(PROFILE_DIR, {
      channel: 'chrome',
      headless,
      viewport: null,
    });
    try {
      const page = await context.newPage();
      page.on('request', (req) => {
        if (req.resourceType() !== 'document') return;
        if (!/secure-direct-hotel-booking\.com/i.test(req.url())) return;
        const h = req.headers();
        console.log('document request:', req.url());
        console.log('cookie header includes cf_clearance:', /cf_clearance=/.test(h.cookie ?? ''));
      });
      await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      console.log('title:', await page.title());
      console.log('cloudflare:', await isCloudflareChallenge(page));
      const cookies = await context.cookies(['https://secure-direct-hotel-booking.com']);
      console.log(
        'cookies:',
        cookies
          .filter((c) => ['cf_clearance', '__cf_bm'].includes(c.name))
          .map((c) => ({
            name: c.name,
            domain: c.domain,
            path: c.path,
            secure: c.secure,
            sameSite: c.sameSite,
            httpOnly: c.httpOnly,
            expires: c.expires,
          })),
      );
    } finally {
      await context.close();
    }
    return;
  }

  const browser = await chromium.launch({ channel: 'chrome', headless });
  try {
    const context = await browser.newContext();
    await addCloudflareClearanceCookie(context);
    const page = await context.newPage();
    page.on('request', (req) => {
      if (req.resourceType() !== 'document') return;
      if (!/secure-direct-hotel-booking\.com/i.test(req.url())) return;
      const h = req.headers();
      console.log('document request:', req.url());
      console.log('cookie header includes cf_clearance:', /cf_clearance=/.test(h.cookie ?? ''));
    });
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    console.log('title:', await page.title());
    console.log('cloudflare:', await isCloudflareChallenge(page));
    const cookies = await context.cookies(['https://secure-direct-hotel-booking.com']);
    console.log(
      'cookies:',
      cookies
        .filter((c) => ['cf_clearance', '__cf_bm'].includes(c.name))
        .map((c) => ({
          name: c.name,
          domain: c.domain,
          path: c.path,
          secure: c.secure,
          sameSite: c.sameSite,
          httpOnly: c.httpOnly,
          expires: c.expires,
        })),
    );
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : String(err));
  process.exit(1);
});
