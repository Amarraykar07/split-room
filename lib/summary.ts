import type { Expense, Member } from '@/types';

export interface SummaryStats {
  totalSpent: number;
  expenseCount: number;
  memberCount: number;
  averagePerPerson: number;
  topSpender: { name: string; amount: number } | null;
  biggestExpense: { description: string; amount: number } | null;
  dateRange: { first: string; last: string } | null;
}

export function computeSummary(expenses: Expense[], members: Member[]): SummaryStats {
  const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const byPayer = new Map<string, number>();
  expenses.forEach((expense) => byPayer.set(expense.paid_by, (byPayer.get(expense.paid_by) ?? 0) + Number(expense.amount)));
  const top = [...byPayer.entries()].sort((a, b) => b[1] - a[1])[0];
  const biggest = [...expenses].sort((a, b) => Number(b.amount) - Number(a.amount))[0];
  const dates = expenses.map((expense) => expense.created_at).sort();
  return {
    totalSpent,
    expenseCount: expenses.length,
    memberCount: members.length,
    averagePerPerson: members.length ? totalSpent / members.length : 0,
    topSpender: top ? { name: members.find((member) => member.id === top[0])?.name ?? 'Unknown', amount: top[1] } : null,
    biggestExpense: biggest ? { description: biggest.description, amount: Number(biggest.amount) } : null,
    dateRange: dates.length ? { first: dates[0], last: dates[dates.length - 1] } : null,
  };
}
