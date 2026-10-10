import { computeSplits } from './split';

describe('computeSplits', () => {
  it.each([
    ['equal', [{ memberId: 'a' }, { memberId: 'b' }, { memberId: 'c' }]],
    ['percentage', [{ memberId: 'a', value: 50 }, { memberId: 'b', value: 50 }]],
    ['shares', [{ memberId: 'a', value: 2 }, { memberId: 'b', value: 1 }]],
  ] as const)('%s shares sum exactly', (type, entries) => {
    expect(computeSplits(10000, type, entries).reduce((sum, item) => sum + item.sharePaise, 0)).toBe(10000);
  });

  it('uses largest remainder for awkward amounts and one paise', () => {
    expect(computeSplits(10000, 'equal', [{ memberId: 'a' }, { memberId: 'b' }, { memberId: 'c' }]).map((s) => s.sharePaise)).toEqual([3334, 3333, 3333]);
    expect(computeSplits(1, 'equal', [{ memberId: 'a' }, { memberId: 'b' }, { memberId: 'c' }]).map((s) => s.sharePaise)).toEqual([1, 0, 0]);
  });

  it('validates percentage and exact inputs', () => {
    expect(() => computeSplits(100, 'percentage', [{ memberId: 'a', value: 40 }])).toThrow('100');
    expect(() => computeSplits(100, 'exact', [{ memberId: 'a', value: 99 }])).toThrow('total');
  });
});
