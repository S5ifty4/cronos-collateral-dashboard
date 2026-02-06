import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { portfolioRoutes } from './routes/portfolio.js';
import { simulateRoutes } from './routes/simulate.js';

const fastify = Fastify({
  logger: true,
});

async function main() {
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
