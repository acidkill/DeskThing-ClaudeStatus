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

  it('computes pct-per-minute from windowed samples', () => {
    const t = new MoodTracker();
    const last = seedLinear(t, 0, 3, 4);
    expect(t.ratePctPerMin(last)).toBeCloseTo(3, 1);
  });

  it('classifies idle when the rate is below 0.5 pct/min', () => {
    const t = new MoodTracker();
    const last = seedLinear(t, 0, 0.2, 4);
    expect(t.derive('auto', last)).toBe('idle');
  });

  it('classifies active in 0.5..2 pct/min', () => {
    const t = new MoodTracker();
    const last = seedLinear(t, 0, 1, 4);
    expect(t.derive('auto', last)).toBe('active');
  });

  it('classifies busy in 2..5 pct/min', () => {
    const t = new MoodTracker();
    const last = seedLinear(t, 0, 3, 4);
    expect(t.derive('auto', last)).toBe('busy');
  });

  it('classifies frantic above 5 pct/min', () => {
    const t = new MoodTracker();
    const last = seedLinear(t, 0, 8, 4);
    expect(t.derive('auto', last)).toBe('frantic');
  });

  it('drops samples older than 5 minutes', () => {
    const t = new MoodTracker();
    t.record(10, 0);
    t.record(20, 60_000);
    t.record(80, 6 * 60_000);
    expect(t.size()).toBe(2);
  });

  it('honours a non-auto override regardless of windowed rate', () => {
    const t = new MoodTracker();
    seedLinear(t, 0, 9, 4);
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
