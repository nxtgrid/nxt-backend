# Device-Messaging Service Extraction — Engineering Plan

**Decision:** ADR-010 (`docs/architecture/010-device-messaging-service-extraction.md`)
**Plan number:** 001
**Created:** 2026-07-02
**Status:** Not started

---

## Reading guide for AI agents

This document is the **single source of truth for picking up and executing** the
device-messaging service extraction. Every task is written to be self-contained: it tells
you what the current code looks like, what the target looks like, which files to touch, and
what "done" means. You do not need the full conversation history that produced this plan.

**Before starting any task:**
1. Read the relevant "Current state" section of the task.
2. Read the actual source files referenced — they are the ground truth; this document
   describes the state at the time it was written (2026-07-02) and may drift.
3. Execute one task at a time. After completing a task, mark it `[x]` in this file and
   note any decisions or deviations under the task.
4. Respect the **Depends on** annotations — do not start a task before its dependencies
   are complete.

**Phases must be executed in order.** Tasks within a phase may be parallelised unless
a `Depends on` note says otherwise.

---

## Current codebase snapshot

> This section gives a cold agent enough context to orient before reading individual tasks.

### Where the module lives

```
apps/tiamat/src/modules/device-messages/
├── device-messages.module.ts       ← @Global() NestJS module; registers all providers
├── device-messages.service.ts      ← base class: pub/sub + retry/requeue logic
├── incoming.service.ts             ← routes incoming events to PUSH or PULL adapters
├── outgoing.service.ts             ← enqueues, distributes, runs reaper cron
├── token.service.ts                ← routes token generation to per-vendor adapters
├── dto/
│   ├── create-device-message.dto.ts
│   └── generate-token.dto.ts
├── lib/
│   ├── types.ts                    ← all shared types; key coupling points (see tasks)
│   ├── queue-moving.ts             ← shared queue primitives + QUEUE_NS_KEY, QUEUE_RETRY_KEY
│   ├── queue-moving.push.ts        ← PUSH pattern queue transitions
│   ├── queue-moving.pull.ts        ← PULL pattern queue transitions
│   ├── lifecycle.push.ts           ← PUSH timeout scanning + GW extension
│   ├── lifecycle.pull.ts           ← PULL polling + age-based timeout
│   ├── retry-helpers.ts            ← MAX_RETRIES, calculateBackoffDelay
│   ├── redis-repository/
│   │   ├── index.ts                ← Redis client (iovalkey), all data access methods
│   │   ├── keys.ts                 ← Redis key factories
│   │   └── helpers.ts              ← serialize/deserialize DeviceMessage ↔ Redis hash
│   └── chirpstack-repository/
│       └── index.ts                ← gRPC client for ChirpStack API
└── adapters/
    ├── calin-lorawan/
    │   ├── _incoming.service.ts    ← PUSH adapter: parses ChirpStack webhook events
    │   ├── _outgoing.service.ts    ← PUSH adapter: sends via ChirpStack gRPC
    │   └── lib/
    │       ├── types.ts            ← ChirpStack event shapes
    │       ├── encode-request-data.ts
    │       ├── decode-response-data.ts
    │       ├── correlate-request-response.ts  ← in-memory up/ack correlator
    │       └── connectivity-helpers.ts
    ├── calin-api-v1/
    │   ├── _incoming.service.ts    ← PULL adapter: polls Calin V1 API for task result
    │   ├── _outgoing.service.ts    ← PULL adapter: creates tasks on Calin V1 API
    │   ├── _token.service.ts       ← token generation for Calin V1
    │   └── lib/repo.ts             ← HTTP client for Calin V1 API
    ├── calin-api-v2/
    │   ├── _incoming.service.ts    ← PULL adapter: polls Calin V2 API for task result
    │   ├── _outgoing.service.ts    ← PULL adapter: creates tasks on Calin V2 API
    │   ├── _token.service.ts       ← token generation for Calin V2
    │   └── lib/repo.ts             ← HTTP client for Calin V2 API
    └── nxt-sts/
        └── _token.service.ts       ← token generation for LoRaWAN meters (HTTP to STS service)
```

### Lua scripts (currently outside the module)

```
apps/tiamat/src/queries/lua/device-messages/
├── fetch-next-message-in-queue.lua
├── fetch-next-message-in-queue.types.ts
├── move-message-between-queues.lua
└── move-message-between-queues.types.ts
```

These are loaded via `RAW_QUERIES` from `apps/tiamat/src/queries/index.ts` and consumed in
`lib/redis-repository/index.ts`.

### How the module is consumed in tiamat

| Caller | How | Location |
|---|---|---|
| `meter-interactions.service.ts` | `deviceMessageOutgoingService.enqueue(dto)` | line ~268 |
| `meter-interactions.service.ts` | `deviceMessageOutgoingService.subscribe(fn)` | line ~59 |
| `meter-interactions.service.ts` | `deviceMessageOutgoingService.getMessageByMeterInteractionId(id)` | line ~595 |
| `meter-interactions.service.ts` | `deviceTokenService.generate(dto)` | line ~220 |
| `chirpstack.controller.ts` | `deviceMessageIncomingService.handle(body, 'CALIN_LORAWAN')` | line 18 |

### Key external imports the module currently uses

