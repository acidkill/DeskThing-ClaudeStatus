import { DeskThing } from '@deskthing/server';
import { type Action, type ActionCallback, DESKTHING_EVENTS } from '@deskthing/types';

import { ACTION_IDS, type ServerToClient } from '../shared/messages';
import type { KeyDispatcher } from './keys';
import { log } from './log';

type Send = (msg: ServerToClient) => void;
type OnRefresh = () => Promise<void> | void;
type GetKeyDispatcher = () => KeyDispatcher | null;

const ACTION_VERSION = '0.1.0';
const ACTION_VERSION_CODE = 1;

const buildAction = (
  id: string,
  name: string,
  description: string,
  extras: Partial<Action> = {},
): Action => ({
  id,
  name,
  description,
  version: ACTION_VERSION,
  version_code: ACTION_VERSION_CODE,
  enabled: true,
  ...extras,
});

const ACTIONS: ReadonlyArray<Action> = [
  buildAction(
    ACTION_IDS.voicePtt,
    'Voice push-to-talk',
    'Sends Space to the focused host window (Claude Code voice push-to-talk).',
    { tag: 'basic' },
  ),
  buildAction(
    ACTION_IDS.modeToggle,
    'Toggle Claude Code mode',
    'Sends Shift+Tab to the focused host window (cycles auto-accept / plan modes).',
    { tag: 'basic' },
  ),
  buildAction(
    ACTION_IDS.cycleAnimation,
    'Cycle splash mood',
    'Manually advance the splash mascot through its mood tiers on the Car Thing.',
    { tag: 'nav' },
  ),
  buildAction(
    ACTION_IDS.refreshNow,
    'Refresh usage now',
    'Force an immediate Anthropic rate-limit poll (debounced server-side).',
    { tag: 'basic' },
  ),
];

const isClawdAction = (id: string | undefined): id is (typeof ACTION_IDS)[keyof typeof ACTION_IDS] => {
  if (!id) return false;
  return (Object.values(ACTION_IDS) as string[]).includes(id);
};

export const setupActions = (deps: {
  send: Send;
  onRefresh: OnRefresh;
  getKeyDispatcher: GetKeyDispatcher;
}): (() => void) => {
  for (const action of ACTIONS) {
    DeskThing.registerAction(action);
  }
  log.info('actions registered', { ids: ACTIONS.map((a) => a.id) });

  const dispose = DeskThing.on(DESKTHING_EVENTS.ACTION, (event) => {
    const payload = (event as { payload?: ActionCallback | { id?: string; value?: unknown } } | undefined)?.payload;
    const id = payload && 'id' in payload ? (payload.id as string | undefined) : undefined;
    if (!isClawdAction(id)) return;

    log.info('action fired', { id });

    switch (id) {
      case ACTION_IDS.refreshNow:
        void deps.onRefresh();
        return;
      case ACTION_IDS.voicePtt: {
        deps.send({ type: 'action:fired', payload: { id } });
        const keys = deps.getKeyDispatcher();
        if (keys) void keys.press({ key: 'space' });
        return;
      }
      case ACTION_IDS.modeToggle: {
        deps.send({ type: 'action:fired', payload: { id } });
        const keys = deps.getKeyDispatcher();
        if (keys) void keys.press({ key: 'tab', shift: true });
        return;
      }
      case ACTION_IDS.cycleAnimation:
        deps.send({ type: 'action:fired', payload: { id } });
        return;
    }
  });

  return () => {
    if (typeof dispose === 'function') dispose();
    for (const action of ACTIONS) {
      try {
        DeskThing.removeAction(action.id);
      } catch (err) {
        log.warn('removeAction failed', { id: action.id, err: String(err) });
      }
    }
  };
};
