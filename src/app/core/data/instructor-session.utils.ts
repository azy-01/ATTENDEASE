import type { InstructorSession } from './student-api.service';

export const HISTORY_PAGE_SIZE = 10;
export const HISTORY_BULK_HIDE_DAYS = 30;

export type HistoryDateFilter = 'week' | 'month' | 'all';

export function getSessionSortTime(session: InstructorSession): number {
  const raw = session.startedAt ?? session.endedAt ?? session.date;
  const parsed = new Date(raw).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function sortSessionsNewestFirst(sessions: InstructorSession[]): InstructorSession[] {
  return [...sessions].sort((first, second) => getSessionSortTime(second) - getSessionSortTime(first));
}

export function isSessionHidden(session: InstructorSession): boolean {
  return Boolean(session.hiddenFromListAt?.trim());
}

export function isSessionActive(session: InstructorSession): boolean {
  return session.status === 'active';
}

export function isSessionHistory(session: InstructorSession): boolean {
  return session.status === 'completed' || session.status === 'cancelled';
}

export function matchesHistoryDateFilter(
  session: InstructorSession,
  filter: HistoryDateFilter
): boolean {
  if (filter === 'all') {
    return true;
  }
  const sessionTime = getSessionSortTime(session);
  const dayMs = 24 * 60 * 60 * 1000;
  const windowMs = filter === 'week' ? 7 * dayMs : 30 * dayMs;
  return sessionTime >= Date.now() - windowMs;
}

export function matchesSessionSearch(session: InstructorSession, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return (
    session.subject.toLowerCase().includes(normalized) ||
    session.section.toLowerCase().includes(normalized) ||
    (session.manualAttendanceCode ?? '').toLowerCase().includes(normalized)
  );
}

export function isSessionOlderThanDays(session: InstructorSession, days: number): boolean {
  const sessionTime = getSessionSortTime(session);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return sessionTime < cutoff;
}
