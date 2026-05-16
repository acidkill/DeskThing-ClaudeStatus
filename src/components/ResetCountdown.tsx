import type { FC } from 'react';

import { t } from '../i18n';
import { formatResetMinutes } from '../lib/format';

type Props = {
  minutes: number;
};

export const ResetCountdown: FC<Props> = ({ minutes }) => {
  return (
    <span className="text-xs font-mono uppercase tracking-widest text-clawd-muted">
      {t('usage.resetIn', { time: formatResetMinutes(minutes) })}
    </span>
  );
};