| Import | Source | Used in |
|---|---|---|
| `MeterInteractionTypeEnum` | `@core/types/supabase-types` | `lib/types.ts:8` (as `DeviceMessageType`) |
| `Json` | `@core/types/supabase-types` | `lib/types.ts:8` |
| `PhaseEnum` | `@core/types/device-messaging` | `lib/redis-repository/keys.ts:1`, `lib/redis-repository/helpers.ts:16`, `dto/create-device-message.dto.ts:1` |
| `isTokenInteraction` | `@tiamat/modules/meter-interactions/lib/meter-interaction-type-helpers` | `adapters/calin-api-v1/_outgoing.service.ts:4`, `adapters/calin-api-v2/_outgoing.service.ts:4` |
| `isPhaseSpecificReadInteraction`, `PhaseSpecificReadTypes` | same as above | `adapters/calin-api-v1/_outgoing.service.ts:4` |
| `GenerateTokenTypes` | `@tiamat/modules/meter-interactions/lib/meter-interaction-type-helpers` | `dto/generate-token.dto.ts:1` |
| `RAW_QUERIES` | `@tiamat/queries` | `lib/redis-repository/index.ts:21` |
| `FetchNextMessageResult`, `MoveMessageResult` | `@tiamat/queries` | `lib/redis-repository/index.ts:21` |
| `generateRandomNumber` | `@helpers/utilities` | `adapters/nxt-sts/_token.service.ts:3` |
| `toSafeNumberOrNull` | `@helpers/number-helpers` | `adapters/calin-api-v1/_outgoing.service.ts:5` |

---

## Goals

- The module can run as an independently deployable HTTP service.
- Adding a new hardware integration requires authoring a single plugin; no core files change.
- `nxt-backend`'s `meter-interactions` module calls the service over HTTP.
- All behavior (queue state machine, retry logic, PUSH/PULL patterns) is preserved exactly.
- A Docker Compose file starts the full thing locally (service + Redis).

## Non-goals (v1)

- Multi-replica / HA deployment (deferred — see ADR-010 decision 6).
- gRPC or WebSocket transport for the command API (HTTP + webhooks is sufficient for v1).
- A UI or admin dashboard.
- Migrating the existing production deployment. v1 is the standalone service; cutover is a
  separate operational task.

---

## Phase 1 — Decouple from nxt-backend

**Goal:** remove all imports from `@core/`, `@tiamat/`, and `@helpers/` from the module.
After this phase the module folder is self-contained. No behavior changes.

**Estimated effort:** ~1 week

---

### Task 1.1 — Vendor `PhaseEnum` locally
- [ ] **Status:** Not started
- **Depends on:** nothing

**Current state:**
`PhaseEnum` is imported from `@core/types/device-messaging` (a lib in `libs/core/`).
It is used in:
- `lib/redis-repository/keys.ts` line 1
- `lib/redis-repository/helpers.ts` line 16
- `dto/create-device-message.dto.ts` line 1

**Target state:**
Declare `PhaseEnum` directly in `lib/types.ts`:
```typescript
export type PhaseEnum = 'A' | 'B' | 'C';
```
Remove the `@core` import from the three files above and update them to import from
`../types` (or the relative equivalent).

**Files to touch:**
- `lib/types.ts` — add the type
- `lib/redis-repository/keys.ts` — update import
- `lib/redis-repository/helpers.ts` — update import
- `dto/create-device-message.dto.ts` — update import

**Done when:** `grep -r "@core/types/device-messaging"` finds zero results in this module.

---

### Task 1.2 — Replace `MeterInteractionTypeEnum` and `Json` with generic types
- [ ] **Status:** Not started
- **Depends on:** nothing

**Current state:**
In `lib/types.ts` line 8:
```typescript
import { Json, MeterInteractionTypeEnum } from '@core/types/supabase-types';
```
`DeviceMessageType` is an alias for `MeterInteractionTypeEnum` (line 34).
`Json` appears in the `response.data` field of `DeviceMessage` and `ParsedIncomingEvent`.

**Target state:**
Replace with local generic types:
```typescript
// Replace MeterInteractionTypeEnum:
export type DeviceMessageType = string;

// Replace Json:
type Json = string | number | boolean | null | { [key: string]: Json } | Json[];
```
The `Json` type can be a private/unexported alias inside `lib/types.ts`.

**Files to touch:**
- `lib/types.ts` — remove the `@core` import, add the two type definitions above

**Done when:** `grep -r "@core/types/supabase-types"` finds zero results in this module.

**Note:** `DeviceMessageType = string` widens the type. The only consumer of this narrowing
is `lib/redis-repository/helpers.ts` which casts `raw.message_type as DeviceMessageType` —
that cast remains valid. Adapter-internal type maps (e.g. `CalinApiV1ReadMap`) narrow the
type for their own use, which is correct.

---

### Task 1.3 — Move Lua scripts into the module
- [ ] **Status:** Not started
- **Depends on:** nothing

**Current state:**
The two Lua files and their TypeScript type companions live at:
```
apps/tiamat/src/queries/lua/device-messages/
├── fetch-next-message-in-queue.lua
├── fetch-next-message-in-queue.types.ts
├── move-message-between-queues.lua
└── move-message-between-queues.types.ts
```
They are re-exported from `apps/tiamat/src/queries/index.ts` as part of `RAW_QUERIES`.
`lib/redis-repository/index.ts` imports them via `import { RAW_QUERIES } from '@tiamat/queries'`.

