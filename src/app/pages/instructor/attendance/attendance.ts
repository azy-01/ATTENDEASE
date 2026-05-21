import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import {
  FACE_TO_FACE_CLASS_MODE,
  StudentApiService,
  type InstructorClass,
  type InstructorSession,
} from '../../../core/data/student-api.service';
import { NotificationService } from '../../../core/data/notification.service';
import {
  HISTORY_BULK_HIDE_DAYS,
  HISTORY_PAGE_SIZE,
  isSessionActive,
  isSessionHistory,
  matchesHistoryDateFilter,
  matchesSessionSearch,
  sortSessionsNewestFirst,
  type HistoryDateFilter,
} from '../../../core/data/instructor-session.utils';
import { getTodayDateKey } from '../../../core/utils/date.utils';
import { TakeAttendancePanelComponent } from './take-attendance-panel.component';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, TakeAttendancePanelComponent],
  templateUrl: './attendance.html',
  styleUrls: ['./attendance.scss'],
})
export class AttendanceComponent {
  private readonly defaultSubjectOptions: string[] = [
    'Ethics',
    'Mathematics',
    'Science',
    'English',
    'Filipino',
    'Programming',
    'Networking',
    'Database Management',
    'Web Development',
    'Capstone Project',
  ];

  private readonly authSessionStorageKey = 'attendease-auth-session';

  selectedSection: string = '';
  selectedSubject: string = '';
  manualAttendanceCode: string = '';
  isStarting: boolean = false;
  isGeneratingManualCode: boolean = false;
  endingSessionId: string | null = null;
  hidingSessionId: string | null = null;
  isClearingOldHistory: boolean = false;
  startError: string = '';
  startSuccess: string = '';

  sections: string[] = [];
  subjects: string[] = [...this.defaultSubjectOptions];
  private scopedClasses: InstructorClass[] = [];
  instructorAuthId = '';

  readonly allSessions = signal<InstructorSession[]>([]);
  readonly historyDateFilter = signal<HistoryDateFilter>('month');
  readonly historySearchQuery = signal('');
  readonly historyVisibleCount = signal(HISTORY_PAGE_SIZE);
  readonly historySectionExpanded = signal(true);

  readonly visibleSessions = computed(() =>
    sortSessionsNewestFirst(this.allSessions().filter((session) => !session.hiddenFromListAt?.trim()))
  );

  readonly activeSessionsList = computed(() =>
    this.visibleSessions().filter((session) => isSessionActive(session))
  );

  readonly activeSessions = computed(() => this.activeSessionsList());

  readonly filteredHistorySessions = computed(() =>
    this.visibleSessions()
      .filter((session) => isSessionHistory(session))
      .filter((session) => matchesHistoryDateFilter(session, this.historyDateFilter()))
      .filter((session) => matchesSessionSearch(session, this.historySearchQuery()))
  );

  readonly displayedHistorySessions = computed(() =>
    this.filteredHistorySessions().slice(0, this.historyVisibleCount())
  );

  readonly hasMoreHistory = computed(
    () => this.filteredHistorySessions().length > this.historyVisibleCount()
  );

  readonly historyHiddenCount = computed(() =>
    this.allSessions().filter(
      (session) => Boolean(session.hiddenFromListAt?.trim()) && isSessionHistory(session)
    ).length
  );

  readonly hasVisibleSessions = computed(() => this.visibleSessions().length > 0);

  constructor(
    private readonly api: StudentApiService,
    private readonly notifications: NotificationService
  ) {
    void this.initializePage();
  }

