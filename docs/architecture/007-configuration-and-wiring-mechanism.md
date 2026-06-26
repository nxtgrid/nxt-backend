# ADR-007: Configuration & Wiring Mechanism

**Date:** 2026-06-26
**Status:** Open (deferred from ADR-004; to be resolved in a dedicated session)

---

## Purpose of this document

This is a **scoped stub** so the question can be picked up later in its own conversation with full
context. It records the problem, the current state, the options, and the constraints inherited from
ADR-004 — but does **not** yet make a decision.

## Inherited context (from ADR-004)

- **Three-tier feature-flag model**, all **per-deployment** (static, resolved at boot):
  - **Tier 1 — Capability** on/off.
  - **Tier 2 — Provider** per capability port (adapter selection, or "none-yet").
  - **Tier 3 — Integration** optional augmentations (Make.com, FlowXO, JIRA, Telegram, Sentry/Loki).
- Honesty rules: required ports with no adapter run in a safe/manual mode (no crash); optional
  integrations absent are silently skipped; inter-capability links are soft pairings with graceful
  degradation.
- Ports-and-adapters: capabilities expose ports; vendor adapters implement them and are selected by
  config.
- Disabled capabilities should **not be instantiated at all** (smaller attack surface, fail-fast).

## The question

How are the three tiers of flags **declared, loaded, validated, and wired** in the NestJS codebase so
that a single config file + env fully determines what a deployment runs?

## Current state (as observed)

- Config is read ad hoc from `process.env` across modules (e.g. `FlutterwaveService` reads
  `process.env.FLW_*` at module init). Each app has a large `.env.example`.
- `dotenv-safe` is already a dependency (can enforce required env presence).
- Some modules are `@Global()` singletons; provider selection is largely implicit/hardcoded today.
- ADR-003 demonstrates a runtime credential-resolution factory pattern (`forOrganization`) — a
  reference for adapter resolution, though per-org scope is out of baseline scope per ADR-004.

## Options / topics to consider (not yet decided)

- **Config source & shape.** A typed config file (e.g. `nxt.config.ts` / YAML) for structure +
  capability/provider/integration selection, with **env vars for secrets only**. Likely via
  `@nestjs/config` with a typed, validated schema.
- **Conditional module loading.** Use NestJS `DynamicModule` / `register()` / `forRoot()` and
  conditional `imports` so only enabled capabilities (and their chosen adapters) are instantiated.
- **Port/adapter binding via DI.** Bind a port token to the configured adapter at boot; provide a
  safe "null/manual" adapter for enabled-but-unprovided required ports.
- **Boot-time validation (fail-fast).** Validate the whole config at startup: unknown/unsupported
  provider → fail; required env for a chosen adapter missing → fail; print an effective-config summary.
- **Host composition.** How a runtime host (`api` / `worker`) selects which enabled capabilities'
  contributions (controllers vs jobs) it mounts — tying this mechanism to ADR-004 Decision 8.

## Constraints / evaluation criteria

- A new operator should configure the whole suite from **one config file + env**, with clear errors.
- No secrets in the config file; secrets via env (or a secret manager) only.
- Mechanism must make adding a new provider/adapter a localized change (no edits across 100+ files).
- Must support the "enabled but no provider yet" graceful-degradation case from ADR-004.

## To decide in the dedicated session

- The concrete config file format and schema, and the env-var contract.
- The exact NestJS conditional-loading pattern and where the capability registry lives.
- The port-token/adapter-binding convention and the null/manual adapter strategy.
- The boot-time validation rules and effective-config reporting.
