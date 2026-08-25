# ADR-010: Device-Messaging Service Extraction

**Date:** 2026-07-02
**Status:** Accepted — execution tracked in `docs/plans/001-device-messaging-service-extraction.md`.
**Amended 2026-07-27** — the extraction repo exists ([`nxt-device-messaging`](https://github.com/nxtgrid/nxt-device-messaging));
decision 1's framework choice is superseded, decision 2's endpoint list is incomplete, decision 4's
field types are stale, and plan 001's phase order cannot execute as written. See
"Amendment (2026-07-27)" below.
**Amended 2026-08-25** — NXT suite consumer is HTTP + HMAC webhook to that service when
Metering is enabled (no in-process embed). Sidecar is opt-in with that capability. Wire
types: `@nxtgrid/device-messaging-contract`. See Amendment §I.

---

## Context

`nxt-backend` contains a module at
`apps/tiamat/src/modules/device-messages/` that handles reliable, prioritized, retrying
delivery of commands to metering hardware. It is currently embedded inside the `tiamat`
application as a `@Global()` NestJS module.

The module is well-factored internally: it has a Redis-backed state machine, two delivery
patterns (PUSH/webhook and PULL/polling), exponential backoff with jitter, atomic Lua queue
transitions, and per-vendor adapter files for each hardware integration. However, it has three
properties that make it a candidate for extraction:

1. **Hardware-agnostic core.** The queue engine, retry logic, and PUSH/PULL lifecycle are fully
   independent of any meter brand. The vendor-specific code is already segregated under
   `adapters/`. Plugging in a new brand today requires touching ~7 files; a real plugin
   contract would reduce that to one.

2. **Reusable outside nxt-backend.** Any NXT suite deployment — or an unrelated operator — that
   communicates with addressable field devices via a network server faces the same problem: send
   a command, track it through delivery queues, retry on failure, report the outcome. This wheel
   should not be re-invented per project.

3. **Domain coupling is superficial and removable.** The module imports `MeterInteractionTypeEnum`
   and `meter_interaction_id` from upstream nxt-backend domain modules, but these are used only
   as opaque identifiers and type labels. Replacing them with generic equivalents
   (`command_type: string`, `correlation_id`) preserves all behavior while removing the
   dependency on meter-domain types.

ADR-004 (capability modularization, decision 2) defers repo splits to artifacts with an
independent release cadence. Device-messaging now qualifies: it will evolve around hardware
integrations on a different cadence from the billing, metering, and operations capabilities
of `nxt-backend`.

### What is decided elsewhere

- ADR-004 decision 2 governs when a split is appropriate.
- ADR-007 governs how configuration is consumed; the extracted service must follow the same
  config pattern (env-supplied secrets, JSON config file for deployment topology).
- ADR-001 governs when to extract adapter abstractions (wait for a second real adapter before
  generalizing the SPI).

## Decisions

### 1. Extract to a standalone NestJS application

The `device-messages` module will be extracted into a new, independently deployable NestJS
application and open-source repository. It will **not** remain a `@Global()` module inside
`tiamat`. The extraction follows the same two-pass principle as ADR-008: (a) move with
minimal changes (behavior-preserving), then (b) generalize and clean the seams.

> **Amended 2026-07-27** — the **framework** is superseded: the service is built on Fastify + Zod
> with no DI container, not NestJS. The decision to extract into an independently deployable service
> and open-source repository stands. See Amendment §A and `nxt-device-messaging` ADR-001.

### 2. Dedicated HTTP endpoints replace in-process coupling

Today the module is coupled to `tiamat` through direct NestJS service injection:
- `meter-interactions.service.ts` calls `deviceMessageOutgoingService.enqueue()` and
  `subscribe()` directly.
- `chirpstack.controller.ts` calls `deviceMessageIncomingService.handle()` directly.

The extracted service will expose:
- `POST /messages` — enqueue a command for delivery.
- `DELETE /messages/:correlationId` — cancel a queued command.
- `GET /messages/:correlationId` — inspect delivery status.
- `POST /ingress/:pluginId` — receive incoming events (webhooks from network servers).
- Outbound delivery results via **configurable webhook callbacks** to the caller (with
  HMAC-signed payloads), and optionally via a message-bus adapter (Redis Streams / NATS).

The in-process `static subscribers` pub/sub (`device-messages.service.ts:23`) is replaced
entirely by the outbound webhook/bus mechanism.

> **Amended 2026-07-27** — the endpoint **inventory** above is incomplete: a synchronous token-
> generation endpoint is missing, and the `DELETE` cancel endpoint wraps a method with no callers.
> The transport model itself is unaffected. See Amendment §C and §D.

### 3. Plugin architecture for hardware integrations

The three adapter registries (`ROUTE_MAP` in outgoing, `PUSH_ADAPTERS`/`PULL_ADAPTERS` in
incoming, `ROUTE_MAP` in token) are replaced by a single **plugin registry** populated at
boot. A plugin is a self-contained unit that declares:
- its identifier (e.g. `calin-lorawan`, `calin-api-v1`, `calin-api-v2`),
- its delivery pattern (`push` or `pull`),
- its outgoing adapter (`sendOne`, `getRemoteStatus`, `parseError`),
- its incoming adapter (`handle` for push, `fetchStatus` for pull),
- optionally its token generator,
- its queue bottleneck strategy (a function `bottleneckKey(message) → string`), replacing the
  hardcoded protocol branches in `redis-repository/keys.ts`.

Per ADR-001: the plugin SPI is defined against the **existing** four adapters. A new adapter
should not prompt a redesign of the interface.

### 4. Domain-generic field names

`meter_interaction_id` → `correlation_id` (opaque string, supplied by the caller).
`grid_id` → `network_id` (opaque number, used for queue bucketing).
`MeterInteractionTypeEnum` → `command_type: string` (the service treats it as opaque).
`DeviceManufacturerEnum`/`DeviceProtocolEnum` remain, but are widened to `string` in the
public contract; plugin implementations may narrow them internally.

> **Amended 2026-07-27** — `network_id` is `number | **null**`, not "an opaque number": baseline
> commit `db5c2ac` made `grid_id` nullable and added an `unassigned` LoRaWAN queue bucket. Any
> plugin `bottleneckKey` must handle it. See Amendment §E.

### 5. Redis/Valkey as the only required infrastructure dependency

Redis (or Valkey) remains the sole infrastructure dependency. No relational DB is introduced.
The two custom Lua scripts (`fetchNextMessageInQueue`, `moveMessageBetweenQueues`) travel with
the service. Persistence (AOF or RDB) must be configured by the operator; loss of Redis state
means loss of in-flight messages, which must be documented clearly.

### 6. Single-writer deployment in v1; HA deferred

The cron-based reaper cycle and the in-memory LoRaWAN up/ack correlator both assume a single
process. Distributing them (leader election for crons, Redis-backed correlator) is **deferred
to a follow-up iteration** once the extraction is complete and there is evidence of multi-instance
demand. v1 ships as a single-replica service with this constraint documented.

---

## Amendment (2026-07-27) — repo created; framework, phase order, and contract corrections

The extraction repo was created and foundational decisions were taken with the maintainer. Seven
corrections to this ADR and to plan 001. Authoritative rationale for A and B now lives in the new
repo's own ADRs; this section records what changed and why, for readers of `nxt-backend`.

### A. Framework: Fastify + Zod, not NestJS (supersedes decision 1's framework choice)

Decision 1 specified "a standalone **NestJS** application." Superseded: the service is built on
**Fastify** with **Zod**, with **no DI container**, and plugins are **plain objects**. The decision
*to extract into an independently deployable service and open-source repository* is unaffected.

Rationale in brief — full record in **`nxt-device-messaging` ADR-001**. The module's actual NestJS
surface is 8 `@Injectable()` classes, one module file, 4 DI constructors, 2 `@Cron()` timers, and
zero controllers; everything else is framework-free. Plan 001's own task 3.7 already removes
`@Injectable()` from every adapter and empties the providers array, and the 4 DI constructors are
exactly what the task 3.2 plugin registry deletes. So the choice was between a NestJS shell around
framework-free plugins and a Fastify shell around the same plugins — a difference of roughly five
route handlers, two timers, config loading, and logging. Fastify was chosen because the
single-file-plugin goal is better served by a plugin layer with no framework types in it, and
because dependency and build weight are product qualities in a repo third parties deploy.

**Consequence for this repo:** `nxt-backend` ADR-006's NestJS toolchain (webpack for decorator
metadata, Nx, the shared Dockerfile) does **not** transfer to the extracted service. It is a
single-application repo on plain Node.

### B. Plan 001's phase order cannot execute (Phase 1 is inverted)

Plan 001 was written 2026-07-02, before the OSS migration's Step 0 (sub-plan 002a) moved the source
tree into `legacy/`. Its Phase 1 ("Decouple from nxt-backend") edits files at
`apps/tiamat/src/modules/device-messages/`, which is now
`legacy/apps/tiamat/src/modules/device-messages/` — a **frozen** tree the roadmap forbids editing.
Its Phase 1 checkpoint ("confirm the module still boots inside tiamat") is also unverifiable,
because `legacy/` never boots.

**Corrected order:** the module is copied into the new repo first, and decoupling happens there.
Plan 001 is re-cut into a per-repo pair accordingly (see G).

Two further staleness corrections for the re-cut:

- Plan 001's external-import table understates the coupling. `@core/types/device-messaging` appears
  in **8** files (not 3), `@core/types/supabase-types` in **5** (not 1), and
  `@helpers/number-helpers` in **4** (not 1).
- `adapters/calin-lorawan/lib/_UNUSED_EXAMPLE_correlate-request-response.redis.ts` is dead code and
  should not travel.

### C. Decision 2's endpoint list is missing token generation

Decision 2 lists four endpoints plus outbound webhooks. It omits **token generation**, even though
`deviceTokenService.generate()` is one of five live consumer call sites
(`meter-interactions.service.ts:222`) and decision 3 already gives plugins an optional token
generator. Plan 001's Phase 2 has no such endpoint either.

Token generation is **synchronous** — it calls the STS or CALIN token service and returns a token
string inline; it is not a queued message and does not flow through the delivery pipeline. It
therefore needs its own endpoint shape, not a variant of `POST /messages`. The exact contract is
open.

For the record, the real consumer surface is **five** in-process call sites, not the four plan 001
tabulates: `enqueue`, `subscribe`, `getMessageByMeterInteractionId`, `handle`, and `generate`.

### D. The cancel API in decision 2 is speculative

`DELETE /messages/:correlationId` wraps `cancelOneByMeterInteractionId`, which has **zero callers**
anywhere in `legacy/` — as does `cancelManyByMeterInteractionIds`, which no plan mentions. Whether
cancel ships in v1, and whether a batch variant is needed, is an open scope question rather than a
settled commitment.

### E. Decision 4's field types are stale (`grid_id` is nullable)

Decision 4 maps `grid_id` → `network_id` as "an opaque number". Since baseline commit `db5c2ac`
("Make meter installs and messaging available for meters without a grid") that is wrong:

- `grid_id` is now `number | null`, where null means the meter is bound to no grid.
- `redis-repository/keys.ts` gained `LORAWAN_UNASSIGNED_BUCKET`, routing such messages to
  `queue:lorawan_network:unassigned`.
- `redis-repository/helpers.ts` omits the field on serialize when nil rather than coercing to `NaN`.

So `network_id` is `number | null`, and any plugin `bottleneckKey` implementation must handle the
unassigned bucket. Plan 001's task 1.6 (target type) and task 3.3 (example `bottleneckKey`) are both
wrong as written; the task 3.3 example would route orphan meters to `queue:lorawan_network:null` and
lose them.

### F. License resolved: MPL-2.0

Plan 001 task 4.4 asks the maintainer to choose between MIT and Apache 2.0. Resolved: the extraction
repo already ships **MPL-2.0**, byte-identical to this repo's `LICENSE`. Consistent across the
estate; no decision outstanding.

### G. Documentation ownership split

- **`nxt-device-messaging`** owns *how the service is built*: its own ADR series (numbered from 001
  — note the collision, always cite cross-repo ADRs by repo), its own plans, its own `AGENTS.md`,
  a chronological `docs/decisions-log.md`, and the normative consumer contract (OpenAPI plus an
  integration guide).
- **`nxt-backend`** keeps *why the extraction happens* (this ADR) and everything that changes on
  this side: the consumer rewiring (Metering import), the App Platform sidecar runbook
  (`docs/deployment/digital-ocean-buildpack.md`), and the company cutover addendum in H.
- Plan 001 is re-cut into a per-repo pair on that boundary. The service build-out moves to the new
  repo; what remains here is the nxt-backend-side work.

### H. Company cutover: wholesale, and a hard stop-then-start

Confirmed with the maintainer: the company adopts the extracted service **as part of the single
wholesale OSS cutover** (ADR-012), not before it. No HTTP client is retrofitted into legacy tiamat,
and `legacy/` is never edited. Consequence: this service's only consumer, ever, is the imported
`meter-interactions` in the new `apps/api`.

Facts for the cutover sub-plan (ADR-012 illustrative step 4 carries the operational items as of
2026-08-25):

- **Device-messaging cutover cannot be blue/green.** ChirpStack posts to exactly one integration
  URL, so repointing it from tiamat's `/chirpstack/calin` to the new service's ingress is atomic and
  global; and if old and new both poll a vendor API for the same task they double-process. This is a
  **hard stop-then-start with a drain** — the mechanics ADR-012 decision 2 assigns to `worker`.
- **ADR-012's step-4 sequence** now carries those three items (amendment 2026-08-25): ChirpStack
  URL flip, old-Valkey drain, new sidecar + Valkey provisioned ahead of the window.
- **Zero pre-cutover production exposure is a named risk.** Under wholesale cutover, the outbound
  webhook design — which this ADR's own risk register calls "the single most consequential interface
  decision" — is first exercised in production inside a window with no rollback past it (ADR-012
  decision 5). It needs ADR-012 decision 3's rehearsal step explicitly attached.
