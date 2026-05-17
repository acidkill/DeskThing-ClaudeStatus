import type { UsageStatus } from '../shared/messages';

export class AnthropicError extends Error {
  readonly code: 'HTTP' | 'NETWORK' | 'TIMEOUT' | 'PARSE';
  readonly status: number | null;
  readonly retryAfterMs: number | null;

  constructor(
    code: AnthropicError['code'],
    message: string,
    status: number | null = null,
    retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = 'AnthropicError';
    this.code = code;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

export type RateLimitSnapshot = {
  sessionPct: number;
  sessionResetMin: number;
  weeklyPct: number;
  weeklyResetMin: number;
  status: UsageStatus;
};

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

// Cheapest available model for a one-token ping. The body's content is
// irrelevant — we only consume the rate-limit response headers.
const PING_MODEL = 'claude-haiku-4-5';

const ALLOWED_STATUSES: ReadonlyArray<UsageStatus> = [
  'allowed',
  'allowed_warning',
  'rejecting',
  'unknown',
];

const parsePct = (raw: string | null): number => {
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  const pct = n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(pct)));
};

const EPOCH_SECONDS_THRESHOLD = 1_000_000_000;

const parseResetMinutes = (raw: string | null): number => {
  if (!raw) return 0;
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber)) {
    // Anthropic returns the reset header as an absolute Unix epoch timestamp
    // in seconds. Numbers >= 1_000_000_000 (post-2001) are treated as epoch
    // seconds; smaller numbers are treated as relative seconds-until-reset
    // for backwards compatibility with older proxies or fixtures.
    const ms =
      asNumber >= EPOCH_SECONDS_THRESHOLD ? asNumber * 1000 : Date.now() + asNumber * 1000;
    return Math.max(0, Math.round((ms - Date.now()) / 60_000));
  }
  const asDate = Date.parse(raw);
  if (Number.isFinite(asDate)) {
    return Math.max(0, Math.round((asDate - Date.now()) / 60_000));
  }
  return 0;
};

const parseStatus = (raw: string | null): UsageStatus => {
  if (raw && (ALLOWED_STATUSES as ReadonlyArray<string>).includes(raw)) {
    return raw as UsageStatus;
  }
  return 'unknown';
};

const parseRetryAfter = (raw: string | null): number | null => {
  if (!raw) return null;
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber)) return Math.max(0, asNumber * 1000);
  const asDate = Date.parse(raw);
  if (Number.isFinite(asDate)) return Math.max(0, asDate - Date.now());
  return null;
};

export const pingAnthropic = async (
  accessToken: string,
  options: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<RateLimitSnapshot> => {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const onAbort = (): void => controller.abort();
  options.signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'oauth-2025-04-20',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        model: PING_MODEL,
        max_tokens: 1,
        messages: [{ role: 'user', content: '.' }],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as { name?: string }).name === 'AbortError') {
      throw new AnthropicError('TIMEOUT', `Anthropic request timed out after ${timeoutMs}ms`);
    }
    throw new AnthropicError('NETWORK', `Anthropic request failed: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }

  const headers = response.headers;
  const snapshot: RateLimitSnapshot = {
    sessionPct: parsePct(headers.get('anthropic-ratelimit-unified-5h-utilization')),
    sessionResetMin: parseResetMinutes(headers.get('anthropic-ratelimit-unified-5h-reset')),
    weeklyPct: parsePct(headers.get('anthropic-ratelimit-unified-7d-utilization')),
    weeklyResetMin: parseResetMinutes(headers.get('anthropic-ratelimit-unified-7d-reset')),
    status: parseStatus(headers.get('anthropic-ratelimit-unified-status')),
  };

  if (response.ok) {
    return snapshot;
  }

  // 429 still returns useful rate-limit headers; surface the snapshot via the
  // error so the caller can broadcast partial data alongside backoff.
  const retryAfterMs = parseRetryAfter(headers.get('retry-after'));
  if (response.status === 429) {
    throw new AnthropicError('HTTP', 'Anthropic rate limit hit (429)', 429, retryAfterMs);
  }
  throw new AnthropicError('HTTP', `Anthropic returned HTTP ${response.status}`, response.status, retryAfterMs);
};
