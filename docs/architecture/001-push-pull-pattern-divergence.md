# ADR-001: PUSH/PULL Pattern Divergence in Device Messaging

**Date:** 2026-03-16
**Status:** Observed (not yet acted on)

## Context

The device messaging pipeline uses a shared orchestration layer for two fundamentally different communication patterns:

- **PUSH (LoRaWAN/ChirpStack):** NS responds instantly (sub-second). The bottleneck is the radio network. The multi-stage queue (NS → GW → Device) maps to real physical hops. Rate limiting prevents network flooding.
- **PULL (CALIN API V1/V2):** The NS (external HTTP API) *is* the bottleneck, with response times ranging from 10–30+ seconds. The "gateway" is a logical grouping, not a physical chokepoint. The awaiting_task stage is just polling an HTTP endpoint for status.

The divergence surfaced when CALIN API slowness caused a feedback loop: un-rate-limited concurrent API calls overwhelmed their server, making it slower, which caused more calls to pile up. The gateway rate limiter had to be moved from "after API response" to "before API call" to cap concurrency — effectively turning it into an API call rate limiter rather than a gateway capacity limiter.

## Current State

The shared pipeline handles both patterns with branching logic:

- `distributeToNetworkServers` branches on queue type (`lorawan_network` vs `gateway`)
- Timeouts, rate limiting, and queue stages are configured at the pipeline level
- Adapters (`CalinApiV1OutgoingService`, `CalinLorawanOutgoingService`) only handle send/parse/status, not orchestration

This works but has growing friction:

- NS timeout is a single value, but LoRaWAN needs ~10s and CALIN API needs ~30s
- Rate limiting serves different purposes per pattern (network flooding vs API concurrency)
- The `queueType === 'gateway'` check conflates queue bottleneck type with communication pattern

## Options Considered

1. **Adapter-level configuration** — Each adapter declares its constraints (max concurrent, timeout, rate limit scope). The shared pipeline reads them. Least invasive, proper separation of concerns.

2. **Adapter-level orchestration** — Each adapter owns its send loop, rate limiting, and timeout logic. Most flexible but risks duplicating retry/cleanup logic across adapters.

3. **Strategy pattern** — Define a "communication strategy" interface (`getRateLimitConfig()`, `getTimeoutConfig()`, etc.) that adapters implement. The pipeline queries the strategy at each decision point.

4. **Separate pipelines** — PUSH and PULL get entirely distinct queue pipelines, sharing only primitives (retry, pub/sub, queue helpers).

## Recommendation

**Option 1 (adapter-level configuration)** is the pragmatic next step. Each adapter exposes static config:

```typescript
interface OutgoingAdapterConfig {
  maxConcurrentRequests: number;
  nsTimeoutMs: number;
  rateLimitScope: 'per_gateway' | 'per_adapter';
}
```

The shared pipeline stays shared (retry logic, pub/sub, queue primitives), but adapters declare *how* it should behave. This avoids duplicating orchestration while properly separating concerns.

If the patterns continue to diverge (e.g., a third protocol with yet different characteristics), escalate to option 3 or 4.

## Trigger

Revisit this ADR when:

- Adding a third communication protocol/manufacturer
- Adding adapter-specific features that require more branching in the shared pipeline
- The `queueType` string-matching pattern spreads to more decision points
