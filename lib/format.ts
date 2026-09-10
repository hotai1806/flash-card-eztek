import type { Translate } from './i18n';
import { DAY, HOUR, MINUTE } from './srs';

/** Human readable duration such as "10 min", "3 d", "2 mo". */
export function formatDuration(t: Translate, ms: number): string {
  if (ms < MINUTE) return t('now');
  const minutes = Math.round(ms / MINUTE);
  if (minutes < 60) return t('minutes', { n: minutes });
  const hours = Math.round(ms / HOUR);
  if (hours < 24) return t('hours', { n: hours });
  const days = Math.round(ms / DAY);
  if (days < 60) return t('days', { n: Math.max(1, days) });
  return t('months', { n: Math.round(ms / (30 * DAY)) });
}

/** "in 3 d" style relative time, or "now" when already due. */
export function formatRelative(t: Translate, target: number, now: number = Date.now()): string {
  const diff = target - now;
  if (diff < MINUTE) return t('now');
  const prefix = t('in');
  const duration = formatDuration(t, diff);
  return prefix ? `${prefix} ${duration}` : duration;
}

export function formatPercent(fraction: number): string {
  return `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
}
