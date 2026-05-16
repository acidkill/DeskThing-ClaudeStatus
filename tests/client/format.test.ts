import { describe, expect, it } from 'vitest';

import { formatRelativeAge, formatResetMinutes } from '../../src/lib/format';

describe('formatResetMinutes', () => {
  it('clamps negatives to zero', () => {
    expect(formatResetMinutes(-5)).toBe('0m');
  });

  it('formats sub-hour values as minutes', () => {
    expect(formatResetMinutes(45)).toBe('45m');
  });

  it('formats hour values as h Xm', () => {
    expect(formatResetMinutes(125)).toBe('2h 5m');
  });

  it('formats day values as d Xh', () => {
    expect(formatResetMinutes(60 * 24 * 2 + 60 * 3)).toBe('2d 3h');
  });

  it('rounds fractional inputs', () => {
    expect(formatResetMinutes(59.6)).toBe('1h 0m');
  });
});

describe('formatRelativeAge', () => {
  const now = Date.parse('2026-05-16T12:00:00Z');

  it('returns "just now" within 5 seconds', () => {
    expect(formatRelativeAge(now - 1000, now)).toBe('just now');
  });

  it('returns seconds when under a minute', () => {
    expect(formatRelativeAge(now - 30_000, now)).toBe('30s ago');
  });

  it('returns minutes for >= 1 minute', () => {
    expect(formatRelativeAge(now - 3 * 60_000, now)).toBe('3m ago');
  });

  it('treats future timestamps as just now', () => {
    expect(formatRelativeAge(now + 5_000, now)).toBe('just now');
  });
});
