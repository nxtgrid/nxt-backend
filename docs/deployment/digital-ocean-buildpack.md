# Deployment on DigitalOcean (App Platform)

One App Platform app. `api` and `worker` always build from **this** repo (Node.js
buildpack). They are the default footprint.

[`nxt-device-messaging`](https://github.com/nxtgrid/nxt-device-messaging) is a
**third component only when Metering is on.** Metering is an opt-in capability
(ADR-007 Tier-1: `capabilities.metering.enabled`). If that flag is off, skip
§3, skip the `DEVICE_MESSAGING_*` vars, and do not run the GHCR image. `api` /
`worker` never call device-messaging except from Metering code, which is not
instantiated when the capability is disabled.

When Metering **is** enabled, device-messaging is a **pre-built GHCR image**, not
an Nx app and not a buildpack build of this monorepo.

| Component | When | Source | Replicas | Redis / Valkey |
|---|---|---|---|---|
| `api` | always | this repo (buildpack) | as you scale HTTP | none for device queues |
| `worker` | always | this repo (buildpack) | as you scale jobs | none for device queues |
| `device-messaging` | Metering on | `ghcr.io/nxtgrid/nxt-device-messaging:<tag>` | **1** | **its own** Valkey |

Same app so they get App Platform private DNS. TypeScript/Zod shapes for the
command API and webhook:
[`@nxtgrid/device-messaging-contract`](https://www.npmjs.com/package/@nxtgrid/device-messaging-contract).
Human contract: that repo’s `docs/guides/integrating.md`. Prefer a version tag
(`v0.1.2`) over `:latest`.

## 1. Create the app (`api`)

Create the app from the version you want to build from. If you're setting up a
fresh app, you most likely will want to use the latest version.

[DigitalOcean App Platform](https://cloud.digitalocean.com/apps) → **Create App**
→ connect GitHub → repo root, branch **`your-selected-version-branch`**.

Do NOT go with the standard settings of Digital Ocean. You should carefully
review these:

- Check the name!! It usually automatically sets it to nxt-backend (the name of
  the repo), but you want to give it a custom name like `api`, or
  `[your-company]-api`.
- The size is usually set too large, so select a smaller instance size to start
  with. You can scale up later as desired.
- Change the deployment settings! This is not the guide for a Docker build,
  which is the default setting. Set the build strategy to Node.js Buildpack.

For the API, the build command is:

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm exec nx sync && pnpm exec nx build api
```

and the run command is:

```bash
node apps/api/dist/main.js
```

(No backticks around the run command in the DO field.)

## 2. Add `worker`

Same GitHub repo and branch. Node.js Buildpack.

Build:

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm exec nx sync && pnpm exec nx build worker
```

Run:

```bash
node apps/worker/dist/main.js
```

## 3. Add `device-messaging` (GHCR) — Metering on only

Add a component from a container image, not from this GitHub repo.

- Image: `ghcr.io/nxtgrid/nxt-device-messaging`
- Tag: `v0.1.2` (or the tag you actually run; keep it in lockstep with the
  contract package major/minor you depend on when Metering lands)
- HTTP port: **3100**
- Instance count: **1** (the service is single-writer; do not scale this
  component)
- If the GHCR package is private, add a registry credential for `ghcr.io`

Do **not** point this component at the nxt-backend Dockerfile or buildpack.

### Its own Valkey

Create a Valkey/Redis resource **for this component only** (DO Managed Caching,
or a Valkey image component). Device-messaging in-flight state lives there;
`api` / `worker` must not share it. Wire the usual Redis env into the
device-messaging component (`REDIS_HOST`, `REDIS_PORT`, password if any) as in
that repo’s `.env.example`.

### Public vs private URLs

| Who | URL |
|---|---|
| `api` enqueue / get / cancel / token / provisioning | **Private** — `${device-messaging.PRIVATE_URL}` or `http://device-messaging:3100`. Do not use `*.ondigitalocean.app` for this hop. |
| ChirpStack (and other vendor ingress) | **Public** HTTPS host of this component → `POST /ingress/:pluginId` |
| Device-messaging webhook back to `api` | **Private** — `${api.PRIVATE_URL}` plus the path Metering will expose (HMAC still required) |

Command routes stay Bearer-protected (`DEVICE_MESSAGING_API_KEY`) even if the
host is public. Ingress stays unauthenticated at the service; only vendors
should be able to reach it (firewall / which routes you expose).

Health check on this component: `GET /healthz` (not `/health`).

Device-messaging needs its JSON config artifact and plugin secrets (CALIN,
ChirpStack, STS, webhook URL/secret) as in that repo’s ADR-002 / `.env.example`.
Set `eventWebhook.url` to the **private** `api` URL once Metering exposes the
receiver.

## 4. App-wide environment variables

Set at **app level** so `api` and `worker` inherit them (DO: Settings →
App-Level Environment Variables). Do **not** put device-messaging’s Valkey
password in app-wide env if that would leak it to `api`/`worker`.

| Variable | Value | Scope | Notes |
|---|---|---|---|
| `NODE_ENV` | `production` | Build & Run | Standard for the Nx components. |
| `NX_DAEMON` | `false` | **Build time** (Build & Run is fine) | Stops Nx from writing `.nx/workspace-data/…/daemon.log` during the build; avoids buildpack export / DOCR layer errors. Not required at runtime. |

When Metering is **enabled** in config (ADR-007), set on **`api`** (not app-wide
unless you want the worker to see them). If Metering is off, leave these unset
and do not add the sidecar.

| Variable | Notes |
|---|---|
| `DEVICE_MESSAGING_BASE_URL` | Private component URL (no trailing slash). Local analogue: `http://127.0.0.1:3100`. |
| `DEVICE_MESSAGING_API_KEY` | Bearer toward device-messaging (that service’s key, not `public.api_keys`). |
| `DEVICE_MESSAGING_WEBHOOK_SECRET` | Same value as device-messaging’s `DEVICE_MESSAGING_WEBHOOK_SECRET`. |

If Metering is on and `DEVICE_MESSAGING_BASE_URL` is missing, fail boot (or
degrade that capability). Do not silently no-op enqueue. If Metering is off,
do not require these vars.

## 5. Verify

**`api`** — public URL:

```bash
curl -sS "https://<api-host>/health"
```

Expect **200** and JSON with `name` and `version`.

**`worker`** — Runtime Logs: periodic `heartbeat` lines from `@nestjs/schedule`.

**`device-messaging`** (only if you added it — Metering on) — private or public host:

```bash
curl -sS "https://<device-messaging-host>/healthz"
```

Expect **200** and `{"ok":true}`.

## Health checks

| Component | Path |
|---|---|
| `api` | `/health` |
| `device-messaging` | `/healthz` |

## Local analogue (Metering on)

Same HTTP contract, different `DEVICE_MESSAGING_BASE_URL`. Skip this if Metering is off.

```bash
# in ../nxt-device-messaging
docker compose up -d valkey
pnpm dev
```

Point `api` at `http://127.0.0.1:3100`.
