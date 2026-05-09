import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentApiService, type InstructorClass, type InstructorSession } from '../../../core/data/student-api.service';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  readonly recentSessions = signal<InstructorSession[]>([]);

  constructor(private readonly api: StudentApiService) {
    void this.loadSessions();
    void this.loadAllowedSections();
  }

  startSession(): void {
    if (!this.selectedSection || !this.selectedSubject) return;

    this.startError = '';
    this.startSuccess = '';
    this.isStarting = true;

    setTimeout(async () => {
      try {
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
        };

        try {
          const saved = await this.api.addInstructorSession(newSession);
          this.recentSessions.set([saved, ...this.recentSessions()]);
          this.startSuccess = `Session started. Manual code: ${saved.manualAttendanceCode ?? manualAttendanceCode}`;
        } catch {
          this.recentSessions.set([newSession, ...this.recentSessions()]);
          this.startSuccess = `Session started. Manual code: ${newSession.manualAttendanceCode ?? manualAttendanceCode}`;
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

  private async loadSessions(): Promise<void> {
    try {
      this.recentSessions.set(await this.api.getInstructorSessions());
    } catch {
      this.recentSessions.set([]);
    }
  }

  private async loadAllowedSections(): Promise<void> {
    const rawSession = localStorage.getItem('attendease-auth-session');
    if (!rawSession) {
      this.sections = [];
      return;
    }

    try {
      const session = JSON.parse(rawSession) as { role?: string; email?: string };
      const role = session.role;
      const email = session.email ?? '';
      const allClasses = await this.api.getInstructorClasses();

      if (role !== 'instructor' || !email.trim()) {
        this.sections = this.extractClassNames(allClasses);
        this.subjects = [...this.defaultSubjectOptions];
        return;
      }

      const account = await this.api.getAuthAccountByEmail('instructor', email);
      const allowedIds = account?.allowedClassIds ?? [];
      const accountId = account?.id ?? '';

      let allowedClasses = allowedIds.length
        ? allClasses.filter((classItem) => allowedIds.includes(classItem.id))
        : [];

      // Fallback: use class-level instructor assignments when allowedClassIds is stale or not yet synced.
      if (!allowedClasses.length && accountId) {
        allowedClasses = allClasses.filter((classItem) =>
          (classItem.assignedInstructorIds ?? []).includes(accountId)
        );
      }

      this.sections = this.extractClassNames(allowedClasses);
      this.subjects = (account?.allowedSubjects ?? []).length
        ? [...new Set(account?.allowedSubjects ?? [])]
        : [...new Set(
          allowedClasses.reduce<string[]>(
            (allSubjects, classItem) => [...allSubjects, ...(classItem.assignedSubjects ?? [])],
            []
          )
        )];
    } catch {
      this.sections = [];
      this.subjects = [];
    }
  }

  private extractClassNames(classes: InstructorClass[]): string[] {
    return [...new Set(
      classes
        .map((item) => item.name.trim())
        .filter((name) => Boolean(name))
    )];
  }
}