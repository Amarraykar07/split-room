export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

export interface SplitEntry {
  memberId: string;
  value?: number;
}

export interface ComputedSplit {
  memberId: string;
  sharePaise: number;
  splitValue: number | null;
}

function largestRemainder(totalPaise: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const raw = weights.map((weight) => (totalPaise * weight) / totalWeight);
  const result = raw.map(Math.floor);
  let remainder = totalPaise - result.reduce((sum, value) => sum + value, 0);
  raw
    .map((value, index) => ({ index, fraction: value - result[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
    .forEach(({ index }) => {
      if (remainder > 0) {
        result[index] += 1;
        remainder -= 1;
      }
    });
  return result;
}

export function computeSplits(
  totalPaise: number,
  type: SplitType,
  entries: SplitEntry[]
): ComputedSplit[] {
  if (!Number.isInteger(totalPaise) || totalPaise < 0) {
    throw new Error('Total must be a non-negative integer number of paise');
  }
  if (entries.length === 0) throw new Error('Select at least one participant');
  if (entries.some((entry) => !entry.memberId)) {
    throw new Error('Every split must have a participant');
  }

  if (type === 'exact') {
    const values = entries.map((entry) => entry.value ?? NaN);
    if (values.some((value) => !Number.isInteger(value) || value < 0)) {
      throw new Error('Exact amounts must be valid non-negative paise values');
    }
    if (values.reduce((sum, value) => sum + value, 0) !== totalPaise) {
      throw new Error('Exact amounts must add up to the total');
    }
    return entries.map((entry, index) => ({
      memberId: entry.memberId,
      sharePaise: values[index],
      splitValue: values[index] / 100,
    }));
  }

  if (type === 'percentage') {
    const values = entries.map((entry) => entry.value ?? NaN);
    if (values.some((value) => !Number.isFinite(value) || value < 0)) {
      throw new Error('Percentages must be non-negative numbers');
    }
    if (Math.abs(values.reduce((sum, value) => sum + value, 0) - 100) > 0.000001) {
      throw new Error('Percentages must add up to 100');
    }
    return largestRemainder(totalPaise, values).map((sharePaise, index) => ({
      memberId: entries[index].memberId,
      sharePaise,
      splitValue: values[index],
    }));
  }

  if (type === 'shares') {
    const values = entries.map((entry) => entry.value ?? NaN);
    if (values.some((value) => !Number.isInteger(value) || value <= 0)) {
      throw new Error('Shares must be positive whole numbers');
    }
    return largestRemainder(totalPaise, values).map((sharePaise, index) => ({
      memberId: entries[index].memberId,
      sharePaise,
      splitValue: values[index],
    }));
  }

  return largestRemainder(totalPaise, entries.map(() => 1)).map((sharePaise, index) => ({
    memberId: entries[index].memberId,
    sharePaise,
    splitValue: null,
  }));
}
