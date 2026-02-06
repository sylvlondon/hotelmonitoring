import type { BrowserContext } from 'playwright';

export async function addCloudflareClearanceCookie(context: BrowserContext): Promise<void> {
  const cf = process.env.SECURE_DIRECT_CF_CLEARANCE;
  if (!cf) return;

  // Cloudflare clearance cookies are usually scoped to the exact host.
  const hosts = ['www.secure-direct-hotel-booking.com', 'secure-direct-hotel-booking.com'];

  await context.addCookies(
    hosts.map((domain) => ({
      name: 'cf_clearance',
      value: cf,
      domain,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax' as const,
    })),
  );
}
