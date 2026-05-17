import type { Mood, SettingsSnapshot } from '../shared/messages';

const WINDOW_MS = 5 * 60 * 1000;
/**
 * Minimum span between samples before we trust a windowed rate. At default 60s
 * polling, two consecutive polls span 60s — so the second poll already
 * unblocks a real rate computation. Single-sample boot returns idle because
 * `samples.length < 2`.
 */
const MIN_WINDOW_MS = 60 * 1000;
/**
 * If the session pct drops by this many points between consecutive samples,
 * treat it as a 5h-window reset and clear the buffer. Otherwise the rate goes
 * negative and we'd report idle even though Claude Code is humming along.
 */
const RESET_DROP_PCT = 5;
/**
 * Rate thresholds in pp/min, calibrated against Anthropic's 5h-utilisation
 * header. A 5-hour (300 min) session ÷ 100% = 0.33 pp/min to fill at the same
 * pace as the session resets — "frantic" starts there.
 */
const IDLE_MAX = 0.1;
const ACTIVE_MAX = 0.2;
const BUSY_MAX = 0.33;
/**
 * Absolute-usage floor: regardless of rate, a meter that's already half-full
 * or worse should not pretend to be idle. Forward movement (any positive
 * delta in the last poll) also escalates from idle → active so the mascot
 * reacts within a single poll once you start working.
 */
const ACTIVE_PCT_FLOOR = 50;
const BUSY_PCT_FLOOR = 75;
const FRANTIC_PCT_FLOOR = 90;

type Sample = { ts: number; sessionPct: number };

const ORDER: ReadonlyArray<Mood> = ['idle', 'active', 'busy', 'frantic'];
const maxMood = (a: Mood, b: Mood): Mood => (ORDER.indexOf(b) > ORDER.indexOf(a) ? b : a);

export class MoodTracker {
  private samples: Sample[] = [];

  record(sessionPct: number, now: number = Date.now()): void {
    const last = this.samples[this.samples.length - 1];
    if (last && sessionPct + RESET_DROP_PCT < last.sessionPct) {
      this.samples = [];
    }
    this.samples.push({ ts: now, sessionPct });
    const cutoff = now - WINDOW_MS;
    while (this.samples.length > 0) {
      const head = this.samples[0];
      if (head && head.ts < cutoff) {
        this.samples.shift();
        continue;
      }
      break;
    }
  }

  /** Percentage points per minute over the captured window, rounded to 2 dp. */
  ratePctPerMin(now: number = Date.now()): number {
    if (this.samples.length < 2) return 0;
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    if (!first || !last) return 0;
    const spanMs = last.ts - first.ts;
    if (spanMs < MIN_WINDOW_MS) return 0;
    const minutes = Math.max(spanMs / 60_000, (now - first.ts) / 60_000);
    if (minutes <= 0) return 0;
    const delta = Math.max(0, last.sessionPct - first.sessionPct);
    return Math.round((delta / minutes) * 100) / 100;
  }

  private rateMood(now: number): Mood {
    const rate = this.ratePctPerMin(now);
    if (rate >= BUSY_MAX) return 'frantic';
    if (rate >= ACTIVE_MAX) return 'busy';
    if (rate >= IDLE_MAX) return 'active';
    return 'idle';
  }

  private absoluteMood(): Mood {
    const last = this.samples[this.samples.length - 1];
    if (!last) return 'idle';
    if (last.sessionPct >= FRANTIC_PCT_FLOOR) return 'frantic';
    if (last.sessionPct >= BUSY_PCT_FLOOR) return 'busy';
    if (last.sessionPct >= ACTIVE_PCT_FLOOR) return 'active';
    return 'idle';
  }

  private movementMood(): Mood {
    if (this.samples.length < 2) return 'idle';
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    if (!first || !last) return 'idle';
    return last.sessionPct > first.sessionPct ? 'active' : 'idle';
  }

  /**
   * Combine rate-based, absolute-pct, and any-forward-movement signals and
   * return the loudest mood any of them implies. The override short-circuits
   * everything for instant manual control.
   */
  derive(override: SettingsSnapshot['animationGroupOverride'], now: number = Date.now()): Mood {
    if (override !== 'auto') return override;
    return maxMood(maxMood(this.rateMood(now), this.absoluteMood()), this.movementMood());
  }

  size(): number {
    return this.samples.length;
  }

  reset(): void {
    this.samples = [];
  }
}
