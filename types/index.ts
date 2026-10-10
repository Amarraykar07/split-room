// Database types matching the Supabase schema

export interface Room {
  id: string;
  code: string;
  name: string;
  created_at: string;
}

export interface Member {
  id: string;
  room_id: string;
  name: string;
  upi_id: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  room_id: string;
  description: string;
  amount: number;
  paid_by: string; // member id
  created_at: string;
  split_type: SplitType;
  category: ExpenseCategory;
  // joined
  paid_by_member?: Member;
  splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  member_id: string;
  share: number;
  split_value: number | null;
  // joined
  member?: Member;
}

// UI types
export interface Settlement {
  id?: string;
  room_id?: string;
  from: Member;
  to: Member;
  amount: number;
  status?: 'paid' | 'confirmed';
  created_at?: string;
  confirmed_at?: string | null;
}

export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';
export type ExpenseCategory = 'food' | 'stay' | 'travel' | 'fun' | 'other';

export interface SettlementRecord {
  id: string;
  room_id: string;
  from_member: string;
  to_member: string;
  amount: number;
  status: 'paid' | 'confirmed';
  created_at: string;
  confirmed_at: string | null;
}

export interface MemberBalance {
  member: Member;
  balance: number; // positive = owed money, negative = owes money
}
