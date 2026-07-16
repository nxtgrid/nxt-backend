# core

Shared kernel (`@nxt/core`): config, generated Supabase types, cross-cutting infra.

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