**Target state:**
Move all four files into `lib/redis-repository/lua/` (create the folder).
In `lib/redis-repository/index.ts`, replace:
```typescript
import { RAW_QUERIES, FetchNextMessageResult, MoveMessageResult } from '@tiamat/queries';
```
with direct relative imports of the `.lua` files (read as strings — check how `loadQuery`
works in `@helpers/query-helpers` and replicate the same approach locally, or inline the
`fs.readFileSync` call) and import the types from the moved `.types.ts` files.

**Files to touch:**
- Move `fetch-next-message-in-queue.lua` → `lib/redis-repository/lua/`
- Move `fetch-next-message-in-queue.types.ts` → `lib/redis-repository/lua/`
- Move `move-message-between-queues.lua` → `lib/redis-repository/lua/`
- Move `move-message-between-queues.types.ts` → `lib/redis-repository/lua/`
- `lib/redis-repository/index.ts` — replace the `@tiamat/queries` import
- `apps/tiamat/src/queries/index.ts` — remove the device-messages Lua exports (they no
  longer belong here once the module is extracted)

**Done when:**
- `grep -r "@tiamat/queries"` finds zero results in this module.
- The Redis client still loads both Lua scripts via `defineCommand` at startup.

---

### Task 1.4 — Move token-type helpers into adapters
- [ ] **Status:** Not started
- **Depends on:** nothing

**Current state:**
`adapters/calin-api-v1/_outgoing.service.ts` and `adapters/calin-api-v2/_outgoing.service.ts`
both import from `@tiamat/modules/meter-interactions/lib/meter-interaction-type-helpers`:
```typescript
import {
  isTokenInteraction,
  isPhaseSpecificReadInteraction,
  PhaseSpecificReadTypes,
} from '@tiamat/modules/meter-interactions/lib/meter-interaction-type-helpers';
```
`dto/generate-token.dto.ts` imports `GenerateTokenTypes` from the same module.

**Target state:**
Copy (do not delete from source) the needed identifiers into the module:

1. In `lib/types.ts`, add:
```typescript
// Command type predicates — adapters use these to decide how to handle a command.
// These are typed against the known CALIN command strings; future plugins may define
// their own predicates internally.
export const TOKEN_INTERACTION_TYPES = [
  'DELIVER_TOKEN', 'TOP_UP', 'CLEAR_CREDIT', 'SET_POWER_LIMIT', 'CLEAR_TAMPER',
] as const;
export type TokenInteractionType = typeof TOKEN_INTERACTION_TYPES[number];
export const isTokenInteraction = (t: string): t is TokenInteractionType =>
  (TOKEN_INTERACTION_TYPES as readonly string[]).includes(t);

export const PHASE_SPECIFIC_READ_TYPES = ['READ_VOLTAGE', 'READ_CURRENT'] as const;
export type PhaseSpecificReadTypes = typeof PHASE_SPECIFIC_READ_TYPES[number];
export const isPhaseSpecificReadInteraction = (t: string): t is PhaseSpecificReadTypes =>
  (PHASE_SPECIFIC_READ_TYPES as readonly string[]).includes(t);

// Token generation command type (used by generate-token.dto.ts)
export type GenerateTokenTypes = 'TOP_UP' | 'SET_POWER_LIMIT' | 'CLEAR_CREDIT' | 'CLEAR_TAMPER';
```
> Verify the exact string values against the source in `meter-interaction-type-helpers`
> before adding them — read that file first.

2. Update imports in `adapters/calin-api-v1/_outgoing.service.ts`,
   `adapters/calin-api-v2/_outgoing.service.ts`, and `dto/generate-token.dto.ts`
   to point to `../../lib/types` (or the correct relative path).

**Files to touch:**
- `lib/types.ts` — add the helpers and types
- `adapters/calin-api-v1/_outgoing.service.ts` — update import
- `adapters/calin-api-v2/_outgoing.service.ts` — update import
- `dto/generate-token.dto.ts` — update import

**Done when:**
`grep -r "@tiamat/modules/meter-interactions"` finds zero results in this module.

---

### Task 1.5 — Vendor utility functions locally
- [ ] **Status:** Not started
- **Depends on:** nothing

**Current state:**
- `adapters/nxt-sts/_token.service.ts` imports `generateRandomNumber` from `@helpers/utilities`.
- `adapters/calin-api-v1/_outgoing.service.ts` imports `toSafeNumberOrNull` from
  `@helpers/number-helpers`.

Read both helpers in `libs/` to see if they are trivial enough to inline, or copy the
entire helper function into a new `lib/utils.ts` inside the module.

**Target state:**
Create `lib/utils.ts` with the two functions (copied verbatim; do not modify logic):
```typescript
export const generateRandomNumber = (digits: number): number => { ... };
export const toSafeNumberOrNull = (value: unknown): number | null => { ... };
```
Update imports in the two adapter files.

**Files to touch:**
- `lib/utils.ts` — new file
- `adapters/nxt-sts/_token.service.ts` — update import
- `adapters/calin-api-v1/_outgoing.service.ts` — update import

**Done when:**
`grep -r "@helpers/"` finds zero results in this module.

---

