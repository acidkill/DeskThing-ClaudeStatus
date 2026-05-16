import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_SETTINGS,
  type ActionId,
  type ErrorPayload,
  type SettingsSnapshot,
  type UsagePayload,
} from '../../shared/messages';
import { deskthing } from '../lib/deskthing';
import { useDeskThingMessage } from './useDeskThingMessage';

export type UsageState = {
  usage: UsagePayload | null;
  error: ErrorPayload | null;
  settings: SettingsSnapshot;
  lastActionId: ActionId | null;
  lastActionAt: number | null;
  requestRefresh: () => void;
  requestSettings: () => void;
};

export const useUsage = (): UsageState => {
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [error, setError] = useState<ErrorPayload | null>(null);
  const [settings, setSettings] = useState<SettingsSnapshot>(DEFAULT_SETTINGS);
  const [lastActionId, setLastActionId] = useState<ActionId | null>(null);
  const [lastActionAt, setLastActionAt] = useState<number | null>(null);

  useDeskThingMessage('usage', (msg) => {
    setUsage(msg.payload);
    setError(null);
  });
  useDeskThingMessage('error', (msg) => setError(msg.payload));
  useDeskThingMessage('settings', (msg) => setSettings(msg.payload));
  useDeskThingMessage('action:fired', (msg) => {
    setLastActionId(msg.payload.id);
    setLastActionAt(Date.now());
  });

  useEffect(() => {
    deskthing.send({ type: 'request:settings' });
  }, []);

  const requestRefresh = useCallback(() => {
    deskthing.send({ type: 'request:refresh' });
  }, []);

  const requestSettings = useCallback(() => {
    deskthing.send({ type: 'request:settings' });
  }, []);

  return { usage, error, settings, lastActionId, lastActionAt, requestRefresh, requestSettings };
};
