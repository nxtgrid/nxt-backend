# Metering: Device-Messaging Client Scaffold — Engineering Plan

**Decision:** ADR-010 (`docs/architecture/010-device-messaging-service-extraction.md`), Amendment §I
**Plan number:** 003
**Created:** 2026-09-08
**Status:** 🟡 **Tasks cut.** Decisions D1–D16 settled. Skeleton first (T1–T3), then meat (T4–T6). No code yet. T1 is next.

---

## Why this plan exists

ADR-010 Amendment §G committed to re-cutting plan 001 into a per-repo pair:

> Plan 001 is re-cut into a per-repo pair on that boundary. The service build-out moves to the new
> repo; what remains here is the nxt-backend-side work.

The service build-out is done and lives in [`nxt-device-messaging`](https://github.com/nxtgrid/nxt-device-messaging).
This plan is **the nxt-backend-side half**. Plan 001 stays stale and is not rewritten (a 1024-line
rewrite is a bad review diff); it carries a pointer here.

## Scope of this slice

Create the **connection** from `nxt-backend` to the `nxt-device-messaging` sidecar, gated behind an
opt-in Metering capability. Deliberately **no-op or shell** for everything downstream of the wire.

In scope:

- A `device-messaging-client` glue module that can enqueue, look up, mint tokens, and
  receive the outbound webhook — `apps/api/src/modules/device-messaging-client/` (D13).
- A **lean shell** `meter-interactions` Nest module + service that registers a no-op
  handler on the glue and does nothing meaningful with the event — no webhook
  controller (D14) — `apps/api/src/modules/metering/meter-interactions/` (D13).
- `capabilities.metering` in the config schema — the first real Tier-1 capability.
- Tier-1 conditionals in `apps/api/src/modules/app.module.ts` only: spread
  `MeterInteractionsModule` behind the flag (D13). That module imports
  `DeviceMessagingClientModule`. `worker`'s matching placeholder stays empty — collection
  (yeti successor) does not enqueue (D12).
- Fail-fast wiring per ADR-010 §I.

Out of scope: meter state management (ADR-002*), directive batches / load shedding (ADR-011),
after-effects, reconciliation, websocket emission, any new database table or migration.

## Reference material

| What | Where |
|---|---|
| Prior art (do **not** treat as given) | `../skyfox/apps/tiamat/src/modules/device-messaging-client/` — 801 LOC |
| Wire contract | `@nxtgrid/device-messaging-contract` (v0.1.2, ESM, peer `zod ^4.4.3`) |
| Normative routes / auth / HMAC | `nxt-device-messaging` ADR-003 + `docs/guides/integrating.md` + running `/swagger` |
| Consumer classification | ADR-005 §11 and its 2026-08-25 amendment |
| Env + deploy | ADR-010 §I, `docs/deployment/digital-ocean-buildpack.md` |

**Do not use ADR-010 decision 2 as the route list** — it is stale (§C, §D).

---

## Settled decisions

### D1. `meter-interactions` keeps nxt-backend conventions; the sidecar does not lead

`meter-interactions` lands in `api` as a lean shell keeping its current outward surface. Nest DTOs
with `class-validator` stay at the **controller** boundary. Conventions are not changed because one
sidecar exposes Zod schemas.

Precision from skyfox: there are two different things called "DTO" there.
`meter-interactions/dto/create-meter-interaction.dto.ts` is a real Nest DTO (class + `IsIn` /
`IsNumber` / `IsObject`, bound to `@Body()`). But `device-messages/dto/create-device-message.dto.ts`
and `generate-token.dto.ts` are plain `type` aliases with no decorators and no validation — internal
module-to-module contracts that happen to live in a `dto/` folder. So the glue's inward-facing
contract is a plain TypeScript type we can shape freely without touching Nest validation.

### D2. The glue is an anti-corruption layer, not a domain layer

Its single job is translating between nxt-backend's NestJS + Postgres/snake_case conventions and the
sidecar's camelCase HTTP API. Nothing about the sidecar's shape propagates inward.

### D3. Consume `@nxtgrid/device-messaging-contract` for **types**, as convenience

This is the biggest departure from skyfox, and it is available to us for a reason skyfox states in
its own source: *"Skyfox is CommonJS and does not take `@nxtgrid/device-messaging-contract`."*

nxt-backend can take it:

- `libs/core/package.json` is `"type": "module"`; `libs/core/src/config/loader.ts` uses
  `import.meta.url`; `apps/api/src/main.ts` uses `await import('./modules/app.module.js')`. The
  runtime is ESM.
- The api runtime graph already contains **exactly one** zod, `4.4.3`, declared by
  `libs/core/package.json` and loaded at boot because `main.ts` calls `loadConfig()` before
  `NestFactory.create`.
- The contract declares zod as a **peer** at `^4.4.3` — exact match, uses our instance, no second
  copy, no dual-instance hazard.
- The `zod@3.25.76` in `pnpm-lock.yaml` is **devDependency-only**, via `better-supabase-types`
  (the `gen-better-types` script). It is not in any runtime graph.

Consequence: **drop skyfox's `lib/types.ts` (139 LOC) entirely.** It is hand-maintained wire types
that exist only because of the CJS constraint.

### D4. Validation is asymmetric by direction

**Outbound** (enqueue body, token body): types only, no runtime validation. We construct these,
TypeScript is sufficient, and the sidecar validates and returns `400` with `issues` if we are wrong.
Do not validate our own construction twice.

**Inbound** (webhook body, enqueue `201`, GET `200`): `safeParse` against the contract's schemas
(`webhookEventSchema`, `deviceMessageResponseSchema`, `deliveryStatusSchema`).

Two reasons Zod beats a hand-written guard here, neither of them "Zod is nicer":

1. `safeParse` returns a **reason** (`error.issues` with field paths). That is what makes a
   quarantine record actionable. Skyfox's `isWebhookEvent()` returns a bare boolean — it tells you
   it failed and nothing about why, which defeats the purpose.
2. The enum validators are the **only** mechanism that catches deploy skew. Typecheck validates
   against the lockfile, not against the container that is running. Nothing forces a contract bump
   when the sidecar image tag moves, and adopters self-host the sidecar on their own cadence. A
   `deliveryStatus` value added by a newer sidecar passes a type-only cast silently and surfaces
   later as an unhandled `switch` branch or a rejected Postgres enum write.

Skyfox is weakest exactly here: `payload as WireDeviceMessageResponse` with no check at all.

### D5. Zod is confined to the glue's boundary files

Zod appears **only** in the glue module's boundary files. Never in `meter-interactions`, never in a
controller DTO, never in a service signature, never in a shared type. Everything the glue hands
inward is a nxt-backend type. This is what keeps D3/D4 consistent with D1.

### D6. The webhook always returns 2xx

Verify HMAC over the raw body, then `safeParse`, then either publish the mapped event or quarantine.
Return 2xx in **both** cases. Never `class-validator` on this route, never a `400`.

This is settled on evidence, not taste. The sidecar's policy:

```ts
// nxt-device-messaging/src/engine/webhook/service.ts:56
export function isRetryableWebhookStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}
```

A `400` is **not retryable**, so the sidecar dead-letters immediately
(`store.deadLetter(..., config.deadLetterTtlSeconds)`, metric `dlq`) — and that branch has **no
`logger.error`**; only the retry-exhausted path in `_onFailure` logs. So a `class-validator`
rejection would put a real delivery result into a Redis DLQ **in another service**, under a TTL,
with no log line, while the meter genuinely executed the command. A `500` is worse in a different
way: it lands in the retryable band, so you get backoff retries and then the DLQ anyway.

Inbound **HTTP responses** may throw, unlike the webhook — those are synchronous request paths where
nxt-backend's own calling code is present to handle the failure.

Requires `NestFactory.create(AppModule, { rawBody: true })` in `apps/api/src/main.ts`, which is not
set today.

### D7. Quarantine is a structured log, not a table

On inbound validation failure: `logger.error` carrying `eventId`, `correlationId`, the Zod issue
paths, and the contract version we are compiled against. No new table, no migration, no ADR-009
governance in this slice. The contract version in the log line is the actual detector for the deploy
skew described in D4.

### D8. Config validation stays at runtime; add a CI parse check

Moving config validation to build time is structurally impossible. `loadConfig()` resolves
`NXT_CONFIG_JSON` → `NXT_CONFIG_URL` (reserved) → `NXT_CONFIG_PATH` → bundled
`config.default.json`; three of four are deploy-time inputs, because ADR-007 decision 4 exists so an
adopter supplies config **without rebuilding the image**. Zod cannot leave the runtime graph.

Additive instead: a test/CI check that `config.default.json` and `config.example.json` both still
parse against `nxtConfigSchema`. This catches the two committed artifacts drifting when the schema
grows — which happens in this slice, since Metering is the first capability to add a subtree.

### D9. Casing marks which side of the glue you are on (resolves Q1)

**The rule.** Everything inside nxt-backend is `snake_case` — every field, including ones with no
Postgres column behind them. `camelCase` appears **only** in the glue's wire-facing files, and per D3
those types come from the contract package rather than being hand-written. No mixed-case objects
anywhere. Casing is not a statement about a field's provenance; it says which side of the glue you
are on.

This preserves the property the estate depends on: Postgres is snake, the Supabase REST client hands
snake to both backend and frontends, and values pass through nxt-backend untranslated. There is
exactly one casing boundary in the system, at the glue's outer edge.

**The glue owns both renames.** Casing *and* vocabulary. Its inward contract speaks
`meter-interactions` vocabulary; `device-messages` vocabulary belongs to the external service and
never reaches a caller. So `transactive_kwh` → `payload.kwh` and `target_power_limit` →
`payload.powerLimit` happen inside `to-wire`, not in the calling service. This is what makes the glue
an anti-corruption layer (D2) rather than a case converter.

**Rejected lead: skyfox's `GenerateTokenDto` is not a model.** The plan previously read an implicit
rule there — "snake mirrors a column, camel is transport-only or computed." Tracing every field back
through `meter-interactions.service.ts:213-225` disproves it: `decoderKey` ← `meter.decoder_key`,
`payload.kwh` ← `interaction.transactive_kwh`, `payload.powerLimit` ← `interaction.target_power_limit`,
`manufacturer`/`protocol` ← derived from `meter.communication_protocol`. Five of six camelCase fields
mirror a column; the sixth (`issueDateString`) is a formatted projection of
`meter.last_sts_token_issued_at` that is written back to it. What actually predicts the casing is
that those are *the sidecar's names* — `external_reference` is the lone survivor of estate
vocabulary. The DTO is a half-translated wire body, not a principle.

Related defect to avoid: skyfox does the semantic rename at `meter-interactions.service.ts:224-225`,
**outside** the client. The domain service absorbs the corruption and the glue mostly passes fields
through — the inverse of D2.

**Opaque plugin `response.data` is never rewritten.** Skyfox's recursive `keysToSnakeCase` is
dropped. The contract declares that field `z.record(z.string(), z.unknown())`, *"Opaque object
payload; plugins own the concrete shape"* — a regex rewrite invents a shape neither the contract nor
the plugin declares, and every future reader must know the regex to interpret storage. The
digit-boundary hack (`([A-Za-z])(\d)`) exists to serve exactly one key in the whole estate,
`source2Activated` in `calin-chirpstack/lib/decode-response-data.ts`. It is tuned to a sample, not
derived from a spec — there is no spec, which is what "opaque" means. The practical cost is
debuggability: the plugin source, `/swagger`, the sidecar logs and its Redis DLQ all say
`source2Activated` while our database would say `source_2_activated`, across a service boundary we
do not control.

The glue therefore hands `response.data` inward **verbatim and opaque**. Passing it through
unmodified also keeps it faithful as a cross-host payload should Q4 ever land on
DB-as-integration-point.

**Deferred, deliberately.** Verbatim pass-through would put a camelCase island inside an otherwise
snake_case structure — e.g. a CALIN API V1 `READ_METER` result is
`{ kwhCreditAvailable: 12.5, isOn: true }` (`calin-api-v1/incoming.ts:100`) nested under a snake_case
`response`. That only becomes a *public-surface* problem if it is served to `qilin`/`pegasus`, and
this slice persists and exposes nothing (meter state, storage and websocket emission are out of
scope). Whether the blob is persisted and exposed — and if so whether it is mapped to typed
snake_case fields per command type — is a meter-state decision under ADR-002*, made when there is a
schema to map into. If estate-wide snake on the public surface turns out to be a hard line, the
correct fix then is an explicit typed map owned by meter-state, not a regex in the glue.

### D10. No port or adapter abstraction — direct dependency (resolves Q2)

`meter-interactions` depends on the glue directly. No `CommandDeliveryPort`, no adapter selection, no
Tier-2 provider for command delivery.

**The ADR tension recorded in Q2 was stale on both sides.**

*ADR-001 no longer governs.* Its subject is the in-process pipeline's PUSH/PULL adapters, which left
this repo under ADR-010. Verified in the sidecar: Option 3 (strategy) became the plugin SPI, a
discriminated union on `deliveryPattern` (`PUSH` / `PULL` / `NONE`) in
`src/plugins/plugin.interface.ts`; Option 1 (adapter-level configuration) became named admission,
where *"Core executes `spacing` / `concurrency`; plugins only declare which one."* ADR-001 is now
marked **Superseded** and removed from the `AGENTS.md` routing index.

*ADR-004 decision 4 has been reworded.* The ports-and-adapters sentence was the other half of the
tension. It now reads as opt-in capability modules with vendor adapters only where a third party is
genuinely interchangeable — which is the estate's actual practice — and decision 8's
"`device-messages` behind a port boundary" clause is struck as superseded by ADR-010.

**The substantive reason, independent of the documents.** Ports-and-adapters exists to swap vendor
implementations, and that variability physically moved to the sidecar. nxt-backend's single
downstream is not a temporary state a second meter brand would end: supporting a new brand means a
new **plugin in the sidecar**, not a new adapter here. A port in this repo would abstract over a set
of size one that cannot grow along the axis ADR-004 cares about. Only a competitor to
`nxt-device-messaging` itself would grow it, and none is proposed. The sidecar *is* Metering's
adapter layer for command delivery; a second one here would satisfy the letter of the old §4 while
duplicating its purpose.

**Maintainer input (2026-09-08).** Metering without device messaging is **not** a real adopter
scenario — if you use Metering you get device messaging. This removes the one case that would have
justified a port (ADR-004 decision 6's "safe/manual mode" with a `none-yet` provider). Fail-fast per
ADR-010 §I stands, and ADR-004's honesty rules now carry a clarification saying so.

**The converse is noted but not now.** Far future, device messaging may serve capabilities other than
Metering. It is not a requirement today. D11 puts the glue in its own namespace so a future
non-metering consumer does not import from inside Metering. Placement is D13.

**The seam is already present.** D9's inward contract is the port in all but name. Introducing a real
one later is a one-file change — swap the concrete factory's registration for an interface token. No
caller moves. Do not pre-build it (ADR-004's trigger: a second real adapter validates the
abstraction).

**Consequence for Q7:** nothing to select for command delivery in this repo. The config surface is
the Metering on/off flag (D15).

### D11. Own Nest module `device-messaging-client`; Injectable public surface (resolves Q3)

**Namespace.** The glue is its own Nest module, not nested under Metering. Folder, module, and
service: `device-messaging-client` / `DeviceMessagingClientModule` /
`DeviceMessagingClientService`. The `-client` suffix is load-bearing — it is the thing in this repo,
not the sidecar.

**No config opt-in of its own.** The client is not a second flag. If you use Metering you get the
client (D10). AppModule spreads `MeterInteractionsModule` behind `capabilities.metering`
(D13); that module imports `DeviceMessagingClientModule` (which **exports** the service).
There is no wrapping Nest `MeteringModule`. A later non-meter consumer imports the client
module itself — not from inside `metering/`. Nest walks the import graph; the client does
not also need to be listed in AppModule.

This is the D10 converse made concrete: do not bury the glue where a later consumer would have to
import from inside Metering. ADR-013's "behavior belongs to the owning capability" does not put this
under `metering/` — command delivery is a shared downstream, not Metering-owned behavior. The
reason the client stays a **sibling**, not under `metering/`, is a later non-meter field device
(feeder sensor, theft monitor) that talks through the sidecar: it must not import from inside
Metering, and it does not revive the dropped generic `devices` registry. Identity on that pipe is
already `device.type` + `externalReference`.

**Public surface is Nest, matching this host.** A Nest module is required anyway: the webhook is a
controller, and consumers inject a provider. The original Q3 recommendation (factory + closure
registered as the provider) is **withdrawn**. That DI style belongs to the sidecar, which has no
container (its ADR-001). This host is Nest throughout (`HealthModule`, `AuthModule`, …), and D1
already said the sidecar does not lead. A `useFactory` provider here would be a one-off convention
for no gain.

**Factory + closure stays in `lib/`**, where skyfox already had it and where D5 wants it: `to-wire`,
`from-wire`, HTTP, HMAC verify. No Nest types, no Zod leaking inward. The `@Injectable` class is a
thin wrapper that Metering injects.

Sketch:

```
device-messaging-client/
  device-messaging-client.module.ts     // provides + exports the service; registers the webhook controller
  device-messaging-client.service.ts    // @Injectable; enqueue / get / generateToken / registerHandler
  device-messaging-events.controller.ts
  lib/                                  // to-wire, from-wire, http, verify
```

Placement is D13. Q4 is settled as api-only (D12).

### D12. `api` only — worker never enqueues (resolves Q4)

The device-messaging client, the webhook, enqueue, and the cron-driven command loops
(directive-batches, scheduled `READ_*`, reconciliation) all live on `api`. `worker` does not import
the client, does not enqueue, and does not receive the webhook.

**Collection is a different path and never dispatches.** `worker` is the yeti successor
(ADR-006). Skyfox's `yeti` has zero references to device-messaging, enqueue, or
meter-interactions. Consumption arrives as vendor *reports*, not as commands:

- CALIN V1 — `POST /COMM_HourlyDataNew` against the vendor HTTP API
  (`calinv1.service.ts`).
- CALIN V2 — `POST /API/DailyReport/Read` against the vendor HTTP API
  (`calinv2.service.ts`).
- CALIN LoRaWAN — excluded from that pull (`calin.service.ts`: *"they rely on a push
  mechanism"*). ChirpStack receives the hourly report, tiamat reroutes it, yeti writes it via
  `insertHourlyReadReport`. `device-data-sink` is a separate ingest of the same kind. Yeti's
  LoRaWAN code talks to ChirpStack gRPC only to *list gateways* (`getConcentrators`), never to
  downlink.

None of those paths send a message to a meter. A Metering collector on `worker` therefore does
not need this client.

**The command crons stay on `api` because they close on the webhook.** Load-shedding batches,
scheduled `READ_*`, and `reconcileSuspendedInteractions` issue a command and then depend on the
result to decide the next action (ADR-002b3). The webhook can land in one place; ADR-005 §9
keeps `worker` inbound HTTP to health/probes; ADR-005 §11 and ADR-010 §I already name `api`'s
private URL as the callback. Splitting enqueue onto `worker` would make meter-state the
cross-host integration point *before* ADR-002* has a schema, and would race coalescing /
in-flight checks across two processes. ADR-005 §11 permits "fridge notes," but that is a cost
to pay when a host split is required, not a reason to invent one.

**Load does not reverse this.** If grouping computation later outgrows `api`'s event loop,
ADR-004 §8's split is compute versus dispatch: a worker writes an intent/job row (ADR-005 §4);
`api` claims it and enqueues. The client stays on `api`.

**Consequence for placement:** host-specific under `apps/api/src/modules/` (D13). Do not promote
to a lib. `worker`'s Tier-1 placeholder stays empty. Fan-out is in-process (D14).

### D13. Folder namespace, not a Nest `MeteringModule` (resolves Q5)

Host-specific under `apps/api/src/modules/`. Promote a Nest module to a lib only when two hosts
actually import it — not speculatively. D12 closed that for this client.

**Two meanings of "module" stay distinct.** A *capability* is the opt-in unit
(`capabilities.metering`). A *Nest module* is a compile/runtime unit (`MeterInteractionsModule`).
Grouping them is a **folder**, not a third kind of module.

A wrapping Nest `MeteringModule` that re-exports interactions, meters, batches, installs, … is a
contribution function in class form. ADR-007's 002d amendment already rejected `xModules(config)`:
hosts compose **explicitly** in `app.module.ts`, and when the list gets long it moves to a
co-located `app.composition.ts` — still a list. Tiamat's flat forty-sibling `app.module.ts` is the
warning.

Nest modules stay at the **behavior** grain the estate already evolved into (not table=module, not
capability=one Nest module). Later arrivals (`meters`, `meter-command-batches`, `meter-installs`)
are additional Nest modules, not merges.

**Layout:**

```
apps/api/src/modules/
  device-messaging-client/          # D11: own namespace, not under metering/
  metering/                         # folder, no metering.module.ts
    meter-interactions/             # this slice's lean shell
```

`metering/` is a **product** namespace (LV network + customer meters), not a claim that every
measuring device lives there. Create it now with one child so the first capability does not land
as another top-level dump.

```ts
...(cfg.capabilities.metering?.enabled
  ? [MeterInteractionsModule]
  : [])
```

The array *is* the capability — `MeterInteractionsModule` is what you turn on. That module
imports `DeviceMessagingClientModule`; Nest registers the client's providers and controllers
as part of that import. Listing both in AppModule only duplicates the graph. ADR-007's
illustrative `[MeteringModule]` was shorthand; taking it literally fights the amendment that
killed contribution functions.

The folder does not have to contain every table Metering *touches* (customers, connections). A
later non-meter field device is either another Nest module in this folder or a second Tier-1 flag
(ADR-013 cost/independence) — not a revived generic `devices` registry, and not a reason to nest
the client. Command-loop traffic still uses the client; collector telemetry still does not (D12).

### D14. Client owns the event; `registerHandler`; 2xx then dispatch; `eventId` dedupe (resolves Q6)

The webhook is **"the client received an event,"** not **"meter-interactions got a callback."**
ADR-010 decision 2 replaced the *engine's* in-process `static subscribers` with the HMAC webhook.
That hop is done. What still has to exist, one layer up, is inversion of control: the controller
lives on `device-messaging-client` (D11), `api` is the only listener (D12), and a later non-meter
consumer must not be reached by calling into `meter-interactions`.

**Fan-out.** `registerHandler` on `DeviceMessagingClientService`. Consumers inject the client
(they already do for enqueue) and register. The controller never imports `meter-interactions`.
The lean shell registers a no-op handler so the path is wired. Do not add `@nestjs/event-emitter`
— this host does not have it, and a stringly-typed bus is a junk drawer for one event. Do not
name it `subscribe` / `publish` (that is the engine's ghost). Meter-interactions does **not**
get a webhook controller.

**Ack, then dispatch.** After HMAC + `safeParse` + map: record `eventId`, return **2xx**, then
dispatch handlers. Do not await them. Catch and log (skyfox's `forEach(fn => { fn(message) })`
leaves unhandled rejections). HMAC failure stays **401** (not retryable). Quarantine stays
**2xx**. D6 is unamended: a successfully parsed event is always 2xx.

The sidecar retry loop is transport — `api` down, 2xx lost on the wire — not our job queue. A
500 on handler throw would enlist that loop in a Postgres write; a permanent handler bug then
dead-letters a delivery that already happened on the meter, which is the failure mode D6 was
written to prevent. Crash-after-ack and a failed write wait for reconciliation (ADR-002b3), not
for a 500. After-effects later must not sit on this request; they are not on it because we do
not await.

**`eventId` dedupe in the glue.** In-memory set, TTL past the sidecar retry budget (~10 min).
Same `eventId` after we have accepted → 2xx, no second dispatch. No table (D7), no Redis (`api`
does not have one; the sidecar's Valkey is private). Restart during the retry window can
re-run handlers; they still need to be idempotent. Skyfox drops `eventId` in `fromWebhookEvent`
and prepends `failure_history` on every POST — a retried ack would double-apply. Record the id
**before** dispatch so a lost 2xx retry cannot overlap an in-flight handler.

**Inward type** is estate-shaped, snake_case, and includes `event_id` and opaque
`correlation_id` (D16). Not `Partial<DeviceMessage>`. Full field list stays D9.

### D15. Metering config is on/off; pluginId from the device row; `/health` stays local (partial Q7)

**Config.** `capabilities.metering` in `libs/core/src/config/schema.ts` is `{ enabled: boolean }`,
optional. Missing key = off. `config.default.json` / `config.example.json` stay
`capabilities: {}`. D8's CI parse check starts to earn its keep when this subtree exists.

Do not add `deviceAdapters` (or any provider list) under Metering. ADR-007 decision 5's
illustrative `"deviceAdapters": [ { "adapter": "calin-api-v2" }, … ]` is leftover from
in-process `device-messages`. Decision 6 already said that section would travel with the
extraction; the sidecar's `plugins[]` is now that allowlist. A second list here would drift
and fail as a sidecar `400`.

Speak in adopter terms. The useful question is whether to turn Metering on. Extra config
appears later only where this process actually chooses a 3rd-party vendor (Payments /
Flutterwave, not this client). ADR-004/007's "tier" vocabulary stays in those ADRs; do not
lead with it in schema, README, or this module.

**`pluginId`.** The device row decides. An adopter who enables Metering provisions meters of a
certain kind; those rows carry the protocol (and manufacturer, when we have it). The glue maps
those estate fields to a sidecar `pluginId` — skyfox's `lib/plugin-id.ts` is that map, including
the token split (`nxt-sts` for LoRaWAN mint, `calin-chirpstack` for enqueue). Meter-interactions
never says `calin-chirpstack`. A protocol with no mapping throws here, not after a silent wire
call.

nxt-backend **assumes the sidecar is set up correctly** for those plugins (enabled and
configured). This host does not duplicate or validate the sidecar's plugin list.

**`/health`.** `HealthService` does not probe the sidecar. The sidecar has its own `/healthz`
for its App Platform / container check (ADR-005 §11: each component is probed independently).
Coupling `api`'s probe to the sidecar would restart `api` when only delivery is down, while
Foundation still serves. Boot fail-fast (ADR-010 §I) covers missing `DEVICE_MESSAGING_*` when
Metering is on. Sidecar outage after boot is an enqueue/GET failure the caller handles, not a
liveness failure.

### D16. Glue methods, not public routes; caller mints `correlation_id` (resolves Q7)

**Two surfaces.** The four names in the leftover Q7 rec (enqueue, GET, `token/generate`, webhook)
are **sidecar** routes the glue *calls* — except the webhook, which the sidecar calls *us*. They
are not Nest controllers on `device-messaging-client`. Product HTTP stays on meter-interactions
(and meters, for “mint a token for this meter”). Frontends never hit the client. Skyfox is
already that shape: `GET …/meter-interactions/:id/delivery-status` internally calls
`getByMeterInteractionId`; token is meters → meter-interactions → `generateToken`.

The **one** HTTP route on the client is the inbound webhook (D14). In-process, meter-interactions
injects the client and calls `enqueue` / `get` / `generateToken` / `registerHandler`. A later
non-meter consumer injects the same client; it does not go through meter-interactions.

**Glue implements** `enqueue`, `get(correlation_id)`, `generateToken`, plus the webhook
controller. **Defer** cancel (`POST /message/cancel`, `/messages/cancel`) and
`POST /plugin/provisioning`. Skyfox never calls cancel; ADR-010 §D already called it
speculative. Provisioning belongs to meter-installs, out of this slice. This slice’s lean
shell does not add meter-interactions HTTP; delivery-status / token routes land when that
module is more than a no-op.

**`correlation_id` is opaque on the glue.** The sidecar treats it as the caller’s job id.
Meter-interactions **mints** it when it has a row — skyfox’s `mi:{id}` convention stays,
but in meter-interactions, not in the client. Do not copy `lib/correlation-id.ts` into the
glue; `getByMeterInteractionId(number)` is the defect to avoid. A later consumer would
otherwise inherit an `mi:` prefix that is Metering’s namespacing, not the pipe’s.

The lean shell does not persist, so it does not mint. The convention is documented for the
slice that inserts `meter_interactions`. Inward events carry `correlation_id: string`;
unsolicited events omit it; the meter-interactions handler ignores those. PK type of `id`
is a schema decision, not a glue one.

---

## Open questions

Q1–Q7 are resolved. Task breakdown can be cut.

### Q1. Naming and translation across three surfaces

**Resolved → D9.**

### Q2. Port-and-adapter, or direct dependency?

**Resolved → D10.**

### Q3. Module, factory, or functions?

**Resolved → D11.**

### Q4. Does `worker` need this? (the sharability question)

**Resolved → D12.**

### Q5. Placement

**Resolved → D13.**

### Q6. Webhook fan-out and the pub/sub question

**Resolved → D14.**

### Q7. Config surface and endpoint scope

**Resolved → D15 + D16.**

---

## Environment and wiring (from ADR-010 §I)

Secrets in env, never in the config artifact:

| Var | Meaning |
|---|---|
| `DEVICE_MESSAGING_BASE_URL` | Private component URL; port **3100** |
| `DEVICE_MESSAGING_API_KEY` | Bearer toward device-messaging |
| `DEVICE_MESSAGING_WEBHOOK_SECRET` | Same value as the sidecar's webhook secret |

Fail-fast via `requireEnv` (`libs/core/src/config/require-env.ts`, throws `MISSING <name>`) at the
glue's own wiring point — ADR-007 decision 9 Layer 2, not in a composition wrapper. ADR-010 §I: *"If
Metering is on and the URL is missing, fail boot (or degrade that capability). Do not silently no-op
enqueue."* If Metering is off, these vars are not required.

Local dev: `pnpm dev` in `../nxt-device-messaging` with
`DEVICE_MESSAGING_BASE_URL=http://127.0.0.1:3100`.

## Reuse verdict on the skyfox client

| Skyfox file | LOC | Verdict |
|---|---|---|
| `lib/types.ts` | 139 | **Delete** — contract package replaces it (D3) |
| `lib/to-wire.ts` + `lib/from-wire.ts` | 252 | Governed by D9. Reuse the field-by-field shape; drop `keysToSnakeCase`; move the semantic rename in from the domain service |
| `lib/http-client.ts` | 119 | Reuse the shape; add the inbound validation it could not have (D4) |
| `lib/plugin-id.ts` | 77 | **Glue** — code map from device-row fields to `pluginId` (D15), including the token split. Not config. |
| `device-messaging-client.service.ts` | 76 | Governed by D14. Drop `subscribe` / `publish`; `registerHandler` + in-memory `eventId` set; dispatch after 2xx with catch/log |
| `device-messaging-events.controller.ts` | 65 | Reuse structure; needs `rawBody: true` (D6); 2xx then dispatch (D14), never import meter-interactions |
| `lib/verify-webhook.ts` | 24 | Copy near-verbatim; it is correct (HMAC + `timingSafeEqual`) |
| `lib/errors.ts` | ~15 | Copy |
| `lib/correlation-id.ts` | ~24 | **Not the glue** — meter-interactions mints `mi:{id}` (D16). Do not copy here. |

## Tasks

Skeleton first (T1–T3), then fill in the client (T4–T6). Each task is a small reviewable
unit; stop after each for review. The maintainer owns git.

**Out of this slice (do not add a task):** `worker` AppModule, `HealthService` sidecar probe,
deploy runbook (already written), cancel, provisioning, meter-interactions product HTTP,
`correlation-id.ts` in the glue, any table or migration.

### T1. Config flag + artifact parse check (D8, D15)

`capabilities.metering` in `libs/core/src/config/schema.ts` is
`{ enabled: boolean }`, optional, `.strict()`. Missing key = off.
`config.default.json` / `config.example.json` stay `capabilities: {}`.

Add a core test that both committed artifacts still parse against `nxtConfigSchema`, that
`{ metering: { enabled: true } }` parses, and that leftover `deviceAdapters` is rejected.
No Nest, no package, no env.

### T2. Meter-interactions shell + AppModule spread (D1, D13)

`apps/api/src/modules/metering/meter-interactions/` as a Nest module + empty service. No
product HTTP, no client yet. AppModule spreads `MeterInteractionsModule` behind
`capabilities.metering?.enabled`. Worker untouched.

### T3. Device-messaging-client shell, imported by meter-interactions (D11, D14, ADR-010 §I)

Sibling folder `apps/api/src/modules/device-messaging-client/`. Module + `@Injectable` that
`requireEnv`s the three `DEVICE_MESSAGING_*` vars and **exports** the service.
`MeterInteractionsModule` imports it. `enqueue` / `get` / `generateToken` stay stubs.
`registerHandler` is a real in-memory list; the lean shell `onModuleInit`s a no-op. No
webhook controller — HMAC is not there yet. Fail-fast now fires when Metering is on.

### T4. ACL (D3, D5, D9, D15)

Add `@nxtgrid/device-messaging-contract` on `api` on the first import. Inward snake_case
types, `lib/plugin-id.ts`, `lib/to-wire.ts`, `lib/from-wire.ts`. Glue owns casing and
vocabulary; `response.data` stays opaque. Interrogate skyfox; do not copy `types.ts` or
`correlation-id.ts`.

### T5. Outbound HTTP (D4, D16)

`lib/http-client.ts` + `lib/errors.ts`. Implement `enqueue` / `get` / `generateToken`.
Types-only on the way out; `safeParse` on `201` / `200`. No cancel, no provisioning.

### T6. Webhook inbound path (D6, D7, D14)

`rawBody: true`, HMAC verify, controller, quarantine structured log, always 2xx after
HMAC+parse, in-memory `eventId` dedupe, dispatch after 2xx with catch/log. HMAC failure
stays 401. Handler throw is not a 500.

## Session notes

**2026-09-08** — Design session. D1–D8 settled with the maintainer. Q1–Q7 recorded as open with
recommendations attached. Decided this plan supersedes the nxt-backend half of plan 001 rather than
rewriting it. No code written.

**2026-09-08 (cont.)** — Q1 resolved as D9. The `GenerateTokenDto` lead was tested against source and
withdrawn; the rule it appeared to encode does not hold. Replaced with a boundary rule rather than a
provenance rule. Q4 discussed in passing: the maintainer expects metering, enqueue and webhook to all
live in `api` as one chunk, to be confirmed when Q4 is taken up in order. No code written.

**2026-09-08 (cont.)** — Q2 resolved as D10. Investigating it surfaced two stale documents, cleaned
in a separate reviewed slice before the write-up:

- `docs/architecture/001-push-pull-pattern-divergence.md` — Status → **Superseded**, with a
  do-not-read banner and its `## Trigger` section voided (its "revisit when adding a third protocol"
  trigger now fires against a pipeline this repo no longer contains). Removed from the `AGENTS.md`
  ADR routing index, which also gained a standing rule that superseded ADRs are absent from the index
  and are historical record only.
- `docs/architecture/004-…md` — decision 4 reworded from ports-and-adapters to opt-in capability
  modules with vendor adapters where a third party is interchangeable; decision 8's device-messages
  clause struck as superseded by ADR-010; decision 6's Tier-2 line and honesty rules clarified so
  "safe/manual mode" no longer appears to contradict ADR-010 §I's fail-fast.

Q3 answered by the maintainer in the same exchange, pending write-up: the client gets its **own
namespace**, with no config opt-in of its own — any capability that uses it pulls it in by importing
it, Metering included. No code written.

**2026-09-08 (cont.)** — Q3 resolved as D11. Own Nest module `device-messaging-client`; no second
config flag; Metering imports it. Public surface is `@Injectable` + Nest module, matching this host
(the original factory-as-provider rec was withdrawn as sidecar-leading, contrary to D1). Factory +
closure stays in `lib/`. `-client` suffix confirmed. Does not settle Q4/Q5. No code written.

**2026-09-09** — Q4 resolved as D12. Maintainer confirmed collection never dispatches; verified
against skyfox `yeti`. CALIN V1/V2 pull vendor hourly/daily *reports*; LoRaWAN consumption is a
ChirpStack→tiamat→yeti push (`insertHourlyReadReport`), not a downlink. Command crons stay on `api`
because they close on the webhook. `worker` does not import the client. Q5 follows immediately. No
code written.

**2026-09-09 (cont.)** — Q5 resolved as D13. Folder namespace (`metering/`), not a Nest
`MeteringModule`. Client is a sibling at `apps/api/src/modules/device-messaging-client/`; lean
shell at `metering/meter-interactions/`. AppModule spreads the Nest modules behind the flag.
`metering/` is a product name; a later non-meter field device does not nest the client or revive
`devices`. D11 amended so AppModule no longer says `MeteringModule` only; the sibling placement
is the non-meter device. Q7's `[MeteringModule]` snippet points at D13. Break before Q6 —
webhook/pubsub evidence is a different file set. No code written.

**2026-09-09 (cont.)** — Q6 resolved as D14. ADR-010 replaced the engine's static subscribers;
in-process fan-out after the webhook is IoC, not a revival of that bus. `registerHandler` on
the client, no EventEmitter2, no meter-interactions webhook controller. Maintainer rejected
await-to-500: sidecar retry is transport, not our write-ahead. D6 unamended — parse success
always 2xx, then dispatch with catch/log. Glue dedupes `eventId` in-memory (skyfox drops it
and is not idempotent on `failure_history`). Crash-after-ack / failed write → reconciliation.
Inward event is estate-shaped and includes `event_id`. Break before Q7 — config / `pluginId` /
correlation-id / health is a different file set. No code written.

**2026-09-09 (cont.)** — Partial Q7 → D15. Maintainer: turn Metering on, then the provisioned
device row selects the plugin; nxt-backend assumes the sidecar has those plugins enabled.
No `deviceAdapters` in this config (ADR-007's example is leftover). Do not lead with
tier-vocabulary; extra config is for 3rd-party vendor choice, which this client does not
have. `/health` does not probe the sidecar (own `/healthz`). Endpoint scope and
`correlation_id` still open. No code written.

**2026-09-10** — Q7 closed as D16. Maintainer: product HTTP is meter-interactions, not the
client (webhook inbound is the exception, D14). Glue methods: enqueue, get, generateToken;
defer cancel and provisioning. `correlation_id` is opaque on the glue; meter-interactions
mints `mi:{id}` so a later non-meter caller is not stuck with that prefix. Do not copy
skyfox `correlation-id.ts` into the client. Ready to cut tasks. No code written.

**2026-09-10 (cont.)** — Tasks cut. Skeleton first: T1 config, T2 meter-interactions shell
+ AppModule spread, T3 client shell imported by that module; then meat T4 ACL, T5 outbound
HTTP, T6 webhook. D13 snippet amended: AppModule spreads `[MeterInteractionsModule]` only;
Nest walks the import graph. D11 matches. No code written.
