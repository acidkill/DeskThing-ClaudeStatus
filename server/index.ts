import { DeskThing } from '@deskthing/server';
import { DESKTHING_EVENTS } from '@deskthing/types';

import { APP_ID, type ServerToClient, type SettingsSnapshot } from '../shared/messages';
import { log } from './log';
import { readSettingsSnapshot, setupSettings } from './settings';

type StopFn = () => void | Promise<void>;

const send = (msg: ServerToClient): void => {
  DeskThing.send(msg);
};

const broadcastSettings = (snapshot: SettingsSnapshot): void => {
  send({ type: 'settings', payload: snapshot });
};

const start = async (): Promise<StopFn> => {
  log.info(`starting ${APP_ID}`);

  setupSettings();

  const disposers: Array<() => void> = [];

  const onSettings = DeskThing.on(DESKTHING_EVENTS.SETTINGS, (event: unknown) => {
    const payload = (event as { payload?: Record<string, { value?: unknown } | undefined> } | undefined)?.payload;
    const snapshot = readSettingsSnapshot(payload);
    log.info('settings updated', { pollIntervalSec: snapshot.pollIntervalSec });
    broadcastSettings(snapshot);
  });
  if (typeof onSettings === 'function') disposers.push(onSettings);

  // Polling, Anthropic client, mood derivation, and action registration land in later phases.

  return async () => {
    for (const dispose of disposers) {
      try {
        dispose();
      } catch (err) {
        log.warn('dispose failed', { err: String(err) });
      }
    }
  };
};

let stopHandle: StopFn | null = null;

DeskThing.on(DESKTHING_EVENTS.START, async () => {
  try {
    stopHandle = await start();
  } catch (err) {
    log.error('start failed', { err: err instanceof Error ? err.message : String(err) });
  }
});

DeskThing.on(DESKTHING_EVENTS.STOP, async () => {
  log.info(`stopping ${APP_ID}`);
  if (stopHandle) {
    await stopHandle();
    stopHandle = null;
  }
});

DeskThing.on(DESKTHING_EVENTS.PURGE, async () => {
  log.info(`purging ${APP_ID}`);
  if (stopHandle) {
    await stopHandle();
    stopHandle = null;
  }
});
