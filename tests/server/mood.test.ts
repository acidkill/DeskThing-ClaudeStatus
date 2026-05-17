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
    const t = new MoodTracker();
    const last = seedLinear(t, 0, 0.25, 4);
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

  it('bridges granular-counter plateaus: stays active for 10 min after last forward tick', () => {
    // Reproduces the user-reported bug: counter ticks 30→32 in first 3 polls,
    // then plateaus. Sample window prunes past the bump after ~7 min and the
    // old logic dropped mood to idle. lastForwardAt memory keeps it active.
    const t = new MoodTracker();
    let now = 0;
    t.record(30, 0, now); // poll 1
    now += 60_000;
    t.record(31, 0, now); // poll 2 — forward tick at t=60s
    now += 60_000;
    t.record(32, 0, now); // poll 3 — forward tick at t=120s
    // Flat for many polls — counter granularity, user still working
    for (let i = 4; i <= 10; i += 1) {
      now += 60_000;
      t.record(32, 0, now);
    }
    // At t=10*60s = 600s, the 30/31/32 samples are long pruned.
    // movementMood + rateMood both return idle here, but lastForwardAt
    // (set at t=120s) is still within 10-min memory → active.
    expect(t.derive('auto', now)).toBe('active');
  });

  it('falls back to idle after ACTIVE_MEMORY_MS since last forward tick', () => {
    const t = new MoodTracker();
    t.record(30, 0, 0);
    t.record(31, 0, 60_000); // last forward at t=60s
    // Advance past 60s + 10min = 660_000ms
    for (let now = 120_000; now <= 700_000; now += 60_000) {
      t.record(31, 0, now);
    }
    expect(t.derive('auto', 700_000)).toBe('idle');
  });

  it('weekly counter movement also triggers recent-movement memory', () => {
    const t = new MoodTracker();
    t.record(20, 10, 0);
    t.record(20, 11, 60_000); // session flat, weekly ticked → active
    // Push past the sample window so movementMood within window is gone too
    for (let now = 120_000; now <= 8 * 60_000; now += 60_000) {
      t.record(20, 11, now);
    }
    // At t=8min, last forward was at t=60s → 7min ago, still < 10min → active
    expect(t.derive('auto', 8 * 60_000)).toBe('active');
  });

  it('exposes lastForwardTimestamp for diagnostics', () => {
    const t = new MoodTracker();
    expect(t.lastForwardTimestamp()).toBeNull();
    t.record(30, 0, 1000);
    expect(t.lastForwardTimestamp()).toBeNull(); // first sample, no prev to compare
    t.record(31, 0, 2000);
    expect(t.lastForwardTimestamp()).toBe(2000);
    t.record(31, 0, 3000); // no movement
    expect(t.lastForwardTimestamp()).toBe(2000);
    t.record(32, 0, 4000); // forward again
    expect(t.lastForwardTimestamp()).toBe(4000);
  });

  it('keeps lastForwardAt across a 5h counter reset (user still working through the reset)', () => {
    const t = new MoodTracker();
    t.record(80, 0, 0);
    t.record(82, 0, 60_000); // forward at t=60s
    expect(t.lastForwardTimestamp()).toBe(60_000);
    // 5h reset: drops to 0
    t.record(0, 0, 120_000);
    expect(t.lastForwardTimestamp()).toBe(60_000); // preserved
    expect(t.derive('auto', 180_000)).toBe('active'); // within 10-min memory
  });
});
