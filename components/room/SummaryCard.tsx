'use client';

import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ExpenseCategory, Member, SettlementRecord } from '@/types';
import type { FullExpense } from './RoomClient';
import { computeSummary, type SummaryStats } from '@/lib/summary';
import { formatINR } from '@/lib/utils';

const CARD_SIZE = { width: 1080, height: 1350 };
const CATEGORY_META: Record<ExpenseCategory, { emoji: string; label: string; color: string }> = {
  food: { emoji: '🍽️', label: 'Khana', color: '#f59e0b' },
  stay: { emoji: '🏨', label: 'Stay', color: '#a78bfa' },
  travel: { emoji: '🚕', label: 'Travel', color: '#38bdf8' },
  fun: { emoji: '🎉', label: 'Masti', color: '#fb7185' },
  other: { emoji: '🛒', label: 'Other', color: '#2dd4bf' },
};

interface Props {
  roomName: string;
  members: Member[];
  expenses: FullExpense[];
  settlements?: SettlementRecord[];
}

export default function SummaryCard({ roomName, members, expenses, settlements = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [scale, setScale] = useState(0.3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const frontExportRef = useRef<HTMLDivElement>(null);
  const stats = useMemo(() => computeSummary(expenses, members, settlements), [expenses, members, settlements]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  useEffect(() => {
    setMounted(true);
    try {
      setHideAmounts(window.localStorage.getItem('splitroom_hide_summary_amounts') === 'true');
    } catch {
      // localStorage can be unavailable in private browsing.
    }
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setError('');
    triggerRef.current?.focus();
  }, []);

  const toggleHideAmounts = (checked: boolean) => {
    setHideAmounts(checked);
    try {
      window.localStorage.setItem('splitroom_hide_summary_amounts', String(checked));
    } catch {
      // localStorage is an optional preference.
    }
  };

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const getFocusable = () => Array.from(modalRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    ) ?? []);
    getFocusable()[0]?.focus();
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, close]);

  useLayoutEffect(() => {
    if (!open || !previewRef.current) return;
    const update = () => {
      const stage = previewRef.current;
      if (!stage) return;
      const stageWidth = stage.clientWidth;
      const stageHeight = stage.clientHeight;
      if (!stageWidth || !stageHeight || !Number.isFinite(stageWidth) || !Number.isFinite(stageHeight)) {
        setScale(0.3);
        return;
      }
      const nextScale = Math.min(stageWidth / CARD_SIZE.width, stageHeight / CARD_SIZE.height, 1);
      setScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 0.3);
    };
    const observer = new ResizeObserver(update);
    observer.observe(previewRef.current);
    update();
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [open]);

  const capture = async (node: HTMLDivElement) => {
    if (document.fonts?.ready) await document.fonts.ready;
    return toPng(node, {
      pixelRatio: 1,
      cacheBust: true,
      width: CARD_SIZE.width,
      height: CARD_SIZE.height,
      style: { width: `${CARD_SIZE.width}px`, height: `${CARD_SIZE.height}px`, margin: '0', transform: 'none' },
    });
  };

  const exportImage = async () => {
    if (!frontExportRef.current) return [];
    return [{ url: await capture(frontExportRef.current), name: `${safeName(roomName)}.png` }];
  };

  const runExport = async (share: boolean) => {
    setBusy(true);
    setError('');
    try {
      const images = await exportImage();
      const files = await Promise.all(images.map(async (image) => {
        const response = await fetch(image.url);
        return new File([await response.blob()], image.name, { type: 'image/png' });
      }));
      if (share && navigator.canShare?.({ files })) {
        await navigator.share({ files, title: `${roomName} summary` });
      } else {
        images.forEach((image) => {
          const link = document.createElement('a');
          link.download = image.name;
          link.href = image.url;
          link.click();
        });
      }
    } catch {
      setError('Could not create the summary image. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const dialog = open && mounted ? createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <div ref={modalRef} className="card flex max-h-[calc(100dvh-32px)] w-full max-w-[520px] flex-col overflow-y-auto p-4" role="dialog" aria-modal="true" aria-labelledby="summary-title">
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <h2 id="summary-title" className="font-bold">Share summary</h2>
          <button className="icon-button" onClick={close} aria-label="Close summary">×</button>
        </div>
        {expenses.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-semibold">Your summary is waiting ✨</p>
            <p className="mt-2 text-sm text-muted-foreground">Add an expense first and your trip story will appear here.</p>
            <button className="btn-secondary mx-auto mt-6 w-auto px-5" onClick={close}>Close</button>
          </div>
        ) : (
          <>
            <label className="mb-3 flex min-h-[44px] items-center justify-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={hideAmounts} onChange={(event) => toggleHideAmounts(event.target.checked)} />
              Hide amounts
            </label>
            <div ref={previewRef} className="flex h-[min(72dvh,720px)] w-full items-center justify-center overflow-hidden max-[639px]:h-[min(62dvh,560px)]">
              <div className="relative shrink-0" style={{ width: CARD_SIZE.width * scale, height: CARD_SIZE.height * scale }}>
                <div
                  className="absolute left-0 top-0"
                  style={{ width: CARD_SIZE.width, height: CARD_SIZE.height, transform: `scale(${scale})`, transformOrigin: 'top left' }}
                >
                  <CardFace stats={stats} roomName={roomName} hideAmounts={hideAmounts} siteUrl={siteUrl} />
                </div>
              </div>
            </div>
            {error && <p role="alert" className="mt-2 text-center text-sm text-danger">{error}</p>}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <button className="btn-primary flex-1" disabled={busy} onClick={() => runExport(true)}>{busy ? 'Preparing…' : 'Share'}</button>
              <button className="btn-secondary flex-1" disabled={busy} onClick={() => runExport(false)}>Download PNG</button>
            </div>
            <div ref={frontExportRef} className="pointer-events-none fixed left-[-99999px] top-0 box-border overflow-hidden bg-[#0a0e17]" style={{ width: CARD_SIZE.width, height: CARD_SIZE.height, margin: 0, transform: 'none' }}>
              <CardFace stats={stats} roomName={roomName} hideAmounts={hideAmounts} siteUrl={siteUrl} />
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return <><button ref={triggerRef} className="btn-secondary w-auto px-3 text-xs" onClick={() => setOpen(true)}>Share summary</button>{dialog}</>;
}

function CardFace({ stats, roomName, hideAmounts, siteUrl }: {
  stats: SummaryStats;
  roomName: string;
  hideAmounts: boolean;
  siteUrl?: string;
}) {
  const peopleCount = stats.paidTotals.filter((person) => person.amount > 0).length;
  let optionalBudget = 280;
  const showSpent = peopleCount > 0 && optionalBudget >= 180;
  if (showSpent) optionalBudget -= 180;
  const showAwards = stats.awards.length > 0 && optionalBudget >= 70;
  if (showAwards) optionalBudget -= 70;
  const showSettleRows = stats.remainingTransactions.length > 0 && optionalBudget >= 110;
  return (
    <div
      className="absolute inset-0 box-border flex flex-col overflow-hidden bg-[#0a0e17] p-[72px] text-slate-100"
      style={{ width: CARD_SIZE.width, height: CARD_SIZE.height, margin: 0, backgroundImage: 'radial-gradient(circle at 15% 15%, rgba(45,212,191,.18), transparent 35%), radial-gradient(circle at 85% 75%, rgba(45,212,191,.12), transparent 35%)' }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(#2dd4bf 2px, transparent 2px)', backgroundSize: '44px 44px' }} />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <header className="flex-none">
          <p className="text-[30px] font-bold uppercase tracking-[.25em] text-teal-300">Split Room</p>
          <h3 className="mt-[34px] line-clamp-2 pb-1 text-[88px] font-extrabold leading-[1.15]">{roomName}</h3>
          <p className="mt-4 text-[30px] text-slate-400">{formatDateRange(stats)}</p>
        </header>
        <main className="mt-8 flex min-h-0 flex-1 flex-col gap-9 overflow-hidden">
          <p className="flex-none text-[150px] font-extrabold leading-[1.1] text-teal-300">
            {hideAmounts ? `${stats.expenseCount} ${plural(stats.expenseCount, 'expense')}` : formatINR(stats.totalSpent)}
          </p>
          <p className="-mt-7 flex-none text-[32px] text-slate-400">{stats.expenseCount} {plural(stats.expenseCount, 'expense')}</p>
          <StatsGrid stats={stats} hideAmounts={hideAmounts} />
          <CategorySection stats={stats} hideAmounts={hideAmounts} />
          <SettleSection stats={stats} hideAmounts={hideAmounts} />
          {showSpent && <SpentByPerson stats={stats} hideAmounts={hideAmounts} />}
          {showAwards && <Awards stats={stats} />}
          {showSettleRows && <SettleRows stats={stats} hideAmounts={hideAmounts} />}
        </main>
        <footer className="mt-auto flex-none pt-6 text-[26px] text-slate-500">
          Made with Split Room{siteUrl ? ` · ${siteUrl}` : ''}
        </footer>
      </div>
    </div>
  );
}

function StatsGrid({ stats, hideAmounts }: { stats: SummaryStats; hideAmounts: boolean }) {
  return <div className="grid flex-none grid-cols-2 gap-4">
    <Stat label="Members" value={`${stats.memberCount} ${plural(stats.memberCount, 'member')}`} />
    <Stat label="Average / person" value={hideAmounts ? 'Per-person share' : formatINR(stats.averagePerPerson)} />
    <Stat label="Top spender" value={stats.topSpender?.name ?? '-'} />
    <Stat label="Biggest expense" value={stats.biggestExpense ? (hideAmounts ? stats.biggestExpense.description : `${truncate(stats.biggestExpense.description, 20)} · ${formatINR(stats.biggestExpense.amount)}`) : '-'} />
  </div>;
}

function CategorySection({ stats, hideAmounts }: { stats: SummaryStats; hideAmounts: boolean }) {
  return <section className="flex-none">
    <p className="text-[34px] font-bold">Categories</p>
    <div className="mt-3 flex h-5 overflow-hidden rounded-full">{stats.categoryBreakdown.map((item) => <div key={item.category} style={{ width: `${item.percentage}%`, backgroundColor: CATEGORY_META[item.category].color }} />)}</div>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[28px]">{stats.categoryBreakdown.map((item) => <span key={item.category}>{CATEGORY_META[item.category].emoji} {item.percentage}%{!hideAmounts && ` · ${formatINR(item.amount)}`}</span>)}</div>
  </section>;
}

function SettleSection({ stats, hideAmounts }: { stats: SummaryStats; hideAmounts: boolean }) {
  return <section className="flex-none">
    <div className="flex items-center justify-between gap-3 text-[28px]"><p className="font-bold">Settle progress</p><span>{stats.totalToSettle === 0 ? 'Nothing to settle' : hideAmounts ? `${stats.settlePercent}% paid of bills` : `${formatINR(stats.settled)} of ${formatINR(stats.totalToSettle)} settled`}</span></div>
    <div className="mt-3 h-5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-teal-300" style={{ width: `${stats.settlePercent}%` }} /></div>
  </section>;
}

function SpentByPerson({ stats, hideAmounts }: { stats: SummaryStats; hideAmounts: boolean }) {
  const people = stats.paidTotals.filter((person) => person.amount > 0).slice(0, 4);
  const max = people[0]?.amount || 1;
  const more = stats.paidTotals.filter((person) => person.amount > 0).length - people.length;
  return <section className="flex-none">
    <p className="text-[34px] font-bold">Spent by person</p>
    <div className="mt-3 space-y-2">{people.map((person) => <div key={person.memberId}>
      <div className="flex items-center gap-3 text-[28px]"><Initial name={person.name} /><span className="min-w-0 flex-1 truncate">{person.name}</span>{!hideAmounts && <span>{formatINR(person.amount)}</span>}</div>
      <div className="mt-1 h-5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-teal-300" style={{ width: `${(person.amount / max) * 100}%` }} /></div>
    </div>)}</div>
    {more > 0 && <p className="mt-1 text-[28px] text-slate-400">+{more} more</p>}
  </section>;
}

function Awards({ stats }: { stats: SummaryStats }) {
  return stats.awards.length ? <section className="flex-none"><p className="text-[34px] font-bold">Awards</p><div className="mt-2 flex flex-wrap gap-2">{stats.awards.slice(0, 2).map((award) => <span key={award.label} className="rounded-full border border-teal-300/30 bg-teal-300/10 px-4 py-2 text-[24px]">{award.label}{award.memberName ? ` · ${award.memberName}` : ''}</span>)}</div></section> : null;
}

function SettleRows({ stats, hideAmounts }: { stats: SummaryStats; hideAmounts: boolean }) {
  const limited = stats.remainingTransactions.slice(0, 3);
  return <section className="flex-none">
    <p className="text-[34px] font-bold">Settle up</p>
    <div className="mt-2 space-y-1 text-[28px]">{limited.length ? limited.map((item, index) => <p key={`${item.from}-${item.to}-${index}`} className="truncate">{item.from} pays {item.to}{hideAmounts ? '' : ` ${formatINR(item.amount)}`}</p>) : <p className="text-teal-300">All settled 🎉</p>}</div>
    {stats.remainingTransactions.length > limited.length && <p className="mt-1 text-[28px] text-slate-400">+{stats.remainingTransactions.length - limited.length} more</p>}
  </section>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="h-[136px] rounded-[24px] border border-white/10 bg-white/5 p-7"><p className="text-[26px] uppercase tracking-[.08em] text-slate-400">{label}</p><p className="mt-2 truncate text-[44px] font-bold">{value}</p></div>;
}

function Initial({ name }: { name: string }) {
  const hue = hash(name) % 360;
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[24px] font-bold text-slate-950" style={{ backgroundColor: `hsl(${hue} 75% 68%)` }}>{name.trim().charAt(0).toUpperCase() || '?'}</span>;
}

function formatDateRange(stats: SummaryStats) {
  if (!stats.dateRange) return 'No dates yet';
  const format = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return format(stats.dateRange.first) === format(stats.dateRange.last) ? format(stats.dateRange.first) : `${format(stats.dateRange.first)} – ${format(stats.dateRange.last)}`;
}

function plural(count: number, word: string) { return `${word}${count === 1 ? '' : 's'}`; }
function truncate(value: string, max: number) { return value.length > max ? `${value.slice(0, max - 1)}…` : value; }
function hash(value: string) { return Array.from(value).reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 7); }
function safeName(value: string) { return value.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'split-room-summary'; }
