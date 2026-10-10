import { computeSummary } from './summary';

describe('computeSummary', () => {
  it('computes empty and populated summaries', () => {
    const members = [{ id: 'a', name: 'Amar' }, { id: 'b', name: 'Bea' }] as never[];
    const expenses = [
      { id: '1', paid_by: 'a', description: 'Dinner', amount: 100, created_at: '2026-01-01' },
      { id: '2', paid_by: 'b', description: 'Taxi', amount: 50, created_at: '2026-01-02' },
    ] as never[];
    expect(computeSummary([], members).totalSpent).toBe(0);
    expect(computeSummary(expenses, members)).toMatchObject({
      totalSpent: 150, expenseCount: 2, memberCount: 2, averagePerPerson: 75,
      topSpender: { name: 'Amar', amount: 100 },
      biggestExpense: { description: 'Dinner', amount: 100 },
    });
    expect(computeSummary(expenses, members).paidTotals).toEqual([
      { memberId: 'a', name: 'Amar', amount: 100 },
      { memberId: 'b', name: 'Bea', amount: 50 },
    ]);
    expect(computeSummary(expenses, members).remainingTransactions).toEqual([]);
  });

  it('calculates remaining transactions after confirmed transfers', () => {
    const members = [{ id: 'a', name: 'Amar' }, { id: 'b', name: 'Bea' }] as never[];
    const expenses = [{
      id: '1', paid_by: 'a', description: 'Dinner', amount: 100, created_at: '2026-01-01',
      splits: [{ member_id: 'a', share: 0 }, { member_id: 'b', share: 100 }],
    }] as never[];
    expect(computeSummary(expenses, members).remainingTransactions[0]).toEqual({
      from: 'Bea', to: 'Amar', amount: 100,
    });
    expect(computeSummary(expenses, members, [{
      from_member: 'b', to_member: 'a', amount: 40, status: 'confirmed',
    }]).remainingTransactions[0].amount).toBe(60);
  });
});
