/**
 * Reads a required environment variable, throwing a clear, fail-fast error if it is unset or
 * empty. Co-located pattern for Tier-2 adapter `forRoot`/constructors and Foundation providers
 * (ADR-007 decision 9, layer 2) — e.g. `SupabaseService` admin client secrets.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`MISSING ${ name }`);
  }
  return value;
}
