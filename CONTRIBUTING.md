# Contributing to Skyfox

Thank you for your interest in contributing! This document explains how to get
set up, what the standards are, and how the contribution process works.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Issues](#reporting-issues)
- [License](#license)
- [Contributors](#contributors)

---

## Getting Started

### Requirements

- **Node.js 22.x** (see `engines` in `package.json`)
- **Docker** — required to run Supabase locally
- **Supabase CLI** — `npm install -g supabase` or use `npx supabase`

### Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/<your-username>/skyfox.git
cd skyfox

# 2. Install dependencies
npm install

# 3. Copy environment variable files and fill them in
cp apps/tiamat/.env.example apps/tiamat/.env
cp apps/talos/.env.example apps/talos/.env
cp apps/loch/.env.example apps/loch/.env
cp apps/yeti/.env.example apps/yeti/.env

# 4. Start Supabase locally (requires Docker)
npx supabase start

# 5. Run the app you want to work on
npx nx serve tiamat
```

---

## Development Workflow

This is an **Nx monorepo**. Each app (`tiamat`, `talos`, `loch`, `yeti`) and
shared library (`core`, `helpers`, `timeseries`) is developed independently but
shares the same root `package.json` and TypeScript configuration.

Serve a specific app in watch mode:
```bash
npx nx serve <app-name>
```

Build a specific app:
```bash
npx nx build <app-name>
```

---

## Code Standards

### Linting and type checking

All `.ts` files must pass ESLint with zero warnings and TypeScript type checking
before a commit is accepted. This is enforced automatically by a pre-commit hook
(Husky + lint-staged).

You can run the checks manually at any time:

```bash
npm run lint          # ESLint + TypeScript type check
npm run eslint        # ESLint only
npm run check-types   # TypeScript type check only
```

If your commit is rejected by the pre-commit hook, fix the reported issues and
try again — do not skip the hook.

### General guidelines

- Write **TypeScript** throughout — avoid `any` where possible
- Follow existing **NestJS module structure** (controller / service / module)
- Keep services focused on a single responsibility
- Do not commit credentials, secrets, or environment-specific values — use
  environment variables and update the relevant `.env.example` file

---

## Submitting a Pull Request

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes, ensuring all linting and type checks pass
3. Write a clear commit message describing *why* the change was made
4. Open a pull request against `main` with a description of the change and
   any relevant context (related issues, screenshots, etc.)
5. Be responsive to review feedback

---

## Reporting Issues

Please open a GitHub issue for:

- Bug reports (include steps to reproduce, expected vs actual behaviour)
- Feature requests (describe the use case, not just the solution)
- Questions about architecture or design decisions

---

## License

By contributing to Skyfox, you agree that your contributions will be licensed
under the same terms as the project — the [Mozilla Public License 2.0](https://www.mozilla.org/MPL/2.0/).
See [LICENSE](./LICENSE) for the full text.

---

## Contributors

See [CONTRIBUTORS.md](./CONTRIBUTORS.md) — your name will be added there after
your first merged pull request.
