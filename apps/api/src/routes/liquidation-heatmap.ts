import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { buildLiquidationHeatmap } from '../services/liquidation-heatmap.js';

const querySchema = z.object({
  asset: z.literal('CRO').optional().default('CRO'),
  platform: z.enum(['all', 'tectonic', 'fulcrom', 'moonlander']).optional().default('all'),
  side: z.enum(['downside', 'upside', 'both']).optional().default('downside'),
});

export const liquidationHeatmapRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Querystring: { asset?: string; platform?: string; side?: string };
  }>('/liquidation-heatmap', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          asset: { type: 'string', enum: ['CRO'] },
          platform: { type: 'string', enum: ['all', 'tectonic', 'fulcrom', 'moonlander'] },
          side: { type: 'string', enum: ['downside', 'upside', 'both'] },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const query = querySchema.parse(request.query);
        return await buildLiquidationHeatmap({ platform: query.platform, side: query.side });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid liquidation heatmap query' });
        }
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch liquidation heatmap' });
      }
    },
  });
};