### Task 1.6 — Rename domain-coupled fields to generic equivalents
- [ ] **Status:** Not started
- **Depends on:** 1.1, 1.2, 1.4 (types must be cleaned up first)

**Current state:**
The `CreateDeviceMessageDto` (`dto/create-device-message.dto.ts`) has:
```typescript
meter_interaction_id?: number;
grid_id: number;
```
`meter_interaction_id` is used throughout as an index key (`idx:meter_interaction_id:…`) and
as a correlation handle passed back to callers via the pub/sub event.
`grid_id` is used exclusively in `lib/redis-repository/keys.ts` to compute the queue key for
LoRaWAN (`queue:lorawan_network:{grid_id}`).

**Target state:**
Rename:
- `meter_interaction_id` → `correlation_id` (type: `string | undefined`, not `number`; the
  caller supplies an opaque string — their internal ID)
- `grid_id` → `network_id` (type: `number`)

This requires updating:
- `dto/create-device-message.dto.ts`
- `lib/types.ts` (`DeviceMessage` embeds the DTO)
- `lib/redis-repository/index.ts` (all usages of `meter_interaction_id`)
- `lib/redis-repository/keys.ts` (`indexMeterInteractionId` → `indexCorrelationId`,
  `queueInitial` uses `grid_id` → `network_id`)
- `lib/redis-repository/helpers.ts` (serialize/deserialize)
- `outgoing.service.ts` (`getMessageByMeterInteractionId` → `getMessageByCorrelationId`,
  `cancelOneByMeterInteractionId` → `cancelOneByCorrelationId`,
  `cancelManyByMeterInteractionIds` → `cancelManyByCorrelationIds`)
- `device-messages.service.ts` (requeueMessage reads `grid_id` and `meter_interaction_id`)

Also update the Redis index key prefix from `idx:meter_interaction_id:` to
`idx:correlation_id:` in `keys.ts`. Note: this is a **data migration concern** for any
running instance; in v1 (fresh deploy only) simply rename.

**Done when:**
`grep -r "meter_interaction_id\|grid_id"` finds zero results in this module folder.

---

### Phase 1 checkpoint

After all 1.x tasks are complete:
- Run `npx tsc --noEmit` from the repo root and confirm zero errors introduced in the
  module files.
- Confirm the module still boots inside tiamat with the same behavior (temporarily keep
  the tiamat wiring; it will be removed in Phase 2).

---

## Phase 2 — Dedicated in/out endpoints

**Goal:** the service exposes an HTTP API for command submission and status, a webhook
ingress for network server events, and an outbound webhook mechanism for result delivery.
The in-process coupling in `tiamat` is replaced by HTTP calls.

**Estimated effort:** ~1.5–2 weeks

---

### Task 2.1 — Create a standalone NestJS app bootstrap
- [ ] **Status:** Not started
- **Depends on:** Phase 1 complete

**Current state:**
The module is a `@Global()` NestJS module with no `main.ts`. It lives inside tiamat's
app module.

**Target state:**
Create a minimal standalone NestJS app. The exact location depends on whether this will be
a new repo or a new app inside the Nx monorepo. For the purposes of this plan:
- If new Nx app: create `apps/device-messaging/` with `main.ts`, `app.module.ts`.
- If new repo: bootstrap with `nest new`.

The device-messages module files move to the new app location.
`app.module.ts` imports `DeviceMessagesModule`, `ScheduleModule.forRoot()`, and
the new controller modules created in tasks 2.2–2.5.

**Done when:** `npm run start:device-messaging` boots without errors.

---

### Task 2.2 — `POST /messages` and status/cancel endpoints
- [ ] **Status:** Not started
- **Depends on:** 2.1

**Current state:**
`enqueue()`, `getMessageByCorrelationId()`, `cancelOneByCorrelationId()` are in-process method
calls on `DeviceMessageOutgoingService`.

**Target state:**
Create `messages.controller.ts`:

```typescript
@Controller('messages')
export class MessagesController {
  @Post()               // enqueue
  @Get(':correlationId') // status
  @Delete(':correlationId') // cancel
}
```

DTOs should use `class-validator` decorators for input validation. The controller wraps
the existing service methods; no logic moves.

Authentication: all endpoints require a **static API key** supplied as
`Authorization: Bearer <key>`, validated against an env var `DEVICE_MESSAGING_API_KEY`.
Use a simple NestJS `Guard` for this.

**Files to create:**
- `messages.controller.ts`
- `messages.controller.dto.ts` (request/response shapes with class-validator)
- `api-key.guard.ts`

**Done when:**
- `POST /messages` with a valid body enqueues a message and returns `{ id, status }`.
- `GET /messages/:correlationId` returns the current delivery status.
- `DELETE /messages/:correlationId` returns `{ result: 'CANCELLED' | 'NOT_CANCELLABLE' | 'NOT_FOUND' }`.
- All endpoints return 401 without the API key.

---

### Task 2.3 — `POST /ingress/:pluginId` webhook endpoint
- [ ] **Status:** Not started
- **Depends on:** 2.1, 3.1 (plugin registry must exist to look up `pluginId`)

**Current state:**
In tiamat, `chirpstack.controller.ts` handles `POST /chirpstack/calin` and calls
`deviceMessageIncomingService.handle(body, 'CALIN_LORAWAN')` directly.
The implementation is hardcoded for the `CALIN_LORAWAN` type.

