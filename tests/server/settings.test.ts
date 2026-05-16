import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../../shared/messages';
import { readSettingsSnapshot } from '../../server/settings';

describe('readSettingsSnapshot', () => {
  it('returns defaults when raw is undefined', () => {
    expect(readSettingsSnapshot(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('returns defaults when raw is an empty record', () => {
    expect(readSettingsSnapshot({})).toEqual(DEFAULT_SETTINGS);
  });

  it('coerces numeric strings to numbers', () => {
    const snap = readSettingsSnapshot({
      pollIntervalSec: { value: '120' },
      usageWarningPct: { value: '95' },
    });
    expect(snap.pollIntervalSec).toBe(120);
    expect(snap.usageWarningPct).toBe(95);
  });

  it('falls back to default for non-finite numbers', () => {
    const snap = readSettingsSnapshot({
      pollIntervalSec: { value: 'not-a-number' },
    });
    expect(snap.pollIntervalSec).toBe(DEFAULT_SETTINGS.pollIntervalSec);
  });

  it('falls back to default for empty strings', () => {
    const snap = readSettingsSnapshot({ credentialsPath: { value: '' } });
    expect(snap.credentialsPath).toBe(DEFAULT_SETTINGS.credentialsPath);
  });

  it('rejects unknown mood override values', () => {
    const snap = readSettingsSnapshot({ animationGroupOverride: { value: 'mystery' } });
    expect(snap.animationGroupOverride).toBe('auto');
  });

  it('accepts every valid mood override value', () => {
    for (const value of ['auto', 'idle', 'active', 'busy', 'frantic'] as const) {
      const snap = readSettingsSnapshot({ animationGroupOverride: { value } });
      expect(snap.animationGroupOverride).toBe(value);
    }
  });

  it('respects boolean false (does not treat it as falsy fallback)', () => {
    const snap = readSettingsSnapshot({ splashEnabled: { value: false } });
    expect(snap.splashEnabled).toBe(false);
  });
});
