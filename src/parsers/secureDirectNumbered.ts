export function parseSecureDirectNumberedTitles(titles: string[]): {
  ids: string[];
  count: number;
} {
  const ids = new Set<number>();

  for (const rawTitle of titles) {
    const title = rawTitle.trim();
    if (!/chambre/i.test(title)) {
      continue;
    }

    const matches = title.matchAll(/\b(\d{1,3})\b/g);
    for (const match of matches) {
      ids.add(Number(match[1]));
    }
  }

  const sorted = Array.from(ids)
    .sort((a, b) => a - b)
    .map(String);

  return { ids: sorted, count: sorted.length };
}
