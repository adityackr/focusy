/**
 * Local-calendar helpers for analytics. All day keys are local `YYYY-MM-DD`
 * strings, so "today" matches the learner's clock rather than UTC.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function dayKey(date: Date | number = new Date()): string {
  const d = typeof date === "number" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Local midnight for a day key (invalid keys fall back to today). */
export function dateFromDayKey(key: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return startOfDay(new Date());
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

export function addDaysKey(key: string, amount: number): string {
  return dayKey(addDays(dateFromDayKey(key), amount));
}

/** Day keys from `days` ago through today, oldest first. */
export function lastDayKeys(days: number, now: Date | number = new Date()): string[] {
  const today = startOfDay(typeof now === "number" ? new Date(now) : now);
  const keys: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    keys.push(dayKey(addDays(today, -offset)));
  }
  return keys;
}

/** Day keys in `[startKey, endKey]`, oldest first. */
export function dayKeysBetween(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  let cursor = dateFromDayKey(startKey);
  const end = dateFromDayKey(endKey).getTime();
  // Guard against a malformed range rather than looping forever.
  for (let i = 0; i < 4000 && cursor.getTime() <= end; i += 1) {
    keys.push(dayKey(cursor));
    cursor = addDays(cursor, 1);
  }
  return keys;
}

/** The calendar days of the streak window ending today (365 days). */
export function trailingYearKeys(now: Date | number = new Date()): string[] {
  return lastDayKeys(365, now);
}

/** Monday (local) that starts the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const weekday = (day.getDay() + 6) % 7; // Monday = 0
  return addDays(day, -weekday);
}

export function weekKeys(now: Date | number = new Date()): string[] {
  const today = typeof now === "number" ? new Date(now) : now;
  const start = startOfWeek(today);
  const out: string[] = [];
  for (let i = 0; i < 7; i += 1) out.push(dayKey(addDays(start, i)));
  return out;
}

export function monthKeys(now: Date | number = new Date()): string[] {
  const today = typeof now === "number" ? new Date(now) : now;
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const out: string[] = [];
  for (let i = 0; i < 31; i += 1) {
    const date = addDays(start, i);
    if (date.getMonth() !== today.getMonth()) break;
    out.push(dayKey(date));
  }
  return out;
}

/**
 * Start (inclusive) and end (exclusive) epoch bounds for a day key range.
 * Used to compare periods without re-scanning unrelated days.
 */
export function dayRangeBounds(keys: string[]): { start: number; end: number } {
  if (keys.length === 0) return { start: 0, end: 0 };
  return {
    start: dateFromDayKey(keys[0]).getTime(),
    end: dateFromDayKey(keys[keys.length - 1]).getTime() + DAY_MS,
  };
}

/** Human duration like `2h 15m`, `14m`, `45s`. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** Compact label for chart axes: `12m`, `1.5h`. */
export function formatCompactDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round((seconds / 3600) * 10) / 10;
  return `${hours}h`;
}

/** Localized short date for a day key, e.g. `Nov 5`. */
export function formatDayLabel(key: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(undefined, opts ?? { month: "short", day: "numeric" }).format(
    dateFromDayKey(key)
  );
}

export function formatFullDayLabel(key: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(dateFromDayKey(key));
}
