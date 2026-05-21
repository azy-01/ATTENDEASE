export type ClassFormStep = 1 | 2 | 3 | 4;

export interface WeekdayOption {
  value: string;
  label: string;
}

export const CLASS_FORM_STEPS: ReadonlyArray<{ num: ClassFormStep; label: string }> = [
  { num: 1, label: 'Details' },
  { num: 2, label: 'Schedule' },
  { num: 3, label: 'Assignments' },
  { num: 4, label: 'Review' },
];

export const WEEKDAY_OPTIONS: ReadonlyArray<WeekdayOption> = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];

export const DEFAULT_YEAR_LEVELS: readonly string[] = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
];

export const DEFAULT_PROGRAMS: readonly string[] = [
  'Information Technology',
  'Computer Science',
  'BS Information Technology',
];

export const PROGRAM_OTHER_VALUE = '__other__';

export function distinctSorted(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
}

export function isTimeRangeValid(startTime: string, endTime: string): boolean {
  const startMatch = startTime.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  const endMatch = endTime.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!startMatch || !endMatch) {
    return false;
  }
  const startMinutes = Number(startMatch[1]) * 60 + Number(startMatch[2]);
  const endMinutes = Number(endMatch[1]) * 60 + Number(endMatch[2]);
  return endMinutes > startMinutes;
}

export function formatWeekdayLabel(day: string): string {
  const normalized = day.trim().toUpperCase();
  return WEEKDAY_OPTIONS.find((option) => option.value === normalized)?.label ?? day;
}

export function formatStudentLabel(name: string, studentId: string): string {
  const trimmedId = studentId.trim();
  return trimmedId ? `${name} (${trimmedId})` : `${name} (No Student ID)`;
}
