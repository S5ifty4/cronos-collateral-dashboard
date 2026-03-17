import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Crollateral — Cronos Collateral Dashboard',
  description: 'Monitor your Tectonic Finance positions on Cronos. Check health factor, liquidation price, borrowing power, and simulate scenarios — before you get rekt.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    url: 'https://crollateral.finance',
    title: 'Crollateral — Cronos Collateral Dashboard',
    description: 'Monitor your Tectonic Finance positions on Cronos. Check health factor, liquidation price, borrowing power, and simulate scenarios — before you get rekt.',
    siteName: 'Crollateral',
  },
  twitter: {
    card: 'summary',
    title: 'Crollateral — Cronos Collateral Dashboard',
    description: 'Monitor your Tectonic Finance positions on Cronos. Check health factor, liquidation price, borrowing power, and simulate scenarios — before you get rekt.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
