import Link from 'next/link';

export default function RoomNotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-4">😕</div>
      <h1 className="mb-2 text-2xl font-bold text-foreground">
        Room Not Found
      </h1>
      <p className="mb-8 max-w-sm text-muted-foreground">
        This room code doesn't exist or the link may be wrong. Double-check the code and try again.
      </p>
      <Link href="/" className="btn-primary">
        ← Go Home
      </Link>
    </main>
  );
}