  startSession(): void {
    if (!this.selectedSection || !this.selectedSubject) return;

    this.startError = '';
    this.startSuccess = '';
    this.isStarting = true;

    setTimeout(async () => {
      try {
        const rawAuth = localStorage.getItem(this.authSessionStorageKey);
        const parsedAuth = rawAuth
          ? (JSON.parse(rawAuth) as { role?: string; email?: string })
          : null;
        const authEmail = (parsedAuth?.email ?? '').trim().toLowerCase();
        if (parsedAuth?.role !== 'instructor' || !authEmail) {
          this.startError = 'You must be signed in as an instructor to start a session.';
          return;
        }
        const instructorAccount = await this.api.getAuthAccountByEmail('instructor', authEmail);
        if (!instructorAccount?.id) {
          this.startError = 'Unable to verify instructor account. Please sign in again.';
          return;
        }

        this.instructorAuthId = instructorAccount.id;

        const matchedClass = this.api.findClassMatchingSession(
          { section: this.selectedSection, subject: this.selectedSubject },
          this.scopedClasses
        );

        const instructorCode = this.manualAttendanceCode.trim().toUpperCase();
        let manualAttendanceCode = instructorCode;

        if (manualAttendanceCode) {
          const isUnique = await this.api.isManualAttendanceCodeUnique(manualAttendanceCode);
          if (!isUnique) {
            this.startError = 'Manual attendance code already exists. Please use a different code.';
            return;
          }
        } else {
          manualAttendanceCode = await this.api.createUniqueManualAttendanceCode();
        }

        const today = getTodayDateKey();
        const newSession: InstructorSession = {
          id: `session-${Date.now()}`,
          subject: this.selectedSubject,
          section: this.selectedSection,
          date: today,
          status: 'active',
          manualAttendanceCode,
          startedAt: new Date().toISOString(),
          instructorAuthId: instructorAccount.id,
          classMode: matchedClass?.classMode,
          classId: matchedClass?.id,
        };

        try {
          const saved = await this.api.addInstructorSession(newSession);
          this.allSessions.set(sortSessionsNewestFirst([saved, ...this.allSessions()]));
          this.startSuccess = this.buildStartSuccessMessage(saved);
          this.notifications.add(
            'Attendance session started',
            `${saved.subject} for ${saved.section} is now active.`,
            'instructor'
          );
        } catch {
          this.allSessions.set(sortSessionsNewestFirst([newSession, ...this.allSessions()]));
          this.startSuccess = this.buildStartSuccessMessage(newSession);
          this.notifications.add(
            'Attendance session started',
            `${newSession.subject} for ${newSession.section} is now active.`,
            'instructor'
          );
        }

        this.selectedSection = '';
        this.selectedSubject = '';
        this.manualAttendanceCode = '';
      } catch {
        this.startError = 'Unable to validate attendance code. Please try again.';
      } finally {
        this.isStarting = false;
      }
    }, 1000);
  }

  async generateManualCode(): Promise<void> {
    if (this.isGeneratingManualCode || this.isStarting) {
      return;
    }
    this.isGeneratingManualCode = true;
    this.startError = '';
    this.startSuccess = '';
    try {
      this.manualAttendanceCode = await this.api.createUniqueManualAttendanceCode();
    } catch {
      this.startError = 'Unable to generate a unique attendance code right now.';
    } finally {
      this.isGeneratingManualCode = false;
    }
  }

  async endSession(sessionId: string): Promise<void> {
    if (this.endingSessionId || !sessionId) {
      return;
    }

    const targetSession = this.allSessions().find((session) => session.id === sessionId);
    if (!targetSession || targetSession.status !== 'active') {
      return;
    }

    this.endingSessionId = sessionId;
    this.startError = '';
    this.startSuccess = '';

    try {
      const updatedSession: InstructorSession = {
        ...targetSession,
        status: 'completed',
        endedAt: new Date().toISOString(),
      };
      const saved = await this.api.updateInstructorSession(sessionId, updatedSession);
      this.patchSession(saved);
      this.startSuccess = `Session for ${saved.subject} (${saved.section}) ended.`;
    } catch {
      this.startError = 'Unable to end session right now. Please try again.';
    } finally {
      this.endingSessionId = null;
    }
  }

  async hideSessionFromList(sessionId: string): Promise<void> {
    if (this.hidingSessionId || !sessionId || !this.instructorAuthId) {
      return;
    }

    const targetSession = this.allSessions().find((session) => session.id === sessionId);
    if (!targetSession || targetSession.status === 'active') {
      return;
    }

    const result = await Swal.fire({
      title: 'Remove from list?',
      html: `Hide <strong>${targetSession.subject}</strong> (${targetSession.section}) from your session list?<br><small>Attendance records are not deleted.</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Remove',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#4f46e5',
    });

    if (!result.isConfirmed) {
      return;
    }

    this.hidingSessionId = sessionId;
    this.startError = '';
    this.startSuccess = '';

    try {
      const saved = await this.api.hideInstructorSessionFromList(sessionId, this.instructorAuthId);
      if (saved) {
        this.patchSession(saved);
        this.startSuccess = 'Session removed from your list.';
      }
    } catch {
      this.startError = 'Unable to remove session from list. Please try again.';
    } finally {
      this.hidingSessionId = null;
    }
  }

  async clearOldHistory(): Promise<void> {
    if (this.isClearingOldHistory || !this.instructorAuthId) {
      return;
    }

    const result = await Swal.fire({
      title: 'Clear old sessions?',
      text: `Hide completed sessions older than ${HISTORY_BULK_HIDE_DAYS} days from your list. Records are kept.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Clear old sessions',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#4f46e5',
    });

    if (!result.isConfirmed) {
      return;
    }

    this.isClearingOldHistory = true;
    this.startError = '';
    this.startSuccess = '';

    try {
      const count = await this.api.hideCompletedSessionsOlderThan(
        this.instructorAuthId,
        HISTORY_BULK_HIDE_DAYS
      );
      await this.loadSessions();
      this.startSuccess =
        count > 0
          ? `${count} old session${count === 1 ? '' : 's'} removed from your list.`
          : 'No sessions older than 30 days to clear.';
    } catch {
      this.startError = 'Unable to clear old sessions right now. Please try again.';
    } finally {
      this.isClearingOldHistory = false;
    }
  }

