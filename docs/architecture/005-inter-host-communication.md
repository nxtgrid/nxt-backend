# ADR-005: Inter-Host Communication

**Date:** 2026-06-26 (decided 2026-07-17)
**Status:** Accepted — explicit prerequisite of authoring **002e** (Energy Production Monitoring).
002d (Foundation) completed 2026-07-17 without needing this lock.
**Amended 2026-08-25** — when Metering is on, App Platform adds device-messaging as a
same-app sidecar (GHCR). It remains an integrable extracted service (§11), not a third Nx host.

---

## Context

ADR-004 defines a modular monolith: capability modules wired onto thin runtime hosts. The default
**Nx** deployable footprint is **`api`** (HTTP-facing; tiamat + folded-in talos) and **`worker`**
(background/collector domains; config-driven composition along capability seams). A separate
Nx host is justified only by a divergent runtime profile — never by code tidiness.

The NXT suite App Platform app runs
[`nxt-device-messaging`](https://github.com/nxtgrid/nxt-device-messaging) as a **third
component only when Metering is enabled** (ADR-007 Tier-1). That is how this suite
delivers meter commands. Deployments that leave Metering off stay at `api` + `worker`.
The sidecar is not an in-stack peer and not a `worker` clone (§11).

The OSS migration roadmap (`docs/plans/002-oss-migration.md`) accepts this ADR as a prerequisite of
Production Monitoring import (**002e**): that is the first sub-plan that gives `worker` a real
capability and therefore real cross-host questions — i.e. the first import that applies this
accepted policy. Foundation (**002d**) wired Supabase on both hosts but carried no cross-host
capability traffic.

### Legacy coupling (what we are leaving)

The four legacy apps were coupled **two ways at once**:

1. **Shared databases (dominant):** the same primary ops DB and the same Timescale instance —
   effectively the integration bus.
2. **Bidirectional HTTP mesh (secondary):** `TALOS_API` / `YETI_API` / `LOCH_API` / `TIAMAT_API`
   (+ API keys). Many of those edges were artifacts of the 4-app split (e.g. tiamat→talos) and
   collapse to in-process calls once modules share a host. A smaller set are true residuals
   (e.g. Epicollect sync calling `user-admin/create-customer`; collector jobs updating ops status
   columns; notification send pipeline owning `notifications` rows).

Legacy also used Valkey/Redis heavily inside device-messaging queues, and Socket.IO for
client-facing realtime — neither is a general host↔host bus for the OSS baseline.

Company deploy today (DigitalOcean App Platform: `api` + *n* workers under one App, private VPC)
makes **private HTTP** a natural residual channel; it does not require a broker, and it does not
excuse missing app-level machine auth.

### Constraints

- **Self-hostability:** lean default footprint (`api` + `worker` + DBs); no mandatory broker for
  inter-host communication (ADR-004).
- **Genericness:** mechanisms must not hardcode NXT-specific topology.
- **Explicit seams:** cross-host cost and availability must remain visible at call sites.
- **Capability boundaries:** respect ADR-004 / ADR-013 ownership; communication is not a way to
  smuggle capability logic across the wrong module.
- **Flexibility with accountability:** strong defaults; exceptions allowed when justified and
  **recorded** (this ADR’s exception bar, or the importing sub-plan decisions log) — not silent
  mesh creep.

## Decision

### 1. Hosts are independent by default; shared DBs carry state

`api` and `worker` are independent composition roots. Coordination is primarily through **shared
databases** (ops Supabase/`public`, Timescale, and any specialty stores a capability owns).
Residual host↔host calls are **allowed but exceptional** — the intent is maximum independence, not
a zero-RPC fantasy. The residual count need not be known up front; capability imports apply this
policy as edges appear.

**Client realtime** (Socket.IO, Supabase realtime to frontends) is **out of scope** for this ADR —
that is host→browser, not host→host.

### 2. Legitimate residual patterns

| Pattern | Meaning | Baseline mechanism |
|---|---|---|
| **Sync orchestration** | Caller needs another host’s business logic *and* an in-line result/error (e.g. Epicollect → create-customer) | Authenticated HTTP |
| **Async kick** | Caller wants work done later; does not need the outcome in the same request | Prefer **DB job / outbox** (per capability); HTTP only transitional/escape |
| **Shared-state dual access** | Both hosts read/write stores they are allowed to touch | Not “messaging” — just dual access under §7 |

### 3. Sync orchestration = authenticated internal HTTP

- **Reuse normal `api` routes** when they are a fit for machines (e.g. existing create-customer),
  authenticated with machine credentials.
- Add a **narrow dedicated surface** (e.g. `/internal/...`) only when the public/human route is
  wrong-shaped (authz, payload, side effects). Do not invent a second full API up front.
- Auth is **ADR-014** (`X-API-KEY` / `api_keys`, evolving scopes + route allowlist). No parallel
  “internal shared secret” system. Private network / VPC is defense-in-depth, not a substitute.

### 4. Async kicks prefer per-capability DB jobs

- Prefer **per-capability / per-domain tables** (today’s `notifications` lifecycle is the
  archetype; `pd_*` job state is similar). No mandatory global platform outbox in Foundation.
- Shared claim/retry **helpers** may appear when a second real user shows the same shape; do not
  design a grand job bus for 002e.
- Fire-and-forget HTTP to enqueue work is a **transitional/escape** path only when no job table
  exists yet for that flow.

**Postgres `LISTEN`/`NOTIFY`** (or equivalent DB wake signals) is **not** a baseline mechanism.
Hosts poll/claim on their own schedule (cron/loops) or use HTTP for sync. Revisit later as an
optimization if a hot path demands it.

### 5. Prefer unidirectional residual HTTP (workers → `api`)

**Default:** in-stack residual HTTP is **worker (or other non-`api` host) → `api`**. Baseline
config gives those callers **`api`’s base URL + machine credential** — not a mesh of every host
URL.

**`api` → worker HTTP** is allowed only when **all** of the following hold (or are explicitly
waived in the importing sub-plan), and the exception is **recorded**:

1. Sync orchestration is truly required (in-line result), **and**
2. The work cannot live on `api` and cannot be a DB job the worker claims, **and**
3. The callee’s runtime profile justifies a separate host (ADR-004), **and**
4. The endpoint and rationale are written down (this ADR’s exceptions note or the sub-plan
   decisions log).

Operationally an exception is a **named** internal client + URL/env for that one surface — not a
return to a full bidirectional host matrix.

### 6. No location-transparent RPC layer

- **Same process (same host):** call Nest services in-process. Former HTTP between modules that now
  share a host (e.g. talos folded into `api`) must not remain HTTP.
- **Cross-process:** use an **explicit** HTTP client or an explicit DB job write at the seam.
- Do **not** build a transport-switching port that hides whether a collaborator is local or remote.
  Seams should look like seams.

“Same toy box” means the same running process — not “merge `api` and `worker`.” Default topology
remains two hosts; modules that are worker-only by design may safely assume they dial `api`.

### 7. Capability-owned ops DB writes (not “api sole writer”)

Legacy already proved that “only tiamat writes ops” is tedious and routinely violated for good
reasons (telemetry status columns, notification send pipeline, field-ops job state). Baseline:

- **Writers follow behavior ownership (ADR-013):** the host that runs a behavior’s writer may
  write the tables/columns that behavior owns — including workers writing ops DB when appropriate.
- **HTTP → `api`** when the mutation needs shared orchestration or invariants (create-customer,
  payouts, issue recalculation, etc.).
- Workers may write, without apology:
  - **Job / outbox / pipeline state** they own (e.g. `notifications` status),
  - **Narrow telemetry / denormalized status** that is a side-effect of collection (e.g. DCU
    online flags, meter last-consumption timestamps, production-owned `grids` monitor fields),
  - **Specialty stores** they own (e.g. Timescale for Production Monitoring).
- This is **not** “any host may write anything.” Random cross-cutting writes of another
  capability’s orchestration path remain forbidden; use HTTP or move the behavior.

### 8. Retire the bidirectional `*_API` mesh

The legacy env matrix (`TALOS_API` / `YETI_API` / `LOCH_API` / `TIAMAT_API` + keys) is **migration
debt**, not a pattern to formalize. As each capability is imported:

- Delete obsolete host-to-host URLs.
- Keep **`api` base URL + machine credential** on in-stack callers that need sync orchestration.
- Add **named reverse URLs** only for recorded §5 exceptions.
- Integrable extracted services (§9) use their own client config (service URL + callback
  registration), not the old mesh variable names.

### 9. `worker` is not an HTTP peer server by default

Default `worker` shape: **cron / consumer** — outbound HTTP to `api` when needed; inbound HTTP
limited to **health/probes** (and whatever the deploy platform requires).

Narrow inbound HTTP on a worker is allowed as a **recorded exception**, especially when a
particular worker composition needs it. Time and composition will force some exceptions; the
default remains “not a peer API server.”

### 10. No broker as the inter-host integration bus

Valkey/Redis (or any message broker) is **not required** for `api`↔`worker` communication in the
OSS baseline. Async prefers DB jobs; sync uses HTTP.

A broker may still appear:

- as **private implementation** inside an extracted service (device-messaging in-flight state —
  ADR-010), or
- as an **opt-in** for large deployments later,

but ADR-005 does not make a broker the platform mesh.

### 11. Integrable extracted services (device-messaging) are not in-stack peers

**In-stack hosts** (`api` ↔ `worker`): same household — swap phone numbers under §5–§6; fridge
notes (DB) are normal.

**Integrable extracted services** (device-messaging per ADR-010, and similar future split-outs):
more like a delivery company any adopter can hire:

- Call **their** HTTP API to enqueue/inspect/cancel work.
- **Register callback URL(s)** up front (or equivalently configure webhooks) so they know where
  to deliver updates — the callback need not be on every request.
- Their Redis/Valkey (or other volatile store) is **private** to that service.
- Interactions with third-party platform components (Chirpstack, STS token generator, …) are that
  service’s outbound integrations, not a second nxt host mesh.

Endpoint and webhook details remain owned by **ADR-010** and by
[`nxt-device-messaging` ADR-003](https://github.com/nxtgrid/nxt-device-messaging/blob/main/docs/architecture/003-public-http-contract.md).
This ADR only classifies the relationship so imports do not pretend device-messaging is
“just another worker.”

**NXT suite default when Metering is on (amendment 2026-08-25).** Metering is an
opt-in capability (ADR-007). If it is off, there is no device-messaging component
and `api` does not call that HTTP API.

When it **is** on, device-messaging is a **same-app sidecar**: pull
`ghcr.io/nxtgrid/nxt-device-messaging:<tag>`, **one replica**, **dedicated** Valkey.
`api` calls the **private** URL (`${device-messaging.PRIVATE_URL}` / port **3100**), not
the public `*.ondigitalocean.app` hostname. ChirpStack (usually outside the app) uses the
**public** host for `POST /ingress/:pluginId`. The webhook back to `api` should also use
`api`’s private URL; HMAC is still required. Runbook:
[`docs/deployment/digital-ocean-buildpack.md`](../deployment/digital-ocean-buildpack.md).
TypeScript/Zod: `@nxtgrid/device-messaging-contract`. Local analogue: `pnpm dev` in
`../nxt-device-messaging` and `DEVICE_MESSAGING_BASE_URL=http://127.0.0.1:3100`.

## Consequences

### Positive

- Lean self-host default: `api` + `worker` + DBs, plus device-messaging as a hired sidecar
  when meters are in play; no mandatory broker or location-transparent RPC.
- Most legacy mesh edges disappear (same-host in-process) or become DB dual-access / job tables.
- Residual sync paths stay simple (HTTP + ADR-014) and fit DO VPC and docker-compose private
  networks alike.
- Write rules match production reality (telemetry + job pipelines) without reintroducing
  “everything must finish via api.”
- Device-messaging stays adoptable outside the nxt stack while sharing one cross-host *policy*
  family (HTTP + callbacks), not a special platform bus.

### Negative / Risks

- Capability imports must apply judgment: HTTP vs DB job vs direct write — wrong choice recreates
  mesh tedium or hidden coupling. Mitigated by this ADR’s tables and the migration decisions log.
- Unidirectional HTTP default will need recorded exceptions; discipline required so exceptions do
  not become the mesh again.
- Per-capability job tables may duplicate claim/retry patterns until a second user justifies shared
  helpers.
- Direct worker writes to ops columns on shared entities need clear ownership (ADR-013) so
  “status side-effect” does not become unbounded schema coupling.

## Related

- **ADR-004** — hosts, decomposition principle, lean default footprint, capability map.
- **ADR-007** — per-deployment config; where `api` base URL / machine credentials are supplied.
- **ADR-010** — device-messaging extraction; HTTP API + webhook callbacks; private Redis;
  NXT suite sidecar topology (amendment 2026-08-25).
- **ADR-012** — cutover notes `api`/`worker` flip asymmetry; database as primary integration point.
- **ADR-013** — capability-owned behavior over shared entities (write/ownership companion).
- **ADR-014** — machine credentials, scopes, route allowlist for residual HTTP.
- **002e** — Energy Production Monitoring import; first major consumer of this ADR.
