/**
 * Unit tests for the settlement algorithm.
 * Run with: npx jest lib/settle.test.ts
 */

import { computeBalances, computeSettlements, roundPaise } from './settle';
import type { Member, MemberBalance } from '@/types';

const mkMember = (id: string, name: string): Member => ({
  id,
  room_id: 'room1',
  name,
  upi_id: null,
  created_at: '',
});

const alice = mkMember('a', 'Alice');
const bob = mkMember('b', 'Bob');
const charlie = mkMember('c', 'Charlie');

describe('roundPaise', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundPaise(10.005)).toBe(10.01); // standard round
    expect(roundPaise(10.004)).toBe(10);
    expect(roundPaise(33.333333)).toBe(33.33);
  });
});

describe('computeBalances', () => {
  it('simple two-person split', () => {
    // Alice pays 100, split equally between Alice and Bob
    const expenses = [
      {
        paid_by: 'a',
        splits: [
          { member_id: 'a', share: 50 },
          { member_id: 'b', share: 50 },
        ],
      },
    ];
    const balances = computeBalances([alice, bob], expenses);
    const aliceBal = balances.find((b) => b.member.id === 'a')!;
    const bobBal = balances.find((b) => b.member.id === 'b')!;
    // Alice is owed 50 by Bob
    expect(aliceBal.balance).toBe(50);
    // Bob owes 50
    expect(bobBal.balance).toBe(-50);
  });

  it('three-way split', () => {
    // Alice pays 300 split 3 ways
    const expenses = [
      {
        paid_by: 'a',
        splits: [
          { member_id: 'a', share: 100 },
          { member_id: 'b', share: 100 },
          { member_id: 'c', share: 100 },
        ],
      },
    ];
    const balances = computeBalances([alice, bob, charlie], expenses);
    expect(balances.find((b) => b.member.id === 'a')!.balance).toBe(200);
    expect(balances.find((b) => b.member.id === 'b')!.balance).toBe(-100);
    expect(balances.find((b) => b.member.id === 'c')!.balance).toBe(-100);
  });

  it('net zero when everyone paid equal amounts', () => {
    const expenses = [
      {
        paid_by: 'a',
        splits: [
          { member_id: 'a', share: 50 },
          { member_id: 'b', share: 50 },
        ],
      },
      {
        paid_by: 'b',
        splits: [
          { member_id: 'a', share: 50 },
          { member_id: 'b', share: 50 },
        ],
      },
    ];
    const balances = computeBalances([alice, bob], expenses);
    expect(balances.find((b) => b.member.id === 'a')!.balance).toBe(0);
    expect(balances.find((b) => b.member.id === 'b')!.balance).toBe(0);
  });
});

describe('computeSettlements', () => {
  it('no settlements when all zero', () => {
    const balances: MemberBalance[] = [
      { member: alice, balance: 0 },
      { member: bob, balance: 0 },
    ];
    expect(computeSettlements(balances)).toHaveLength(0);
  });

  it('one settlement for simple debt', () => {
    const balances: MemberBalance[] = [
      { member: alice, balance: 100 },
      { member: bob, balance: -100 },
    ];
    const settlements = computeSettlements(balances);
    expect(settlements).toHaveLength(1);
    expect(settlements[0].from.id).toBe('b');
    expect(settlements[0].to.id).toBe('a');
    expect(settlements[0].amount).toBe(100);
  });

  it('minimises transactions for three-person debt', () => {
    // Alice: +200, Bob: -100, Charlie: -100
    const balances: MemberBalance[] = [
      { member: alice, balance: 200 },
      { member: bob, balance: -100 },
      { member: charlie, balance: -100 },
    ];
    const settlements = computeSettlements(balances);
    expect(settlements).toHaveLength(2);
    const total = settlements.reduce((s, t) => s + t.amount, 0);
    expect(roundPaise(total)).toBe(200);
  });

  it('handles paise (100 rupees split 3 ways)', () => {
    // 100 / 3 = 33.33 each, rounding handled
    const balances: MemberBalance[] = [
      { member: alice, balance: 66.67 },
      { member: bob, balance: -33.33 },
      { member: charlie, balance: -33.34 },
    ];
    const settlements = computeSettlements(balances);
    expect(settlements.length).toBeGreaterThan(0);
    const total = settlements.reduce((s, t) => s + t.amount, 0);
    expect(roundPaise(total)).toBeCloseTo(66.67, 1);
  });
});
