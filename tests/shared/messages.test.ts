import { describe, expect, it } from 'vitest';

import {
  ACTION_IDS,
  APP_ID,
  DEFAULT_SETTINGS,
  SETTING_KEYS,
  type ServerToClient,
} from '../../shared/messages';

describe('shared/messages', () => {
  it('exposes the canonical app id', () => {
    expect(APP_ID).toBe('clawdmeter');
  });

  it('defaults match CLAUDE.md §5', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      pollIntervalSec: 60,
      credentialsPath: '~/.claude/.credentials.json',
      splashEnabled: true,
      splashRotateSec: 20,
      animationGroupOverride: 'auto',
      usageWarningPct: 80,
    });
  });

  it('action ids use the clawd: namespace and are unique', () => {
    const ids = Object.values(ACTION_IDS);
    for (const id of ids) expect(id).toMatch(/^clawd:/);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('setting keys match the snapshot field names', () => {
    expect(Object.keys(SETTING_KEYS).sort()).toEqual(
      ['animationGroupOverride', 'credentialsPath', 'pollIntervalSec', 'splashEnabled', 'splashRotateSec', 'usageWarningPct'],
    );
  });

  it('discriminates ServerToClient variants by type', () => {
    const samples: ServerToClient[] = [
      { type: 'usage', payload: { s: 1, sr: 1, w: 1, wr: 1, st: 'allowed', mood: 'idle', ok: true, ts: 0 } },
      { type: 'error', payload: { code: 'x', message: 'y' } },
      { type: 'settings', payload: DEFAULT_SETTINGS },
      { type: 'action:fired', payload: { id: ACTION_IDS.refreshNow } },
    ];
    expect(samples.map((s) => s.type)).toEqual(['usage', 'error', 'settings', 'action:fired']);
  });
});
