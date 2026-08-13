import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Analytics } from '@vercel/analytics/react';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Crollateral — Cronos DeFi Risk Dashboard',
  description: 'Monitor Cronos DeFi risk across lending and perps. Review health factor, liquidation exposure, borrowing power, and planning scenarios before making decisions.',
  metadataBase: new URL('https://www.crollateral.finance'),
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    url: 'https://crollateral.finance',
    title: 'Crollateral — Cronos DeFi Risk Dashboard',
    description: 'Monitor Cronos DeFi risk across lending and perps. Review health factor, liquidation exposure, borrowing power, and planning scenarios before making decisions.',
    siteName: 'Crollateral',
    images: [{ url: 'https://crollateral.finance/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crollateral — Cronos DeFi Risk Dashboard',
    description: 'Monitor Cronos DeFi risk across lending and perps. Review health factor, liquidation exposure, borrowing power, and planning scenarios before making decisions.',
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