**Target state:**
Create `ingress.controller.ts`:
```typescript
@Controller('ingress')
export class IngressController {
  @Post(':pluginId')
  handleIncoming(@Param('pluginId') pluginId: string, @Body() body: unknown) {
    return this.deviceMessageIncomingService.handle(body, pluginId);
  }
}
```

The `pluginId` param (e.g. `calin-lorawan`) is matched against the plugin registry.
Auth: HMAC signature verification per-plugin (each plugin declares a `verifySignature(req)`
method; the controller calls it before proceeding; plugins may opt out). The HMAC secret
is supplied via config (see Task 4.2).

**Files to create:**
- `ingress.controller.ts`

**Done when:**
Posting a valid ChirpStack event to `POST /ingress/calin-lorawan` is processed correctly
and a matching queued message transitions state.

---

### Task 2.4 — Outbound result delivery (webhook callbacks)
- [ ] **Status:** Not started
- **Depends on:** 2.1

**Current state:**
`DeviceMessagesService.publish()` calls a `static subscribers = []` array — in-process only.
`meter-interactions.service.ts` registers a callback at boot via `subscribe()`.

**Target state:**
Replace the static pub/sub with an **outbound webhook** mechanism:

1. The service accepts a `RESULT_WEBHOOK_URL` env var (required) and `RESULT_WEBHOOK_SECRET`
   (required, used for HMAC-SHA256 signature on each payload).
2. When `publish()` is called, instead of notifying in-process subscribers, the service
   HTTP POSTs the message payload to `RESULT_WEBHOOK_URL` with a
   `X-Device-Messaging-Signature: sha256=<hmac>` header.
3. Delivery is fire-and-forget with a single retry on network error; if the webhook endpoint
   is unreachable, log and continue (do not block the queue engine).
4. The `subscribe()` method and static `subscribers` array are **removed**.

This is the most significant behavioral change in the entire extraction. The caller
(`meter-interactions`) must expose a matching webhook endpoint and verify the signature.

**Files to touch:**
- `device-messages.service.ts` — replace `publish()` implementation and remove `subscribe()`
- Create `lib/webhook-delivery.ts` — the HTTP POST + HMAC signing logic

**Adapter note:** use the `HttpService` (`@nestjs/axios`) already present in the project,
or use native `fetch` (Node 18+) to avoid the dependency.

**Done when:**
When a message completes or fails, the service POSTs the result to the configured webhook
URL with a valid HMAC signature. A test endpoint (e.g. a simple Express mock) can verify
reception.

---

### Task 2.5 — OpenAPI spec
- [ ] **Status:** Not started
- **Depends on:** 2.2, 2.3

**Current state:** none.

**Target state:**
Add `@nestjs/swagger` and decorate the controllers and DTOs. Auto-generate an OpenAPI JSON
at `/api-docs`. The spec must document:
- All request/response shapes
- The `X-Device-Messaging-Signature` header on ingress webhooks
- The delivery status enum values
- The plugin ID format

**Done when:** `GET /api-docs-json` returns a valid OpenAPI 3.x document.

---

### Phase 2 checkpoint

- The service boots standalone with `docker-compose up`.
- `nxt-backend`'s `meter-interactions.service.ts` can be updated to call `POST /messages`
  and receive results via webhook instead of in-process injection.
- The original `@Global()` module can be **removed from tiamat's app module** without
  breaking anything.

---

## Phase 3 — Plugin architecture

**Goal:** adding a new hardware integration requires authoring a single plugin file; no
core service files change.

**Estimated effort:** ~2–3 weeks

---

### Task 3.1 — Define the plugin interface
- [ ] **Status:** Not started
- **Depends on:** Phase 1 complete

**Current state:**
Partial interfaces exist (`PushIncomingAdapter` in `lib/lifecycle.push.ts`,
`PullIncomingAdapter` in `lib/lifecycle.pull.ts`, `PushOutgoingAdapter` in `lib/lifecycle.push.ts`).
Three separate `ROUTE_MAP` / `PUSH_ADAPTERS` / `PULL_ADAPTERS` dictionaries.
Queue bottleneck strategy is hardcoded in `lib/redis-repository/keys.ts:queueInitial()`.

**Target state:**
Create `lib/plugin.interface.ts` with a single unified plugin descriptor type:

```typescript
export type DeviceMessagingPlugin = {
  /** Unique, URL-safe identifier, e.g. 'calin-lorawan' */
  readonly id: string;

  /** Delivery pattern determines which queues and lifecycle logic apply */
  readonly pattern: 'push' | 'pull';

  /**
   * Returns the initial queue key for a message.
   * 'push' plugins typically bucket by network (grid/tenant).
   * 'pull' plugins typically bucket by gateway.
   */
  bottleneckKey(message: CreateDeviceMessageDto): string;

  outgoing: {
    /** Send the message to the network server. Returns an external delivery ID. */
    sendOne(message: DeviceMessage): Promise<string>;
    /** Check remote queue status (used by GW timeout extension for push plugins). */
    getRemoteStatus(message: DeviceMessage): Promise<{ delivery_status: string }>;
    /** Convert a thrown error into a FailureContext for the retry/fail logic. */
    parseError(err: unknown): FailureContext;
  };

  incoming: {
    /** PUSH: parse a raw webhook event into a ParsedIncomingEvent (or null to ignore). */
    handle?(event: unknown): ParsedIncomingEvent | null;
    /** PULL: poll the network server for the current status of a message. */
    fetchStatus?(message: DeviceMessage): Promise<ParsedIncomingEvent | null>;
    /** PUSH only: optional HMAC signature verification for incoming webhooks. */
    verifySignature?(rawBody: Buffer, headers: Record<string, string>): boolean;
  };

  /** Optional: token generation capability. */
  token?: {
    generate(dto: GenerateTokenDto): Promise<string>;
  };
};
```

