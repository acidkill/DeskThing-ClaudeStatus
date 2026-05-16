import { t } from '../i18n';

export const formatResetMinutes = (minutes: number): string => {
  const safe = Math.max(0, Math.round(minutes));
  if (safe >= 60 * 24) {
    const d = Math.floor(safe / (60 * 24));
    const h = Math.floor((safe % (60 * 24)) / 60);
    return t('time.daysHours', { d, h });
  }
  if (safe >= 60) {
    const h = Math.floor(safe / 60);
    const m = safe % 60;
    return t('time.hoursMinutes', { h, m });
  }
  return t('time.minutesShort', { n: safe });
};

export const formatRelativeAge = (ms: number, now: number = Date.now()): string => {
  const elapsed = Math.max(0, now - ms);
  if (elapsed < 5_000) return t('time.justNow');
  if (elapsed < 60_000) return t('time.secondsAgo', { n: Math.floor(elapsed / 1000) });
  return t('time.minutesAgo', { n: Math.floor(elapsed / 60_000) });
};
