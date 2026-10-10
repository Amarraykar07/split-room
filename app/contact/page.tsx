import ContactForm from '@/components/ContactForm';

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <div className="card">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Contact</p>
        <h1 className="mt-2 text-3xl font-bold">We&apos;d love to hear from you</h1>
        <p className="mt-3 text-muted-foreground">
          Have a question, suggestion, or issue with a room? Send us a message and we&apos;ll get back to you.
        </p>
        <ContactForm />
      </div>
    </main>
  );
}
