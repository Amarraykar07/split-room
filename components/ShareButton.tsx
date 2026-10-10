'use client';

import { useState } from 'react';
import { buildWhatsAppUrl } from '@/lib/utils';
import { Check, Copy, MoreHorizontal, Send, Share2 } from 'lucide-react';
import RoomCode from './RoomCode';

interface Props {
  roomCode: string;
  roomName: string;
}

export default function ShareButton({ roomCode, roomName }: Props) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const roomUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/room/${roomCode}`
      : `https://splitroom.in/room/${roomCode}`;

  const shareText = `Join me on Split Room to split expenses!\n\nRoom: ${roomName}\nCode: ${roomCode}\nLink: ${roomUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
    setShowMenu(false);
  };

  const handleNativeShare = async () => {
    if ('share' in navigator) {
      try {
        await navigator.share({
          title: `Split Room: ${roomName}`,
          text: shareText,
          url: roomUrl,
        });
      } catch {
        // user cancelled
      }
    }
    setShowMenu(false);
  };

  const whatsappUrl = buildWhatsAppUrl(shareText);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="btn-secondary px-3"
      >
        <Share2 size={16} /> Share
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          {/* Menu */}
          <div className="card absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden p-0">
            <button
              onClick={handleCopy}
              className="flex min-h-[44px] w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-surface-strong"
            >
              {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowMenu(false)}
              className="flex min-h-[44px] w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-surface-strong"
            >
              <Send size={16} /> Share on WhatsApp
            </a>
            {typeof window !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="flex min-h-[44px] w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-surface-strong"
              >
                <MoreHorizontal size={16} /> More options
              </button>
            )}
            <div className="flex items-center justify-between border-t border-border px-4 py-2">
              <RoomCode code={roomCode} className="font-mono text-xs text-muted-foreground" />
              {copied && <span className="text-xs text-success">Copied</span>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
