import { z } from 'zod';

import { demoCapabilitySchema } from '#modules/demo/demo.schema.js';

/**
 * Category (B) data-references: deployment-specific row identifiers.
 *
 * Both fields stay plain configured values — not sourced from the database — per the 002c
 * Task 3 decisions log (2026-07-14): `adminOrganizationId`'s DB-side fact
 * (`organizations.organization_type = 'PLATFORM_OPERATOR'`, ADR-007 Amendment) and this config
 * value are two independently-set facts accepted to agree without being mechanically linked.
 * Optional so a zero-config boot still validates; a capability that depends on one is
 * responsible for failing clearly at its own point of use when it is missing.
 */
const deploymentSchema = z.object({
  adminOrganizationId: z.number().int().positive().optional(),
  systemWalletId: z.number().int().positive().optional(),
}).strict();

/** Category (C) presentation/content — the only browser-safe subtree (ADR-007 decision 5). */
const publicConfigSchema = z.object({
  platformName: z.string(),
}).strict();

/**
 * Category (A) Tier-1/Tier-2 flags. Grows with capability imports — do not speculate ahead.
 * `demo` is temporary scaffolding proving Tier-1 gating (002c Task 3); delete it alongside
 * `modules/demo/` once a real capability lands.
 */
const capabilitiesSchema = z.object({
  demo: demoCapabilitySchema.optional(),
}).strict();

/** Category (A) Tier-3 optional augmentations. Grows with capability imports. */
const integrationsSchema = z.object({}).strict();

export const nxtConfigSchema = z.object({
  $schema: z.string().optional(),
  $schemaVersion: z.literal('1'),
  deployment: deploymentSchema.default({}),
  public: publicConfigSchema,
  capabilities: capabilitiesSchema.default({}),
  integrations: integrationsSchema.default({}),
}).strict();

export type NxtConfig = z.infer<typeof nxtConfigSchema>;
