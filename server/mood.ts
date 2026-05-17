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
 * Rate thresholds in pp/min. IDLE_MAX is kept low (0.02) because real Sonnet
 * usage typically moves the unified-5h counter only 0.01–0.05 pp/min; the
 * old value of 0.1 caused active sessions to read as idle. ACTIVE_MAX /
 * BUSY_MAX preserve the previously-verified calibration for heavier usage.
 */
const IDLE_MAX = 0.02;
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
/**
 * How long after the last observed forward movement (on EITHER the session or
 * weekly counter) the tracker stays at least `active`. Outlives the 5-minute
 * sample window so granular plateaus — typical for the unified-5h counter,
 * which only ticks every 1–3 polls during normal Sonnet usage — don't drop
 * the mascot back to idle while Claude is still humming. Tuning rationale:
 * shorter than this and brief pauses between turns look idle; longer and a
 * truly idle user keeps seeing "active" long after they stopped.
 */
const ACTIVE_MEMORY_MS = 10 * 60 * 1000;

type Sample = { ts: number; sessionPct: number };

const ORDER: ReadonlyArray<Mood> = ['idle', 'active', 'busy', 'frantic'];
const maxMood = (a: Mood, b: Mood): Mood => (ORDER.indexOf(b) > ORDER.indexOf(a) ? b : a);

export class MoodTracker {
  private samples: Sample[] = [];
  private prevSessionPct: number | null = null;
  private prevWeeklyPct: number | null = null;
  private lastForwardAt: number | null = null;

  record(sessionPct: number, weeklyPct: number = 0, now: number = Date.now()): void {
    const last = this.samples[this.samples.length - 1];
    if (last && sessionPct + RESET_DROP_PCT < last.sessionPct) {
      // 5h window reset on the upstream counter — drop the sample buffer but
      // keep `lastForwardAt` so we don't pretend the user just went idle.
      this.samples = [];
      this.prevSessionPct = null;
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

    // Track forward movement on EITHER counter, independently of the sample
    // window. The session 5h counter has coarse granularity (~0.01–0.05
    // pp/min) so we also watch the weekly counter; either ticking up means
    // the user is actively burning tokens.
    if (this.prevSessionPct !== null && sessionPct > this.prevSessionPct) {
      this.lastForwardAt = now;
    }
    if (this.prevWeeklyPct !== null && weeklyPct > this.prevWeeklyPct) {
      this.lastForwardAt = now;
    }
    this.prevSessionPct = sessionPct;
    this.prevWeeklyPct = weeklyPct;
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
    for (let i = 1; i < this.samples.length; i++) {
      const prev = this.samples[i - 1];
      const curr = this.samples[i];
      if (prev && curr && curr.sessionPct > prev.sessionPct) return 'active';
    }
    return 'idle';
  }

  /**
   * Cross-window memory of recent forward movement. Survives sample pruning,
   * so granular plateaus on the unified-5h counter (1–3 polls without a
   * visible tick) don't snap us back to idle while Claude is still working.
   */
  private recentMovementMood(now: number): Mood {
    if (this.lastForwardAt === null) return 'idle';
    if (now - this.lastForwardAt <= ACTIVE_MEMORY_MS) return 'active';
    return 'idle';
  }

  /**
   * Combine rate-based, absolute-pct, in-window movement, and cross-window
   * recent-movement signals; return the loudest mood any of them implies.
   * The override short-circuits everything for instant manual control.
   */
  derive(override: SettingsSnapshot['animationGroupOverride'], now: number = Date.now()): Mood {
    if (override !== 'auto') return override;
    return maxMood(
      maxMood(this.rateMood(now), this.absoluteMood()),
      maxMood(this.movementMood(), this.recentMovementMood(now)),
    );
  }

  size(): number {
    return this.samples.length;
  }

  lastForwardTimestamp(): number | null {
    return this.lastForwardAt;
  }

  reset(): void {
    this.samples = [];
    this.prevSessionPct = null;
    this.prevWeeklyPct = null;
    this.lastForwardAt = null;
  }
}