This interface replaces the three separate partial interfaces. Each existing adapter set
(`calin-lorawan`, `calin-api-v1`, `calin-api-v2`) will become one object implementing this.

**Files to create:**
- `lib/plugin.interface.ts`

**Done when:** the interface is defined and TypeScript compiles against it without errors.
No adapters are migrated yet (that is tasks 3.4–3.7).

---

### Task 3.2 — Create the plugin registry
- [ ] **Status:** Not started
- **Depends on:** 3.1

**Current state:**
Three hard-coded dictionaries in three different services:
- `outgoing.service.ts` `ROUTE_MAP` (lines ~57–61)
- `incoming.service.ts` `PUSH_ADAPTERS` / `PULL_ADAPTERS` (lines ~40–51)
- `token.service.ts` `ROUTE_MAP` (lines ~16–20)

Adding a plugin requires editing all three files plus `device-messages.module.ts`,
`lib/types.ts` (the `NetworkServerImplementation` union and `PULL_PATTERN_IMPLEMENTATIONS`
array), and `lib/redis-repository/keys.ts` (`queueInitial()`).

**Target state:**
Create `lib/plugin-registry.ts`:
```typescript
const registry = new Map<string, DeviceMessagingPlugin>();

export const pluginRegistry = {
  register(plugin: DeviceMessagingPlugin): void { registry.set(plugin.id, plugin); },
  get(id: string): DeviceMessagingPlugin | undefined { return registry.get(id); },
  getAll(): DeviceMessagingPlugin[] { return Array.from(registry.values()); },
  getPushPlugins(): DeviceMessagingPlugin[] { return getAll().filter(p => p.pattern === 'push'); },
  getPullPlugins(): DeviceMessagingPlugin[] { return getAll().filter(p => p.pattern === 'pull'); },
};
```

Replace the three ROUTE_MAPs with `pluginRegistry` lookups:
- `outgoing.service.ts` `getAdapter()` → `pluginRegistry.get(id)?.outgoing`
- `incoming.service.ts` `handle()` and `pollPullImplementations()` → iterate
  `pluginRegistry.getPushPlugins()` / `pluginRegistry.getPullPlugins()`
- `token.service.ts` `getAdapter()` → `pluginRegistry.get(id)?.token`

The `NetworkServerImplementation` type union in `lib/types.ts` becomes `string`.
`PULL_PATTERN_IMPLEMENTATIONS` is replaced by `pluginRegistry.getPullPlugins().map(p => p.id)`.

Plugins are registered in `device-messages.module.ts` (or a dedicated `plugins.ts` bootstrap
file) before the module initialises.

**Files to touch:**
- `lib/plugin-registry.ts` — new file
- `outgoing.service.ts` — update adapter lookup
- `incoming.service.ts` — update adapter lookup + PULL iteration
- `token.service.ts` — update adapter lookup
- `lib/types.ts` — update `NetworkServerImplementation` and `PULL_PATTERN_IMPLEMENTATIONS`
- `device-messages.module.ts` — register plugins

**Done when:**
The service boots and processes messages with no behavior change. The three hardcoded maps
are gone.

---

### Task 3.3 — Generalise queue bottleneck strategy
- [ ] **Status:** Not started
- **Depends on:** 3.2

**Current state:**
`lib/redis-repository/keys.ts` `queueInitial()` has hardcoded branches:
```typescript
if (dto.device.protocol === 'LORAWAN') return `queue:lorawan_network:${dto.network_id}`;
if (dto.device.protocol === 'API_V1' && ...) return `queue:gateway:${dto.device.gateway.id}`;
if (dto.device.protocol === 'API_V2' && ...) return `queue:gateway:${dto.device.gateway.id}`;
```

**Target state:**
Remove `queueInitial()` from `keys.ts`. Each plugin declares `bottleneckKey(message)`:
- `calin-lorawan` plugin: `() => \`queue:lorawan_network:${message.network_id}\``
- `calin-api-v1` / `calin-api-v2` plugins: `() => \`queue:gateway:${message.device.gateway.id}\``

The distributor in `outgoing.service.ts` calls `plugin.bottleneckKey(message)` instead of
`redisKeys.queueInitial(message)`.

**Files to touch:**
- `lib/redis-repository/keys.ts` — remove `queueInitial()`
- `outgoing.service.ts` — call `plugin.bottleneckKey(dto)` when enqueuing
- `device-messages.service.ts` `requeueMessage()` — currently reconstructs the queue key
  from stored message fields; it will need to look up the plugin and call `bottleneckKey`

**Done when:**
`grep -r "queueInitial"` finds zero results. Enqueueing messages with all three protocols
routes to the correct Redis queue.

---

### Task 3.4 — Migrate `calin-lorawan` to the plugin contract
- [ ] **Status:** Not started
- **Depends on:** 3.1, 3.2

