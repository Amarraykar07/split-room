import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Background from '@/components/Background';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const viewport: Viewport = {
  themeColor: '#0a0e17',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'Split Room — Free Expense Splitter for Friends & Trips | India',
    template: '%s | Split Room',
  },
  description:
    'Split Room is a free, no-login expense splitting app for friends, trips and flatmates in India. Supports UPI payments. Try our trip expense calculator now!',
  keywords: [
    'expense splitter India',
    'split bill with friends India',
    'trip expense calculator',
    'UPI expense split',
    'flatmate expense tracker',
    'group expense app India',
    'split room',
  ],
  authors: [{ name: 'Split Room' }],
  metadataBase: new URL('https://splitroom.in'),
  openGraph: {
    title: 'Split Room — Free Expense Splitter for Friends & Trips',
    description:
      'No login needed. Split bills instantly with UPI. Perfect for trips, flatmates and group outings.',
    url: 'https://splitroom.in',
    siteName: 'Split Room',
    locale: 'en_IN',
    type: 'website',
    images: [{ url: '/logo.svg', width: 64, height: 64, alt: 'Split Room logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Split Room — Free Expense Splitter',
    description: 'No login. Split bills instantly with UPI.',
    images: ['/logo.svg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem('splitroom_theme')==='light'?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
      </head>
      <body className={`${inter.variable} flex min-h-screen flex-col bg-background text-foreground`}>
        <ThemeProvider>
          <Background />
          <Header />
          <div className="relative z-10 flex flex-1 flex-col">{children}</div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
