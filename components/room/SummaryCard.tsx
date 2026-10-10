'use client';

import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { ExpenseCategory, Member, SettlementRecord } from '@/types';
import type { FullExpense } from './RoomClient';
import { computeSummary, type SummaryStats } from '@/lib/summary';
import { formatINR } from '@/lib/utils';

type CardSize = 'story' | 'post' | 'square';
const SIZES: Record<CardSize, { label: string; width: number; height: number }> = {
  story: { label: 'Story', width: 1080, height: 1920 },
  post: { label: 'Post', width: 1080, height: 1350 },
  square: { label: 'Square', width: 1080, height: 1080 },
};
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
  const [flipped, setFlipped] = useState(false);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [exportBothSides, setExportBothSides] = useState(false);
  const [sizeKey, setSizeKey] = useState<CardSize>('post');
  const [scale, setScale] = useState(0.3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const frontExportRef = useRef<HTMLDivElement>(null);
  const backExportRef = useRef<HTMLDivElement>(null);
  const size = SIZES[sizeKey];
  const stats = useMemo(() => computeSummary(expenses, members, settlements), [expenses, members, settlements]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  useEffect(() => {
    setMounted(true);
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    try {
      setHideAmounts(window.localStorage.getItem('splitroom_hide_summary_amounts') === 'true');
    } catch {
      // localStorage can be unavailable in private browsing.
    }
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setFlipped(false);
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

  useEffect(() => {
    if (!open || !previewRef.current) return;
    const update = () => {
      const box = previewRef.current?.getBoundingClientRect();
      if (!box) return;
      setScale(Math.min((box.width - 16) / size.width, (box.height - 16) / size.height));
    };
    const observer = new ResizeObserver(update);
    observer.observe(previewRef.current);
    update();
    return () => observer.disconnect();
  }, [open, size]);

  const capture = async (node: HTMLDivElement) => {
    if (document.fonts?.ready) await document.fonts.ready;
    return toPng(node, {
      pixelRatio: 1,
      cacheBust: true,
      width: size.width,
      height: size.height,
      style: { width: `${size.width}px`, height: `${size.height}px`, margin: '0', transform: 'none' },
    });
  };

  const exportImages = async (both: boolean) => {
    const targets = both
      ? [[frontExportRef.current, 'front'], [backExportRef.current, 'back']] as const
      : [[flipped ? backExportRef.current : frontExportRef.current, flipped ? 'back' : 'front']] as const;
    const images: { url: string; name: string }[] = [];
    for (const [node, side] of targets) {
      if (node) images.push({ url: await capture(node), name: `${safeName(roomName)}-${sizeKey}-${side}.png` });
    }
    return images;
  };

  const runExport = async (both: boolean, share: boolean) => {
    setBusy(true);
    setError('');
    try {
      const images = await exportImages(both);
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

  const toggleFlip = () => setFlipped((value) => !value);
  const handleCardKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleFlip();
    }
  };

  const dialog = open && mounted ? createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <div ref={modalRef} className="card flex max-h-[calc(100dvh-32px)] w-full max-w-[460px] flex-col overflow-y-auto p-4" role="dialog" aria-modal="true" aria-labelledby="summary-title">
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
            <div className="mb-3 flex flex-wrap gap-1 rounded-xl border border-border p-1">
              {(Object.entries(SIZES) as [CardSize, typeof SIZES[CardSize]][]).map(([key, option]) => (
                <button key={key} className={`min-h-[44px] flex-1 rounded-lg px-2 text-xs font-bold ${sizeKey === key ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`} onClick={() => setSizeKey(key)}>{option.label}</button>
              ))}
            </div>
            <label className="mb-3 flex min-h-[44px] items-center justify-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={hideAmounts} onChange={(event) => toggleHideAmounts(event.target.checked)} />
              Hide amounts
            </label>
            <div ref={previewRef} className="flex w-full items-center justify-center overflow-hidden" style={{ height: Math.max(120, Math.round(size.height * scale)) }}>
              <div className="relative shrink-0" style={{ width: size.width * scale, height: size.height * scale, perspective: 1800 }}>
                <div
                  className={`absolute left-1/2 top-0 [transform-style:preserve-3d] ${reducedMotion ? 'transition-opacity duration-150' : 'transition-transform duration-[600ms] ease-in-out'}`}
                  style={{ width: size.width, height: size.height, transform: `translateX(-50%) scale(${scale})${!reducedMotion && flipped ? ' rotateY(180deg)' : ''}`, transformOrigin: 'top center', opacity: reducedMotion ? 1 : undefined }}
                  onClick={toggleFlip}
                  onKeyDown={handleCardKey}
                  role="button"
                  tabIndex={0}
                  aria-label={flipped ? 'Show summary highlights' : 'Show spending details'}
                >
                  {reducedMotion ? <CardFace stats={stats} roomName={roomName} side={flipped ? 'back' : 'front'} size={size} hideAmounts={hideAmounts} siteUrl={siteUrl} animate3d={false} /> : <>
                    <CardFace stats={stats} roomName={roomName} side="front" size={size} hideAmounts={hideAmounts} siteUrl={siteUrl} />
                    <CardFace stats={stats} roomName={roomName} side="back" size={size} hideAmounts={hideAmounts} siteUrl={siteUrl} />
                  </>}
                </div>
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">Tap card to flip</p>
            <button className="btn-secondary mx-auto mt-2 w-auto px-4 text-xs" onClick={toggleFlip}>Flip</button>
            {error && <p role="alert" className="mt-2 text-center text-sm text-danger">{error}</p>}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <button className="btn-primary flex-1" disabled={busy} onClick={() => runExport(exportBothSides, true)}>{busy ? 'Preparing…' : 'Share'}</button>
              <button className="btn-secondary flex-1" disabled={busy} onClick={() => runExport(exportBothSides, false)}>Download PNG</button>
            </div>
            <label className="mt-2 flex min-h-[44px] items-center justify-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={exportBothSides} onChange={(event) => setExportBothSides(event.target.checked)} />
              Both sides
            </label>
            <div ref={frontExportRef} className="pointer-events-none fixed left-[-99999px] top-0 box-border overflow-hidden bg-[#0a0e17]" style={{ width: size.width, height: size.height, margin: 0, transform: 'none' }}>
              <CardFace stats={stats} roomName={roomName} side="front" size={size} hideAmounts={hideAmounts} siteUrl={siteUrl} exportMode />
            </div>
            <div ref={backExportRef} className="pointer-events-none fixed left-[-99999px] top-0 box-border overflow-hidden bg-[#0a0e17]" style={{ width: size.width, height: size.height, margin: 0, transform: 'none' }}>
              <CardFace stats={stats} roomName={roomName} side="back" size={size} hideAmounts={hideAmounts} siteUrl={siteUrl} exportMode />
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return <><button ref={triggerRef} className="btn-secondary w-auto px-3 text-xs" onClick={() => setOpen(true)}>Share summary</button>{dialog}</>;
}

function CardFace({ stats, roomName, side, size, hideAmounts, siteUrl, exportMode = false, animate3d }: {
  stats: SummaryStats;
  roomName: string;
  side: 'front' | 'back';
  size: { width: number; height: number };
  hideAmounts: boolean;
  siteUrl?: string;
  exportMode?: boolean;
  animate3d?: boolean;
}) {
  const compact = size.height <= 1080;
  const story = size.height >= 1900;
  return (
    <div
      className={`absolute inset-0 box-border overflow-hidden bg-[#0a0e17] p-[72px] text-slate-100 ${side === 'back' && !exportMode && animate3d !== false ? '[transform:rotateY(180deg)]' : ''} ${exportMode ? '' : '[backface-visibility:hidden]'}`}
      style={{ width: size.width, height: size.height, margin: 0, transformOrigin: 'center', backgroundImage: 'radial-gradient(circle at 15% 15%, rgba(45,212,191,.18), transparent 35%), radial-gradient(circle at 85% 75%, rgba(45,212,191,.12), transparent 35%)' }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(#2dd4bf 2px, transparent 2px)', backgroundSize: '44px 44px' }} />
      <div className="relative flex h-full flex-col">
        <p className="text-[30px] font-bold uppercase tracking-[.25em] text-teal-300">Split Room</p>
        <h3 className="mt-[42px] truncate text-[72px] font-black">{roomName}</h3>
        {side === 'front'
          ? <Front stats={stats} hideAmounts={hideAmounts} compact={compact} story={story} siteUrl={siteUrl} />
          : <Back stats={stats} hideAmounts={hideAmounts} compact={compact} />}
        <p className="mt-auto text-[24px] text-slate-500">Made with Split Room{siteUrl ? ` · ${siteUrl}` : ''}</p>
      </div>
    </div>
  );
}

function Front({ stats, hideAmounts, compact, story, siteUrl }: { stats: SummaryStats; hideAmounts: boolean; compact: boolean; story: boolean; siteUrl?: string }) {
  return <>
    <p className="mt-6 text-[28px] text-slate-400">{formatDateRange(stats)}</p>
    <p className="mt-10 text-[86px] font-black text-teal-300">{hideAmounts ? `${stats.expenseCount} ${plural(stats.expenseCount, 'expense')}` : formatINR(stats.totalSpent)}</p>
    <p className="mt-1 text-[30px] text-slate-400">{stats.expenseCount} {plural(stats.expenseCount, 'expense')}</p>
    <div className="mt-10 grid grid-cols-2 gap-5">
      <Stat label="Members" value={`${stats.memberCount} ${plural(stats.memberCount, 'member')}`} />
      <Stat label="Average / person" value={hideAmounts ? 'Per-person share' : formatINR(stats.averagePerPerson)} />
      <Stat label="Top spender" value={stats.topSpender?.name ?? '-'} />
      <Stat label="Biggest expense" value={stats.biggestExpense ? (hideAmounts ? stats.biggestExpense.description : `${truncate(stats.biggestExpense.description, 20)} · ${formatINR(stats.biggestExpense.amount)}`) : '-'} />
    </div>
    {!compact && <CategorySection stats={stats} hideAmounts={hideAmounts} />}
    <SettleSection stats={stats} hideAmounts={hideAmounts} compact={compact} />
    {!compact && <ExpenseSection stats={stats} hideAmounts={hideAmounts} story={story} />}
    {!compact && <Awards stats={stats} compact={compact} />}
  </>;
}

function CategorySection({ stats, hideAmounts }: { stats: SummaryStats; hideAmounts: boolean }) {
  return <section className="mt-10">
    <p className="text-[28px] font-bold">Categories</p>
    <div className="mt-4 flex h-7 overflow-hidden rounded-full">{stats.categoryBreakdown.map((item) => <div key={item.category} style={{ width: `${item.percentage}%`, backgroundColor: CATEGORY_META[item.category].color }} />)}</div>
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[22px]">{stats.categoryBreakdown.map((item) => <span key={item.category}>{CATEGORY_META[item.category].emoji} {item.percentage}%{!hideAmounts && ` · ${formatINR(item.amount)}`}</span>)}</div>
  </section>;
}

function SettleSection({ stats, hideAmounts, compact }: { stats: SummaryStats; hideAmounts: boolean; compact: boolean }) {
  return <section className={`mt-10 ${compact ? 'mt-8' : ''}`}>
    <div className="flex items-center justify-between gap-3 text-[25px]"><p className="font-bold">Settle progress</p><span>{stats.totalToSettle === 0 ? 'Nothing to settle' : hideAmounts ? `${stats.settlePercent}% paid of bills` : `${formatINR(stats.settled)} of ${formatINR(stats.totalToSettle)} settled`}</span></div>
    <div className="mt-3 h-6 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-teal-300" style={{ width: `${stats.settlePercent}%` }} /></div>
    {stats.pendingSettled > 0 && <p className="mt-2 text-[20px] text-slate-400">{hideAmounts ? 'Pending payments shown separately' : `${formatINR(stats.pendingSettled)} pending`}</p>}
  </section>;
}

function ExpenseSection({ stats, hideAmounts, story }: { stats: SummaryStats; hideAmounts: boolean; story: boolean }) {
  return <section className="mt-10">
    <p className="text-[28px] font-bold">Top {Math.min(3, stats.topExpenses.length)} expenses</p>
    <div className="mt-3 space-y-2 text-[24px]">{(story ? stats.topExpenses : stats.topExpenses.slice(0, 2)).map((expense, index) => <p key={`${expense.description}-${index}`} className="flex justify-between gap-4"><span className="truncate">{truncate(expense.description, 30)}</span>{!hideAmounts && <span className="shrink-0">{formatINR(expense.amount)}</span>}</p>)}</div>
  </section>;
}

function Awards({ stats, compact }: { stats: SummaryStats; compact: boolean }) {
  return stats.awards.length ? <div className="mt-8 flex flex-wrap gap-3">{stats.awards.slice(0, compact ? 2 : 3).map((award) => <span key={award.label} className="rounded-full border border-teal-300/30 bg-teal-300/10 px-4 py-2 text-[22px]">{award.label}{award.memberName ? ` · ${award.memberName}` : ''}</span>)}</div> : null;
}

function Back({ stats, hideAmounts, compact }: { stats: SummaryStats; hideAmounts: boolean; compact: boolean }) {
  const visible = stats.paidTotals.filter((person) => person.amount > 0).slice(0, 6);
  const max = visible[0]?.amount || 1;
  const transactions = stats.remainingTransactions.slice(0, 5);
  return <>
    <p className="mt-12 text-[38px] font-black">Spending by person</p>
    <div className="mt-7 space-y-5">{visible.map((person) => <div key={person.memberId}><div className="flex items-center gap-3 text-[27px]"><Initial name={person.name} /><span className="min-w-0 flex-1 truncate">{person.name}</span>{!hideAmounts && <span>{formatINR(person.amount)}</span>}</div><div className="mt-2 h-4 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-teal-300" style={{ width: `${(person.amount / max) * 100}%` }} /></div></div>)}</div>
    {stats.paidTotals.filter((person) => person.amount > 0).length > visible.length && <p className="mt-3 text-[24px] text-slate-400">+{stats.paidTotals.filter((person) => person.amount > 0).length - visible.length} more</p>}
    {!compact && <><p className="mt-12 text-[38px] font-black">Top expenses</p><div className="mt-4 space-y-2 text-[26px]">{stats.topExpenses.map((expense, index) => <p key={`${expense.description}-${index}`} className="flex justify-between gap-3"><span className="truncate">{truncate(expense.description, 30)}</span>{!hideAmounts && <span>{formatINR(expense.amount)}</span>}</p>)}</div></>}
    <p className="mt-10 text-[38px] font-black">Settle up</p>
    <div className="mt-4 space-y-3 text-[27px]">{transactions.length ? transactions.map((item, index) => <p key={`${item.from}-${item.to}-${index}`} className="truncate">{item.from} pays {item.to}{hideAmounts ? '' : ` ${formatINR(item.amount)}`}</p>) : <p className="text-teal-300">All settled 🎉</p>}</div>
    {stats.remainingTransactions.length > transactions.length && <p className="mt-3 text-[24px] text-slate-400">+{stats.remainingTransactions.length - transactions.length} more</p>}
  </>;
}

function Initial({ name }: { name: string }) {
  const hue = hash(name) % 360;
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold text-slate-950" style={{ backgroundColor: `hsl(${hue} 75% 68%)` }}>{name.trim().charAt(0).toUpperCase() || '?'}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[28px] border border-white/10 bg-white/5 p-6"><p className="text-[20px] uppercase tracking-wide text-slate-400">{label}</p><p className="mt-3 truncate text-[30px] font-bold">{value}</p></div>;
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
