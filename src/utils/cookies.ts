import type { BrowserContext } from 'playwright';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

let cachedClearance: string | null | undefined;

function getCfClearance(): string | null {
  if (cachedClearance !== undefined) return cachedClearance;

  if (process.env.SECURE_DIRECT_CF_CLEARANCE) {
    cachedClearance = process.env.SECURE_DIRECT_CF_CLEARANCE;
    return cachedClearance;
  }

  const file = process.env.SECURE_DIRECT_CF_CLEARANCE_FILE;
  const candidates = [
    file,
    join(homedir(), '.config', 'hotelmonitoring', 'cf_clearance.txt'),
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    try {
      const v = readFileSync(p, 'utf8').trim();
      if (v) {
        cachedClearance = v;
        return cachedClearance;
      }
    } catch {
      // ignore
    }
  }

  cachedClearance = null;
  return cachedClearance;
}

export async function addCloudflareClearanceCookie(context: BrowserContext): Promise<void> {
  const cf = getCfClearance();
  if (!cf) return;

  // Use `url` to mimic a host-only cookie (often how cf_clearance is set).
  const urls = [
    'https://www.secure-direct-hotel-booking.com',
    'https://secure-direct-hotel-booking.com',
  ];

  await context.addCookies(
    urls.map((url) => ({
      name: 'cf_clearance',
      value: cf,
      url,
      httpOnly: true,
      secure: true,
      sameSite: 'Lax' as const,
    })),
  );
}
