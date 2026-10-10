/**
 * Settlement algorithm: minimum transactions to settle all debts.
 *
 * Uses a greedy algorithm: repeatedly match the biggest creditor with
 * the biggest debtor until all balances are settled.
 *
 * All amounts are rounded to 2 decimal places (paise precision).
 */

import type { Member, MemberBalance, Settlement } from '@/types';

/**
 * Round a number to 2 decimal places using standard rounding.
 * Uses multiplication to avoid floating-point issues.
 */
export function roundPaise(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Compute net balance for each member.
 * Positive balance = owed money (creditor)
 * Negative balance = owes money (debtor)
 */
export function computeBalances(
  members: Member[],
  expenses: Array<{
    paid_by: string;
    splits: Array<{ member_id: string; share: number }>;
  }>,
  confirmedSettlements: Array<{ from_member: string; to_member: string; amount: number }> = []
): MemberBalance[] {
  const balanceMap: Record<string, number> = {};

  // Initialize all members with 0 balance
  for (const m of members) {
    balanceMap[m.id] = 0;
  }

  for (const transfer of confirmedSettlements) {
    balanceMap[transfer.from_member] = roundPaise(
      (balanceMap[transfer.from_member] ?? 0) + Number(transfer.amount)
    );
    balanceMap[transfer.to_member] = roundPaise(
      (balanceMap[transfer.to_member] ?? 0) - Number(transfer.amount)
    );
  }

  // Process each expense
  for (const expense of expenses) {
    // Payer receives credit for what others owe
    for (const split of expense.splits) {
      if (split.member_id === expense.paid_by) {
        // Payer's own share: net effect 0 (paid for themselves)
        // balanceMap[split.member_id] += split.share - split.share = 0
      } else {
        // Others owe the payer
        balanceMap[expense.paid_by] = roundPaise(
          (balanceMap[expense.paid_by] ?? 0) + split.share
        );
        balanceMap[split.member_id] = roundPaise(
          (balanceMap[split.member_id] ?? 0) - split.share
        );
      }
    }
  }

  return members.map((m) => ({
    member: m,
    balance: roundPaise(balanceMap[m.id] ?? 0),
  }));
}

/**
 * Compute minimum transactions to settle all debts.
 * Returns list of { from, to, amount } settlements.
 *
 * Pure function — no side effects, fully unit-testable.
 */
export function computeSettlements(balances: MemberBalance[]): Settlement[] {
  const settlements: Settlement[] = [];

  // Create mutable copies, filter out zero balances
  const creditors = balances
    .filter((b) => b.balance > 0.005)
    .map((b) => ({ member: b.member, amount: b.balance }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = balances
    .filter((b) => b.balance < -0.005)
    .map((b) => ({ member: b.member, amount: Math.abs(b.balance) }))
    .sort((a, b) => b.amount - a.amount);

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];

    const settleAmount = roundPaise(
      Math.min(creditor.amount, debtor.amount)
    );

    if (settleAmount > 0.005) {
      settlements.push({
        from: debtor.member,
        to: creditor.member,
        amount: settleAmount,
      });
    }

    creditor.amount = roundPaise(creditor.amount - settleAmount);
    debtor.amount = roundPaise(debtor.amount - settleAmount);

    if (creditor.amount < 0.005) ci++;
    if (debtor.amount < 0.005) di++;
  }

  return settlements;
}
