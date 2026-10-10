'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinRoomForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 6) {
      setError('Enter the room code from your friend');
      return;
    }
    router.push(`/room/${trimmed}`);
  };

  return (
    <form onSubmit={handleJoin} className="space-y-3">
      <div>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter room code (e.g. ABCD1234)"
          className="input uppercase tracking-widest font-mono"
          maxLength={8}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
        />
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>
      <button type="submit" className="btn-secondary w-full">
        Join Room
      </button>
    </form>
  );
}
