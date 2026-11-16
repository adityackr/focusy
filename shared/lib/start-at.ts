/** `?t=` start time in whole seconds, or undefined when absent/invalid. */
export function parseStartAt(
  raw: string | string[] | undefined,
): number | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return Math.floor(seconds);
}
