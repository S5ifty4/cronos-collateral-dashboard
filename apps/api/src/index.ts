import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { portfolioRoutes } from './routes/portfolio.js';
import { simulateRoutes } from './routes/simulate.js';

const fastify = Fastify({
  logger: true,
});

async function main() {
  // Register rate limiting - per IP address
  await fastify.register(rateLimit, {
    max: 60, // max 60 requests per IP per minute
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      // Use X-Forwarded-For header if behind proxy (Vercel/Railway), otherwise use IP
      const forwarded = request.headers['x-forwarded-for'];
      if (forwarded) {
        // X-Forwarded-For can be comma-separated, take the first (client) IP
        return Array.isArray(forwarded) ? forwarded[0].split(',')[0].trim() : forwarded.split(',')[0].trim();
      }
      return request.ip;
    },
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. You have made ${context.max} requests in ${context.after}. Please try again later.`,
    }),
  });

  // Register CORS - supports multiple origins separated by comma
  const allowedOrigins = config.corsOrigin.split(',').map(o => o.trim());
  await fastify.register(cors, {
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    methods: ['GET', 'POST'],
  });

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });

  // Register routes
  await fastify.register(portfolioRoutes, { prefix: '/api' });
  await fastify.register(simulateRoutes, { prefix: '/api' });

  // Start server
  try {
    await fastify.listen({ port: config.port, host: config.host });
    console.log(`API server running at http://${config.host}:${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
