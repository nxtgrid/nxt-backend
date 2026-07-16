import { HttpException } from '@nestjs/common';
import type { PinoLogger } from 'nestjs-pino';

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

/** Logs via pino, then throws an HTTP exception — exported for auth and other Foundation consumers. */
export function throwSupabaseError(
  error: unknown,
  status: number | undefined,
  logger: PinoLogger,
): never {
  logger.error({ error, status }, '[SUPABASE RESPONSE ERROR]');
  throw new HttpException(resolveErrorMessage(error), status ?? 500);
}