**Current state:**
Three NestJS `@Injectable()` services:
- `adapters/calin-lorawan/_outgoing.service.ts` (`CalinLorawanOutgoingService`)
- `adapters/calin-lorawan/_incoming.service.ts` (`CalinLorawanIncomingService`)
- `adapters/nxt-sts/_token.service.ts` (`NxtStsTokenService`)

**Target state:**
Create `adapters/calin-lorawan/plugin.ts` that exports a single
`const calinLorawanPlugin: DeviceMessagingPlugin = { ... }` which composes the three
services above (or inlines their logic). Token generation is folded into the
`plugin.token.generate()` method.

The three `@Injectable()` classes may keep their current structure internally; the plugin
object is a thin wrapper.

Move `lib/chirpstack-repository/index.ts` into `adapters/calin-lorawan/` since it is
specific to this plugin.

The in-memory correlator (`lib/` or `adapters/calin-lorawan/lib/correlate-request-response.ts`)
stays in `adapters/calin-lorawan/lib/` — it is already plugin-internal.

**Files to create/move:**
- `adapters/calin-lorawan/plugin.ts` — new plugin descriptor
- Move `lib/chirpstack-repository/` → `adapters/calin-lorawan/chirpstack-repository/`
  and update the import in `adapters/calin-lorawan/_outgoing.service.ts`

**Done when:**
`calinLorawanPlugin` is registered in the plugin registry and LoRaWAN messages flow correctly
end-to-end (enqueue → ChirpStack gRPC → webhook callback → result).

---

### Task 3.5 — Migrate `calin-api-v1` to the plugin contract
- [ ] **Status:** Not started
- **Depends on:** 3.1, 3.2

Same structure as 3.4. Create `adapters/calin-api-v1/plugin.ts` composing
`CalinApiV1OutgoingService`, `CalinApiV1IncomingService`, and `CalinApiV1TokenService`.

**Done when:** `calinApiV1Plugin` registered and API-V1 messages flow correctly.

---

### Task 3.6 — Migrate `calin-api-v2` to the plugin contract
- [ ] **Status:** Not started
- **Depends on:** 3.1, 3.2

Same structure as 3.4. Create `adapters/calin-api-v2/plugin.ts`.

**Done when:** `calinApiV2Plugin` registered and API-V2 messages flow correctly.

---

### Task 3.7 — Remove NestJS `@Injectable()` from adapters; clean up module providers
- [ ] **Status:** Not started
- **Depends on:** 3.4, 3.5, 3.6

**Current state:**
All adapter classes are `@Injectable()` NestJS services registered as providers in
`device-messages.module.ts`. They are injected via constructor DI into the three
main services.

**Target state:**
Once each adapter is wrapped by a plugin object and registered in the plugin registry,
the NestJS DI wiring for adapters is no longer needed. Remove `@Injectable()` from all
adapter classes and remove them from `device-messages.module.ts`'s `providers` array.
The plugin objects are plain objects, not DI-managed.

Exception: `NxtStsTokenService` uses `HttpService` (`@nestjs/axios`) via DI. Either:
(a) Keep it as `@Injectable()` and inject it into the plugin bootstrap, or
(b) Replace the Axios call with native `fetch` (Node 18+) and remove the DI dependency.
Option (b) is preferred to reduce NestJS coupling in the plugin layer.

**Done when:**
`device-messages.module.ts` `providers` array contains only the three core services
(`DeviceMessageOutgoingService`, `DeviceMessageIncomingService`, `DeviceTokenService`).
`@Injectable()` appears in zero adapter files.

---

### Task 3.8 — Plugin config/secrets isolation
- [ ] **Status:** Not started
- **Depends on:** 3.4, 3.5, 3.6

**Current state:**
Each adapter reads `process.env` directly at module load time:
```typescript
// calin-api-v1/_outgoing.service.ts
const { CALIN_V1_COMPANY_NAME, CALIN_V1_ADMIN_USERNAME, CALIN_V1_ADMIN_PASSWORD } = process.env;
// calin-lorawan/_outgoing.service.ts (indirect via chirpstack-repository)
const { CHIRPSTACK_API_URL, CHIRPSTACK_API_TOKEN, ... } = process.env;
// nxt-sts/_token.service.ts
const { STS_GENERATOR_API } = process.env;
// redis-repository/index.ts
const { NXT_ENV, HERMES_HOST, HERMES_PORT, HERMES_USERNAME, HERMES_PASSWORD } = process.env;
```

**Target state:**
Each plugin receives a validated config object at registration time.
Create `lib/config.ts` with a typed config interface:
```typescript
export type DeviceMessagingConfig = {
  redis: { host: string; port: number; username?: string; password?: string; tls: boolean; db?: number };
  resultWebhook: { url: string; secret: string };
  apiKey: string;
  plugins: {
    calinLorawan?: { chirpstackUrl: string; chirpstackToken: string; ... };
    calinApiV1?: { companyName: string; username: string; password: string; ... };
    calinApiV2?: { customerId: string; companyName: string; ... };
    nxtSts?: { generatorApiUrl: string };
  };
};
```
Load and validate with Zod at `main.ts` startup (consistent with ADR-007 pattern).
Pass the relevant slice to each plugin at registration.
Remove all direct `process.env` access from adapter files.

