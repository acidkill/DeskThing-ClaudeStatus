import { DeskThing } from '@deskthing/server';
import { type AppSettings, SETTING_TYPES } from '@deskthing/types';

import { DEFAULT_SETTINGS, SETTING_KEYS, type SettingsSnapshot } from '../shared/messages';
import { log } from './log';

export const setupSettings = (): void => {
  const settings: AppSettings = {
    [SETTING_KEYS.pollIntervalSec]: {
      id: SETTING_KEYS.pollIntervalSec,
      label: 'Poll interval (seconds)',
      description: 'How often the server pings the Anthropic API for fresh rate-limit headers.',
      type: SETTING_TYPES.NUMBER,
      value: DEFAULT_SETTINGS.pollIntervalSec,
      min: 30,
      max: 600,
    },
    [SETTING_KEYS.credentialsPath]: {
      id: SETTING_KEYS.credentialsPath,
      label: 'Claude credentials path',
      description: 'Path to the Claude Code OAuth credentials JSON. "~" expands to the host user home.',
      type: SETTING_TYPES.STRING,
      value: DEFAULT_SETTINGS.credentialsPath,
    },
    [SETTING_KEYS.splashEnabled]: {
      id: SETTING_KEYS.splashEnabled,
      label: 'Show splash screen',
      description: 'Rotate the splash/mascot screen alongside the usage screen.',
      type: SETTING_TYPES.BOOLEAN,
      value: DEFAULT_SETTINGS.splashEnabled,
    },
    [SETTING_KEYS.splashRotateSec]: {
      id: SETTING_KEYS.splashRotateSec,
      label: 'Splash rotate (seconds)',
      description: 'Seconds the splash screen stays visible before rotating back to usage.',
      type: SETTING_TYPES.NUMBER,
      value: DEFAULT_SETTINGS.splashRotateSec,
      min: 5,
      max: 300,
    },
    [SETTING_KEYS.animationGroupOverride]: {
      id: SETTING_KEYS.animationGroupOverride,
      label: 'Mood override',
      description: 'Force a specific mascot mood tier instead of deriving it from usage rate.',
      type: SETTING_TYPES.SELECT,
      value: DEFAULT_SETTINGS.animationGroupOverride,
      options: [
        { label: 'Auto (derive from usage rate)', value: 'auto' },
        { label: 'Idle', value: 'idle' },
        { label: 'Active', value: 'active' },
        { label: 'Busy', value: 'busy' },
        { label: 'Frantic', value: 'frantic' },
      ],
    },
    [SETTING_KEYS.usageWarningPct]: {
      id: SETTING_KEYS.usageWarningPct,
      label: 'Usage warning threshold (%)',
      description: 'Session/weekly utilisation percentage at which the UI flips to a warning colour.',
      type: SETTING_TYPES.RANGE,
      value: DEFAULT_SETTINGS.usageWarningPct,
      min: 1,
      max: 100,
      step: 1,
    },
    [SETTING_KEYS.hostKeystrokeBackend]: {
      id: SETTING_KEYS.hostKeystrokeBackend,
      label: 'Host keystroke backend',
      description:
        'How clawd:voice_ptt and clawd:mode_toggle dispatch keystrokes to the host. Auto probes platform tools; set off to disable. Linux needs xdotool (X11) or wtype/ydotool (Wayland).',
      type: SETTING_TYPES.SELECT,
      value: DEFAULT_SETTINGS.hostKeystrokeBackend,
      options: [
        { label: 'Auto (detect platform)', value: 'auto' },
        { label: 'macOS (osascript)', value: 'osascript' },
        { label: 'Linux X11 (xdotool)', value: 'xdotool' },
        { label: 'Linux Wayland (wtype)', value: 'wtype' },
        { label: 'Linux Wayland (ydotool)', value: 'ydotool' },
        { label: 'Windows (PowerShell SendKeys)', value: 'powershell' },
        { label: 'Off (no host keystrokes)', value: 'off' },
      ],
    },
  };

  DeskThing.initSettings(settings);
  log.info('settings initialised', { keys: Object.keys(settings) });
};

const numberOrDefault = (raw: unknown, fallback: number): number => {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const stringOrDefault = (raw: unknown, fallback: string): string => {
  return typeof raw === 'string' && raw.length > 0 ? raw : fallback;
};

const boolOrDefault = (raw: unknown, fallback: boolean): boolean => {
  return typeof raw === 'boolean' ? raw : fallback;
};

const moodOverrideOrDefault = (
  raw: unknown,
  fallback: SettingsSnapshot['animationGroupOverride'],
): SettingsSnapshot['animationGroupOverride'] => {
  const allowed: ReadonlyArray<SettingsSnapshot['animationGroupOverride']> = [
    'auto',
    'idle',
    'active',
    'busy',
    'frantic',
  ];
  if (typeof raw === 'string' && (allowed as ReadonlyArray<string>).includes(raw)) {
    return raw as SettingsSnapshot['animationGroupOverride'];
  }
  return fallback;
};

const keystrokeBackendOrDefault = (
  raw: unknown,
  fallback: SettingsSnapshot['hostKeystrokeBackend'],
): SettingsSnapshot['hostKeystrokeBackend'] => {
  const allowed: ReadonlyArray<SettingsSnapshot['hostKeystrokeBackend']> = [
    'auto',
    'osascript',
    'xdotool',
    'wtype',
    'ydotool',
    'powershell',
    'off',
  ];
  if (typeof raw === 'string' && (allowed as ReadonlyArray<string>).includes(raw)) {
    return raw as SettingsSnapshot['hostKeystrokeBackend'];
  }
  return fallback;
};

export const readSettingsSnapshot = (
  raw: Record<string, { value?: unknown } | undefined> | undefined,
): SettingsSnapshot => {
  const v = (key: string): unknown => raw?.[key]?.value;
  return {
    pollIntervalSec: numberOrDefault(v(SETTING_KEYS.pollIntervalSec), DEFAULT_SETTINGS.pollIntervalSec),
    credentialsPath: stringOrDefault(v(SETTING_KEYS.credentialsPath), DEFAULT_SETTINGS.credentialsPath),
    splashEnabled: boolOrDefault(v(SETTING_KEYS.splashEnabled), DEFAULT_SETTINGS.splashEnabled),
    splashRotateSec: numberOrDefault(v(SETTING_KEYS.splashRotateSec), DEFAULT_SETTINGS.splashRotateSec),
    animationGroupOverride: moodOverrideOrDefault(
      v(SETTING_KEYS.animationGroupOverride),
      DEFAULT_SETTINGS.animationGroupOverride,
    ),
    usageWarningPct: numberOrDefault(v(SETTING_KEYS.usageWarningPct), DEFAULT_SETTINGS.usageWarningPct),
    hostKeystrokeBackend: keystrokeBackendOrDefault(
      v(SETTING_KEYS.hostKeystrokeBackend),
      DEFAULT_SETTINGS.hostKeystrokeBackend,
    ),
  };
};
