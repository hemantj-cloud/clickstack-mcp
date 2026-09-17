export interface DivergenceItem {
  attribute: string;
  divergenceScore: number;
  targetTopValues: { value: string; percent: number }[];
  baselineTopValues: { value: string; percent: number }[];
}

export function computeDistributionDivergence(
  targetValues: string[],
  baselineValues: string[]
): number {
  const targetCounts = new Map<string, number>();
  for (const v of targetValues) targetCounts.set(v, (targetCounts.get(v) || 0) + 1);

  const baselineCounts = new Map<string, number>();
  for (const v of baselineValues) baselineCounts.set(v, (baselineCounts.get(v) || 0) + 1);

  const targetTotal = targetValues.length || 1;
  const baselineTotal = baselineValues.length || 1;

  const allKeys = new Set([...targetCounts.keys(), ...baselineCounts.keys()]);
  let totalVariation = 0;

  for (const key of allKeys) {
    const p = (targetCounts.get(key) || 0) / targetTotal;
    const q = (baselineCounts.get(key) || 0) / baselineTotal;
    totalVariation += Math.abs(p - q);
  }

  return parseFloat((totalVariation / 2).toFixed(3));
}
