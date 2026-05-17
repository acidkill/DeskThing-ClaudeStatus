import { DeskThing } from '@deskthing/server';

const REDACT_PATTERNS: ReadonlyArray<RegExp> = [
  /sk-ant-[A-Za-z0-9_-]{10,}/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /"access_token"\s*:\s*"[^"]+"/gi,
  /"refresh_token"\s*:\s*"[^"]+"/gi,
];

export const redact = (input: string): string => {
  let out = input;
  for (const pattern of REDACT_PATTERNS) {
    out = out.replace(pattern, '[redacted]');
  }
  return out;
};

const format = (msg: string, meta?: Record<string, unknown>): string => {
  if (!meta) return redact(msg);
  return redact(`${msg} ${JSON.stringify(meta)}`);
};

const callIfFn = (fn: unknown, line: string): boolean => {
  if (typeof fn === 'function') {
    (fn as (s: string) => void)(line);
    return true;
  }
  return false;
};

export const log = {
  info(msg: string, meta?: Record<string, unknown>): void {
    const line = format(msg, meta);
    if (!callIfFn((DeskThing as unknown as { sendLog?: unknown }).sendLog, line)) {
      console.log(`[claude-status] ${line}`);
    }
  },
  warn(msg: string, meta?: Record<string, unknown>): void {
    const line = format(msg, meta);
    if (!callIfFn((DeskThing as unknown as { sendWarning?: unknown }).sendWarning, line)) {
      console.warn(`[claude-status] ${line}`);
    }
  },
  error(msg: string, meta?: Record<string, unknown>): void {
    const line = format(msg, meta);
    if (!callIfFn((DeskThing as unknown as { sendError?: unknown }).sendError, line)) {
      console.error(`[claude-status] ${line}`);
    }
  },
};
