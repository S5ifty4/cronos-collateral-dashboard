import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Use — Crollateral',
  description: 'Terms of use and disclaimers for crollateral.finance',
};

export default function TermsPage() {
  const lastUpdated = 'March 2026';

  return (
    <div className="min-h-screen bg-cro-bg">
      {/* Header */}
      <header className="border-b border-cro-border bg-cro-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="font-bold text-cro-text">Terms of Use</h1>
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-cro-muted bg-cro-card border border-cro-border rounded-lg hover:text-cro-text hover:border-cro-cyan/50 transition-all"
            >
              ← Back
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8 text-cro-muted text-sm leading-relaxed">

          <p className="text-xs text-cro-muted">Last updated: {lastUpdated}</p>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-cro-text">1. No Financial Advice</h2>
            <p>
              Nothing on crollateral.finance constitutes financial, investment, or trading advice of any kind.
              All content — including health factor calculations, liquidation price estimates, borrowing power
              simulations, and price projections — is provided for informational and educational purposes only.
            </p>
            <p>
              You should not make any financial decision based solely on the information displayed on this site.
              Always do your own research (DYOR) and consult qualified financial or legal professionals before
              taking any action with your assets.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-cro-text">2. No Warranties — Accuracy of Data</h2>
            <p>
              Crollateral pulls price data and portfolio information from third-party sources, including
              on-chain smart contract reads and external price APIs. This data may be delayed, incomplete,
              or inaccurate. We make no representations or warranties — express or implied — about the
              accuracy, completeness, timeliness, or reliability of any information displayed.
            </p>
            <p>
              Displayed prices may not reflect the real-time oracle prices used by Tectonic Finance for
              liquidation decisions. <strong className="text-cro-text">Always verify your positions directly
              on Tectonic Finance before taking any action.</strong>
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-cro-text">3. No Liability</h2>
            <p>
              To the fullest extent permitted by applicable law, the creators and operators of crollateral.finance
              shall not be liable for any losses, damages, or claims of any kind arising from your use of —
              or reliance on — this tool. This includes but is not limited to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Liquidation of your DeFi positions</li>
              <li>Financial losses resulting from decisions made using this tool</li>
              <li>Errors or inaccuracies in calculations, prices, or displayed data</li>
              <li>Downtime, outages, or unavailability of the service</li>
              <li>Third-party API failures or stale data</li>
            </ul>
            <p>
              Use of this site is entirely at your own risk.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-cro-text">4. Read-Only Tool — Wallet Safety</h2>
            <p>
              Crollateral is a read-only dashboard. Connecting your wallet allows the site to read your
              on-chain portfolio data (collateral positions, borrow balances, health factor) from public
              blockchain state. The site does <strong className="text-cro-text">not</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Request transaction signing or approvals</li>
              <li>Submit transactions on your behalf</li>
              <li>Access, transfer, or interact with your funds in any way</li>
              <li>Store your wallet address or any personally identifiable information</li>
            </ul>
            <p>
              Your wallet address is used solely to fetch publicly available on-chain data.
              If you ever see a signature or transaction request from this site, do not approve it —
              that would indicate a compromise.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-cro-text">5. No Affiliation</h2>
            <p>
              Crollateral is an independent, community-built project. It is not affiliated with, endorsed by,
              or in any way connected to Tectonic Finance, Crypto.com, Cronos Labs, or any other protocol,
              company, or organization referenced on this site. All trademarks and brand names belong to
              their respective owners.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-cro-text">6. Third-Party Services</h2>
            <p>
              This site relies on third-party APIs and blockchain RPCs for price feeds and on-chain data.
              We are not responsible for the availability, accuracy, or behavior of these services.
              Disruptions to third-party providers may affect the accuracy or availability of data displayed.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-cro-text">7. Changes to These Terms</h2>
            <p>
              We may update these terms at any time without prior notice. Continued use of the site
              constitutes acceptance of any revised terms. Check back periodically for updates.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-cro-text">8. Experimental Software</h2>
            <p>
              Crollateral is an experimental, open-source tool built by the community. It may contain bugs,
              calculation errors, or inaccuracies. It is provided "as is" without warranty of any kind.
              Do not use it as your sole source of truth for managing DeFi risk.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-cro-text">9. Governing Law</h2>
            <p>
              These terms are governed by and construed in accordance with the laws of the State of California,
              without regard to its conflict of law principles. Any disputes arising from your use of this
              site shall be subject to the exclusive jurisdiction of the courts located in California.
            </p>
          </section>

          {/* Back link */}
          <div className="pt-4 border-t border-cro-border">
            <Link href="/" className="text-cro-cyan text-sm hover:underline">
              ← Return to Dashboard
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
