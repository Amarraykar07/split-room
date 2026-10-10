'use client';

import { useState } from 'react';
import type { Member } from '@/types';
import type { FullExpense } from './RoomClient';
import { supabase } from '@/lib/supabase';
import { formatINR } from '@/lib/utils';
import { roundPaise } from '@/lib/settle';
import { computeSplits } from '@/lib/split';
import type { SplitType } from '@/types';
import { Check, FileText, Plus, Trash2 } from 'lucide-react';

interface Props {
  expenses: FullExpense[];
  members: Member[];
  roomId: string;
  myMemberId: string | null;
}

export default function ExpensesPanel({ expenses, members, roomId, myMemberId }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(myMemberId ?? '');
  const [splitBetween, setSplitBetween] = useState<string[]>(members.map((m) => m.id));
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Update paidBy default when myMemberId changes
  const effectivePaidBy = paidBy || myMemberId || (members[0]?.id ?? '');

  const openForm = () => {
    setSplitBetween(members.map((m) => m.id));
    setPaidBy(myMemberId ?? members[0]?.id ?? '');
    setSplitType('equal');
    setSplitValues({});
    setShowForm(true);
  };

  const toggleSplit = (id: string) => {
    setSplitBetween((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!description.trim() || isNaN(numAmount) || numAmount <= 0) {
      setError('Please fill all fields with valid values');
      return;
    }
    if (!effectivePaidBy) {
      setError('Please select who paid');
      return;
    }
    if (splitBetween.length === 0) { setError('Select at least one person to split between'); return; }

    setAdding(true);
    setError('');

    try {
      const totalPaise = Math.round(numAmount * 100);
      const computed = computeSplits(totalPaise, splitType, splitBetween.map((memberId) => ({
        memberId,
        value: splitType === 'exact'
          ? Math.round(parseFloat(splitValues[memberId] || '0') * 100)
          : splitType === 'equal' ? undefined : parseFloat(splitValues[memberId] || '0'),
      })));

      const { data: expense, error: expErr } = await supabase
        .from('expenses')
        .insert({
          room_id: roomId,
          description: description.trim(),
          amount: totalPaise / 100,
          paid_by: effectivePaidBy,
          split_type: splitType,
        })
        .select()
        .single();

      if (expErr) throw expErr;

      const { error: splitErr } = await supabase.from('expense_splits').insert(
        computed.map((s) => ({
          expense_id: expense.id,
          member_id: s.memberId,
          share: s.sharePaise / 100,
          split_value: s.splitValue,
        }))
      );

      if (splitErr) throw splitErr;

      setDescription('');
      setAmount('');
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    setDeletingId(id);
    await supabase.from('expenses').delete().eq('id', id);
    setDeletingId(null);
  };

  const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const splitError = (() => {
    if (!amount || splitBetween.length === 0) return null;
    try {
      computeSplits(Math.round(parseFloat(amount) * 100), splitType, splitBetween.map((memberId) => ({
        memberId,
        value: splitType === 'exact'
          ? Math.round(parseFloat(splitValues[memberId] || '0') * 100)
          : splitType === 'equal' ? undefined : parseFloat(splitValues[memberId] || '0'),
      })));
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Enter valid split values';
    }
  })();

  return (
    <section>
      {/* Summary bar */}
      {expenses.length > 0 && (
        <div className="card mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total spent</p>
            <p className="text-xl font-bold">{formatINR(totalAmount)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="text-xl font-bold">{expenses.length}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <FileText size={18} className="text-accent" /> Expenses
        </h2>
        {members.length > 0 && (
          <button
            onClick={openForm}
            className="btn-primary w-auto px-4"
          >
            <Plus size={16} /> Add expense
          </button>
        )}
      </div>

      {/* Add expense form */}
      {showForm && (
        <div className="card mb-4">
          <form onSubmit={handleAdd} className="space-y-4">
            <h3 className="font-bold">Add expense</h3>

            <div>
              <label className="label">Description *</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Dinner at Swiggy"
                className="input"
                maxLength={80}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Amount (₹) *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="input"
                min="0.01"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="label">Paid by</label>
              <select
                value={effectivePaidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="input"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Split between</label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium ${
                      splitBetween.includes(m.id)
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border bg-surface text-muted-foreground'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={splitBetween.includes(m.id)}
                      onChange={() => toggleSplit(m.id)}
                      className="sr-only"
                    />
                    <span>{splitBetween.includes(m.id) ? <Check size={14} /> : null}</span>
                    {m.name}
                  </label>
                ))}
              </div>
              <div className="mt-3 flex rounded-xl border border-border p-1" role="tablist" aria-label="Split type">
                {([
                  ['equal', 'Equal'], ['exact', 'Exact'], ['percentage', '%'], ['shares', 'Shares'],
                ] as const).map(([value, label]) => (
                  <button type="button" key={value} onClick={() => setSplitType(value)}
                    className={`min-h-[44px] flex-1 rounded-lg px-2 text-xs font-bold ${splitType === value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {splitType !== 'equal' && (
                <div className="mt-3 space-y-2">
                  {splitBetween.map((id) => {
                    const member = members.find((m) => m.id === id);
                    return <label key={id} className="flex items-center gap-2 text-sm">
                      <span className="min-w-20 truncate">{member?.name}</span>
                      <input className="input" type="number" min={splitType === 'shares' ? 1 : 0}
                        step={splitType === 'shares' ? 1 : '0.01'} value={splitValues[id] ?? ''}
                        onChange={(e) => setSplitValues((prev) => ({ ...prev, [id]: e.target.value }))}
                        placeholder={splitType === 'percentage' ? '0%' : splitType === 'shares' ? '1' : '₹0.00'} />
                    </label>;
                  })}
                </div>
              )}
              {splitBetween.length > 0 && amount && splitType === 'equal' && (
                <p className="mt-2 text-xs text-muted-foreground">
                  ≈ {formatINR(roundPaise(parseFloat(amount || '0') / splitBetween.length))} per person
                </p>
              )}
              {splitType !== 'equal' && amount && (
                <p className={`mt-2 text-xs ${splitError ? 'text-danger' : 'text-success'}`}>
                  {splitError ?? (splitType === 'percentage' ? 'Percentages add up to 100%' : 'Split is valid')}
                </p>
              )}
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex gap-3">
              <button type="submit" className="btn-primary flex-1" disabled={adding || Boolean(splitError) || !amount || splitBetween.length === 0}>
                {adding ? 'Adding...' : 'Add Expense'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expenses list */}
      {expenses.length === 0 && !showForm && (
        <div className="card text-center py-10">
          <FileText className="mx-auto mb-3 text-accent" size={32} />
          <p className="font-medium text-muted-foreground">No expenses yet</p>
          {members.length === 0 && (
            <p className="mt-1 text-sm text-muted-foreground">Add members first to track expenses</p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {expenses.map((exp) => (
          <div key={exp.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold">
                  {exp.description}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Paid by <span className="font-medium text-foreground">{exp.paid_by_member?.name}</span>
                </p>
                <span className="mt-2 inline-flex rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-bold uppercase text-accent">
                  {exp.split_type === 'percentage' ? '%' : exp.split_type}
                </span>
                <div className="flex flex-wrap gap-1 mt-2">
                  {exp.splits?.map((s) => (
                    <span
                      key={s.id}
                      className="rounded-full border border-border bg-surface-strong px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {s.member?.name}: {formatINR(Number(s.share))}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold">
                  {formatINR(Number(exp.amount))}
                </p>
                <button
                  onClick={() => handleDelete(exp.id)}
                  disabled={deletingId === exp.id}
                  className="btn-danger mt-1 px-2 text-xs"
                  title="Delete expense"
                >
                  {deletingId === exp.id ? '...' : <><Trash2 size={14} /> Delete</>}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
