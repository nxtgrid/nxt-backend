# core

Shared kernel (`@nxt/core`): config, generated Supabase types, cross-cutting infra.

## Import style

| Scope | Specifier | Notes |
|---|---|---|
| Other packages → this one | `@nxt/core`, `@nxt/core/types/…` | Public API via `"exports"` (barrel / subpaths) |
| Inside this package (cross-folder) | `#config/…`, `#modules/…`, `#types/…` | Package `"imports"` — direct files, not the barrel |
| Same folder / co-located sibling | relative `./…` | Prefer for local peers |

Example: `import { requireEnv } from '#config/require-env.js'`.

## Supabase types

| Import | From |
|---|---|
| `Database` (client typing) | `@nxt/core/types/supabase-types-adjusted` |
| Enums, `Json`, table row/insert/update aliases | `@nxt/core/types/supabase-types` |

Regenerate generated types: `pnpm generate-types:local` (requires `pnpm supabase start`).

## Building

Run `nx build core` to build the library.

## Running unit tests

Run `nx test core` to execute the unit tests via [Jest](https://jestjs.io).
