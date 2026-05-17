import { describe, expect, it } from 'vitest';

import { MoodTracker } from '../../server/mood';

const seedLinear = (tracker: MoodTracker, start: number, perMin: number, mins: number): number => {
  const stepMs = 60_000;
  let now = start;
  for (let i = 0; i <= mins; i += 1) {
    tracker.record(i * perMin, 0, now);
    now += stepMs;
  }
  return now - stepMs;
};

describe('MoodTracker', () => {
  it('starts idle with no data', () => {
    const t = new MoodTracker();
    expect(t.derive('auto', 0)).toBe('idle');
    expect(t.ratePctPerMin(0)).toBe(0);
  });

  it('returns rate 0 with a single sample (no derivable rate)', () => {
    const t = new MoodTracker();
    t.record(20, 0, 0);
    expect(t.ratePctPerMin(0)).toBe(0);
  });

  it('computes pct-per-minute once the second poll lands', () => {
    const t = new MoodTracker();
    const last = seedLinear(t, 0, 0.5, 4);
    expect(t.ratePctPerMin(last)).toBeCloseTo(0.5, 1);
  });

  it('classifies idle when there is no movement and session pct is low', () => {
    const t = new MoodTracker();
    const last = seedLinear(t, 0, 0, 4);
    expect(t.derive('auto', last)).toBe('idle');
  });

  it('escalates idle → active on any forward movement before the rate window unlocks', () => {
    const t = new MoodTracker();
    t.record(10, 0, 0);
    t.record(10.5, 0, 30_000);
    expect(t.derive('auto', 30_000)).toBe('active');
  });

  it('classifies busy at rate 0.20..0.33 pp/min', () => {
    // Use 2 minutes (3 samples, 2 ticks) so the memory signal lands at busy
    // (2 ticks → busy) and matches the rate signal's busy verdict. With more
    // ticks the count-based memory escalation pushes us to frantic.
    const t = new MoodTracker();
    const last = seedLinear(t, 0, 0.25, 2);
    expect(t.derive('auto', last)).toBe('busy');
  });

  it('classifies frantic at rate ≥ 0.33 pp/min', () => {
    const t = new MoodTracker();
    const last = seedLinear(t, 0, 0.5, 4);
    expect(t.derive('auto', last)).toBe('frantic');
  });

  it('elevates to active when session pct crosses 50% even if rate is flat', () => {
    const t = new MoodTracker();
    t.record(55, 0, 0);
    expect(t.derive('auto', 0)).toBe('active');
  });

  it('elevates to busy when session pct crosses 75%', () => {
    const t = new MoodTracker();
    t.record(80, 0, 0);
    expect(t.derive('auto', 0)).toBe('busy');
  });

  it('elevates to frantic when session pct crosses 90%', () => {
    const t = new MoodTracker();
    t.record(95, 0, 0);
    expect(t.derive('auto', 0)).toBe('frantic');
  });

  it('drops samples older than 5 minutes', () => {
    const t = new MoodTracker();
    t.record(10, 0, 0);
    t.record(20, 0, 60_000);
    t.record(80, 0, 6 * 60_000);
    expect(t.size()).toBe(2);
  });

  it('clears the buffer when sessionPct drops 5+ points (5h reset)', () => {
    const t = new MoodTracker();
    seedLinear(t, 0, 2, 4);
    expect(t.size()).toBeGreaterThan(1);
    t.record(0, 0, 5 * 60_000);
    expect(t.size()).toBe(1);
  });

  it('clamps a negative delta to zero rate', () => {
    const t = new MoodTracker();
    t.record(40, 0, 0);
    t.record(39, 0, 60_000);
    t.record(38, 0, 90_000);
    expect(t.ratePctPerMin(90_000)).toBe(0);
  });

  it('honours a non-auto override regardless of windowed rate or absolute pct', () => {
    const t = new MoodTracker();
    t.record(95, 0, 0);
    expect(t.derive('idle')).toBe('idle');
    expect(t.derive('frantic')).toBe('frantic');
  });

  it('resets the window on demand', () => {
    const t = new MoodTracker();
    t.record(50, 0, 0);
    t.reset();
    expect(t.size()).toBe(0);
    expect(t.derive('auto', 0)).toBe('idle');
    expect(t.lastForwardTimestamp()).toBeNull();
  });

  it('bridges granular-counter plateaus: stays active for 20 min after a single forward tick', () => {
    // Reproduces the original user-reported bug: counter ticks 30→32 in first
    // 3 polls, then plateaus. Sample window prunes past the bump after ~7 min
    // and the original logic dropped mood to idle. Memory keeps it active.
    const t = new MoodTracker();
    let now = 0;
    t.record(30, 0, now); // poll 1
    now += 60_000;
    t.record(31, 0, now); // poll 2 — forward tick at t=60s
    now += 60_000;
    t.record(32, 0, now); // poll 3 — forward tick at t=120s
    // Two forward ticks within window — should escalate from active to busy.
    for (let i = 4; i <= 10; i += 1) {
      now += 60_000;
      t.record(32, 0, now);
    }
    // At t=10*60s = 600s, 30/31/32 samples are long pruned. movementMood and
    // rateMood both return idle. fwdTicks=2 within 20-min memory → busy.
    expect(t.derive('auto', now)).toBe('busy');
  });

  it('escalates memory signal: 1 tick=active, 2 ticks=busy, 4 ticks=frantic', () => {
    const t = new MoodTracker();
    let now = 0;

    // Establish baseline so first comparison works
    t.record(30, 0, now);
    now += 60_000;

    // Tick 1 at t=60s — should land at active (1 tick) — but rateMood will
    // also fire here, so let's seed many flat samples to neutralise the rate
    // signal, then verify the memory signal stand-alone after pruning.
    t.record(30.5, 0, now); // tick 1
    for (let k = 0; k < 6; k += 1) {
      now += 60_000;
      t.record(30.5, 0, now); // flat — sample window will contain only 30.5s
    }
    // Now sample window is all 30.5 — rateMood and movementMood both idle.
    // absoluteMood: 30.5 < 50 → idle. Only memory remains → active (1 tick).
    expect(t.derive('auto', now)).toBe('active');

    // Add a second tick further in.
    now += 60_000;
    t.record(31, 0, now); // tick 2
    for (let k = 0; k < 6; k += 1) {
      now += 60_000;
      t.record(31, 0, now); // flat
    }
    // Memory has 2 ticks → busy
    expect(t.derive('auto', now)).toBe('busy');

    // Two more ticks — total 4 ticks in window → frantic
    now += 60_000;
    t.record(31.5, 0, now); // tick 3
    now += 60_000;
    t.record(32, 0, now); // tick 4
    for (let k = 0; k < 4; k += 1) {
      now += 60_000;
      t.record(32, 0, now); // flat
    }
    expect(t.derive('auto', now)).toBe('frantic');
  });

  it('falls back to idle after ACTIVE_MEMORY_MS since last forward tick', () => {
    const t = new MoodTracker();
    t.record(30, 0, 0);
    t.record(31, 0, 60_000); // last forward at t=60s
    // Advance past 60s + 20min = 1_260_000ms
    for (let now = 120_000; now <= 1_300_000; now += 60_000) {
      t.record(31, 0, now);
    }
    expect(t.derive('auto', 1_300_000)).toBe('idle');
  });

  it('weekly counter movement also triggers recent-movement memory', () => {
    const t = new MoodTracker();
    t.record(20, 10, 0);
    t.record(20, 11, 60_000); // session flat, weekly ticked → active
    // Push past the sample window so movementMood within window is gone too
    for (let now = 120_000; now <= 8 * 60_000; now += 60_000) {
      t.record(20, 11, now);
    }
    // At t=8min, last forward was at t=60s → 7min ago, still < 20min → active
    expect(t.derive('auto', 8 * 60_000)).toBe('active');
  });

  it('exposes lastForwardTimestamp and recentTickCount for diagnostics', () => {
    const t = new MoodTracker();
    expect(t.lastForwardTimestamp()).toBeNull();
    expect(t.recentTickCount(0)).toBe(0);
    t.record(30, 0, 1000);
    expect(t.lastForwardTimestamp()).toBeNull(); // first sample, no prev to compare
    t.record(31, 0, 2000);
    expect(t.lastForwardTimestamp()).toBe(2000);
    expect(t.recentTickCount(2000)).toBe(1);
    t.record(31, 0, 3000); // no movement
    expect(t.lastForwardTimestamp()).toBe(2000);
    expect(t.recentTickCount(3000)).toBe(1);
    t.record(32, 0, 4000); // forward again
    expect(t.lastForwardTimestamp()).toBe(4000);
    expect(t.recentTickCount(4000)).toBe(2);
  });

  it('keeps forward-tick memory across a 5h counter reset (user still working)', () => {
    const t = new MoodTracker();
    t.record(80, 0, 0);
    t.record(82, 0, 60_000); // forward at t=60s
    expect(t.lastForwardTimestamp()).toBe(60_000);
    // 5h reset: drops to 0
    t.record(0, 0, 120_000);
    expect(t.lastForwardTimestamp()).toBe(60_000); // preserved
    expect(t.derive('auto', 180_000)).toBe('active'); // within 20-min memory
  });

  it('prunes ticks older than the 20-minute memory window', () => {
    const t = new MoodTracker();
    let now = 0;
    t.record(30, 0, now);
    // Record 4 ticks over the first 4 minutes.
    for (let i = 1; i <= 4; i += 1) {
      now = i * 60_000;
      t.record(30 + i * 0.1, 0, now);
    }
    expect(t.recentTickCount(now)).toBe(4);
    // Jump to t = 25 min. All ticks (t=60s..240s) older than now-20min=300s
    // should be pruned.
    now = 25 * 60_000;
    t.record(30.4, 0, now); // no new tick (same value as previous)
    expect(t.recentTickCount(now)).toBe(0);
  });
});
