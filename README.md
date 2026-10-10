# Split Room 🇮🇳

**Free, no-login expense splitting app for friends, trips and flatmates — made for India with UPI support.**

🔗 Live demo: [splitroom.in](https://splitroom.in) _(deploy your own below)_

---

## Features

- 🚀 **No login** — share a link, everyone joins instantly
- 💸 **Add & split expenses** — equal split with INR amounts
- 📊 **Smart settlements** — minimum transactions to settle all debts
- 📱 **Pay via UPI** — deep links + QR codes for PhonePe, GPay, Paytm
- ⚡ **Realtime** — live updates across all devices via Supabase
- 💬 **WhatsApp share** — one-tap room sharing

---

## Quick Setup (5 minutes)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd split-room
npm install
```

### 2. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free tier is fine)
2. Click **New Project**, give it a name, pick a region close to India (e.g., Singapore)
3. Wait for the project to provision (~1 minute)

### 3. Run the Database Schema

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy & paste the contents of [`supabase/schema.sql`](./supabase/schema.sql)
4. Click **Run** ✅

This creates all tables, indexes, RLS policies, and enables Realtime.

### 4. Get Your API Keys

1. In Supabase dashboard, go to **Settings → API**
2. Copy:
   - **Project URL** (e.g., `https://abcdef.supabase.co`)
   - **anon / public** key (long JWT string)

### 5. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 6. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

### 7. Run Tests

```bash
npm test
```

Tests cover the settlement algorithm (`lib/settle.test.ts`) including paise rounding edge cases.

---

## Deploy to Vercel

### Option A: Vercel CLI (fastest)

```bash
npm install -g vercel
vercel
```

When prompted, add the environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Option B: Vercel Dashboard

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import your GitHub repo
4. In **Environment Variables**, add both keys from step 4 above
5. Click **Deploy** ✅

---

## Project Structure

```
split-room/
├── app/
│   ├── layout.tsx          # Root layout with SEO metadata
│   ├── page.tsx            # Landing page (SSR)
│   └── room/[code]/
│       ├── page.tsx        # Room page (SSR + SSG)
│       └── not-found.tsx   # Friendly 404
├── components/
│   ├── CreateRoomForm.tsx  # Create room form
│   ├── JoinRoomForm.tsx    # Join room by code
│   ├── ShareButton.tsx     # Share via copy/WhatsApp/native
│   ├── AdSlot.tsx          # AdSense placeholder
│   └── room/
│       ├── RoomClient.tsx  # Main room client shell + realtime
│       ├── MembersPanel.tsx
│       ├── ExpensesPanel.tsx
│       └── SettlementPanel.tsx
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── settle.ts           # Settlement algorithm (pure function)
│   ├── settle.test.ts      # Unit tests
│   └── utils.ts            # Room code gen, INR format, UPI utils
├── types/
│   └── index.ts            # TypeScript types for all DB tables
├── supabase/
│   └── schema.sql          # Database schema
└── ...config files
```

---

## Adding Google AdSense

The app has an `<AdSlot />` component in `components/AdSlot.tsx`. To add real ads:

1. Get approved for [Google AdSense](https://adsense.google.com)
2. Replace the inner content of `AdSlot.tsx` with your AdSense snippet
3. Add your AdSense script to `app/layout.tsx`

---

## Security Notes

> ⚠️ **MVP Security**: Rooms are protected only by their unguessable 8-character code. RLS policies allow all anon operations. This is intentional for a no-login MVP.

For production hardening:
- Add owner-based auth (Supabase Auth with magic links)
- Rate-limit room creation
- Add room expiry (delete after 30 days)

---

## Tech Stack

| Tech | Purpose |
|------|---------|
| Next.js 15 (App Router) | Framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Supabase | Database + Realtime |
| qrcode.react | UPI QR codes |
| Jest + ts-jest | Unit testing |
| Vercel | Hosting |

---

## License

MIT — free to use and modify.
