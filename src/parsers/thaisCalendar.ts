export function parseThaisRoomTitles(titles: string[]): { ids: string[]; count: number } {
  const ids = new Set<number>();

  for (const title of titles) {
    const match = title.trim().match(/^(\d+)\s*-/);
    if (match) {
      ids.add(Number(match[1]));
    }
  }

  const sorted = Array.from(ids)
    .sort((a, b) => a - b)
    .map(String);

  return { ids: sorted, count: sorted.length };
}
