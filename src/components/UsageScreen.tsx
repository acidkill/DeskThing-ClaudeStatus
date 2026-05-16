import type { FC } from 'react';

import type { SettingsSnapshot, UsagePayload } from '../../shared/messages';
import { t } from '../i18n';
import { ResetCountdown } from './ResetCountdown';
import { StatusPill } from './StatusPill';
import { UsageBar } from './UsageBar';
import { MeterMascot } from './MeterMascot';

type Props = {
  usage: UsagePayload | null;
  settings: SettingsSnapshot;
};

export const UsageScreen: FC<Props> = ({ usage, settings }) => {
  if (!usage) {
    return (
      <section className="flex h-full w-full items-center justify-center">
        <p className="text-clawd-muted">{t('usage.waiting')}</p>
      </section>
    );
  }

  return (
    <section className="grid h-full w-full grid-cols-[1fr_240px] gap-8 px-10 py-8">
      <div className="flex flex-col justify-between">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">{t('app.title')}</h1>
          <StatusPill status={usage.st} />
        </header>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <UsageBar
              label={t('usage.session.label')}
              pct={usage.s}
              warningPct={settings.usageWarningPct}
              status={usage.st}
            />
            <ResetCountdown minutes={usage.sr} />
          </div>
          <div className="flex flex-col gap-2">
            <UsageBar
              label={t('usage.weekly.label')}
              pct={usage.w}
              warningPct={settings.usageWarningPct}
              status={usage.st}
            />
            <ResetCountdown minutes={usage.wr} />
          </div>
        </div>

        <footer className="text-xs text-clawd-muted">{t('app.subtitle')}</footer>
      </div>

      <aside className="flex flex-col items-center justify-center gap-2">
        <MeterMascot mood={usage.mood} size={220} />
        <span className="text-xs uppercase tracking-widest text-clawd-muted">
          {t(`usage.mood.${usage.mood}` as const)}
        </span>
      </aside>
    </section>
  );
};
