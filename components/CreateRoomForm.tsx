'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { generateRoomCode } from '@/lib/utils';

export default function CreateRoomForm() {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const code = generateRoomCode();
      const { error: dbError } = await supabase.from('rooms').insert({
        code,
        name: roomName.trim(),
      });

      if (dbError) throw dbError;
      router.push(`/room/${code}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create room';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCreate} className="space-y-3">
      <div>
        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="e.g. Goa Trip 2024, Flat Expenses"
          className="input"
          maxLength={60}
          disabled={loading}
          autoFocus
        />
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Creating...' : 'Create Room'}
      </button>
    </form>
  );
}
