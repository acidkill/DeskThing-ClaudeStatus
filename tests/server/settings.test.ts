import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS, SETTING_KEYS } from '../../shared/messages';
import { readSettingsSnapshot, setupSettings } from '../../server/settings';

const initSettings = vi.fn();

vi.mock('@deskthing/server', () => ({
  DeskThing: { initSettings: (...args: unknown[]) => initSettings(...args) },
}));

vi.mock('../../server/log', () => ({
  log: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
}));

describe('setupSettings', () => {
  it('registers every key SettingsSnapshot reads back', () => {
    // Regression: splashRotateSec was read by readSettingsSnapshot but never
    // registered, so the platform could never supply a non-default value and the
    // splash rotation cadence was permanently pinned to the default.
    initSettings.mockClear();
    setupSettings();
    expect(initSettings).toHaveBeenCalledTimes(1);
    const registered = initSettings.mock.calls[0]?.[0] as Record<string, { id: string }>;
    expect(Object.keys(registered).sort()).toEqual(Object.values(SETTING_KEYS).sort());
    for (const [key, entry] of Object.entries(registered)) {
      expect(entry.id).toBe(key);
    }
  });

  it('registers splashRotateSec as a bounded number defaulting to 20', () => {
    initSettings.mockClear();
    setupSettings();
    const registered = initSettings.mock.calls[0]?.[0] as Record<
      string,
      { type: string; value: unknown; min?: number; max?: number }
    >;
    const entry = registered[SETTING_KEYS.splashRotateSec];
    expect(entry).toBeDefined();
    expect(entry?.value).toBe(DEFAULT_SETTINGS.splashRotateSec);
    expect(entry?.value).toBe(20);
    expect(entry?.type).toBe(registered[SETTING_KEYS.pollIntervalSec]?.type);
    expect(typeof entry?.min).toBe('number');
    expect(typeof entry?.max).toBe('number');
    expect(entry?.min ?? 0).toBeLessThan(entry?.max ?? 0);
  });

  it('closes the registration <-> read loop: what is registered reads back as the defaults', () => {
    // DEFECT A shipped because registration and read-back were only ever checked
    // separately. readSettingsSnapshot happily returns a default for a key nobody
    // registered, so a missing registration is invisible to any test that feeds
    // readSettingsSnapshot a hand-written record. Feeding it the ACTUAL registry
    // is what makes the gap visible: a key absent from setupSettings can never
    // appear in `registered`, and the identity below fails on the missing key.
    initSettings.mockClear();
    setupSettings();
    const registered = initSettings.mock.calls[0]?.[0] as Record<string, { value?: unknown }>;

    for (const key of Object.values(SETTING_KEYS)) {
      expect(registered[key], `${key} is never registered with the DeskThing settings UI`).toBeDefined();
    }
    expect(readSettingsSnapshot(registered)).toEqual(DEFAULT_SETTINGS);

    // And the loop is load-bearing: drop any single registration and the snapshot
    // silently falls back instead of surfacing the hole, which is exactly the
    // failure mode above. Prove the equality is sensitive to the entry's value.
    const tampered = {
      ...registered,
      [SETTING_KEYS.splashRotateSec]: { value: DEFAULT_SETTINGS.splashRotateSec + 11 },
    };
    expect(readSettingsSnapshot(tampered).splashRotateSec).toBe(
      DEFAULT_SETTINGS.splashRotateSec + 11,
    );
  });
});

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

  it('returns a platform-supplied splashRotateSec instead of the default', () => {
    const supplied = DEFAULT_SETTINGS.splashRotateSec + 25;
    expect(readSettingsSnapshot({ splashRotateSec: { value: supplied } }).splashRotateSec).toBe(
      supplied,
    );
    // and via the string form the settings form actually emits
    expect(readSettingsSnapshot({ splashRotateSec: { value: '45' } }).splashRotateSec).toBe(45);
  });
});
