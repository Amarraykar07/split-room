'use client';

import { useState } from 'react';
import type { Member } from '@/types';
import { supabase } from '@/lib/supabase';
import { CreditCard, Plus, Users, X } from 'lucide-react';

interface Props {
  members: Member[];
  roomId: string;
  myMemberId: string | null;
  onSelectMe: (id: string) => void;
}

export default function MembersPanel({ members, roomId, myMemberId, onSelectMe }: Props) {
  const [name, setName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setError('');

    try {
      const { data, error: dbError } = await supabase
        .from('members')
        .insert({
          room_id: roomId,
          name: name.trim(),
          upi_id: upiId.trim() || null,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Auto-select as "me" if first member or none selected
      if (!myMemberId && data) {
        onSelectMe(data.id);
      }

      setName('');
      setUpiId('');
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Users size={18} className="text-accent" /> Members ({members.length})
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
        >
          {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add</>}
        </button>
      </div>

      {/* Members list */}
      <div className="flex flex-wrap gap-2 mb-3">
        {members.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">No members yet. Add the first one!</p>
        )}
        {members.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelectMe(m.id)}
            title={myMemberId === m.id ? "That's you!" : `Set as me: ${m.name}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all
              ${
                myMemberId === m.id
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'border border-border bg-surface-strong text-foreground hover:bg-surface'
              }`}
          >
            <span>{m.name}</span>
            {myMemberId === m.id && <span className="text-xs">✓ Me</span>}
            {m.upi_id && <CreditCard size={14} className="opacity-60" aria-label="Has UPI ID" />}
          </button>
        ))}
      </div>

      {myMemberId && (
        <p className="mb-3 text-xs text-muted-foreground">
          Tap a name to set it as &quot;me&quot;
        </p>
      )}

      {/* Add member form */}
      {showForm && (
        <form onSubmit={handleAdd} className="space-y-3 border-t border-border pt-4">
          <div>
            <label className="label">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul"
              className="input"
              maxLength={40}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">UPI ID (optional, for receiving payments)</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. rahul@upi"
              className="input"
              maxLength={60}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={adding}>
            {adding ? 'Adding...' : 'Add Member'}
          </button>
        </form>
      )}
    </section>
  );
}
