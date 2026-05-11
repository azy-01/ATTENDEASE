import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  StudentApiService,
  type AttendanceRecord,
  type InstructorClass,
  type InstructorSession
} from '../../../core/data/student-api.service';

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

  // ── Stats ──────────────────────────────────────────────
  stats: StatCard[] = [
    { label: 'Present Today', value: 0, icon: 'how_to_reg', color: '#10b981' },
    { label: 'Absent Today', value: 0, icon: 'person_off', color: '#ef4444' },
    { label: 'Late Today', value: 0, icon: 'schedule', color: '#f59e0b' },
    { label: 'Total Students', value: 2, icon: 'group', color: '#6366f1' },
  ];

  attendanceLogs: Array<{ student: string; subject: string; class: string; timeIn: string; status: string }> = [];
  recentSessions: string[] = [];
  assignedClasses: string[] = [];
  assignedSubjects: string[] = [];
  attendanceRate: number = 0;

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
    const rawSession = localStorage.getItem('attendease-auth-session');
    if (!rawSession) {
      this.clearInstructorData();
      return;
    }

    try {
      const session = JSON.parse(rawSession) as { role?: string; email?: string };
      const role = session.role;
      const email = (session.email ?? '').trim().toLowerCase();
      if (role !== 'instructor' || !email) {
        this.clearInstructorData();
        return;
      }

      const account = await this.studentApi.getAuthAccountByEmail('instructor', email);
      if (!account?.id) {
        this.clearInstructorData();
        return;
      }

      const [classes, attendance, sessions] = await Promise.all([
        this.studentApi.getInstructorClasses(),
        this.studentApi.getAttendanceRecords(),
        this.studentApi.getInstructorSessionsForOwner(account.id)
      ]);

      const allowedClassIds = account.allowedClassIds ?? [];
      const scopedClasses = classes.filter((item) => allowedClassIds.includes(item.id));
      const scopedClassNames = new Set(
        scopedClasses.map((item) => item.name.trim().toLowerCase()).filter((name) => Boolean(name))
      );
      const scopedSubjects = new Set(
        (account?.allowedSubjects ?? [])
          .map((item) => item.trim())
          .filter((item) => Boolean(item))
      );
      const scopedSubjectNamesLower = new Set(
        Array.from(scopedSubjects).map((item) => item.toLowerCase())
      );

      const relevantAttendance = attendance.filter((item) => {
        const section = (item.section ?? '').trim().toLowerCase();
        const subject = (item.subject ?? '').trim().toLowerCase();
        const classMatches = scopedClassNames.size > 0 && scopedClassNames.has(section);
        if (!classMatches) {
          return false;
        }
        return scopedSubjectNamesLower.size > 0 ? scopedSubjectNamesLower.has(subject) : true;
      });
      const relevantSessions = this.filterRelevantSessions(
        sessions,
        scopedClassNames,
        scopedSubjectNamesLower
      );

      this.assignedClasses = this.uniqueClassNames(scopedClasses);
      this.assignedSubjects = scopedSubjects.size > 0
        ? Array.from(scopedSubjects)
        : this.uniqueAssignedSubjectsFromClasses(scopedClasses);
      this.attendanceLogs = relevantAttendance
        .sort((first, second) => this.toUnix(second.date) - this.toUnix(first.date))
        .slice(0, 5)
        .map((item) => ({
          student: item.studentName ?? item.studentEmail ?? 'Unknown student',
          subject: item.subject,
          class: item.section,
          timeIn: item.timeIn,
          status: item.status
        }));
      this.recentSessions = relevantSessions
        .slice(0, 5)
        .map((item) => `${item.subject} - ${item.section} (${item.date})`);
      this.applyTodayStats(relevantAttendance, scopedClasses);
    } catch {
      this.clearInstructorData();
    }
  }

  private applyTodayStats(records: AttendanceRecord[], classes: InstructorClass[]): void {
    const today = new Date();
    const todaysRecords = records.filter((item) => this.isSameDate(item.date, today));
    const presentToday = todaysRecords.filter((item) => item.status === 'Present').length;
    const lateToday = todaysRecords.filter((item) => item.status === 'Late').length;
    const absentToday = todaysRecords.filter((item) => item.status === 'Absent').length;
    const denominator = todaysRecords.length || 1;
    this.attendanceRate = Math.round(((presentToday + lateToday) / denominator) * 100);

    this.stats = [
      { label: 'Present Today', value: presentToday, icon: 'how_to_reg', color: '#10b981' },
      { label: 'Absent Today', value: absentToday, icon: 'person_off', color: '#ef4444' },
      { label: 'Late Today', value: lateToday, icon: 'schedule', color: '#f59e0b' },
      {
        label: 'Total Students',
        value: classes.reduce((sum, item) => sum + (item.studentCount ?? 0), 0),
        icon: 'group',
        color: '#6366f1'
      },
    ];
  }

  private clearInstructorData(): void {
    this.recentSessions = [];
    this.assignedClasses = [];
    this.assignedSubjects = [];
    this.attendanceLogs = [];
    this.attendanceRate = 0;
    this.stats = [
      { label: 'Present Today', value: 0, icon: 'how_to_reg', color: '#10b981' },
      { label: 'Absent Today', value: 0, icon: 'person_off', color: '#ef4444' },
      { label: 'Late Today', value: 0, icon: 'schedule', color: '#f59e0b' },
      { label: 'Total Students', value: 0, icon: 'group', color: '#6366f1' },
    ];
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

  private isSameDate(rawDate: string, target: Date): boolean {
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) {
      return false;
    }
    return (
      parsed.getFullYear() === target.getFullYear() &&
      parsed.getMonth() === target.getMonth() &&
      parsed.getDate() === target.getDate()
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
      .filter((item) => {
        const section = (item.section ?? '').trim().toLowerCase();
        const subject = (item.subject ?? '').trim().toLowerCase();
        const classMatches = scopedClassNames.size > 0 && scopedClassNames.has(section);
        if (!classMatches) {
          return false;
        }
        return scopedSubjects.size > 0 ? scopedSubjects.has(subject) : true;
      })
      .sort((first, second) => this.toUnix(second.date) - this.toUnix(first.date));
  }
}