**Done when:**
`grep -r "process.env"` finds results only in `main.ts` / config loader.
Starting the service with missing required config fails fast with a clear Zod validation error.

---

### Phase 3 checkpoint

- Run the full message lifecycle for each of the three existing plugins (calin-lorawan,
  calin-api-v1, calin-api-v2) and confirm end-to-end behavior is unchanged.
- Confirm that adding a new (stub) plugin requires only creating a new `plugin.ts` file
  and registering it — no core file changes.

---

## Phase 4 — Deployment

**Goal:** operators can run the service with `docker-compose up`. Observability is
production-grade (structured logs, basic metrics). The service is ready to open-source.

**Estimated effort:** ~1.5–2 weeks

---

### Task 4.1 — Dockerfile and docker-compose
- [ ] **Status:** Not started
- **Depends on:** 2.1

**Target state:**
`Dockerfile` (multi-stage):
1. Build stage: `npm ci` + `npm run build`
2. Production stage: copy compiled output + `node_modules` (production only)

`docker-compose.yml`:
```yaml
services:
  device-messaging:
    build: .
    ports: ["3100:3100"]
    environment:
      - REDIS_HOST=redis
      ... (all required env vars, with safe defaults for local dev)
    depends_on: [redis]
  redis:
    image: valkey/valkey:8-alpine
    command: valkey-server --save 60 1 --loglevel warning
    volumes: ["redis-data:/data"]
volumes:
  redis-data:
```

**Files to create:**
- `Dockerfile`
- `docker-compose.yml`
- `.env.example` (all required env vars documented)

**Done when:** `docker-compose up` starts both services. `POST /messages` works from the host.

---

### Task 4.2 — Replace `console.*` with structured logging
- [ ] **Status:** Not started
- **Depends on:** 2.1

**Current state:**
~50 `console.info`, `console.warn`, `console.error` calls scattered throughout the module
(run `grep -rn "console\." apps/tiamat/src/modules/device-messages/` for the full list).

**Target state:**
Use NestJS `Logger` (`import { Logger } from '@nestjs/common'`). Each service/module gets a
named logger: `new Logger('DeviceMessagingOutgoing')`, etc.
Log levels: `error` for unexpected failures, `warn` for recoverable issues (retries, phantom
messages, slow network calls), `verbose`/`debug` for currently-commented-out trace logs.

**Done when:** `grep -rn "console\."` finds zero results in the module.

---

### Task 4.3 — Metrics endpoint
- [ ] **Status:** Not started
- **Depends on:** 4.1

Expose a `GET /metrics` endpoint (Prometheus text format) with at minimum:
- `device_messaging_queue_depth{queue}` — current size of each Redis sorted set queue
- `device_messaging_messages_total{status}` — counter of messages by final status
  (DELIVERY_SUCCESSFUL / DELIVERY_FAILED)
- `device_messaging_retry_count_histogram` — distribution of retry counts at resolution

Use `prom-client` (the standard Node.js Prometheus client).

**Files to create:**
- `metrics.controller.ts`
- `lib/metrics.ts` (counter/gauge/histogram definitions)

**Done when:** `GET /metrics` returns valid Prometheus exposition format. A basic
`docker-compose.yml` override for local Prometheus scraping is documented in the README.

---

### Task 4.4 — README and open-source hygiene
- [ ] **Status:** Not started
- **Depends on:** 4.1, 4.2, 2.5 (OpenAPI)

Write a `README.md` that covers:
1. What this service does (one paragraph)
2. Concepts: plugins, PUSH/PULL patterns, delivery pipeline, retry logic
3. Quick start (`docker-compose up`, send a test message, observe the webhook callback)
4. Configuration reference (all env vars and their meaning)
5. Writing a plugin (the `DeviceMessagingPlugin` interface, a minimal example)
6. Deployment notes (Redis persistence, single-writer constraint in v1, HA future)
7. API reference (link to `/api-docs`)

Also add: `LICENSE` (MIT or Apache 2.0 — confirm with maintainer), `CONTRIBUTING.md` stub,
`.github/ISSUE_TEMPLATE/` stubs.

---

### Phase 4 checkpoint

- `docker-compose up` starts successfully.
- `README.md` quick-start works end-to-end without outside context.
- `GET /metrics` returns valid Prometheus output.
- The service compiles and passes type-check with zero errors.

---

## Phase 5 (future) — HA / multi-instance

**Deferred per ADR-010 decision 6.** Track separately when evidence of demand exists.

Work items:
- **5.1 Distributed cron / leader election:** The two cron jobs (`runMessageResolutionCycle`
  every 2s, `pollPullImplementations` every 5s) run on every replica. Add a Redis-based
  leader lock (e.g. `SET leader NX PX <ttl>` renewed every interval) so only one replica
  runs the cron at a time. Or replace with a dedicated job worker process.
- **5.2 Distributed LoRaWAN correlator:** The in-memory `pendingCorrelations` Map in
  `adapters/calin-lorawan/lib/correlate-request-response.ts` breaks under multiple replicas
  (an `up` event on replica A won't find the `ack` stored by replica B). Replace the Map
  with a Redis Hash with TTL (10 seconds per entry, matching the current in-memory TTL).

---

## Notes & decisions log

> Append here as the plan is executed. Format: `YYYY-MM-DD — [task id] — note`

_(empty)_
