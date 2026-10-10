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
  // joined
  paid_by_member?: Member;
  splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  member_id: string;
  share: number;
  // joined
  member?: Member;
}

// UI types
export interface Settlement {
  from: Member;
  to: Member;
  amount: number;
}

export interface MemberBalance {
  member: Member;
  balance: number; // positive = owed money, negative = owes money
}
