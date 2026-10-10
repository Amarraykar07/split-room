'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import type { Member, SettlementRecord } from '@/types';
import type { FullExpense } from './RoomClient';
import { computeSummary, type SummaryStats } from '@/lib/summary';
import { formatINR } from '@/lib/utils';

interface Props {
  roomName: string;
  members: Member[];
  expenses: FullExpense[];
  settlements?: SettlementRecord[];
}

const EXPORT_WIDTH = 1080;
const EXPORT_HEIGHT = 1350;

export default function SummaryCard({ roomName, members, expenses, settlements = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [bothSides, setBothSides] = useState(false);
  const [scale, setScale] = useState(0.28);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const frontExportRef = useRef<HTMLDivElement>(null);
  const backExportRef = useRef<HTMLDivElement>(null);
  const stats = useMemo(() => computeSummary(expenses, members, settlements), [expenses, members, settlements]);

  useEffect(() => {
    setMounted(true);
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setFlipped(false);
    setError('');
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => modalRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) ?? [];
    const first = focusable()[0];
    first?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (!elements.length) return;
      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open || !previewRef.current) return;
    const updateScale = () => {
      const box = previewRef.current?.getBoundingClientRect();
      if (!box) return;
      setScale(Math.max(0.12, Math.min((box.width - 16) / EXPORT_WIDTH, 0.42)));
    };
    const observer = new ResizeObserver(updateScale);
    observer.observe(previewRef.current);
    updateScale();
    return () => observer.disconnect();
  }, [open]);

  const capture = async (node: HTMLDivElement) => {
    if (document.fonts?.ready) await document.fonts.ready;
    return toPng(node, { pixelRatio: 1, cacheBust: true, width: EXPORT_WIDTH, height: EXPORT_HEIGHT });
  };

  const exportImages = async (): Promise<{ url: string; name: string }[]> => {
    const nodes = flipped
      ? [[backExportRef.current, 'back'] as const]
      : [[frontExportRef.current, 'front'] as const];
    const images: { url: string; name: string }[] = [];
    for (const [node, side] of nodes) {
      if (node) images.push({ url: await capture(node), name: `${safeFileName(roomName)}-${side}.png` });
    }
    return images;
  };

  const exportBoth = async (): Promise<{ url: string; name: string }[]> => {
    if (document.fonts?.ready) await document.fonts.ready;
    const images: { url: string; name: string }[] = [];
    for (const [node, side] of [[frontExportRef.current, 'front'], [backExportRef.current, 'back']] as const) {
      if (node) images.push({ url: await capture(node), name: `${safeFileName(roomName)}-${side}.png` });
    }
    return images;
  };

  const downloadImages = (images: { url: string; name: string }[]) => {
    images.forEach(({ url, name }) => {
      const link = document.createElement('a');
      link.download = name;
      link.href = url;
      link.click();
    });
  };

  const runExport = async (both: boolean, share: boolean) => {
    setBusy(true);
    setError('');
    try {
      const images = both ? await exportBoth() : await exportImages();
      const files = await Promise.all(images.map(async ({ url, name }) => {
        const response = await fetch(url);
        return new File([await response.blob()], name, { type: 'image/png' });
      }));
      if (share && navigator.canShare?.({ files })) {
        await navigator.share({ files, title: `${roomName} summary` });
      } else {
        downloadImages(images);
      }
    } catch {
      setError('Could not create the summary image. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleCardKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setFlipped((value) => !value);
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
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="font-semibold">Your summary is waiting ✨</p>
            <p className="mt-2 text-sm text-muted-foreground">Add an expense first and your trip story will appear here.</p>
            <button className="btn-secondary mt-6 w-auto px-5" onClick={close}>Close</button>
          </div>
        ) : (
          <>
            <div ref={previewRef} className="flex min-h-0 w-full items-center justify-center overflow-hidden" style={{ height: Math.round(EXPORT_HEIGHT * scale) }}>
              <div
                className="relative shrink-0 cursor-pointer"
                style={{ width: EXPORT_WIDTH * scale, height: EXPORT_HEIGHT * scale, perspective: 1800 }}
                onClick={() => setFlipped((value) => !value)}
                onKeyDown={handleCardKey}
                role="button"
                tabIndex={0}
                aria-label={flipped ? 'Show summary highlights' : 'Show spending details'}
              >
                <div
                  className="absolute left-1/2 top-0 h-[1350px] w-[1080px] transition-transform duration-[600ms] ease-in-out [transform-style:preserve-3d] motion-reduce:transition-opacity motion-reduce:[transform:none]"
                  style={{ transform: `translateX(-50%) scale(${scale})${flipped ? ' rotateY(180deg)' : ''}`, transformOrigin: 'top center' }}
                >
                  {reducedMotion
                    ? <SummaryFace stats={stats} roomName={roomName} side={flipped ? 'back' : 'front'} />
                    : <>
                      <SummaryFace stats={stats} roomName={roomName} side="front" />
                      <SummaryFace stats={stats} roomName={roomName} side="back" />
                    </>}
                </div>
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">Tap card to flip</p>
            <div className="mt-2 flex justify-center">
              <button className="btn-secondary w-auto px-4 text-xs" onClick={() => setFlipped((value) => !value)}>Flip</button>
            </div>
            <label className="mt-3 flex min-h-[44px] items-center justify-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={bothSides} onChange={(event) => setBothSides(event.target.checked)} />
              Both sides
            </label>
            {error && <p role="alert" className="mt-2 text-center text-sm text-danger">{error}</p>}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <button className="btn-primary flex-1" disabled={busy} onClick={() => runExport(bothSides, true)}>{busy ? 'Preparing…' : 'Share'}</button>
              <button className="btn-secondary flex-1" disabled={busy} onClick={() => {
                void runExport(bothSides, false);
              }}>Download PNG</button>
            </div>
            <div ref={frontExportRef} className="pointer-events-none fixed left-[-99999px] top-0 h-[1350px] w-[1080px]"><SummaryFace stats={stats} roomName={roomName} side="front" exportMode /></div>
            <div ref={backExportRef} className="pointer-events-none fixed left-[-99999px] top-0 h-[1350px] w-[1080px]"><SummaryFace stats={stats} roomName={roomName} side="back" exportMode /></div>
          </>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return <>
    <button ref={triggerRef} className="btn-secondary w-auto px-3 text-xs" onClick={() => setOpen(true)}>Share summary</button>
    {dialog}
  </>;
}

function SummaryFace({ stats, roomName, side, exportMode = false }: { stats: SummaryStats; roomName: string; side: 'front' | 'back'; exportMode?: boolean }) {
  return (
    <div
      className={`absolute inset-0 h-[1350px] w-[1080px] overflow-hidden bg-[#0a0e17] p-[72px] text-slate-100 ${side === 'back' && !exportMode ? '[transform:rotateY(180deg)]' : ''} ${exportMode ? '' : '[backface-visibility:hidden]'}`}
      style={{ width: EXPORT_WIDTH, height: EXPORT_HEIGHT, backgroundImage: 'radial-gradient(circle at 15% 15%, rgba(45,212,191,.18), transparent 35%), radial-gradient(circle at 85% 75%, rgba(45,212,191,.12), transparent 35%)' }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(#2dd4bf 2px, transparent 2px)', backgroundSize: '44px 44px' }} />
      <div className="relative flex h-full flex-col">
        <p className="text-[30px] font-bold uppercase tracking-[.25em] text-teal-300">Split Room</p>
        <h3 className="mt-[48px] truncate text-[72px] font-black">{roomName}</h3>
        {side === 'front' ? <FrontContent stats={stats} /> : <BackContent stats={stats} />}
        <p className="mt-auto text-[24px] text-slate-500">Made with Split Room</p>
      </div>
    </div>
  );
}

function FrontContent({ stats }: { stats: SummaryStats }) {
  return <>
    <p className="mt-8 text-[28px] text-slate-400">{formatDateRange(stats)}</p>
    <p className="mt-16 text-[92px] font-black text-teal-300">{formatINR(stats.totalSpent)}</p>
    <div className="mt-14 grid grid-cols-2 gap-5">
      <Stat label="Members" value={String(stats.memberCount)} /><Stat label="Expenses" value={String(stats.expenseCount)} />
      <Stat label="Average / person" value={formatINR(stats.averagePerPerson)} /><Stat label="Top spender" value={stats.topSpender?.name ?? '-'} />
    </div>
    <div className="mt-14 rounded-[28px] border border-white/10 bg-white/5 p-6">
      <p className="text-[22px] uppercase tracking-wide text-slate-400">Biggest expense</p>
      <p className="mt-3 truncate text-[32px] font-bold">{stats.biggestExpense?.description ?? '-'}</p>
      <p className="mt-2 text-[30px] text-teal-300">{stats.biggestExpense ? formatINR(stats.biggestExpense.amount) : '-'}</p>
    </div>
  </>;
}

function BackContent({ stats }: { stats: SummaryStats }) {
  const visible = stats.paidTotals.filter((item) => item.amount > 0).slice(0, 6);
  const morePeople = Math.max(0, stats.paidTotals.filter((item) => item.amount > 0).length - visible.length);
  const max = visible[0]?.amount || 1;
  const transactions = stats.remainingTransactions.slice(0, 5);
  const moreTransactions = Math.max(0, stats.remainingTransactions.length - transactions.length);
  return <>
    <p className="mt-12 text-[38px] font-black">Spending by person</p>
    <div className="mt-8 space-y-5">{visible.map((person) => <div key={person.memberId}>
      <div className="flex justify-between gap-3 text-[27px]"><span className="truncate">{person.name}</span><span>{formatINR(person.amount)}</span></div>
      <div className="mt-2 h-4 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-teal-300" style={{ width: `${(person.amount / max) * 100}%` }} /></div>
    </div>)}</div>
    {morePeople > 0 && <p className="mt-3 text-[24px] text-slate-400">+{morePeople} more</p>}
    <p className="mt-12 text-[38px] font-black">Settle up</p>
    <div className="mt-5 space-y-3">{transactions.length ? transactions.map((item, index) => <p key={`${item.from}-${item.to}-${index}`} className="truncate text-[27px]">{item.from} pays {item.to} {formatINR(item.amount)}</p>) : <p className="text-[30px] text-teal-300">All settled 🎉</p>}</div>
    {moreTransactions > 0 && <p className="mt-3 text-[24px] text-slate-400">+{moreTransactions} more</p>}
  </>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[28px] border border-white/10 bg-white/5 p-6"><p className="text-[20px] uppercase tracking-wide text-slate-400">{label}</p><p className="mt-3 truncate text-[30px] font-bold">{value}</p></div>;
}

function formatDateRange(stats: SummaryStats) {
  if (!stats.dateRange) return 'No dates yet';
  const format = (date: string) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${format(stats.dateRange.first)} – ${format(stats.dateRange.last)}`;
}

function safeFileName(value: string) {
  return value.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'split-room-summary';
}
