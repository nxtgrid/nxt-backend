import { z } from 'zod';

/**
 * Temporary demo capability — proves Tier-1 gating honesty (002c Task 3). Delete this schema
 * alongside the rest of `modules/demo/` once a real capability demonstrates the same pattern
 * (see the 002c decisions log, 2026-07-14).
 */
export const demoCapabilitySchema = z.object({
  enabled: z.boolean().default(false),
}).strict();

export type DemoCapabilityConfig = z.infer<typeof demoCapabilitySchema>;
