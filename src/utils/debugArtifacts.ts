import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Page } from 'playwright';

function safeName(s: string): string {
  return s.replaceAll(/[^a-zA-Z0-9._-]+/g, '_');
}

export async function captureDebugArtifacts(params: {
  page: Page;
  hotelId: string;
  provider: string;
  targetDate: string;
  attempt: number;
  label: string;
}): Promise<void> {
  const enabled = process.env.DEBUG_ARTIFACTS === '1' || process.env.CI === 'true';
  if (!enabled) {
    return;
  }

  const base = `output/debug/${safeName(params.hotelId)}_${safeName(params.provider)}_${safeName(params.targetDate)}_a${params.attempt}_${safeName(params.label)}`;
  mkdirSync(dirname(base), { recursive: true });

  try {
    await params.page.screenshot({ path: `${base}.png`, fullPage: true });
  } catch {
    // ignore
  }

  try {
    const html = await params.page.content();
    writeFileSync(`${base}.html`, html, 'utf8');
  } catch {
    // ignore
  }
}
