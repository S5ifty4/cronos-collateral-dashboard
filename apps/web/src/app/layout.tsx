import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Analytics } from '@vercel/analytics/react';

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
    images: [{ url: 'https://crollateral.finance/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crollateral — Cronos Collateral Dashboard',
    description: 'Monitor your Tectonic Finance positions on Cronos. Check health factor, liquidation price, borrowing power, and simulate scenarios — before you get rekt.',
    images: ['https://crollateral.finance/og-image.png'],
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
        <Analytics />
      </body>
    </html>
  );
}
