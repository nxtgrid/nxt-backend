import { HttpException, type Logger } from '@nestjs/common';

interface ErrorWithMessage {
  message: unknown;
}

function hasMessage(error: unknown): error is ErrorWithMessage {
  return typeof error === 'object' && error !== null && 'message' in error;
}

export function isCloudflareHtmlError(error: unknown): boolean {
  const msg = hasMessage(error) ? error.message : undefined;
  if (typeof msg !== 'string') {
    return false;
  }
  const checkableMsg = msg.trim().toLowerCase();
  return checkableMsg.includes('html') || checkableMsg.includes('internal server error');
}

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
  logger: Logger,
): never {
  logger.error(
    `[SUPABASE RESPONSE ERROR] status=${ status ?? 'unknown' } ${ resolveErrorMessage(error) }`,
  );
  throw new HttpException(resolveErrorMessage(error), status ?? 500);
}
