import type { Metadata } from 'next';
import {
  ArrowRight,
  Calculator,
  Check,
  ChevronDown,
  CircleDollarSign,
  Link2,
  LockKeyhole,
  MessageCircleQuestion,
  Smartphone,
  Sparkles,
  Users,
  WalletCards,
  Zap,
} from 'lucide-react';
import CreateRoomForm from '@/components/CreateRoomForm';
import JoinRoomForm from '@/components/JoinRoomForm';

export const metadata: Metadata = {
  title: 'Split Room — Free Expense Splitter for Friends & Trips | India',
  description:
    'Free no-login expense splitting app for friends, trips and flatmates in India. UPI support. Try our trip expense calculator!',
};

const steps = [
  { icon: LockKeyhole, title: 'Create a room', desc: 'Name your room and share the link with your group.' },
  { icon: WalletCards, title: 'Add expenses', desc: 'Track who paid and who owes what, with no login needed.' },
  { icon: Smartphone, title: 'Settle via UPI', desc: 'See exactly who owes whom and pay with one tap.' },
];

const features = [
  { icon: LockKeyhole, title: 'No login', desc: 'Zero accounts, zero passwords' },
  { icon: Zap, title: 'Realtime', desc: 'Live updates for everyone' },
  { icon: Smartphone, title: 'UPI ready', desc: 'Pay with any UPI app' },
  { icon: Link2, title: 'Share link', desc: 'WhatsApp-ready room link' },
  { icon: Calculator, title: 'Smart settle', desc: 'Minimum transactions' },
  { icon: CircleDollarSign, title: 'Free', desc: 'Always free, no limits' },
];

const faqs = [
  ['Is Split Room really free?', 'Yes! Split Room is completely free to use. No hidden charges, no premium plans.'],
  ['Do I need to create an account?', 'No! Just create a room, share the link, and start splitting.'],
  ['How does the trip expense calculator work?', 'Add expenses with who paid. Our smart algorithm calculates the minimum payments needed to settle everyone.'],
  ['Can I split bills with friends who are not tech-savvy?', 'Absolutely! Share the room link and anyone can join from any phone browser.'],
  ['How do I pay via UPI?', 'If your friend adds a UPI ID, you will see a Pay button and QR code to open any UPI app.'],
  ['Is my data safe?', 'Rooms use unguessable 8-character codes and no personal data is collected.'],
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      <section className="px-4 pb-16 pt-16 sm:pt-24">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-accent">
              <Sparkles size={16} /> Made for India · UPI ready
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">Split Room</h1>
            <p className="mt-4 text-xl font-semibold text-accent sm:text-2xl">Split expenses instantly</p>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
              No login. No drama. Just split bills with friends, flatmates and travel buddies.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
            <div className="card">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-bold"><Users size={20} className="text-accent" /> Create a room</h2>
              <CreateRoomForm />
            </div>
            <div className="card">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-bold"><Link2 size={20} className="text-accent" /> Join a room</h2>
              <JoinRoomForm />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">Simple by design</p>
            <h2 className="mt-2 text-3xl font-bold">How it works</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card">
                <Icon className="mb-5 text-accent" size={24} />
                <h3 className="font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">Everything you need</p>
            <h2 className="mt-2 text-3xl font-bold">Why Split Room?</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card">
                <Icon className="mb-4 text-accent" size={22} />
                <div className="text-sm font-bold">{title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <MessageCircleQuestion className="mx-auto text-accent" size={28} />
            <h2 className="mt-3 text-3xl font-bold">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map(([question, answer]) => (
              <details key={question} className="card group">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                  {question}
                  <ChevronDown className="text-muted-foreground transition-transform group-open:rotate-180" size={18} />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
