'use client';

import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  code: string;
  className?: string;
}

export default function RoomCode({ code, className = '' }: Props) {
  const storageKey = `splitroom_code_visible_${code}`;
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(storageKey) === 'true');
    } catch {
      setVisible(false);
    }
  }, [storageKey]);

  const toggle = () => {
    const next = !visible;
    setVisible(next);
    try {
      window.localStorage.setItem(storageKey, String(next));
    } catch {
      // Visibility still works when storage is unavailable.
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span aria-hidden="true">{visible ? code : '••••••••'}</span>
      <button
        type="button"
        className="icon-button icon-button-small"
        onClick={copyCode}
        aria-label="Copy room code"
        title="Copy room code"
      >
        {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
      </button>
      <button
        type="button"
        className="icon-button icon-button-small"
        onClick={toggle}
        aria-label={visible ? 'Hide code' : 'Show code'}
        title={visible ? 'Hide code' : 'Show code'}
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
      {copied && <span className="text-xs text-success" role="status">Copied</span>}
    </span>
  );
}
