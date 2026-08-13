import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Crollateral',
  description: 'Privacy policy for crollateral.finance',
};

export default function PrivacyPage() {
  const lastUpdated = 'August 2026';

  return (
    <div className="min-h-screen bg-cro-bg cro-glow">
      <header className="sticky top-0 z-50 border-b border-cro-border bg-cro-bg/80 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <h1 className="font-semibold text-cro-text">Privacy Policy</h1>
            <Link
              href="/"
              className="rounded-lg border border-cro-border bg-cro-card px-4 py-2 text-sm font-medium text-cro-muted transition-all hover:border-cro-cyan/50 hover:text-cro-text"
            >
              ← Back
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="rounded-2xl border border-cro-border bg-cro-card p-5 text-sm leading-relaxed text-cro-muted sm:p-8">
          <p className="text-xs text-cro-muted">Last updated: {lastUpdated}</p>
          <p className="mt-4">
            Crollateral is designed as a read-only DeFi risk dashboard. This policy explains what information may be processed when you use crollateral.finance.
          </p>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold text-cro-text">1. Information You Provide</h2>
            <p>
              Crollateral does not ask you to create an account, submit personal profile information, or provide private keys. If you connect a wallet, your public wallet address is used to display publicly available position and market information.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold text-cro-text">2. Public Blockchain Data</h2>
            <p>
              Wallet addresses, balances, open positions, transactions, and liquidation-related data on public blockchains are public by design. Crollateral may request and display that information so you can review risk in a simpler interface.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold text-cro-text">3. Usage and Performance Data</h2>
            <p>
              The site may use privacy-conscious analytics and hosting logs to understand page performance, reliability, and general usage. These tools may process technical information such as browser type, device type, approximate location, pages visited, referrer, and timestamps.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold text-cro-text">4. Third-Party Services</h2>
            <p>
              Crollateral relies on categories of third-party services such as wallet connection providers, blockchain RPC providers, analytics, cloud hosting, and protocol data sources. These services may process requests needed to deliver the dashboard.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold text-cro-text">5. Wallet Safety</h2>
            <p>
              Crollateral is read-only. The site should not ask you to sign transactions or approve token spending. If you ever see a transaction or approval request claiming to be from Crollateral, do not approve it and verify the URL immediately.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold text-cro-text">6. Data Retention</h2>
            <p>
              Public blockchain data remains available on-chain regardless of Crollateral. Hosting and analytics providers may retain operational logs according to their own retention practices. Crollateral does not provide user accounts or account-deletion workflows at this time.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold text-cro-text">7. Changes</h2>
            <p>
              This policy may be updated as the product evolves. Continued use of the site after updates means you accept the revised policy.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold text-cro-text">8. Contact</h2>
            <p>
              For privacy or safety concerns, use the public project/community contact path where Crollateral is shared. Do not send private keys, seed phrases, or sensitive wallet credentials.
            </p>
          </section>

          <div className="mt-8 border-t border-cro-border pt-4">
            <Link href="/" className="text-sm text-cro-cyan hover:underline">
              ← Return to Crollateral
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
