import type { Page, Response } from 'playwright';

export function stripHtmlToText(html: string): string {
  // Very lightweight HTML -> text for parsing.
  return html
    .replaceAll(/<\s*br\s*\/?\s*>/gi, '\n')
    .replaceAll(/<\s*\/p\s*>/gi, '\n')
    .replaceAll(/<\s*\/div\s*>/gi, '\n')
    .replaceAll(/<\s*\/li\s*>/gi, '\n')
    .replaceAll(/<[^>]*>/g, ' ')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll(/\s+/g, ' ')
    .trim();
}

export async function waitForSelectionAjax(page: Page): Promise<{ url: string; body: string } | null> {
  const candidates: Response[] = [];
  const handler = (resp: Response) => {
    const url = resp.url();
    const req = resp.request();
    const rt = req.resourceType();
    if (rt !== 'xhr' && rt !== 'fetch') return;
    if (!/secure-direct-hotel-booking\.com/i.test(url)) return;
    if (!/ajax|selection|accommodation|search/i.test(url)) return;
    if (resp.status() >= 400) return;
    candidates.push(resp);
  };

  page.on('response', handler);
  try {
    // Give the page time to issue the request(s).
    await page.waitForTimeout(5000);
    const last = candidates[candidates.length - 1];
    if (!last) return null;
    return { url: last.url(), body: await last.text() };
  } finally {
    page.off('response', handler);
  }
}

export function splitCategoryBlocksFromHtml(html: string): Array<{ category: string; text: string }> {
  // Heuristic: split on h2/h3 titles; keep following text until next title.
  const normalized = html
    .replaceAll(/<\s*h[23][^>]*>/gi, '\n@@TITLE@@')
    .replaceAll(/<\s*\/h[23]\s*>/gi, '@@/TITLE@@\n')
    .replaceAll(/\r\n/g, '\n');

  const blocks: Array<{ category: string; text: string }> = [];
  const re = /@@TITLE@@([\s\S]*?)@@\/TITLE@@/g;

  const titles: Array<{ title: string; start: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized))) {
    const raw = m[1];
    const title = stripHtmlToText(raw);
    titles.push({ title: title || 'category', start: m.index, end: re.lastIndex });
  }

  if (titles.length === 0) {
    return [{ category: 'all', text: stripHtmlToText(html) }];
  }

  for (let i = 0; i < titles.length; i += 1) {
    const cur = titles[i];
    const next = titles[i + 1];
    const segment = normalized.slice(cur.end, next ? next.start : normalized.length);
    blocks.push({ category: cur.title, text: stripHtmlToText(segment) });
  }

  return blocks;
}
