import { z } from 'zod';

/**
 * Category (C) presentation/content — the only browser-safe subtree (ADR-007 decision 5).
 *
 * Category (B) data-references (`deployment.adminOrganizationId` / `systemWalletId`) were
 * dropped in 002d — see ADR-007 Amendment 2026-07-15 §B. Admin org is DB-native; system
 * wallet returns under Payments capability config when that capability is imported.
 */
const publicConfigSchema = z.object({
  platformName: z.string(),
}).strict();

/**
 * Category (A) Tier-1/Tier-2 flags. Grows with capability imports — do not speculate ahead.
 * Empty until the first real Tier-1 capability lands (demo scaffolding removed in 002d Task 4).
 */
const capabilitiesSchema = z.object({}).strict();

/** Category (A) Tier-3 optional augmentations. Grows with capability imports. */
const integrationsSchema = z.object({}).strict();

export const nxtConfigSchema = z.object({
  $schema: z.string().optional(),
  $schemaVersion: z.literal('1'),
  public: publicConfigSchema,
  capabilities: capabilitiesSchema.default({}),
  integrations: integrationsSchema.default({}),
}).strict();

export type NxtConfig = z.infer<typeof nxtConfigSchema>;
