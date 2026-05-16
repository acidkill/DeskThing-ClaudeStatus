import type { FC } from 'react';

import type { UsageStatus } from '../../shared/messages';

type Tone = 'ok' | 'warn' | 'err';

const toneFor = (pct: number, warningPct: number, status: UsageStatus): Tone => {
  if (status === 'rejecting' || pct >= 100) return 'err';
  if (status === 'allowed_warning' || pct >= warningPct) return 'warn';
  return 'ok';
};

const TONE_BG: Record<Tone, string> = {
  ok: 'bg-clawd-ok',
  warn: 'bg-clawd-warn',
  err: 'bg-clawd-err',
};

const TONE_TEXT: Record<Tone, string> = {
  ok: 'text-clawd-ok',
  warn: 'text-clawd-warn',
  err: 'text-clawd-err',
};

type Props = {
  label: string;
  pct: number;
  warningPct: number;
  status: UsageStatus;
};

export const UsageBar: FC<Props> = ({ label, pct, warningPct, status }) => {
  const safe = Math.max(0, Math.min(100, pct));
  const tone = toneFor(safe, warningPct, status);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-sm uppercase tracking-widest text-clawd-muted">{label}</span>
        <span className={`font-mono text-2xl tabular-nums ${TONE_TEXT[tone]}`}>
          {Math.round(safe)}
          <span className="text-base text-clawd-muted">%</span>
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-clawd-panel" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(safe)}>
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${TONE_BG[tone]}`}
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
};
