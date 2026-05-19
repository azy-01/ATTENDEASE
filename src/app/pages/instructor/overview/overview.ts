import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  StudentApiService,
  type AttendanceRecord,
  type AuthAccount,
  type InstructorClass,
  type InstructorSession,
  type InstructorStudent
} from '../../../core/data/student-api.service';
import { getTodayDateKey, isSameCalendarDate, toCalendarDateKey } from '../../../core/utils/date.utils';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  color: string;
}

interface CalendarCell {
  day: number | null;
  isToday: boolean;
}

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview.html',
  styleUrls: ['./overview.scss'],
})
export class OverviewComponent implements OnInit {
  constructor(
    private readonly router: Router,
    private readonly studentApi: StudentApiService
  ) {}

  readonly isLoading = signal(true);

  // ── Stats ──────────────────────────────────────────────
  readonly stats = signal<StatCard[]>([
    { label: 'Present Today', value: 0, icon: 'how_to_reg', color: '#10b981' },
    { label: 'Absent Today', value: 0, icon: 'person_off', color: '#ef4444' },
    { label: 'Late Today', value: 0, icon: 'schedule', color: '#f59e0b' },
    { label: 'Total Students', value: 0, icon: 'group', color: '#6366f1' },
  ]);

  readonly attendanceLogs = signal<
    Array<{ student: string; subject: string; class: string; timeIn: string; status: string }>
  >([]);
  readonly recentSessions = signal<string[]>([]);
  readonly assignedClasses = signal<string[]>([]);
  readonly assignedSubjects = signal<string[]>([]);
  readonly attendanceRate = signal(0);

  // ── Calendar ───────────────────────────────────────────
  dayNames: string[] = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  calendarCells: CalendarCell[] = [];
  currentMonthLabel: string = '';

  private viewDate: Date = new Date();

  ngOnInit(): void {
    this.buildCalendar();
    void this.loadInstructorOverviewData();
  }

  buildCalendar(): void {
    const today = new Date();
    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();

    this.currentMonthLabel = this.viewDate.toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: CalendarCell[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, isToday: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === d;
      cells.push({ day: d, isToday });
    }

    this.calendarCells = cells;
  }

  prevMonth(): void {
    this.viewDate = new Date(
      this.viewDate.getFullYear(),
      this.viewDate.getMonth() - 1,
      1
    );
    this.buildCalendar();
  }

  nextMonth(): void {
    this.viewDate = new Date(
      this.viewDate.getFullYear(),
      this.viewDate.getMonth() + 1,
      1
    );
    this.buildCalendar();
  }

  goToAttendance(): void {
    void this.router.navigate(['/instructor/attendance']);
  }

  goToReports(): void {
    void this.router.navigate(['/instructor/reports']);
  }

  private async loadInstructorOverviewData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const rawSession = localStorage.getItem('attendease-auth-session');
      if (!rawSession) {
        this.clearInstructorData();
        return;
      }

      const session = JSON.parse(rawSession) as { role?: string; email?: string };
      const role = session.role;
      const email = (session.email ?? '').trim().toLowerCase();
      const isStaff = role === 'admin' || role === 'superadmin';
      if ((role !== 'instructor' && !isStaff) || !email) {
        this.clearInstructorData();
        return;
      }

      const [classes, attendance, activeStudents] = await Promise.all([
        this.studentApi.getInstructorClasses(),
        this.studentApi.getAttendanceRecords(),
        this.studentApi.getInstructorStudents(),
      ]);

      let scopedClasses = classes;
      let scopedSubjects = new Set<string>();
      let sessions: InstructorSession[] = [];

      if (isStaff) {
        scopedClasses = classes.filter((item) => item.status !== 'archived');
      } else {
        const account = await this.studentApi.getAuthAccountByEmail('instructor', email);
        if (!account?.id) {
          this.clearInstructorData();
          return;
        }

        scopedClasses = this.resolveScopedClasses(classes, account);
        scopedSubjects = new Set(
          (account.allowedSubjects ?? [])
            .map((item) => item.trim())
            .filter((item) => Boolean(item))
        );
        sessions = await this.studentApi.getInstructorSessionsForOwner(account.id);
      }

      const scopedSectionKeys = this.buildScopedSectionKeys(scopedClasses);
      const scopedSubjectNamesLower = new Set(
        Array.from(scopedSubjects).map((item) => item.toLowerCase())
      );

      const relevantAttendance = attendance.filter((item) => {
        const section = (item.section ?? '').trim().toLowerCase();
        const subject = (item.subject ?? '').trim().toLowerCase();
        const classMatches = scopedSectionKeys.size > 0 && scopedSectionKeys.has(section);
        if (!classMatches) {
          return false;
        }
        return scopedSubjectNamesLower.size > 0 ? scopedSubjectNamesLower.has(subject) : true;
      });
      const relevantSessions = this.filterRelevantSessions(
        sessions,
        scopedSectionKeys,
        scopedSubjectNamesLower
      );

