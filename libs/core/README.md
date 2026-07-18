# core

Shared kernel (`@nxt/core`): config, generated Supabase types, cross-cutting infra.

## Import style

| Scope | Specifier | Notes |
|---|---|---|
| Bootstrap / config | `@nxt/core/config` | `loadConfig` / `getConfig` / `setConfig` / `requireEnv` — **no Nest modules** |
| Nest infra & helpers | `@nxt/core` | Logger, Global*Module, constants — not config |
| Generated / adjusted types | `@nxt/core/types/…` | Public type subpaths |
| Inside this package (cross-folder) | `#config/…`, `#modules/…`, `#types/…` | Package `"imports"` — direct files |
| Same folder / co-located sibling | relative `./…` | Prefer for local peers |

Do **not** import config from the fat `@nxt/core` barrel (it is not re-exported there).

Example (in-package): `import { requireEnv } from '#config/require-env.js'`.

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
