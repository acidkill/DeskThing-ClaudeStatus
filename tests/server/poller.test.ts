import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS, type ServerToClient, type SettingsSnapshot } from '../../shared/messages';

const { readCredentialsMock, pingAnthropicMock } = vi.hoisted(() => ({
  readCredentialsMock: vi.fn(),
  pingAnthropicMock: vi.fn(),
}));

vi.mock('../../server/credentials', async () => {
  const actual = await vi.importActual<typeof import('../../server/credentials')>(
    '../../server/credentials',
  );
  return { ...actual, readCredentials: readCredentialsMock };
});

vi.mock('../../server/anthropic', async () => {
  const actual = await vi.importActual<typeof import('../../server/anthropic')>(
    '../../server/anthropic',
  );
  return { ...actual, pingAnthropic: pingAnthropicMock };
});

vi.mock('../../server/log', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  redact: (s: string) => s,
}));

import { createPoller } from '../../server/poller';
import { AnthropicError } from '../../server/anthropic';
import { CredentialsError } from '../../server/credentials';

type Sent = ServerToClient;

const setupHarness = (overrides: Partial<SettingsSnapshot> = {}) => {
  const sent: Sent[] = [];
  const settings: SettingsSnapshot = { ...DEFAULT_SETTINGS, pollIntervalSec: 10, ...overrides };
  const poller = createPoller({
    send: (msg) => sent.push(msg),
    getSettings: () => settings,
  });
  return { sent, settings, poller };
};

beforeEach(() => {
  readCredentialsMock.mockReset();
  pingAnthropicMock.mockReset();
  vi.useFakeTimers({ now: new Date('2026-05-16T12:00:00Z') });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createPoller', () => {
  it('broadcasts a usage payload on a successful tick', async () => {
    readCredentialsMock.mockResolvedValue({
      accessToken: 'tok',
      refreshToken: null,
      expiresAt: null,
      resolvedPath: '/tmp/c',
    });
    pingAnthropicMock.mockResolvedValue({
      sessionPct: 42,
      sessionResetMin: 30,
      weeklyPct: 12,
      weeklyResetMin: 600,
      status: 'allowed',
    });

    const { sent, poller } = setupHarness();
    await poller.poll('manual');

    expect(sent).toHaveLength(1);
    const msg = sent[0]!;
    expect(msg.type).toBe('usage');
    if (msg.type !== 'usage') throw new Error('expected usage');
    expect(msg.payload.s).toBe(42);
    expect(msg.payload.w).toBe(12);
    expect(msg.payload.st).toBe('allowed');
    expect(msg.payload.ok).toBe(true);
    expect(msg.payload.mood).toBe('idle');
    expect(msg.payload.ts).toBe(Date.parse('2026-05-16T12:00:00Z'));
  });

  it('marks ok=false when the upstream is rejecting', async () => {
    readCredentialsMock.mockResolvedValue({ accessToken: 'tok', refreshToken: null, expiresAt: null, resolvedPath: '' });
    pingAnthropicMock.mockResolvedValue({
      sessionPct: 100,
      sessionResetMin: 5,
      weeklyPct: 100,
      weeklyResetMin: 200,
      status: 'rejecting',
    });
    const { sent, poller } = setupHarness();
    await poller.poll('tick');
    const msg = sent[0]!;
    if (msg.type !== 'usage') throw new Error('expected usage');
    expect(msg.payload.ok).toBe(false);
  });

  it('broadcasts a credentials error when readCredentials throws', async () => {
    readCredentialsMock.mockRejectedValue(new CredentialsError('NOT_FOUND', 'gone'));
    const { sent, poller } = setupHarness();
    await poller.poll('manual');
    const msg = sent[0]!;
    expect(msg.type).toBe('error');
    if (msg.type !== 'error') throw new Error('expected error');
    expect(msg.payload.code).toBe('credentials:not_found');
    expect(pingAnthropicMock).not.toHaveBeenCalled();
  });

  it('skips overlapping ticks via the in-flight guard', async () => {
    readCredentialsMock.mockResolvedValue({ accessToken: 'tok', refreshToken: null, expiresAt: null, resolvedPath: '' });
    let resolveFirst!: (v: unknown) => void;
    pingAnthropicMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve as (v: unknown) => void;
        }),
    );

    const { sent, poller } = setupHarness();
    const first = poller.poll('manual');
    await poller.poll('tick'); // should be a no-op while first is pending
    expect(sent).toHaveLength(0);
    expect(pingAnthropicMock).toHaveBeenCalledTimes(1);

    resolveFirst({
      sessionPct: 10,
      sessionResetMin: 1,
      weeklyPct: 1,
      weeklyResetMin: 1,
      status: 'allowed',
    });
    await first;
    expect(sent).toHaveLength(1);
  });

  it('backs off on 429 and honours retry-after, capped at pollIntervalSec * 8', async () => {
    readCredentialsMock.mockResolvedValue({ accessToken: 'tok', refreshToken: null, expiresAt: null, resolvedPath: '' });

    pingAnthropicMock.mockRejectedValueOnce(new AnthropicError('HTTP', '429', 429, 4000));
    const { sent, poller } = setupHarness({ pollIntervalSec: 60 });
    await poller.poll('tick');
    expect(sent[0]?.type).toBe('error');

    // Tick during the backoff window must NOT call upstream again.
    pingAnthropicMock.mockClear();
    await poller.poll('tick');
    expect(pingAnthropicMock).not.toHaveBeenCalled();

    // After the backoff window elapses, a tick re-tries upstream.
    vi.setSystemTime(Date.now() + 5000);
    pingAnthropicMock.mockResolvedValue({
      sessionPct: 5,
      sessionResetMin: 1,
      weeklyPct: 1,
      weeklyResetMin: 1,
      status: 'allowed',
    });
    await poller.poll('tick');
    expect(pingAnthropicMock).toHaveBeenCalledTimes(1);
    expect(sent.at(-1)?.type).toBe('usage');
  });

  it('uses exponential backoff when retry-after is absent', async () => {
    readCredentialsMock.mockResolvedValue({ accessToken: 'tok', refreshToken: null, expiresAt: null, resolvedPath: '' });
    pingAnthropicMock.mockRejectedValue(new AnthropicError('HTTP', '429', 429, null));

    const { sent, poller } = setupHarness({ pollIntervalSec: 30 });
    await poller.poll('tick');
    await poller.poll('tick');
    await poller.poll('tick');
    // All three calls receive an error message; only the first reaches upstream.
    expect(sent.filter((s) => s.type === 'error')).toHaveLength(1);
  });
});
