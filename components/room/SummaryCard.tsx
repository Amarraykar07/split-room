'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import type { Member } from '@/types';
import type { FullExpense } from './RoomClient';
import { computeSummary } from '@/lib/summary';
import { formatINR } from '@/lib/utils';

interface Props { roomName: string; members: Member[]; expenses: FullExpense[]; }

export default function SummaryCard({ roomName, members, expenses }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const stats = computeSummary(expenses, members);

  const generate = async () => cardRef.current ? toPng(cardRef.current, { pixelRatio: 2, cacheBust: true }) : '';
  const download = async () => {
    try {
      const url = await generate();
      const link = document.createElement('a');
      link.download = `${roomName.replace(/\s+/g, '-').toLowerCase()}-summary.png`;
      link.href = url;
      link.click();
    } catch { setError('Could not generate the summary image. Please try again.'); }
  };
  const share = async () => {
    try {
      const url = await generate();
      const response = await fetch(url);
      const file = new File([await response.blob()], 'split-room-summary.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: `${roomName} summary` });
      else await download();
    } catch { setError('Sharing is not supported here. Try Download PNG instead.'); }
  };

  return <>
    <button className="btn-secondary w-auto px-3 text-xs" onClick={() => setOpen(true)}>Share summary</button>
    {open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
        <div className="card max-h-[95vh] w-full max-w-lg overflow-auto">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Share summary</h2><button className="icon-button" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
          {expenses.length === 0 ? <p className="py-10 text-center text-muted-foreground">Add an expense first and your trip story will appear here.</p> : <>
            <div ref={cardRef} className="relative mx-auto aspect-[4/5] w-full max-w-[432px] overflow-hidden bg-[#0a0e17] p-7 text-slate-100" style={{ backgroundImage: 'radial-gradient(circle at 15% 15%, rgba(45,212,191,.18), transparent 35%), radial-gradient(circle at 85% 75%, rgba(45,212,191,.12), transparent 35%)' }}>
              <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(#2dd4bf 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
              <div className="relative flex h-full flex-col">
                <p className="text-xs font-bold uppercase tracking-[.25em] text-teal-300">Split Room</p>
                <h3 className="mt-4 text-3xl font-black">{roomName}</h3>
                <p className="mt-2 text-4xl font-black text-teal-300">{formatINR(stats.totalSpent)}</p>
                <p className="mt-1 text-sm text-slate-400">total spent · {stats.expenseCount} expenses</p>
                <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Members" value={String(stats.memberCount)} /><Stat label="Avg / person" value={formatINR(stats.averagePerPerson)} />
                  <Stat label="Top spender" value={stats.topSpender?.name ?? '-'} /><Stat label="Biggest expense" value={stats.biggestExpense ? `${stats.biggestExpense.description} · ${formatINR(stats.biggestExpense.amount)}` : '-'} />
                </div>
                <p className="mt-6 text-xs text-slate-400">{stats.dateRange ? `${new Date(stats.dateRange.first).toLocaleDateString('en-IN')} – ${new Date(stats.dateRange.last).toLocaleDateString('en-IN')}` : ''}</p>
                <p className="mt-auto text-xs text-slate-500">Made with Split Room</p>
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            <div className="mt-4 flex gap-3"><button className="btn-primary flex-1" onClick={share}>Share</button><button className="btn-secondary flex-1" onClick={download}>Download PNG</button></div>
          </>}
        </div>
      </div>
    )}
  </>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 truncate font-bold">{value}</p></div>;
}
