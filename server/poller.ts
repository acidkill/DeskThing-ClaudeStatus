import { AnthropicError, pingAnthropic, type RateLimitSnapshot } from './anthropic';
import { CredentialsError, readCredentials } from './credentials';
import { log } from './log';
import { MoodTracker } from './mood';
import type { ErrorPayload, ServerToClient, SettingsSnapshot, UsagePayload } from '../shared/messages';

type Send = (msg: ServerToClient) => void;
type GetSettings = () => SettingsSnapshot;

export type Poller = {
  poll: (reason: 'tick' | 'manual' | 'settings-change') => Promise<void>;
  broadcastMood: () => void;
  dispose: () => void;
};

const credentialErrorPayload = (err: CredentialsError): ErrorPayload => ({
  code: `credentials:${err.code.toLowerCase()}`,
  message: err.message,
});

const anthropicErrorPayload = (err: AnthropicError): ErrorPayload => ({
  code: `anthropic:${err.code.toLowerCase()}${err.status ? `:${err.status}` : ''}`,
  message: err.message,
});

const buildUsagePayload = (
  snapshot: RateLimitSnapshot,
  mood: ReturnType<MoodTracker['derive']>,
): UsagePayload => ({
  s: snapshot.sessionPct,
  sr: snapshot.sessionResetMin,
  w: snapshot.weeklyPct,
  wr: snapshot.weeklyResetMin,
  st: snapshot.status,
  mood,
  ok: snapshot.status !== 'rejecting',
  ts: Date.now(),
});

export const createPoller = (deps: { send: Send; getSettings: GetSettings }): Poller => {
  const mood = new MoodTracker();
  let inflight: Promise<void> | null = null;
  let consecutive429 = 0;
  let backoffUntil = 0;
  let disposed = false;
  let lastSnapshot: RateLimitSnapshot | null = null;

  const poll = async (reason: 'tick' | 'manual' | 'settings-change'): Promise<void> => {
    if (disposed) return;
    if (inflight) {
      log.info('poll skipped: in flight', { reason });
      return;
    }
    const now = Date.now();
    if (reason === 'tick' && now < backoffUntil) {
      log.info('poll skipped: backing off', { msRemaining: backoffUntil - now });
      return;
    }

    const settings = deps.getSettings();
    inflight = (async () => {
      try {
        const creds = await readCredentials(settings.credentialsPath);
        const snapshot = await pingAnthropic(creds.accessToken);
        lastSnapshot = snapshot;
        mood.record(snapshot.sessionPct);
        const ratePpm = mood.ratePctPerMin();
        const payload = buildUsagePayload(snapshot, mood.derive(settings.animationGroupOverride));
        deps.send({ type: 'usage', payload });
        consecutive429 = 0;
        backoffUntil = 0;
        log.info('poll ok', {
          s: payload.s,
          w: payload.w,
          sr: payload.sr,
          wr: payload.wr,
          st: payload.st,
          mood: payload.mood,
          ratePpm,
          samples: mood.size(),
          reason,
        });
      } catch (err) {
        if (err instanceof CredentialsError) {
          deps.send({ type: 'error', payload: credentialErrorPayload(err) });
          log.error('credentials error', { code: err.code });
          return;
        }
        if (err instanceof AnthropicError) {
          deps.send({ type: 'error', payload: anthropicErrorPayload(err) });
          log.warn('anthropic error', { code: err.code, status: err.status ?? 'n/a' });
          if (err.status === 429) {
            consecutive429 += 1;
            const capMs = settings.pollIntervalSec * 8 * 1000;
            const expMs = Math.min(capMs, 1000 * 2 ** Math.min(consecutive429, 10));
            const waitMs = err.retryAfterMs && err.retryAfterMs > 0 ? Math.min(capMs, err.retryAfterMs) : expMs;
            backoffUntil = Date.now() + waitMs;
            log.warn('backing off after 429', { waitMs, consecutive429 });
          }
          return;
        }
        const message = err instanceof Error ? err.message : String(err);
        deps.send({ type: 'error', payload: { code: 'unknown', message } });
        log.error('poll failed', { message });
      } finally {
        inflight = null;
      }
    })();

    await inflight;
  };

  const broadcastMood = (): void => {
    if (disposed || !lastSnapshot) return;
    const settings = deps.getSettings();
    const payload = buildUsagePayload(lastSnapshot, mood.derive(settings.animationGroupOverride));
    deps.send({ type: 'usage', payload });
    log.info('mood rebroadcast', { mood: payload.mood, override: settings.animationGroupOverride });
  };

  const dispose = (): void => {
    disposed = true;
    mood.reset();
  };

  return { poll, broadcastMood, dispose };
};
