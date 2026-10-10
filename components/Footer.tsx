import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="glass mt-auto rounded-none border-x-0 border-b-0">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="Split Room logo" width={32} height={32} />
          <div>
            <p className="font-semibold">Split Room</p>
            <p className="text-muted-foreground">Simple expense splitting for everyone.</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground" aria-label="Footer navigation">
          <Link href="/">Home</Link>
          <Link href="/contact">Contact Us</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
        <p className="text-muted-foreground">© {new Date().getFullYear()} Split Room. Made in India 🇮🇳</p>
      </div>
    </footer>
  );
}
