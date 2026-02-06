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
  // Register rate limiting
  await fastify.register(rateLimit, {
    max: 100, // max 100 requests
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    }),
  });

  // Register CORS
  await fastify.register(cors, {
    origin: config.corsOrigin,
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
