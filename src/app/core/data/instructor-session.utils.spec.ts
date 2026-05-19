import {
  getSessionSortTime,
  isSessionHistory,
  matchesHistoryDateFilter,
  matchesSessionSearch,
  sortSessionsNewestFirst,
} from './instructor-session.utils';
import type { InstructorSession } from './student-api.service';

function buildSession(overrides: Partial<InstructorSession> = {}): InstructorSession {
  return {
    id: 'session-1',
    subject: 'Math',
    section: 'BSIT-1A',
    date: '2026-05-01',
    status: 'completed',
    startedAt: '2026-05-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('instructor-session.utils', () => {
  it('sorts sessions newest first using startedAt, endedAt, or date', () => {
    const sessions = [
      buildSession({ id: 'old', startedAt: '2026-05-01T08:00:00.000Z' }),
      buildSession({ id: 'new', startedAt: '2026-05-20T08:00:00.000Z' }),
    ];
    const sorted = sortSessionsNewestFirst(sessions);
    expect(sorted[0].id).toBe('new');
    expect(sorted[1].id).toBe('old');
  });

  it('matches session search by subject, section, or code', () => {
    const session = buildSession({
      subject: 'Programming',
      section: 'BSIT-2B',
      manualAttendanceCode: 'ABC123',
    });
    expect(matchesSessionSearch(session, 'prog')).toBe(true);
    expect(matchesSessionSearch(session, 'bsit')).toBe(true);
    expect(matchesSessionSearch(session, 'abc')).toBe(true);
    expect(matchesSessionSearch(session, 'chemistry')).toBe(false);
  });

  it('filters history sessions by week window', () => {
    const recent = buildSession({
      startedAt: new Date().toISOString(),
      status: 'completed',
    });
    const old = buildSession({
      startedAt: '2020-01-01T08:00:00.000Z',
      status: 'completed',
    });
    expect(matchesHistoryDateFilter(recent, 'week')).toBe(true);
    expect(matchesHistoryDateFilter(old, 'week')).toBe(false);
    expect(matchesHistoryDateFilter(old, 'all')).toBe(true);
  });

  it('identifies history sessions', () => {
    expect(isSessionHistory(buildSession({ status: 'completed' }))).toBe(true);
    expect(isSessionHistory(buildSession({ status: 'active' }))).toBe(false);
  });

  it('returns sort time from endedAt when startedAt is missing', () => {
    const session = buildSession({
      startedAt: undefined,
      endedAt: '2026-05-10T10:00:00.000Z',
    });
    expect(getSessionSortTime(session)).toBe(new Date('2026-05-10T10:00:00.000Z').getTime());
  });
});
