/**
 * Reads a required environment variable, throwing a clear, fail-fast error if it is unset or
 * empty. This is the co-located pattern every Tier-2 adapter's `forRoot`/constructor copies
 * (ADR-007 decision 9, layer 2) and the pattern the `demo` capability demonstrates.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`MISSING ${ name }`);
  }
  return value;
}
