import type { FC } from 'react';

import { t, type StringKey } from '../i18n';
import type { UsageStatus } from '../../shared/messages';

const TONE: Record<UsageStatus, string> = {
  allowed: 'border-clawd-ok/40 text-clawd-ok',
  allowed_warning: 'border-clawd-warn/40 text-clawd-warn',
  rejecting: 'border-clawd-err/40 text-clawd-err',
  unknown: 'border-clawd-muted/40 text-clawd-muted',
};

const KEY: Record<UsageStatus, StringKey> = {
  allowed: 'usage.status.allowed',
  allowed_warning: 'usage.status.allowed_warning',
  rejecting: 'usage.status.rejecting',
  unknown: 'usage.status.unknown',
};

type Props = {
  status: UsageStatus;
};

export const StatusPill: FC<Props> = ({ status }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest ${TONE[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {t(KEY[status])}
    </span>
  );
};
