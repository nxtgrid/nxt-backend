# Deployment on DigitalOcean (App Platform, buildpack)

Branch-based deploy for one DO app with one or more components from the monorepo root.

## 1. Create the app
Create the app from the version you want to build from. If you're setting up a fresh app, you most likely will want to use the latest version.

[DigitalOcean App Platform](https://cloud.digitalocean.com/apps) → **Create App** → connect
GitHub → repo root, branch **`your-selected-version-branch`**.

Do NOT go with the standard settings of Digital Ocean. You should carefully review these:
- Check the name!! It usually automatically sets it to nxt-backend (the name of the repo), but you want to give it a custom name like `api`, or `[your-company]-api`.
- The size is usually set too large, so select a smaller instance size to start with. You can scale up later as desired.
- Change the deployment settings! This is not the guide for a Docker build, which is the default setting. Set the build strategy to Node.js Buildpack.

For the API, the build command is:
```bash
corepack enable && pnpm install --frozen-lockfile && pnpm exec nx sync && pnpm exec nx build api
```
and the run command is:
```bash
`node apps/api/dist/main.js`
```

## 2. App-wide environment variables

Set at **app level** so all components inherit them (DO: Settings → App-Level Environment
Variables).

| Variable | Value | Scope | Notes |
|---|---|---|---|
| `NODE_ENV` | `production` | Build & Run | Standard for both components. |
| `NX_DAEMON` | `false` | **Build time** (Build & Run is fine) | Stops Nx from writing `.nx/workspace-data/…/daemon.log` during the build; avoids buildpack export / DOCR layer errors. Not required at runtime. |

## 4. Verify

**`api`** — public URL:

```bash
curl -sS "https://<api-host>/health"
```

Expect **200** and JSON with `name` and `version`.

**`worker`** — Runtime Logs: periodic `heartbeat` lines from `@nestjs/schedule`.

## Health checks
/health
