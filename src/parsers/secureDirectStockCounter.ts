export interface CategoryBlock {
  category: string;
  text: string;
}

export function parseSecureDirectStockCounter(
  categories: CategoryBlock[],
  totalRooms: number,
): {
  categoryStock: Record<string, number>;
  sumBeforeCap: number;
  availableCount: number;
  csv: string;
} {
  const result: Record<string, number> = {};

  for (const block of categories) {
    const values = Array.from(
      block.text.matchAll(/Plus que\s+(\d+)\s+disponible\(s\)/gi),
    ).map((m) => Number(m[1]));

    result[block.category] = values.length > 0 ? Math.max(...values) : 0;
  }

  const entries = Object.entries(result);
  const sumBeforeCap = entries.reduce((acc, [, n]) => acc + n, 0);
  const availableCount = Math.min(sumBeforeCap, totalRooms);
  const csv = entries.map(([name, n]) => `${name}:${n}`).join(',');

  return {
    categoryStock: result,
    sumBeforeCap,
    availableCount,
    csv,
  };
}
