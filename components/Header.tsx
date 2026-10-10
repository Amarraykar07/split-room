'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="glass sticky top-0 z-40 rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex min-h-[44px] items-center gap-2 font-bold tracking-tight">
          <Image src="/logo.svg" alt="Split Room logo" width={32} height={32} priority />
          <span>Split Room</span>
        </Link>

        <nav className="hidden items-center gap-2 sm:flex" aria-label="Main navigation">
          <Link className="nav-link" href="/">Home</Link>
          <Link className="nav-link" href="/contact">Contact</Link>
          <ThemeToggle />
        </nav>

        <div className="flex items-center gap-2 sm:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="icon-button glass"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="glass mx-4 mb-3 flex flex-col gap-1 p-2 sm:hidden" aria-label="Mobile navigation">
          <Link className="nav-link" href="/" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link className="nav-link" href="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
        </nav>
      )}
    </header>
  );
}
