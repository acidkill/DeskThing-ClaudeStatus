import type { FC } from 'react';

import type { Mood } from '../../shared/messages';
import { ClawdSprite } from '../clawd/ClawdSprite';
import { hasClawdSprites } from '../clawd/sprites';
import { t } from '../i18n';
import { MeterMascot } from './MeterMascot';

type Props = {
  mood: Mood;
};

const useClawd = hasClawdSprites();

export const SplashScreen: FC<Props> = ({ mood }) => {
  return (
    <section className="flex h-full w-full flex-col items-center justify-center gap-6">
      {useClawd ? <ClawdSprite mood={mood} size={360} /> : <MeterMascot mood={mood} size={320} />}
      <div className="flex flex-col items-center gap-1">
        <p className="text-2xl font-semibold tracking-tight">{t('app.title')}</p>
        <p className="text-xs uppercase tracking-widest text-clawd-muted">
          {t(`usage.mood.${mood}` as const)}
        </p>
      </div>
    </section>
  );
};
