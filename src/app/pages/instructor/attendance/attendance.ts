import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FACE_TO_FACE_CLASS_MODE,
  StudentApiService,
  type InstructorClass,
  type InstructorSession,
} from '../../../core/data/student-api.service';
import { NotificationService } from '../../../core/data/notification.service';
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
  startError: string = '';
  startSuccess: string = '';

  sections: string[] = [];
  subjects: string[] = [...this.defaultSubjectOptions];
  private scopedClasses: InstructorClass[] = [];
  instructorAuthId = '';

  readonly recentSessions = signal<InstructorSession[]>([]);

  readonly activeSessions = computed(() =>
    this.recentSessions().filter((session) => session.status === 'active')
  );

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

        const today = new Date().toISOString().split('T')[0];
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
          this.recentSessions.set([saved, ...this.recentSessions()]);
          this.startSuccess = this.buildStartSuccessMessage(saved);
          this.notifications.add(
            'Attendance session started',
            `${saved.subject} for ${saved.section} is now active.`,
            'instructor'
          );
        } catch {
          this.recentSessions.set([newSession, ...this.recentSessions()]);
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

    const targetSession = this.recentSessions().find((session) => session.id === sessionId);
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
      };
      const saved = await this.api.updateInstructorSession(sessionId, updatedSession);
      this.recentSessions.set(
        this.recentSessions().map((session) => (session.id === sessionId ? saved : session))
      );
      this.startSuccess = `Session for ${saved.subject} (${saved.section}) ended.`;
    } catch {
      this.startError = 'Unable to end session right now. Please try again.';
    } finally {
      this.endingSessionId = null;
    }
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
        this.recentSessions.set([]);
        return;
      }
      const session = JSON.parse(rawSession) as { role?: string; email?: string };
      const email = (session.email ?? '').trim().toLowerCase();
      if (session.role !== 'instructor' || !email) {
        this.recentSessions.set([]);
        return;
      }
      const account = await this.api.getAuthAccountByEmail('instructor', email);
      if (!account?.id) {
        this.recentSessions.set([]);
        return;
      }
      this.instructorAuthId = account.id;
      const sessions = await this.api.getInstructorSessionsForOwner(account.id);
      this.recentSessions.set(
        sessions.sort((first, second) => {
          const firstTime = new Date(first.startedAt ?? first.date).getTime();
          const secondTime = new Date(second.startedAt ?? second.date).getTime();
          return secondTime - firstTime;
        })
      );
    } catch {
      this.recentSessions.set([]);
    }
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
