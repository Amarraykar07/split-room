'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { formatTimeLeft, getRoomExpiry, isExpiringSoon, timeLeft } from '@/lib/expiry';
import { computeBalances } from '@/lib/settle';

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
  const [now, setNow] = useState(() => new Date());
  const [expiryMessage, setExpiryMessage] = useState('');
  const [showCreatedNotice, setShowCreatedNotice] = useState(false);
  const [extending, setExtending] = useState(false);
  const [lastActiveAt, setLastActiveAt] = useState(room.last_active_at);
  const [expiryBannerDismissed, setExpiryBannerDismissed] = useState(false);

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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` }, (payload) => {
        const updatedRoom = payload.new as { last_active_at?: string };
        if (updatedRoom.last_active_at) {
          setLastActiveAt(updatedRoom.last_active_at);
          setExpiryMessage('');
          setNow(new Date());
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `room_id=eq.${room.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `room_id=eq.${room.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_splits' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements', filter: `room_id=eq.${room.id}` }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room.id, loadData, lsKey]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      if (window.localStorage.getItem('splitroom_created_notice') === '1') {
        setShowCreatedNotice(true);
        window.localStorage.removeItem('splitroom_created_notice');
      }
    } catch {
      // The notice is best-effort when storage is unavailable.
    }
  }, []);

  const handleSelectMember = (id: string) => {
    setMyMemberId(id);
    setLocalStorage(lsKey, id);
  };

  const expiresAt = getRoomExpiry(lastActiveAt, room.expiry_days);
  const remaining = timeLeft(expiresAt, now);
  const expiringSoon = isExpiringSoon(expiresAt, now);
  const confirmedSettlements = settlements.filter((settlement) => settlement.status === 'confirmed');
  const balances = useMemo(
    () => computeBalances(members, expenses, confirmedSettlements),
    [members, expenses, confirmedSettlements]
  );

  const extendRoom = async () => {
    setExtending(true);
    setExpiryMessage('');
    const { error } = await supabase.from('rooms').update({ last_active_at: new Date().toISOString() }).eq('id', room.id);
    if (error) {
      setExpiryMessage(`Could not extend the room: ${error.message}`);
    } else {
      setLastActiveAt(new Date().toISOString());
      setExpiryMessage(`Room extended for another ${room.expiry_days} days.`);
      setExpiryBannerDismissed(true);
      setNow(new Date());
    }
    setExtending(false);
  };

  const downloadBackup = () => {
    const backup = {
      exported_at: new Date().toISOString(),
      room: { id: room.id, code: room.code, name: room.name, expiry_days: room.expiry_days, last_active_at: room.last_active_at },
      members,
      expenses,
      balances: balances.map(({ member, balance }) => ({ member_id: member.id, member_name: member.name, balance })),
      settlements,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${room.code.toLowerCase()}-backup.json`;
    link.click();
    URL.revokeObjectURL(url);
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
            <SummaryCard roomName={room.name} members={members} expenses={expenses} settlements={settlements} />
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
            {(expiringSoon || remaining.expired) && !expiryBannerDismissed && (
              <section className={`glass flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between ${remaining.expired ? 'border-danger/60 text-danger' : 'border-amber-400/60 text-amber-600 dark:text-amber-300'}`}>
                <div>
                  <p className="font-semibold">
                    {remaining.expired
                      ? 'This room has reached its inactivity deadline.'
                      : `This room will be deleted in ${formatTimeLeft(remaining)} because of inactivity.`}
                  </p>
                  <p className="text-sm opacity-80">Add any expense or tap Extend to keep it.</p>
                  {expiryMessage && <p className="mt-1 text-sm font-medium">{expiryMessage}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button className="btn-secondary min-h-11" onClick={downloadBackup}>Download backup</button>
                  <button className="btn-primary min-h-11" onClick={extendRoom} disabled={extending}>
                    {extending ? 'Extending...' : 'Extend'}
                  </button>
                </div>
              </section>
            )}
            <p className="text-xs text-muted-foreground">
              Expires in {formatTimeLeft(remaining)} due to inactivity.
            </p>
            {showCreatedNotice && (
              <section className="glass flex items-center justify-between gap-3 border border-accent/40 p-3 text-sm">
                <span>Free rooms are deleted after 2 days of inactivity.</span>
                <button className="text-accent" onClick={() => setShowCreatedNotice(false)} aria-label="Dismiss notice">×</button>
              </section>
            )}
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
