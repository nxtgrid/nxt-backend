import { HttpException, ServiceUnavailableException } from '@nestjs/common';

/** Structural logger — avoids pnpm dual `@nestjs/common` peer identity mismatches. */
interface ErrorLogger {
  error(message: string, ...optionalParams: unknown[]): void;
}

interface ErrorWithMessage {
  message: unknown;
}

function hasMessage(error: unknown): error is ErrorWithMessage {
  return typeof error === 'object' && error !== null && 'message' in error;
}

/**
 * Detects HTML / generic 5xx bodies sometimes returned through the Data API
 * (e.g. Cloudflare). Used to collapse gigantic HTML into a one-line log/response
 * and map to HTTP 503 (infra unavailable — not an empty result set).
 *
 * Legacy soft-`null` was a panic brake when call sites were not throw-ready; OSS
 * throws instead. Retries for this class of failure are a far-future optimization.
 */
function isCloudflareHtmlError(error: unknown): boolean {
  const msg = hasMessage(error) ? error.message : undefined;
  if (typeof msg !== 'string') {
    return false;
  }
  const checkableMsg = msg.trim().toLowerCase();
  return checkableMsg.includes('html') || checkableMsg.includes('internal server error');
}

const CLOUDFLARE_HTML_SUMMARY = 'Supabase service unavailable (HTML/5xx body — likely Cloudflare)';

function resolveErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (hasMessage(error) && typeof error.message === 'string') {
    return error.message;
  }
  return JSON.stringify(error);
}

/** Logs then throws an HTTP exception — exported for auth and other Foundation consumers. */
export function throwSupabaseError(
  error: unknown,
  status: number | undefined,
  logger: ErrorLogger,
): never {
  if (isCloudflareHtmlError(error)) {
    // @TEMPORARY :: Logging the entire error so we can tighten the html check
    console.info(error);
    logger.error(
      `[SUPABASE RESPONSE ERROR] status=${ status ?? 'unknown' } ${ CLOUDFLARE_HTML_SUMMARY }`,
    );
    throw new ServiceUnavailableException(CLOUDFLARE_HTML_SUMMARY);
  }

  const message = resolveErrorMessage(error);
  logger.error(
    `[SUPABASE RESPONSE ERROR] status=${ status ?? 'unknown' } ${ message }`,
  );
  throw new HttpException(message, status ?? 500);
}
