# syntax=docker/dockerfile:1
# Parameterized multi-stage image for @nxt/api and @nxt/worker (ADR-006 decision 7).
# Build: docker build --build-arg APP=api .
#        docker build --build-arg APP=worker .
#
# Runtime pruning uses Nx prune targets (not pnpm deploy) — see 002c decisions log [6].

ARG APP=api

# ── base ──────────────────────────────────────────────────────────────────────
FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable
WORKDIR /workspace

# ── build ─────────────────────────────────────────────────────────────────────
FROM base AS build
ARG APP

# Manifests first so install layer caches when only source changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY libs/core/package.json libs/core/

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

# Build + pruned package.json / lockfile / workspace_modules in apps/${APP}/dist.
RUN pnpm exec nx sync
RUN pnpm exec nx run "${APP}:prune"

# ── runtime ───────────────────────────────────────────────────────────────────
FROM base AS runtime
ARG APP
ENV NODE_ENV=production
ENV CI=true
WORKDIR /app

# Webpack + Nx prune output: main.js, config.default.json, pruned manifests, workspace_modules/.
COPY --from=build --chown=node:node /workspace/apps/${APP}/dist ./

# Hoisted linker so workspace_modules/@nxt/core can resolve its own deps (e.g. zod).
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile --config.node-linker=hoisted

USER node
EXPOSE 3000
CMD ["node", "main.js"]
