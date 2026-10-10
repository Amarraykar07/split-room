import type { Expense, ExpenseCategory, Member, SettlementRecord } from '@/types';
import { computeBalances, computeSettlements } from './settle';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['food', 'stay', 'travel', 'fun', 'other'];

export interface PaidTotal { memberId: string; name: string; amount: number }
export interface RemainingTransaction { from: string; to: string; amount: number }
export interface CategoryTotal {
  category: ExpenseCategory;
  amount: number;
  percentage: number;
}
export interface Award { label: string; memberName?: string }
export interface SummaryStats {
  totalSpent: number;
  expenseCount: number;
  memberCount: number;
  averagePerPerson: number;
  topSpender: { name: string; amount: number } | null;
  biggestExpense: { description: string; amount: number } | null;
  topExpenses: { description: string; amount: number }[];
  dateRange: { first: string; last: string } | null;
  paidTotals: PaidTotal[];
  remainingTransactions: RemainingTransaction[];
  categoryBreakdown: CategoryTotal[];
  totalToSettle: number;
  settled: number;
  settlePercent: number;
  pendingSettled: number;
  awards: Award[];
}

function largestRemainderPercentages(amounts: number[], total: number): number[] {
  if (total <= 0) return amounts.map(() => 0);
  const raw = amounts.map((amount) => (amount / total) * 100);
  const whole = raw.map(Math.floor);
  let remainder = 100 - whole.reduce((sum, value) => sum + value, 0);
  raw.map((value, index) => ({ index, fraction: value - whole[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
    .forEach(({ index }) => {
      if (remainder > 0) {
        whole[index] += 1;
        remainder -= 1;
      }
    });
  return whole;
}

const categoryOf = (expense: Expense): ExpenseCategory =>
  EXPENSE_CATEGORIES.includes(expense.category) ? expense.category : 'other';

const shortName = (name: string) => name.length > 14 ? `${name.slice(0, 13)}…` : name;

export function computeSummary(
  expenses: Expense[],
  members: Member[],
  settlements: Pick<SettlementRecord, 'from_member' | 'to_member' | 'amount' | 'status'>[] = []
): SummaryStats {
  const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const paidById = new Map<string, number>();
  expenses.forEach((expense) => paidById.set(expense.paid_by, (paidById.get(expense.paid_by) ?? 0) + Number(expense.amount)));
  const paidTotals = members
    .map((member) => ({ memberId: member.id, name: member.name, amount: paidById.get(member.id) ?? 0 }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
  const top = paidTotals.find((item) => item.amount > 0) ?? null;
  const sortedExpenses = [...expenses].sort((a, b) => Number(b.amount) - Number(a.amount) || a.description.localeCompare(b.description));
  const dates = expenses.map((expense) => expense.created_at).sort();
  const expenseInputs = expenses.map((expense) => ({
    paid_by: expense.paid_by,
    splits: (expense.splits ?? []).map((split) => ({ member_id: split.member_id, share: Number(split.share) })),
  }));
  const confirmed = settlements.filter((settlement) => settlement.status === 'confirmed');
  const expenseBalances = computeBalances(members, expenseInputs);
  const balances = computeBalances(members, expenseInputs, confirmed);
  const remainingTransactions = computeSettlements(balances).map((transaction) => ({
    from: shortName(transaction.from.name),
    to: shortName(transaction.to.name),
    amount: transaction.amount,
  }));

  const categoryAmounts = EXPENSE_CATEGORIES.map((category) =>
    expenses.filter((expense) => categoryOf(expense) === category).reduce((sum, expense) => sum + Number(expense.amount), 0)
  );
  const percentages = largestRemainderPercentages(categoryAmounts, totalSpent);
  const categoryBreakdown = EXPENSE_CATEGORIES.map((category, index) => ({
    category,
    amount: categoryAmounts[index],
    percentage: percentages[index],
  })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));

  const totalToSettle = expenseBalances.reduce((sum, balance) => sum + Math.max(0, balance.balance), 0);
  const confirmedAmount = confirmed.reduce((sum, settlement) => sum + Number(settlement.amount), 0);
  const settled = Math.min(totalToSettle, confirmedAmount);
  const pendingSettled = settlements.filter((settlement) => settlement.status === 'paid')
    .reduce((sum, settlement) => sum + Number(settlement.amount), 0);
  const awards: Award[] = [];
  if (expenses.length >= 3 && members.length >= 2) {
    if (top && totalSpent > 0 && top.amount / totalSpent >= 0.4) {
      awards.push({ label: 'Daanveer 👑', memberName: shortName(top.name) });
    }
    if (categoryBreakdown[0]?.category === 'food') awards.push({ label: 'Foodie Squad 🍽️' });
    if (sortedExpenses[0]) {
      const payer = members.find((member) => member.id === sortedExpenses[0].paid_by);
      if (payer) awards.push({ label: 'Big Spender Moment 💥', memberName: shortName(payer.name) });
    }
    if (balances.every((balance) => Math.abs(balance.balance) <= 1)) awards.push({ label: 'Sab Barabar ⚖️' });
  }

  return {
    totalSpent,
    expenseCount: expenses.length,
    memberCount: members.length,
    averagePerPerson: members.length ? totalSpent / members.length : 0,
    topSpender: top ? { name: shortName(top.name), amount: top.amount } : null,
    biggestExpense: sortedExpenses[0] ? { description: sortedExpenses[0].description, amount: Number(sortedExpenses[0].amount) } : null,
    topExpenses: sortedExpenses.slice(0, 3).map((expense) => ({ description: expense.description, amount: Number(expense.amount) })),
    dateRange: dates.length ? { first: dates[0], last: dates[dates.length - 1] } : null,
    paidTotals,
    remainingTransactions,
    categoryBreakdown,
    totalToSettle,
    settled,
    settlePercent: totalToSettle ? Math.round((settled / totalToSettle) * 100) : 0,
    pendingSettled,
    awards: awards.slice(0, 3),
  };
}
