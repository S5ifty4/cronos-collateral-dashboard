import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { SimulateRequest, ScenarioResult } from '@cronos-dash/shared';
import { simulateScenario, calculateTargetHF } from '@cronos-dash/shared';

const scenarioActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('priceShock'),
    symbol: z.string(),
    pctChange: z.number(),
  }),
  z.object({
    type: z.literal('repay'),
    symbol: z.string(),
    amount: z.number().positive(),
  }),
  z.object({
    type: z.literal('addCollateral'),
    symbol: z.string(),
    amount: z.number().positive(),
  }),
  z.object({
    type: z.literal('withdrawCollateral'),
    symbol: z.string(),
    amount: z.number().positive(),
  }),
]);

const simulateRequestSchema = z.object({
  snapshot: z.object({
    protocol: z.string(),
    collaterals: z.array(
      z.object({
        asset: z.object({
          symbol: z.string(),
          address: z.string(),
          decimals: z.number(),
        }),
        amount: z.number(),
        valueUsd: z.number(),
        liquidationThreshold: z.number(),
        enabled: z.boolean(),
      })
    ),
    borrows: z.array(
      z.object({
        asset: z.object({
          symbol: z.string(),
          address: z.string(),
          decimals: z.number(),
        }),
        amount: z.number(),
        valueUsd: z.number(),
      })
    ),
    totals: z.object({
      collateralUsd: z.number(),
      borrowUsd: z.number(),
      weightedCollateralUsd: z.number(),
    }),
    risk: z.object({
      healthFactor: z.number(),
      totalCollateralUsd: z.number(),
      totalBorrowUsd: z.number(),
      availableBorrowUsd: z.number(),
      liquidationPrices: z.record(z.number()),
    }),
  }),
  scenario: z.object({
    actions: z.array(scenarioActionSchema),
  }),
  prices: z.record(z.number()),
});

const targetHFRequestSchema = z.object({
  targetHF: z.number().positive(),
  snapshot: simulateRequestSchema.shape.snapshot,
  prices: z.record(z.number()),
});

export const simulateRoutes: FastifyPluginAsync = async (fastify) => {
  // Simulate scenario endpoint
  fastify.post<{
    Body: SimulateRequest;
  }>('/simulate', {
    handler: async (request, reply) => {
      try {
        const validated = simulateRequestSchema.parse(request.body);
        const result = simulateScenario(
          validated.snapshot,
          validated.scenario,
          validated.prices
        );
        return result;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Invalid request body',
            details: error.errors,
          });
        }
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Simulation failed' });
      }
    },
  });

  // Target HF calculator endpoint
  fastify.post('/target-hf', {
    handler: async (request, reply) => {
      try {
        const validated = targetHFRequestSchema.parse(request.body);
        const result = calculateTargetHF({
          targetHF: validated.targetHF,
          snapshot: validated.snapshot,
          prices: validated.prices,
        });
        return result;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Invalid request body',
            details: error.errors,
          });
        }
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Target HF calculation failed' });
      }
    },
  });
};
