import type { FC } from 'react';

import type { ErrorPayload, SettingsSnapshot } from '../../shared/messages';
import { t } from '../i18n';
import { MeterMascot } from './MeterMascot';

type Props = {
  settings: SettingsSnapshot;
  error: ErrorPayload | null;
  onRefresh: () => void;
};

const Row: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-baseline justify-between gap-4">
    <span className="text-xs uppercase tracking-widest text-clawd-muted">{label}</span>
    <span className="font-mono text-sm text-clawd-fg">{value}</span>
  </div>
);

export const SettingsScreen: FC<Props> = ({ settings, error, onRefresh }) => {
  return (
    <section className="grid h-full w-full grid-cols-[1fr_220px] gap-6 px-10 py-6">
      <div className="flex flex-col gap-3 overflow-hidden">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full border border-clawd-muted/40 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-clawd-fg hover:border-clawd-fg/60"
          >
            {t('settings.refresh')}
          </button>
        </header>

        <div className="flex flex-col gap-2 rounded-lg bg-clawd-panel px-4 py-3">
          <Row label={t('settings.pollInterval')} value={`${settings.pollIntervalSec}s`} />
          <Row label={t('settings.credentialsPath')} value={settings.credentialsPath} />
          <Row label={t('settings.splashEnabled')} value={settings.splashEnabled ? '✓' : '✗'} />
          <Row label={t('settings.splashRotateSec')} value={`${settings.splashRotateSec}s`} />
          <Row label={t('settings.moodOverride')} value={settings.animationGroupOverride} />
          <Row label={t('settings.warningThreshold')} value={`${settings.usageWarningPct}%`} />
          <Row label={t('settings.hostKeystrokeBackend')} value={settings.hostKeystrokeBackend} />
        </div>

        <div className="flex flex-col gap-1 rounded-lg bg-clawd-panel px-4 py-3">
          <span className="text-xs uppercase tracking-widest text-clawd-muted">{t('settings.lastError')}</span>
          {error ? (
            <>
              <span className="font-mono text-xs text-clawd-err">{error.code}</span>
              <span className="text-sm text-clawd-fg">{error.message}</span>
            </>
          ) : (
            <span className="text-sm text-clawd-muted">{t('settings.noError')}</span>
          )}
        </div>
      </div>

      <aside className="flex flex-col items-center justify-center">
        <MeterMascot mood={settings.animationGroupOverride === 'auto' ? 'idle' : settings.animationGroupOverride} size={180} />
        <span className="text-xs uppercase tracking-widest text-clawd-muted">
          {settings.animationGroupOverride}
        </span>
      </aside>
    </section>
  );
};