      this.assignedClasses.set(this.uniqueClassNames(scopedClasses));
      this.assignedSubjects.set(
        scopedSubjects.size > 0
          ? Array.from(scopedSubjects)
          : this.uniqueAssignedSubjectsFromClasses(scopedClasses)
      );
      this.attendanceLogs.set(
        relevantAttendance
          .sort((first, second) => this.toUnix(second.date) - this.toUnix(first.date))
          .slice(0, 5)
          .map((item) => ({
            student: item.studentName ?? item.studentEmail ?? 'Unknown student',
            subject: item.subject,
            class: item.section,
            timeIn: item.timeIn,
            status: item.status
          }))
      );
      this.recentSessions.set(
        relevantSessions
          .slice(0, 5)
          .map((item) => `${item.subject} - ${item.section} (${item.date})`)
      );
      this.applyTodayStats(relevantAttendance, scopedClasses, activeStudents);
    } catch {
      this.clearInstructorData();
    } finally {
      this.isLoading.set(false);
    }
  }

  private resolveScopedClasses(classes: InstructorClass[], account: AuthAccount): InstructorClass[] {
    const allowedClassIds = account.allowedClassIds ?? [];
    let scopedClasses = allowedClassIds.length
      ? classes.filter((item) => allowedClassIds.includes(item.id))
      : [];

    if (!scopedClasses.length && account.id) {
      scopedClasses = classes.filter((item) =>
        (item.assignedInstructorIds ?? []).includes(account.id)
      );
    }

    return scopedClasses;
  }

  private buildScopedSectionKeys(classes: InstructorClass[]): Set<string> {
    const keys = new Set<string>();
    for (const classItem of classes) {
      const name = classItem.name.trim().toLowerCase();
      const section = (classItem.section ?? '').trim().toLowerCase();
      if (name) {
        keys.add(name);
      }
      if (section) {
        keys.add(section);
      }
    }
    return keys;
  }

  private countUniqueStudents(
    classes: InstructorClass[],
    activeStudents: InstructorStudent[]
  ): number {
    const activeStudentIds = new Set(activeStudents.map((student) => student.id));
    const studentIds = new Set<string>();
    for (const classItem of classes) {
      for (const studentId of classItem.assignedStudentIds ?? []) {
        const trimmedId = studentId.trim();
        if (trimmedId && activeStudentIds.has(trimmedId)) {
          studentIds.add(trimmedId);
        }
      }
    }
    return studentIds.size;
  }

  private applyTodayStats(
    records: AttendanceRecord[],
    classes: InstructorClass[],
    activeStudents: InstructorStudent[]
  ): void {
    const today = new Date();
    const todayKey = getTodayDateKey(today);
    const todaysRecords = records.filter(
      (item) => isSameCalendarDate(item.date, today) || toCalendarDateKey(item.date) === todayKey
    );
    const presentToday = todaysRecords.filter((item) => item.status === 'Present').length;
    const lateToday = todaysRecords.filter((item) => item.status === 'Late').length;
    const absentToday = todaysRecords.filter((item) => item.status === 'Absent').length;
    const denominator = todaysRecords.length || 1;
    this.attendanceRate.set(Math.round(((presentToday + lateToday) / denominator) * 100));

    this.stats.set([
      { label: 'Present Today', value: presentToday, icon: 'how_to_reg', color: '#10b981' },
      { label: 'Absent Today', value: absentToday, icon: 'person_off', color: '#ef4444' },
      { label: 'Late Today', value: lateToday, icon: 'schedule', color: '#f59e0b' },
      {
        label: 'Total Students',
        value: this.countUniqueStudents(classes, activeStudents),
        icon: 'group',
        color: '#6366f1'
      },
    ]);
  }

  private clearInstructorData(): void {
    this.recentSessions.set([]);
    this.assignedClasses.set([]);
    this.assignedSubjects.set([]);
    this.attendanceLogs.set([]);
    this.attendanceRate.set(0);
    this.stats.set([
      { label: 'Present Today', value: 0, icon: 'how_to_reg', color: '#10b981' },
      { label: 'Absent Today', value: 0, icon: 'person_off', color: '#ef4444' },
      { label: 'Late Today', value: 0, icon: 'schedule', color: '#f59e0b' },
      { label: 'Total Students', value: 0, icon: 'group', color: '#6366f1' },
    ]);
  }

  private uniqueClassNames(classes: InstructorClass[]): string[] {
    return Array.from(
      new Set(classes.map((item) => item.name.trim()).filter((name) => Boolean(name)))
    );
  }

  private uniqueAssignedSubjectsFromClasses(classes: InstructorClass[]): string[] {
    return Array.from(
      new Set(
        classes
          .flatMap((item) => item.assignedSubjects ?? [])
          .map((subject) => subject.trim())
          .filter((subject) => Boolean(subject))
      )
    );
  }

  private toUnix(rawDate: string): number {
    const parsed = new Date(rawDate).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private filterRelevantSessions(
    sessions: InstructorSession[],
    scopedClassNames: Set<string>,
    scopedSubjects: Set<string>
  ): InstructorSession[] {
    return sessions
      .filter((item) => !item.hiddenFromListAt?.trim())
      .filter((item) => {
        const section = (item.section ?? '').trim().toLowerCase();
        const subject = (item.subject ?? '').trim().toLowerCase();
        const classMatches = scopedClassNames.size > 0 && scopedClassNames.has(section);
        if (!classMatches) {
          return false;
        }
        return scopedSubjects.size > 0 ? scopedSubjects.has(subject) : true;
      })
      .sort((first, second) => {
        const firstTime = new Date(first.startedAt ?? first.endedAt ?? first.date).getTime();
        const secondTime = new Date(second.startedAt ?? second.endedAt ?? second.date).getTime();
        return secondTime - firstTime;
      });
  }
}