import type { Mood, SettingsSnapshot } from '../shared/messages';

const WINDOW_MS = 5 * 60 * 1000;

type Sample = { ts: number; sessionPct: number };

export class MoodTracker {
  private readonly samples: Sample[] = [];

  record(sessionPct: number, now: number = Date.now()): void {
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

  /** Percentage points per minute, rounded to 2 dp. */
  ratePctPerMin(now: number = Date.now()): number {
    if (this.samples.length < 2) return 0;
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    if (!first || !last) return 0;
    const minutes = Math.max((last.ts - first.ts) / 60_000, (now - first.ts) / 60_000);
    if (minutes <= 0) return 0;
    const delta = last.sessionPct - first.sessionPct;
    return Math.round((delta / minutes) * 100) / 100;
  }

  /**
   * Map the windowed rate to a mood tier. Negative or near-zero rates collapse
   * to "idle" — the meter is draining (reset just happened) or static.
   */
  derive(override: SettingsSnapshot['animationGroupOverride'], now: number = Date.now()): Mood {
    if (override !== 'auto') return override;
    const rate = this.ratePctPerMin(now);
    if (rate < 0.5) return 'idle';
    if (rate < 2) return 'active';
    if (rate < 5) return 'busy';
    return 'frantic';
  }

  size(): number {
    return this.samples.length;
  }

  reset(): void {
    this.samples.length = 0;
  }
}
