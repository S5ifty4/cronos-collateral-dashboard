import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Use — Crollateral',
  description: 'Terms of use and risk disclosures for crollateral.finance',
};

export default function TermsPage() {
  const lastUpdated = 'August 2026';

  return (
    <div className="min-h-screen bg-cro-bg cro-glow">
      <header className="sticky top-0 z-50 border-b border-cro-border bg-cro-bg/80 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <h1 className="font-semibold text-cro-text">Terms of Use</h1>
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
            These terms govern use of crollateral.finance. Crollateral is a read-only, independent risk dashboard for Cronos DeFi users.
          </p>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold text-cro-text">1. No Financial Advice</h2>
            <p>
              Nothing on Crollateral is financial, investment, legal, tax, or trading advice. Position summaries, health factors, liquidation prices, market-risk buckets, and simulations are informational estimates only.
            </p>
            <p>
              You are responsible for your own decisions. Always verify directly on the source platform before trading, borrowing, repaying, adding collateral, withdrawing collateral, or changing any position.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold text-cro-text">2. Data Accuracy and Availability</h2>
            <p>
              Crollateral displays information derived from public blockchain data, protocol interfaces, price feeds, and market data sources. Data may be delayed, incomplete, unavailable, or different from the exact values used by a protocol at execution or liquidation time.
            </p>
            <p>
              Estimates for lending risk and perps risk use different concepts. Lending views may show debt at risk, while perps views may show notional exposure, collateral, profit or loss, and liquidation buffers.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold text-cro-text">3. Read-Only Wallet Use</h2>
            <p>
              Connecting a wallet lets Crollateral read public position data for that wallet. Crollateral does not custody funds, submit transactions, request token approvals, or request wallet signing.
            </p>
            <p>
              If you see a transaction, approval, permit, or signature request that claims to be from Crollateral, do not approve it and verify the URL immediately.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold text-cro-text">4. DeFi and Smart-Contract Risk</h2>
            <p>
              DeFi protocols, wallets, bridges, price feeds, or blockchain networks can fail or behave unexpectedly. Prices can move quickly, positions can be liquidated, and transactions on public blockchains are generally irreversible.
            </p>
            <p>
              Crollateral cannot prevent losses, liquidations, failed trades, downtime, incorrect pricing, or protocol-specific execution outcomes.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold text-cro-text">5. No Affiliation or Endorsement</h2>
            <p>
              Crollateral is independent and community-built. It is not affiliated with, endorsed by, sponsored by, or operated by Tectonic Finance, Fulcrom Finance, Moonlander, Crypto.com, Cronos Labs, or any other protocol or organization referenced on the site. All names, logos, and trademarks belong to their respective owners.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold text-cro-text">6. Third-Party Platforms</h2>
            <p>
              Source platforms control their own contracts, interfaces, fees, liquidation rules, maintenance windows, and terms. Crollateral does not control those platforms and is not responsible for their availability, accuracy, execution, or decisions.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold text-cro-text">7. No Warranties and Limitation of Liability</h2>
            <p>
              Crollateral is provided “as is” and “as available,” without warranties of any kind. To the fullest extent permitted by law, the creators and operators of Crollateral are not liable for losses, damages, liquidations, missed opportunities, data errors, outages, or claims arising from use of the site.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold text-cro-text">8. Privacy</h2>
            <p>
              Use of Crollateral is also subject to the <Link href="/privacy" className="text-cro-cyan hover:underline">Privacy Policy</Link>.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold text-cro-text">9. Changes to These Terms</h2>
            <p>
              These terms may be updated as the product evolves. Continued use of the site after updates means you accept the revised terms.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold text-cro-text">10. Reference Materials</h2>
            <p>
              Protocol documentation can be useful context, but it may change over time. Start with the official docs for <a href="https://tectonic.gitbook.io/docs" target="_blank" rel="noreferrer" className="text-cro-cyan hover:underline">Tectonic</a>, <a href="https://docs.fulcrom.finance/fulcrom-finance" target="_blank" rel="noreferrer" className="text-cro-cyan hover:underline">Fulcrom</a>, and <a href="https://docs.moonlander.trade" target="_blank" rel="noreferrer" className="text-cro-cyan hover:underline">Moonlander</a> when checking platform-specific mechanics.
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
