import { DeskThing } from '@deskthing/server';
import { DESKTHING_EVENTS } from '@deskthing/types';

import {
  APP_ID,
  DEFAULT_SETTINGS,
  type ServerToClient,
  type SettingsSnapshot,
} from '../shared/messages';
import { setupActions } from './actions';
import { log } from './log';
import { createPoller } from './poller';
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

  let currentSettings: SettingsSnapshot = { ...DEFAULT_SETTINGS };
  const getSettings = (): SettingsSnapshot => currentSettings;

  const initialSettings = await DeskThing.getSettings();
  if (initialSettings) {
    currentSettings = readSettingsSnapshot(initialSettings);
    broadcastSettings(currentSettings);
  }

  const poller = createPoller({ send, getSettings });
  const disposeActions = setupActions({
    send,
    onRefresh: () => poller.poll('manual'),
  });

  const disposers: Array<() => void> = [disposeActions];

  const disposeSettings = DeskThing.on(DESKTHING_EVENTS.SETTINGS, (event: unknown) => {
    const payload = (event as { payload?: Record<string, { value?: unknown } | undefined> } | undefined)?.payload;
    if (!payload) return;
    const previousIntervalSec = currentSettings.pollIntervalSec;
    currentSettings = readSettingsSnapshot(payload);
    broadcastSettings(currentSettings);
    log.info('settings updated', {
      pollIntervalSec: currentSettings.pollIntervalSec,
      mood: currentSettings.animationGroupOverride,
    });
    if (currentSettings.pollIntervalSec !== previousIntervalSec) {
      void poller.poll('settings-change');
    }
  });
  if (typeof disposeSettings === 'function') disposers.push(disposeSettings);

  const disposeRefreshRequest = DeskThing.on('request:refresh', () => {
    void poller.poll('manual');
  });
  if (typeof disposeRefreshRequest === 'function') disposers.push(disposeRefreshRequest);

  const disposeSettingsRequest = DeskThing.on('request:settings', () => {
    broadcastSettings(currentSettings);
  });
  if (typeof disposeSettingsRequest === 'function') disposers.push(disposeSettingsRequest);

  // Kick off the first poll immediately, then run on the configured interval.
  void poller.poll('manual');
  const cancelInterval = DeskThing.setInterval(async () => {
    await poller.poll('tick');
  }, Math.max(currentSettings.pollIntervalSec, 30) * 1000);
  disposers.push(cancelInterval);

  return async () => {
    for (const dispose of disposers) {
      try {
        dispose();
      } catch (err) {
        log.warn('dispose failed', { err: String(err) });
      }
    }
    poller.dispose();
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