  setHistoryDateFilter(filter: HistoryDateFilter): void {
    this.historyDateFilter.set(filter);
    this.historyVisibleCount.set(HISTORY_PAGE_SIZE);
  }

  onHistorySearchChange(value: string): void {
    this.historySearchQuery.set(value);
    this.historyVisibleCount.set(HISTORY_PAGE_SIZE);
  }

  loadMoreHistory(): void {
    this.historyVisibleCount.update((count) => count + HISTORY_PAGE_SIZE);
  }

  toggleHistorySection(): void {
    this.historySectionExpanded.update((expanded) => !expanded);
  }

  sessionModeLabel(session: InstructorSession): string {
    if (session.classMode === FACE_TO_FACE_CLASS_MODE) {
      return 'Face-to-face';
    }
    if (session.classMode === 'Online Class') {
      return 'Online';
    }
    return 'Mode unset';
  }

  sessionModeClass(session: InstructorSession): string {
    if (session.classMode === FACE_TO_FACE_CLASS_MODE) {
      return 'badge-f2f';
    }
    if (session.classMode === 'Online Class') {
      return 'badge-online';
    }
    return 'badge-mode-unknown';
  }

  private async initializePage(): Promise<void> {
    await Promise.all([this.loadSessions(), this.loadAllowedSections()]);
  }

  private async loadSessions(): Promise<void> {
    try {
      const rawSession = localStorage.getItem(this.authSessionStorageKey);
      if (!rawSession) {
        this.allSessions.set([]);
        return;
      }
      const session = JSON.parse(rawSession) as { role?: string; email?: string };
      const email = (session.email ?? '').trim().toLowerCase();
      if (session.role !== 'instructor' || !email) {
        this.allSessions.set([]);
        return;
      }
      const account = await this.api.getAuthAccountByEmail('instructor', email);
      if (!account?.id) {
        this.allSessions.set([]);
        return;
      }
      this.instructorAuthId = account.id;
      const sessions = await this.api.getInstructorSessionsForOwner(account.id, {
        includeHidden: true,
      });
      this.allSessions.set(sortSessionsNewestFirst(sessions));
    } catch {
      this.allSessions.set([]);
    }
  }

  private patchSession(updated: InstructorSession): void {
    this.allSessions.set(
      sortSessionsNewestFirst(
        this.allSessions().map((session) => (session.id === updated.id ? updated : session))
      )
    );
  }

  private async loadAllowedSections(): Promise<void> {
    const rawSession = localStorage.getItem(this.authSessionStorageKey);
    if (!rawSession) {
      this.sections = [];
      this.scopedClasses = [];
      return;
    }

    try {
      const session = JSON.parse(rawSession) as { role?: string; email?: string };
      const role = session.role;
      const email = session.email ?? '';
      const allClasses = await this.api.getInstructorClasses();

      if (role !== 'instructor' || !email.trim()) {
        this.scopedClasses = allClasses;
        this.sections = this.extractClassNames(allClasses);
        this.subjects = [...this.defaultSubjectOptions];
        return;
      }

      const account = await this.api.getAuthAccountByEmail('instructor', email);
      const allowedIds = account?.allowedClassIds ?? [];
      const accountId = account?.id ?? '';
      this.instructorAuthId = accountId;

      let allowedClasses = allowedIds.length
        ? allClasses.filter((classItem) => allowedIds.includes(classItem.id))
        : [];

      if (!allowedClasses.length && accountId) {
        allowedClasses = allClasses.filter((classItem) =>
          (classItem.assignedInstructorIds ?? []).includes(accountId)
        );
      }

      this.scopedClasses = allowedClasses;
      this.sections = this.extractClassNames(allowedClasses);
      this.subjects = (account?.allowedSubjects ?? []).length
        ? [...new Set(account?.allowedSubjects ?? [])]
        : [
            ...new Set(
              allowedClasses.reduce<string[]>(
                (allSubjects, classItem) => [...allSubjects, ...(classItem.assignedSubjects ?? [])],
                []
              )
            ),
          ];
    } catch {
      this.sections = [];
      this.subjects = [];
      this.scopedClasses = [];
    }
  }

  private extractClassNames(classes: InstructorClass[]): string[] {
    return [
      ...new Set(classes.map((item) => item.name.trim()).filter((name) => Boolean(name))),
    ];
  }

  private buildStartSuccessMessage(session: InstructorSession): string {
    const code = session.manualAttendanceCode ?? '';
    const modeHint =
      session.classMode === FACE_TO_FACE_CLASS_MODE
        ? ' You can mark attendance via QR or manual entry.'
        : session.classMode === 'Online Class'
          ? ' Students can check in with the manual code.'
          : '';
    return `Session started. Manual code: ${code}.${modeHint}`;
  }
}
