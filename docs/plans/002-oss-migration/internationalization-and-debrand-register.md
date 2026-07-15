# Internationalization & De-Brand Register

**Companion to:** the OSS migration roadmap `docs/plans/002-oss-migration.md` (migration-wide —
**not** tied to a single sub-plan).
**Purpose:** the authoritative record of every **Nigeria-specific / NXT-Grid-specific value or
name** found in the legacy code and schema, and how the OSS baseline neutralizes it. This is
roadmap **rule 6** ("keep an eye out for the platform becoming international instead of
Nigeria-only") made concrete and durable.

Two flavors live here:

- **i18n** — hardcoded locale assumptions: currency, timezone, phone/country, language, date/number
  formatting, tax/regulatory constants.
- **de-brand** — hardcoded company identity: the "NXT Grid" name, `nxtgrid.co` emails/domains, brand
  strings, brand-named symbols in code (types, flags, constants).

**Rules:**

- One row per finding. A de-brand/i18n change ships in an import only if it has a row here.
- `Disposition` is one of: `neutralized` (fixed in baseline), `configurable` (moved to config/env,
  with the key), `deferred` (returns with its owning capability — record where), `noted` (future
  candidate, no action yet).
- **Schema-level** findings (a column default, an enum, a constraint) are *also* recorded in the
  **schema deviation register** (they have a cutover implication); this register cross-links them so
  the i18n picture is complete in one place.
- Status: `candidate` (spotted, unconfirmed) → `confirmed` (maintainer sign-off) or `rejected`
  (kept as-is, row stays for the record).
- Appended by every capability import that touches locale/brand values. If in doubt, add a row.

## Register

| # | Location | Finding | Kind | Disposition | Cross-ref | Status |
|---|---|---|---|---|---|---|
| 1 | `grids.timezone` column default (002b init migration; legacy `grid.entity.ts` `'Africa/Lagos'`) | Timezone defaults to Lagos — a Nigeria assumption baked into the **schema**, not just code | i18n | **neutralized** — default changed to `'UTC'` in the init migration (002d Task 2). New inserts only; existing company grids keep stored values | Schema deviation register (002d entry) | candidate |
| 2 | `legacy/apps/tiamat/src/modules/auth/nxt-supabase-user.ts` — type `NxtSupabaseUser` | Brand-named auth user type (`Nxt…`) | de-brand | **neutralized** — renamed `AuthenticatedUser` on import (002d Task 7) | 002d Task 7 | candidate |
| 3 | `legacy/apps/tiamat/src/modules/auth/supabase.strategy.ts` — comment "let all NXT Grid pass" + `console.info` | Brand reference in comment; also the (deferred) admin-org membership flag `is_nxt_grid_member` | de-brand | **neutralized** — comment cleaned on import; flag **deferred** (no in-scope reader), reintroduced as `is_admin_org_member` with its consumer | 002d Task 7; ADR-007 Amendment 2026-07-15 §B | candidate |
| 4 | `legacy/apps/tiamat/src/modules/user-admin/user-admin.service.ts` — commented-out test-user block (`bobby.bol@nxtgrid.co`, `+31…` phone) + "Create a NXT Grid member" comment | Brand emails/phone in dead code; brand reference in comment | de-brand | **neutralized** — dead block deleted (not ported); comment de-branded on import (002d Task 9) | 002d Task 9 | candidate |
| 5 | `organizations` (no `timezone` column today) | An org-level timezone would be the natural i18n home once multi-region operators exist (grids currently carry timezone) | i18n | **noted** — future candidate; no action in 002d | — | candidate |

## Notes

> Append context/decisions here as the register grows.

- 2026-07-15 — Register created during 002d Task 1. Seeded from the foundation-scope de-brand/i18n
  sweep (chat, 2026-07-15). The one substantive **schema** i18n hit is `grids.timezone` (#1); the
  rest are code-level de-brand items handled inline during their module's import. Currency was **not**
  found hardcoded in the foundation scope — expect currency findings to surface in the Payments
  import; add them here then.
