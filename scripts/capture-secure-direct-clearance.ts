import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const URLS = [
  'https://www.secure-direct-hotel-booking.com/module_booking_engine/index.php?id_etab=46249f1124e703947d3298deefeb8493&langue=francais',
  'https://www.secure-direct-hotel-booking.com/module_booking_engine/index.php?id_etab=540835380b24ce9a38e47ab1436e5d11&langue=francais',
];

const OUT_DIR = join(homedir(), '.config', 'hotelmonitoring');
const OUT_FILE = join(OUT_DIR, 'cf_clearance.txt');
const PROFILE_DIR = join(OUT_DIR, 'chrome-profile');

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: null,
    args: [
      '--disable-dev-shm-usage',
      // Some WSL setups are happier with this flag.
      '--no-first-run',
    ],
  });

  try {
    for (const url of URLS) {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    }

    // User action needed in the opened Chrome window.
    // We just wait until Cloudflare sets cf_clearance.
    const deadline = Date.now() + 10 * 60_000;
    while (Date.now() < deadline) {
      const cookies = await context.cookies(['https://secure-direct-hotel-booking.com']);
      const cf = cookies.find((c) => c.name === 'cf_clearance')?.value?.trim();
      if (cf) {
        writeFileSync(OUT_FILE, `${cf}\n`, 'utf8');
        chmodSync(OUT_FILE, 0o600);
        // eslint-disable-next-line no-console
        console.log(`Saved cf_clearance to: ${OUT_FILE}`);
        return;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    throw new Error('Timeout waiting for cf_clearance (10 minutes). Solve the challenge in Chrome then rerun.');
  } finally {
    await context.close().catch(() => null);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

