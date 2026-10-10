'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Room, Member, Expense, ExpenseSplit, SettlementRecord } from '@/types';
import { supabase } from '@/lib/supabase';
import { getLocalStorage, setLocalStorage } from '@/lib/utils';
import MembersPanel from './MembersPanel';
import ExpensesPanel from './ExpensesPanel';
import SettlementPanel from './SettlementPanel';
import ShareButton from '../ShareButton';
import AdSlot from '../AdSlot';
import { Receipt } from 'lucide-react';
import RoomCode from '../RoomCode';
import SummaryCard from './SummaryCard';

interface Props {
  room: Room;
}

export type FullExpense = Expense & {
  paid_by_member: Member;
  splits: (ExpenseSplit & { member: Member })[];
};

export default function RoomClient({ room }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<FullExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'expenses' | 'settle'>('expenses');
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [settlementsAvailable, setSettlementsAvailable] = useState(true);
  const [loadError, setLoadError] = useState('');

  const lsKey = `splitroom_member_${room.id}`;

  // Load initial data
  const loadData = useCallback(async () => {
    const [{ data: membersData, error: membersError }, { data: expensesData, error: expensesError }, settlementResult] = await Promise.all([
      supabase.from('members').select('*').eq('room_id', room.id).order('created_at'),
      supabase
        .from('expenses')
        .select(`
          *,
          paid_by_member:members!expenses_paid_by_fkey(*),
          splits:expense_splits(
            *,
            member:members(*)
          )
        `)
        .eq('room_id', room.id)
        .order('created_at', { ascending: false }),
      settlementsAvailable
        ? supabase.from('settlements').select('*').eq('room_id', room.id).order('created_at', { ascending: false })
        : Promise.resolve({ data: null, error: null }),
    ]);
    const settlementError = settlementResult.error;
    const missingSettlementsTable =
      settlementError?.code === '42P01' ||
      settlementError?.code === 'PGRST205' ||
      settlementError?.message.toLowerCase().includes('settlements');
    if (missingSettlementsTable) setSettlementsAvailable(false);
    const firstError = membersError ?? expensesError ?? (missingSettlementsTable ? null : settlementError);
    if (firstError) setLoadError(firstError.message);
    if (membersData) setMembers(membersData);
    if (expensesData) setExpenses(expensesData as FullExpense[]);
    if (settlementResult.data) setSettlements(settlementResult.data as SettlementRecord[]);
    setLoading(false);
  }, [room.id]);

  useEffect(() => {
    loadData();
    const savedId = getLocalStorage(lsKey);
    if (savedId) setMyMemberId(savedId);

    // Realtime subscriptions
    const channel = supabase
      .channel(`room:${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `room_id=eq.${room.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `room_id=eq.${room.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_splits' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements', filter: `room_id=eq.${room.id}` }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room.id, loadData, lsKey]);

  const handleSelectMember = (id: string) => {
    setMyMemberId(id);
    setLocalStorage(lsKey, id);
  };

  const tabs = [
    { id: 'expenses' as const, label: 'Expenses' },
    { id: 'settle' as const, label: 'Settle Up' },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-strong sticky top-0 z-30 rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-bold text-lg leading-tight">{room.name}</h1>
            <RoomCode code={room.code} className="font-mono text-xs text-accent" />
          </div>
          <div className="flex items-center gap-2">
            <SummaryCard roomName={room.name} members={members} expenses={expenses} />
            <ShareButton roomCode={room.code} roomName={room.name} />
          </div>
        </div>

        {/* Tab Bar */}
        <div className="mx-auto flex max-w-5xl gap-1 px-4 pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-t-xl border-b-2 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:bg-surface-strong hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        {loading ? (
          <div className="text-center py-16">
            <Receipt className="mx-auto animate-pulse text-accent" size={32} />
            <p className="mt-3 text-muted-foreground">Loading room...</p>
          </div>
        ) : loadError ? (
          <div className="card text-center py-10"><p className="font-semibold text-danger">Could not load this room.</p><p className="mt-2 text-sm text-muted-foreground">{loadError}</p><button className="btn-secondary mx-auto mt-4 w-auto" onClick={() => { setLoading(true); setLoadError(''); loadData(); }}>Try again</button></div>
        ) : (
          <>
            <MembersPanel
              members={members}
              roomId={room.id}
              myMemberId={myMemberId}
              onSelectMe={handleSelectMember}
            />

            <AdSlot id="room-top" />

            {activeTab === 'expenses' && (
              <ExpensesPanel
                expenses={expenses}
                members={members}
                roomId={room.id}
                myMemberId={myMemberId}
              />
            )}

            {activeTab === 'settle' && (
              <SettlementPanel members={members} expenses={expenses} settlements={settlements} roomId={room.id} roomCode={room.code} roomName={room.name} myMemberId={myMemberId} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
