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
 * How far back we look at forward-movement ticks (on EITHER counter) when
 * deriving "the user is actively working". 20 minutes outlives the 5-minute
 * sample window AND the typical granularity gap on the unified-5h counter
 * (~1 visible tick every 5–15 min during normal Sonnet usage). Shorter and
 * brief pauses between turns look idle; longer and a truly idle user keeps
 * seeing "active" long after they stopped. Memory is pruned aggressively to
 * stay bounded.
 */
const ACTIVE_MEMORY_MS = 20 * 60 * 1000;
/**
 * Tick-count thresholds for the memory signal. The previous design only
 * returned `active` from memory — so a user generating 5k tokens with
 * multiple visible counter ticks within 20 minutes still saw `active`, never
 * `busy` or `frantic`. With these counts, *sustained* activity escalates:
 *   • 1 tick in window  → active
 *   • 2–3 ticks         → busy
 *   • ≥4 ticks          → frantic
 * Tuned for Sonnet 4.6 normal-use granularity. Coarser counters (or single
 * heavy bursts) still rely on the rate and absolute-pct signals.
 */
const MEMORY_BUSY_TICKS = 2;
const MEMORY_FRANTIC_TICKS = 4;

type Sample = { ts: number; sessionPct: number };

const ORDER: ReadonlyArray<Mood> = ['idle', 'active', 'busy', 'frantic'];
const maxMood = (a: Mood, b: Mood): Mood => (ORDER.indexOf(b) > ORDER.indexOf(a) ? b : a);

export class MoodTracker {
  private samples: Sample[] = [];
  private prevSessionPct: number | null = null;
  private prevWeeklyPct: number | null = null;
  /** Timestamps of every observed forward tick (session OR weekly counter),
   *  pruned to the last ACTIVE_MEMORY_MS. Drives the count-based escalation
   *  in `recentMovementMood`. */
  private forwardTicks: number[] = [];

  record(sessionPct: number, weeklyPct: number = 0, now: number = Date.now()): void {
    const last = this.samples[this.samples.length - 1];
    if (last && sessionPct + RESET_DROP_PCT < last.sessionPct) {
      // 5h window reset on the upstream counter — drop the sample buffer but
      // keep `forwardTicks` so we don't pretend the user just went idle.
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

    // Track forward movement on EITHER counter. The session 5h counter has
    // coarse granularity (~0.01–0.05 pp/min) so we also watch the weekly
    // counter; either ticking up means the user is actively burning tokens.
    // We count ticks (not just remember the last one) so sustained activity
    // can escalate the memory signal to busy / frantic.
    const sessionTicked = this.prevSessionPct !== null && sessionPct > this.prevSessionPct;
    const weeklyTicked = this.prevWeeklyPct !== null && weeklyPct > this.prevWeeklyPct;
    if (sessionTicked || weeklyTicked) {
      this.forwardTicks.push(now);
    }
    // Prune ticks older than the memory window so the array stays bounded.
    const memoryCutoff = now - ACTIVE_MEMORY_MS;
    while (this.forwardTicks.length > 0) {
      const head = this.forwardTicks[0];
      if (head !== undefined && head < memoryCutoff) {
        this.forwardTicks.shift();
        continue;
      }
      break;
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
   * visible tick) don't snap us back to idle. Counts ticks in the window so
   * sustained activity escalates to busy / frantic.
   */
  private recentMovementMood(now: number): Mood {
    const count = this.recentForwardTicks(now);
    if (count === 0) return 'idle';
    if (count >= MEMORY_FRANTIC_TICKS) return 'frantic';
    if (count >= MEMORY_BUSY_TICKS) return 'busy';
    return 'active';
  }

  /** Forward ticks observed in the last ACTIVE_MEMORY_MS. */
  private recentForwardTicks(now: number): number {
    const cutoff = now - ACTIVE_MEMORY_MS;
    let count = 0;
    for (const t of this.forwardTicks) {
      if (t >= cutoff) count += 1;
    }
    return count;
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

  /** Timestamp of the most recent forward tick in any counter, or null. */
  lastForwardTimestamp(): number | null {
    const last = this.forwardTicks[this.forwardTicks.length - 1];
    return last ?? null;
  }

  /** Count of forward ticks within ACTIVE_MEMORY_MS for diagnostics. */
  recentTickCount(now: number = Date.now()): number {
    return this.recentForwardTicks(now);
  }

  reset(): void {
    this.samples = [];
    this.prevSessionPct = null;
    this.prevWeeklyPct = null;
    this.forwardTicks = [];
  }
}
