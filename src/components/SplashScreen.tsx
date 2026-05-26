import type { FC } from 'react';

import type { Mood } from '../../shared/messages';
import { MascotSprite } from '../mascot/MascotSprite';
import { t } from '../i18n';

type Props = {
  mood: Mood;
};

export const SplashScreen: FC<Props> = ({ mood }) => {
  return (
    <section className="flex h-full w-full flex-col items-center justify-center gap-6">
      <MascotSprite mood={mood} size={360} />
      <div className="flex flex-col items-center gap-1">
        <p className="text-2xl font-semibold tracking-tight">{t('app.title')}</p>
        <p className="text-xs uppercase tracking-widest text-clawd-muted">
          {t(`usage.mood.${mood}` as const)}
        </p>
      </div>
    </section>
  );
};
