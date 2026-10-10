'use client';

import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Member } from '@/types';
import type { SettlementRecord } from '@/types';
import type { FullExpense } from './RoomClient';
import { computeBalances, computeSettlements } from '@/lib/settle';
import { formatINR, buildUPILink, buildPaymentReminderMessage, buildWhatsAppUrl } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, CircleDollarSign, Send, Users, Bell } from 'lucide-react';

interface Props {
  members: Member[];
  expenses: FullExpense[];
  settlements: SettlementRecord[];
  roomId: string;
  roomCode: string;
  roomName: string;
  myMemberId: string | null;
}

export default function SettlementPanel({ members, expenses, settlements: records, roomId, roomCode, roomName, myMemberId }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const balances = useMemo(() => {
    const simplified = expenses.map((e) => ({
      paid_by: e.paid_by,
      splits: (e.splits ?? []).map((s) => ({
        member_id: s.member_id,
        share: Number(s.share),
      })),
    }));
    return computeBalances(members, simplified, records.filter((r) => r.status === 'confirmed'));
  }, [members, expenses, records]);

  const settlements = useMemo(() => computeSettlements(balances), [balances]);

  if (members.length === 0) {
    return (
      <div className="card text-center py-10">
        <UsersIcon />
        <p className="font-medium text-muted-foreground">Add members first</p>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="card text-center py-10">
        <CheckCircle2 className="mx-auto mb-3 text-accent" size={32} />
        <p className="font-medium text-muted-foreground">No expenses to settle</p>
      </div>
    );
  }

  const allSettled = settlements.length === 0;

  return (
    <div className="space-y-4">
      {/* Balances */}
      <div className="card">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
          <CircleDollarSign size={18} className="text-accent" /> Balances
        </h2>
        <div className="space-y-3">
          {balances.map(({ member, balance }) => (
            <div key={member.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    balance > 0.005
                      ? 'bg-success'
                      : balance < -0.005
                      ? 'bg-red-500'
                      : 'bg-surface-strong'
                  }`}
                />
                <span className="font-medium truncate">
                  {member.name}
                </span>
              </div>
              <span
                className={`font-bold text-sm flex-shrink-0 ${
                  balance > 0.005
                    ? 'text-success'
                    : balance < -0.005
                    ? 'text-danger'
                    : 'text-muted-foreground'
                }`}
              >
                {balance > 0.005
                  ? `+${formatINR(balance)}`
                  : balance < -0.005
                  ? formatINR(balance)
                  : 'Settled ✓'}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Green = gets money back • Red = owes money
        </p>
      </div>

      {/* Settlements */}
      <div className="card">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
          <Send size={18} className="text-accent" /> Payments to make
        </h2>

        {allSettled ? (
          <div className="text-center py-6">
            <CheckCircle2 className="mx-auto mb-3 text-success" size={32} />
            <p className="font-semibold text-success">All settled up!</p>
            <p className="mt-1 text-sm text-muted-foreground">Everyone&apos;s even</p>
          </div>
        ) : (
          <div className="space-y-4">
            {settlements.map((s, i) => {
              const upiLink = s.to.upi_id
                ? buildUPILink({ upiId: s.to.upi_id, name: s.to.name, amount: s.amount })
                : null;

              return (
                <div
                  key={i}
                  className="space-y-3 rounded-[var(--radius-control)] border border-border bg-surface p-4"
                >
                  {/* Transaction summary */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{s.from.name}</span>
                    <span className="text-muted-foreground">pays</span>
                    <span className="font-semibold">{s.to.name}</span>
                    <span className="ml-auto text-lg font-bold text-accent">
                      {formatINR(s.amount)}
                    </span>
                  </div>
                  {(() => {
                    const record = records.find((r) => r.from_member === s.from.id && r.to_member === s.to.id && Math.abs(Number(r.amount) - s.amount) < 0.01);
                    // Identity controls are UI-level only; the MVP has no authentication.
                    const isPayer = myMemberId === s.from.id;
                    const isReceiver = myMemberId === s.to.id;
                    const markPaid = async () => {
                      setBusyId(s.from.id);
                      const { error } = await supabase.from('settlements').insert({ room_id: roomId, from_member: s.from.id, to_member: s.to.id, amount: s.amount, status: 'paid' });
                      if (error) setActionError(error.message);
                      setBusyId(null);
                    };
                    const cancel = async () => {
                      if (record) {
                        const { error } = await supabase.from('settlements').delete().eq('id', record.id);
                        if (error) setActionError(error.message);
                      }
                    };
                    const confirm = async () => {
                      if (record) {
                        const { error } = await supabase.from('settlements').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', record.id);
                        if (error) setActionError(error.message);
                      }
                    };
                    const roomLink = typeof window !== 'undefined' ? `${window.location.origin}/room/${encodeURIComponent(roomCode)}` : `https://splitroom.in/room/${encodeURIComponent(roomCode)}`;
                    const reminder = buildWhatsAppUrl(buildPaymentReminderMessage({ payerName: s.from.name, receiverName: s.to.name, roomName, amount: s.amount, receiverUpiId: s.to.upi_id, roomLink }));
                    return <div className="flex flex-wrap items-center gap-2">
                      {record?.status === 'confirmed' && <span className="rounded-full bg-success/15 px-2 py-1 text-xs font-bold text-success">Settled</span>}
                      {record?.status === 'paid' && <span className="rounded-full bg-yellow-400/15 px-2 py-1 text-xs font-bold text-yellow-300">Waiting for confirmation</span>}
                      {!record && isPayer && <button className="btn-primary w-auto px-3 text-xs" onClick={markPaid} disabled={busyId === s.from.id}>Mark as paid</button>}
                      {record?.status === 'paid' && isReceiver && <button className="btn-primary w-auto px-3 text-xs" onClick={confirm}>Confirm received</button>}
                      {record?.status === 'paid' && (isPayer || isReceiver) && <button className="btn-secondary w-auto px-3 text-xs" onClick={cancel}>Cancel</button>}
                      <a className="btn-secondary w-auto px-3 text-xs" href={reminder} target="_blank" rel="noopener noreferrer"><Bell size={14} /> Remind</a>
                      {record && !isPayer && !isReceiver && <span className="text-xs text-muted-foreground">Payment status is read-only</span>}
                    </div>;
                  })()}

                  {/* UPI section */}
                  {upiLink ? (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3 items-start">
                        {/* QR Code */}
                        <div className="flex-shrink-0 rounded-[var(--radius-control)] bg-white p-3">
                          <QRCodeSVG
                            value={upiLink}
                            size={100}
                            level="M"
                            includeMargin={false}
                          />
                        </div>
                        {/* UPI button and info */}
                        <div className="flex-1">
                          <p className="mb-2 text-xs text-muted-foreground">
                            UPI: <span className="font-mono font-medium text-foreground">{s.to.upi_id}</span>
                          </p>
                          <a
                            href={upiLink}
                            className="btn-primary text-sm py-2.5 inline-flex"
                            rel="noopener noreferrer"
                          >
                            💳 Pay via UPI
                          </a>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Scan QR or tap button to open PhonePe, GPay, Paytm etc.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs italic text-muted-foreground">
                      {s.to.name} hasn't added a UPI ID — pay them in person or ask them to add their UPI ID.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="card">
        <h2 className="mb-3 font-bold">Payment history</h2>
        {records.length === 0 ? <p className="text-sm text-muted-foreground">No payments marked yet.</p> : (
          <div className="space-y-2">{records.map((record) => (
            <div key={record.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-strong px-3 py-2 text-sm">
              <span>{members.find((m) => m.id === record.from_member)?.name} → {members.find((m) => m.id === record.to_member)?.name}</span>
              <span className={record.status === 'confirmed' ? 'text-success' : 'text-yellow-300'}>{formatINR(Number(record.amount))} · {record.status === 'confirmed' ? 'Settled' : 'Waiting'}</span>
            </div>
          ))}</div>
        )}
      </div>
      {actionError && <p className="text-sm text-danger">{actionError}</p>}
    </div>
  );
}

function UsersIcon() {
  return <Users className="mx-auto mb-3 text-accent" size={32} />;
}
