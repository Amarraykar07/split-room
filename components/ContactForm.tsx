'use client';

import { useState } from 'react';

const emailAddress = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@example.com';
const whatsapp = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP;
const instagram = process.env.NEXT_PUBLIC_CONTACT_INSTAGRAM;

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim();
    const message = String(form.get('message') || '').trim();

    if (!name || name.length > 80 || !email || email.length > 160 || message.length < 1 || message.length > 2000) {
      setError('Please complete all fields within the allowed length.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    // This mailto flow can later be replaced by a Supabase table or an email service.
    window.location.href = `mailto:${encodeURIComponent(emailAddress)}?subject=${encodeURIComponent(`Split Room contact from ${name}`)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)}`;
    setError('');
    setSubmitted(true);
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          Email: <a className="text-accent underline" href={`mailto:${emailAddress}`}>{emailAddress}</a>
        </p>
        <div className="flex flex-wrap gap-4">
          {whatsapp && <a className="text-accent underline" href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>}
          {instagram && <a className="text-accent underline" href={instagram} target="_blank" rel="noreferrer">Instagram</a>}
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="contact-name">Name</label>
          <input id="contact-name" name="name" className="input" maxLength={80} required />
        </div>
        <div>
          <label className="label" htmlFor="contact-email">Email</label>
          <input id="contact-email" name="email" type="email" className="input" maxLength={160} required />
        </div>
        <div>
          <label className="label" htmlFor="contact-message">Message</label>
          <textarea id="contact-message" name="message" className="input min-h-32" maxLength={2000} required />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        {submitted && <p className="text-sm text-success">Your email draft is ready. Thanks for reaching out!</p>}
        <button className="btn-primary" type="submit">Open email</button>
      </form>
    </div>
  );
}
