import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { config } from './config.js';
import { portfolioRoutes } from './routes/portfolio.js';
import { simulateRoutes } from './routes/simulate.js';
import { liquidationHistoryRoutes } from './routes/liquidation-history.js';
import { fulcromPositionsRoutes } from './routes/fulcrom-positions.js';
import { fulcromTradeHistoryRoutes } from './routes/fulcrom-trade-history.js';
import { moonlanderPositionsRoutes } from './routes/moonlander-positions.js';

const fastify = Fastify({
  logger: true,
  // Trust proxy headers only from known upstream (Railway/Vercel inject X-Forwarded-For)
  // Set to true when deployed behind a single trusted proxy; false in dev
  trustProxy: process.env.NODE_ENV === 'production',
});

async function main() {
  // ── Security headers (helmet) ──────────────────────────────────────────────
  await fastify.register(helmet, {
    // Allow CoinGecko + Cronos RPCs for API-initiated fetches
    contentSecurityPolicy: false, // CSP not relevant for a pure JSON API
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'no-referrer' },
  });

  // ── Rate limiting ────────────────────────────────────────────────────────────
  // When trustProxy=true Fastify will use the first untrusted IP from
  // X-Forwarded-For (set by our known proxy). When false (dev) it uses
  // request.ip directly. Either way we never blindly trust user-supplied IPs.
  await fastify.register(rateLimit, {
    max: 60, // 60 requests per IP per minute
    timeWindow: '1 minute',
    // In production with trustProxy, request.ip is already resolved by Fastify
    // to the real client IP from X-Forwarded-For. No need to re-parse.
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. You have made ${context.max} requests in ${context.after}. Please try again later.`,
    }),
  });

  // ── CORS ─────────────────────────────────────────────────────────────────────
  // In production, CORS_ORIGIN should be set explicitly.
  // Default falls back to the known production domain if unset.
  if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
    console.warn('WARNING: CORS_ORIGIN env var not set — defaulting to https://www.crollateral.finance');
    process.env.CORS_ORIGIN = 'https://www.crollateral.finance';
  }
  const allowedOrigins = config.corsOrigin.split(',').map(o => o.trim());
  await fastify.register(cors, {
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    methods: ['GET', 'POST'],
  });

  // ── Health check ──────────────────────────────────────────────────────────────
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });

  // ── Routes ────────────────────────────────────────────────────────────────────
  await fastify.register(portfolioRoutes, { prefix: '/api' });
  await fastify.register(simulateRoutes, { prefix: '/api' });
  await fastify.register(liquidationHistoryRoutes, { prefix: '/api' });
  await fastify.register(fulcromPositionsRoutes, { prefix: '/api' });
  await fastify.register(fulcromTradeHistoryRoutes, { prefix: '/api' });
  await fastify.register(moonlanderPositionsRoutes, { prefix: '/api' });

  // ── Start ─────────────────────────────────────────────────────────────────────
  try {
    await fastify.listen({ port: config.port, host: config.host });
    console.log(`API server running at http://${config.host}:${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
