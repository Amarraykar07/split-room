'use client';

import { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Member } from '@/types';
import type { FullExpense } from './RoomClient';
import { computeBalances, computeSettlements } from '@/lib/settle';
import { formatINR, buildUPILink } from '@/lib/utils';
import { CheckCircle2, CircleDollarSign, Send, Users } from 'lucide-react';

interface Props {
  members: Member[];
  expenses: FullExpense[];
}

export default function SettlementPanel({ members, expenses }: Props) {
  const balances = useMemo(() => {
    const simplified = expenses.map((e) => ({
      paid_by: e.paid_by,
      splits: (e.splits ?? []).map((s) => ({
        member_id: s.member_id,
        share: Number(s.share),
      })),
    }));
    return computeBalances(members, simplified);
  }, [members, expenses]);

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
    </div>
  );
}

function UsersIcon() {
  return <Users className="mx-auto mb-3 text-accent" size={32} />;
}
