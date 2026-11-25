/** Dates are stored as local calendar days in ISO form: YYYY-MM-DD. */

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function todayKey(): string {
  return toKey(new Date());
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function mondayOf(key: string): string {
  const d = fromKey(key);
  return addDays(key, -((d.getDay() + 6) % 7));
}

export function dayLabel(key: string, style: 'short' | 'long' = 'short'): string {
  const t = todayKey();
  if (key === t) return 'Today';
  if (key === addDays(t, -1)) return 'Yesterday';
  return fromKey(key).toLocaleDateString(undefined, style === 'long'
    ? { weekday: 'long', day: 'numeric', month: 'long' }
    : { weekday: 'short', day: 'numeric', month: 'short' });
}

export function weekdayLetter(key: string): string {
  return fromKey(key).toLocaleDateString(undefined, { weekday: 'narrow' });
}
