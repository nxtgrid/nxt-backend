# @helpers

Shared utility library. Small, focused, framework-agnostic helper functions used across all apps in the monorepo. The exception is `pipes.ts`, which provides NestJS-specific pipes.

**Path alias:** `@helpers` → `libs/helpers/src`

There is no barrel `index.ts` — import directly from the file you need:

```typescript
import { chunkifyArray } from '@helpers/array-helpers';
import { round } from '@helpers/number-helpers';
```

---

## Files and exports

### `array-helpers.ts`

| Export | Description |
|--------|-------------|
| `chunkifyArray` | Splits an array into chunks of a given size. |
| `pluckIdsFrom` | Extracts `id` fields from an array of objects. |
| `sliceByPercent` | Returns a percentage slice of an array. |
| `orderWith` | Sorts an array by a nested property path. |
| `shuffle` | Returns a randomly shuffled copy of an array. |

### `number-helpers.ts`

| Export | Description |
|--------|-------------|
| `round` | Rounds a number to a given number of decimal places. |
| `formatCurrency` | Formats a number as a Nigerian locale currency string. |
| `toSafeNumberOr` | Parses a value to a number, returning a fallback if parsing fails. |
| `toSafeNumberOrNull` | Parses a value to a number, returning `null` on failure. |
| `toSafeNumberOrZero` | Parses a value to a number, returning `0` on failure. |

### `promise-helpers.ts`

| Export | Description |
|--------|-------------|
| `mapAsyncSequential` | Sequential async map — processes an array one item at a time and returns `{ results, errors }`. |

### `utilities.ts`

| Export | Description |
|--------|-------------|
| `sleep` | Returns a promise that resolves after a given number of milliseconds. |
| `generateRandomNumber` | Generates a random integer within a range. |

### `primitive-helpers.ts`

| Export | Description |
|--------|-------------|
| `removeWs` | Replaces whitespace in a string with underscores. |

### `computation-helpers.ts`

| Export | Description |
|--------|-------------|
| `addFees` | Sums the `fee` field across an array of objects. |

### `time-helpers.ts`

| Export | Description |
|--------|-------------|
| `forceLeadingZero` | Pads a number string with a leading zero if it is a single digit. |

### `phone-helpers.ts`

| Export | Description |
|--------|-------------|
| `makePhoneCompliantForSupabaseFilter` | Strips the leading `+` from a phone number for use in Supabase query filters. |

### `query-helpers.ts`

| Export | Description |
|--------|-------------|
| `loadQuery` | Reads a raw SQL file from the app's `queries/` folder at runtime using `readFileSync`. |

### `third-party-service-helpers.ts`

| Export | Description |
|--------|-------------|
| `createFlutterwaveReference` | Generates a Flutterwave payment reference string. |
| `inferBrokerIndexByVrmId` | Maps a Victron VRM site ID to the appropriate MQTT broker index. |

### `pipes.ts` _(NestJS-specific)_

| Export | Description |
|--------|-------------|
| `ParseDatePipe` | NestJS pipe that parses a query/route param string into a `Date`. |
| `ParseBoolPipe` | NestJS pipe that parses a query/route param string into a `boolean`. |

---

## Tests and linting

```bash
# Run unit tests
npx nx test helpers

# Run linting
npx nx lint helpers
```

Unit tests live alongside the helper files for `array-helpers`, `number-helpers`, `promise-helpers`, and `utilities`.

---

## License

This project is licensed under the [Mozilla Public License 2.0](https://www.mozilla.org/MPL/2.0/). See the [`LICENSE`](../../LICENSE) file at the repository root.
