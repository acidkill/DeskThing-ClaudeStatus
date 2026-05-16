import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnthropicError, pingAnthropic } from '../../server/anthropic';

type FetchMock = ReturnType<typeof vi.fn>;

const installFetchMock = (impl: (input: string, init?: RequestInit) => Promise<Response>): FetchMock => {
  const spy = vi.fn(impl) as FetchMock;
  vi.stubGlobal('fetch', spy);
  return spy;
};

const okResponse = (headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify({ id: 'msg' }), { status: 200, headers });

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-05-16T12:00:00Z') });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('pingAnthropic', () => {
  it('sends Bearer + oauth-beta + JSON body to the v1/messages endpoint', async () => {
    const spy = installFetchMock(async () => okResponse({
      'anthropic-ratelimit-unified-5h-utilization': '0.25',
      'anthropic-ratelimit-unified-5h-reset': '600',
      'anthropic-ratelimit-unified-7d-utilization': '0.10',
      'anthropic-ratelimit-unified-7d-reset': '3600',
      'anthropic-ratelimit-unified-status': 'allowed',
    }));

    const snapshot = await pingAnthropic('tok-123');

    expect(spy).toHaveBeenCalledOnce();
    const [url, init] = spy.mock.calls[0]!;
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init?.method).toBe('POST');
    const headers = init?.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer tok-123');
    expect(headers['anthropic-beta']).toMatch(/oauth/);
    expect(headers['anthropic-version']).toBe('2023-06-01');
    expect(JSON.parse(String(init?.body))).toMatchObject({ max_tokens: 1 });

    expect(snapshot.sessionPct).toBe(25);
    expect(snapshot.sessionResetMin).toBe(10);
    expect(snapshot.weeklyPct).toBe(10);
    expect(snapshot.weeklyResetMin).toBe(60);
    expect(snapshot.status).toBe('allowed');
  });

  it('accepts percentages already in 0..100 range', async () => {
    installFetchMock(async () => okResponse({
      'anthropic-ratelimit-unified-5h-utilization': '87',
      'anthropic-ratelimit-unified-5h-reset': '60',
      'anthropic-ratelimit-unified-7d-utilization': '12',
      'anthropic-ratelimit-unified-7d-reset': '60',
      'anthropic-ratelimit-unified-status': 'allowed_warning',
    }));
    const snapshot = await pingAnthropic('tok');
    expect(snapshot.sessionPct).toBe(87);
    expect(snapshot.status).toBe('allowed_warning');
  });

  it('parses RFC 3339 reset timestamps relative to now', async () => {
    installFetchMock(async () => okResponse({
      'anthropic-ratelimit-unified-5h-reset': new Date('2026-05-16T12:30:00Z').toISOString(),
      'anthropic-ratelimit-unified-7d-reset': new Date('2026-05-16T14:00:00Z').toISOString(),
    }));
    const snapshot = await pingAnthropic('tok');
    expect(snapshot.sessionResetMin).toBe(30);
    expect(snapshot.weeklyResetMin).toBe(120);
  });

  it('clamps percentages and defaults missing headers safely', async () => {
    installFetchMock(async () => okResponse({}));
    const snapshot = await pingAnthropic('tok');
    expect(snapshot).toEqual({
      sessionPct: 0,
      sessionResetMin: 0,
      weeklyPct: 0,
      weeklyResetMin: 0,
      status: 'unknown',
    });
  });

  it('throws AnthropicError(HTTP, 429) with retry-after when rate-limited', async () => {
    installFetchMock(
      async () =>
        new Response('rate limited', {
          status: 429,
          headers: { 'retry-after': '7' },
        }),
    );
    await expect(pingAnthropic('tok')).rejects.toMatchObject({
      name: 'AnthropicError',
      code: 'HTTP',
      status: 429,
      retryAfterMs: 7000,
    });
  });

  it('throws AnthropicError(HTTP) for other non-2xx responses', async () => {
    installFetchMock(async () => new Response('boom', { status: 500 }));
    const err = (await pingAnthropic('tok').catch((e) => e)) as AnthropicError;
    expect(err.code).toBe('HTTP');
    expect(err.status).toBe(500);
  });

  it('throws AnthropicError(NETWORK) when fetch rejects', async () => {
    installFetchMock(async () => {
      throw new TypeError('connection refused');
    });
    await expect(pingAnthropic('tok')).rejects.toMatchObject({
      name: 'AnthropicError',
      code: 'NETWORK',
    });
  });
});
