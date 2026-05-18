/**
 * Parses YYYY-MM-DD (and other date strings) as a local calendar date.
 * Avoids UTC timezone shifts from `new Date('YYYY-MM-DD')`.
 */
export function parseCalendarDate(rawDate: string): Date | null {
  const trimmed = rawDate.trim();
  if (!trimmed) {
    return null;
  }

  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoDateMatch) {
    const year = Number(isoDateMatch[1]);
    const month = Number(isoDateMatch[2]) - 1;
    const day = Number(isoDateMatch[3]);
    const parsed = new Date(year, month, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isSameCalendarDate(rawDate: string, target: Date): boolean {
  const parsed = parseCalendarDate(rawDate);
  if (!parsed) {
    return false;
  }

  return (
    parsed.getFullYear() === target.getFullYear() &&
    parsed.getMonth() === target.getMonth() &&
    parsed.getDate() === target.getDate()
  );
}

export function getTodayDateKey(reference: Date = new Date()): string {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, '0');
  const day = String(reference.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toCalendarDateKey(rawDate: string): string {
  const parsed = parseCalendarDate(rawDate);
  if (!parsed) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
