export const APP_ID = 'clawdmeter' as const;

export type UsageStatus = 'allowed' | 'allowed_warning' | 'rejecting' | 'unknown';
export type Mood = 'idle' | 'active' | 'busy' | 'frantic';

export type UsagePayload = {
  s: number;
  sr: number;
  w: number;
  wr: number;
  st: UsageStatus;
  mood: Mood;
  ok: boolean;
  ts: number;
};

export type ErrorPayload = {
  code: string;
  message: string;
};

export type SettingsSnapshot = {
  pollIntervalSec: number;
  credentialsPath: string;
  splashEnabled: boolean;
  splashRotateSec: number;
  animationGroupOverride: 'auto' | Mood;
  usageWarningPct: number;
};

export type ActionId = (typeof ACTION_IDS)[keyof typeof ACTION_IDS];

export type ServerToClient =
  | { type: 'usage'; payload: UsagePayload }
  | { type: 'error'; payload: ErrorPayload }
  | { type: 'settings'; payload: SettingsSnapshot }
  | { type: 'action:fired'; payload: { id: ActionId } };

export type ClientToServer =
  | { type: 'request:refresh' }
  | { type: 'request:settings' }
  | { type: 'action:voice_ptt'; payload: { down: boolean } }
  | { type: 'action:mode_toggle' };

export type ServerToClientType = ServerToClient['type'];
export type ClientToServerType = ClientToServer['type'];

export const SETTING_KEYS = {
  pollIntervalSec: 'pollIntervalSec',
  credentialsPath: 'credentialsPath',
  splashEnabled: 'splashEnabled',
  splashRotateSec: 'splashRotateSec',
  animationGroupOverride: 'animationGroupOverride',
  usageWarningPct: 'usageWarningPct',
} as const;

export const ACTION_IDS = {
  voicePtt: 'clawd:voice_ptt',
  modeToggle: 'clawd:mode_toggle',
  cycleAnimation: 'clawd:cycle_animation',
  refreshNow: 'clawd:refresh_now',
} as const;

export const DEFAULT_SETTINGS: SettingsSnapshot = {
  pollIntervalSec: 60,
  credentialsPath: '~/.claude/.credentials.json',
  splashEnabled: true,
  splashRotateSec: 20,
  animationGroupOverride: 'auto',
  usageWarningPct: 80,
};
