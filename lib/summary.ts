import type { Expense, Member, SettlementRecord } from '@/types';
import { computeBalances, computeSettlements } from './settle';

export interface PaidTotal {
  memberId: string;
  name: string;
  amount: number;
}

export interface RemainingTransaction {
  from: string;
  to: string;
  amount: number;
}

export interface SummaryStats {
  totalSpent: number;
  expenseCount: number;
  memberCount: number;
  averagePerPerson: number;
  topSpender: { name: string; amount: number } | null;
  biggestExpense: { description: string; amount: number } | null;
  dateRange: { first: string; last: string } | null;
  paidTotals: PaidTotal[];
  remainingTransactions: RemainingTransaction[];
}

export function computeSummary(
  expenses: Expense[],
  members: Member[],
  confirmedSettlements: Pick<SettlementRecord, 'from_member' | 'to_member' | 'amount' | 'status'>[] = []
): SummaryStats {
  const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const paidById = new Map<string, number>();
  expenses.forEach((expense) => {
    paidById.set(expense.paid_by, (paidById.get(expense.paid_by) ?? 0) + Number(expense.amount));
  });
  const paidTotals = members
    .map((member) => ({ memberId: member.id, name: member.name, amount: paidById.get(member.id) ?? 0 }))
    .sort((a, b) => b.amount - a.amount);
  const top = paidTotals.find((item) => item.amount > 0);
  const biggest = [...expenses].sort((a, b) => Number(b.amount) - Number(a.amount))[0];
  const dates = expenses.map((expense) => expense.created_at).sort();
  const balances = computeBalances(
    members,
    expenses.map((expense) => ({
      paid_by: expense.paid_by,
      splits: (expense.splits ?? []).map((split) => ({ member_id: split.member_id, share: Number(split.share) })),
    })),
    confirmedSettlements.filter((settlement) => settlement.status === 'confirmed')
  );
  const remainingTransactions = computeSettlements(balances).map((transaction) => ({
    from: transaction.from.name,
    to: transaction.to.name,
    amount: transaction.amount,
  }));

  return {
    totalSpent,
    expenseCount: expenses.length,
    memberCount: members.length,
    averagePerPerson: members.length ? totalSpent / members.length : 0,
    topSpender: top ? { name: top.name, amount: top.amount } : null,
    biggestExpense: biggest ? { description: biggest.description, amount: Number(biggest.amount) } : null,
    dateRange: dates.length ? { first: dates[0], last: dates[dates.length - 1] } : null,
    paidTotals,
    remainingTransactions,
  };
}