- **Open question:** whether the early adopter (roadmap deployment consumer #3) runs CALIN meters and
  ChirpStack. If they do, they are the natural first production user *before* the company, which
  would retire most of that risk.

### I. NXT suite consumer and deploy (2026-08-25)

Metering is an **opt-in capability** (ADR-007 Tier-1). Device-messaging is that
capability’s delivery backend, not a platform-wide host. If Metering is off, `api` /
`worker` do not instantiate Metering modules, do not call the HTTP API, and the App
Platform app does not need the GHCR component or `DEVICE_MESSAGING_*` env.

When Metering **is** enabled, this suite talks to device-messaging **over HTTP**. There
is no in-process embed. The only consumer is `meter-interactions` calling the command
API and receiving HMAC-signed webhooks. (Metering is not imported yet; that code does
not exist in `apps/` today.)

**Do not use this ADR as the route list.** Decision 2’s `POST /messages` inventory is stale.
Normative paths, auth, and webhook HMAC live in
[`nxt-device-messaging` ADR-003](https://github.com/nxtgrid/nxt-device-messaging/blob/main/docs/architecture/003-public-http-contract.md),
[`docs/guides/integrating.md`](https://github.com/nxtgrid/nxt-device-messaging/blob/main/docs/guides/integrating.md),
and the running service’s `/swagger`. There is no message-bus / NATS adapter in v1.

TypeScript/Zod for those routes and the webhook body:
[`@nxtgrid/device-messaging-contract`](https://www.npmjs.com/package/@nxtgrid/device-messaging-contract)
(peer `zod`). nxt-backend wraps HTTP locally; a typed fetch client is a later Metering slice,
not a second way to run the engine.

**Deploy (ADR-005 §11, ADR-006 §8), Metering on only:** same App Platform app as
`api`/`worker`; image `ghcr.io/nxtgrid/nxt-device-messaging:<tag>`; **replicas 1**;
**own** Valkey; `api` uses the **private** URL. Runbook:
[`docs/deployment/digital-ocean-buildpack.md`](../deployment/digital-ocean-buildpack.md).
Repo: [nxt-device-messaging](https://github.com/nxtgrid/nxt-device-messaging).

**Wiring (Metering enabled — ADR-007):** secrets in env, URL in config/env:

- `DEVICE_MESSAGING_BASE_URL` — private component URL
- `DEVICE_MESSAGING_API_KEY` — Bearer toward device-messaging
- `DEVICE_MESSAGING_WEBHOOK_SECRET` — same value as that service’s webhook secret

If Metering is on and the URL is missing, fail boot (or degrade that capability).
Do not silently no-op enqueue. If Metering is off, do not require these vars.

### What is unchanged

Decisions 3 (plugin architecture), 5 (Redis/Valkey as the sole infrastructure dependency, Lua
scripts travelling with the service), and 6 (single-writer v1, HA deferred) stand as written.
Decision 2's transport model — HTTP command API plus webhook ingress plus outbound HMAC-signed
result callbacks — also stands; only its endpoint inventory is incomplete (C, D).

---

## Consequences

### Positive
- Any NXT suite deployment or third-party operator can run device-messaging independently of
  the rest of nxt-backend.
- Adding a new hardware integration requires authoring a single plugin file, not editing
  the core service.
- The in-process pub/sub is replaced by a network contract, which is testable and inspectable.
- `nxt-backend`'s `meter-interactions` module is simplified to an HTTP client call.

### Negative / Risks
- Adds a network hop and a deployment dependency (operators must now run two services + Redis
  instead of one).
- The outbound webhook/bus design is the single most consequential interface decision; getting
  it wrong is expensive to change later.
- v1 single-writer constraint limits throughput for operators with very high message volumes.
- The extraction introduces a period where both the embedded module and the standalone service
  must be maintained transitionally.

## Triggers (revisit when)
- A second non-CALIN hardware integration is being added (validates the plugin SPI).
- An operator reports single-writer throughput as a hard constraint (triggers HA work).
- The outbound webhook/bus design proves insufficient for a consumer's latency needs.

## Related
- **ADR-001** — when to extract adapter abstractions; its unimplemented per-adapter configuration
  recommendation is what the plugin contract must carry.
- **ADR-004** — capability modularization; repo split criteria (decision 2).
- **ADR-005** — inter-host communication; §11 classifies this service as an integrable extracted
  service rather than an in-stack peer; 2026-08-25 amendment is the same-app sidecar default.
- **ADR-006** — §8 App Platform components; device-messaging is GHCR, not `nx build`.
- **ADR-007** — configuration and wiring mechanism; decision 6 anticipated this config section
  travelling with the extraction; Metering env names in Amendment §I.
- **ADR-008** — incremental import strategy and two-pass principle.
- **ADR-012** — company cutover; Amendment §H constraints; 2026-08-25 addendum on illustrative
  step 4 (sidecar, Valkey drain, ChirpStack flip).
- **Execution plan** — `docs/plans/001-device-messaging-service-extraction.md` (**stale**; being
  re-cut per Amendment §B and §G).
- **`nxt-device-messaging` ADR-001** — Fastify + Zod, no DI container; supersedes decision 1's
  framework choice.
- **`nxt-device-messaging` ADR-002** — configuration mechanism; adapts ADR-007 for the standalone
  service.
- **`nxt-device-messaging` ADR-003** — normative HTTP/webhook paths (not decision 2 in this file).
- **`@nxtgrid/device-messaging-contract`** — adopter TS/Zod artifact of that wire.
