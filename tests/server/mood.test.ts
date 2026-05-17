import { describe, expect, it } from 'vitest';

import { MoodTracker } from '../../server/mood';

const seedLinear = (tracker: MoodTracker, start: number, perMin: number, mins: number): number => {
  const stepMs = 60_000;
  let now = start;
  for (let i = 0; i <= mins; i += 1) {
    tracker.record(i * perMin, now);
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
    t.record(20, 0);
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
    t.record(10, 0);
    t.record(10.5, 30_000);
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
    t.record(55, 0);
    expect(t.derive('auto', 0)).toBe('active');
  });

  it('elevates to busy when session pct crosses 75%', () => {
    const t = new MoodTracker();
    t.record(80, 0);
    expect(t.derive('auto', 0)).toBe('busy');
  });

  it('elevates to frantic when session pct crosses 90%', () => {
    const t = new MoodTracker();
    t.record(95, 0);
    expect(t.derive('auto', 0)).toBe('frantic');
  });

  it('drops samples older than 5 minutes', () => {
    const t = new MoodTracker();
    t.record(10, 0);
    t.record(20, 60_000);
    t.record(80, 6 * 60_000);
    expect(t.size()).toBe(2);
  });

  it('clears the buffer when sessionPct drops 5+ points (5h reset)', () => {
    const t = new MoodTracker();
    seedLinear(t, 0, 2, 4);
    expect(t.size()).toBeGreaterThan(1);
    t.record(0, 5 * 60_000);
    expect(t.size()).toBe(1);
  });

  it('clamps a negative delta to zero rate', () => {
    const t = new MoodTracker();
    t.record(40, 0);
    t.record(39, 60_000);
    t.record(38, 90_000);
    expect(t.ratePctPerMin(90_000)).toBe(0);
  });

  it('honours a non-auto override regardless of windowed rate or absolute pct', () => {
    const t = new MoodTracker();
    t.record(95, 0);
    expect(t.derive('idle')).toBe('idle');
    expect(t.derive('frantic')).toBe('frantic');
  });

  it('resets the window on demand', () => {
    const t = new MoodTracker();
    t.record(50, 0);
    t.reset();
    expect(t.size()).toBe(0);
    expect(t.derive('auto', 0)).toBe('idle');
  });
});
