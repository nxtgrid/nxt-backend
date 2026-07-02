# ADR-010: Device-Messaging Service Extraction

**Date:** 2026-07-02
**Status:** Accepted — execution tracked in `docs/plans/device-messaging-service-extraction.md`

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
- **ADR-001** — when to extract adapter abstractions.
- **ADR-004** — capability modularization; repo split criteria (decision 2).
- **ADR-007** — configuration and wiring mechanism.
- **ADR-008** — incremental import strategy and two-pass principle.
- **Execution plan** — `docs/plans/device-messaging-service-extraction.md`
