/** @type {import('next').NextConfig} */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Extract hostname from API URL for CSP connect-src
let apiHostname = '';
try {
  apiHostname = new URL(API_URL).origin;
} catch (_) {
  apiHostname = API_URL;
}

const securityHeaders = [
  // Prevent clickjacking / iframe embedding
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // XSS filter (legacy browsers)
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Don't send referrer to external sites
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restrict browser features
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // HSTS: enforce HTTPS for 1 year (only applies when served over HTTPS)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  // Content Security Policy
  // - Blocks inline scripts/styles except what wagmi/WC needs
  // - Allows only our API + known crypto infra + CoinGecko
  // - Prevents loading external scripts/iframes
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Scripts: Next.js App Router requires 'unsafe-inline' for its webpack
      // bootstrap runtime. 'unsafe-eval' is needed by wagmi/WalletConnect.
      // Note: to remove 'unsafe-inline' you'd need nonce-based CSP via middleware.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
      // Styles: self + inline (Tailwind inlines at build time)
      "style-src 'self' 'unsafe-inline'",
      // Images: open — wallet icons come from various CDNs (Cloudflare imagedelivery.net,
      // WalletConnect explorer, etc). Image loading poses no security risk for a read-only app.
      "img-src * data: blob:",
      // Fonts: self
      "font-src 'self'",
      // API calls + Cronos RPC + WalletConnect + CoinGecko prices
      [
        'connect-src',
        "'self'",
        apiHostname,
        'https://evm.cronos.org',
        'https://cronos-evm-rpc.publicnode.com',
        'https://rpc.vvs.finance',
        'https://api.coingecko.com',
        'wss://relay.walletconnect.com',
        'wss://relay.walletconnect.org',
        'https://verify.walletconnect.com',
        'https://verify.walletconnect.org',
        'https://explorer-api.walletconnect.com',
        'https://registry.walletconnect.com',
        'https://*.walletconnect.com',
        'https://*.walletconnect.org',
        // Reown AppKit (formerly Web3Modal) API — wallet list + images
        'https://*.web3modal.com',
        'https://*.web3modal.org',
        'https://api.web3modal.org',
      ].join(' '),
      // Frames: deny all
      "frame-src 'none'",
      // Objects: deny
      "object-src 'none'",
      // Base URI: self only (prevent base tag injection)
      "base-uri 'self'",
      // Form action: self only
      "form-action 'self'",
      // Upgrade HTTP to HTTPS
      'upgrade-insecure-requests',
    ].join('; '),
  },
];

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cronos-dash/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cryptologos.cc',
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
