import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentApiService, type AttendanceRecord } from '../../../core/data/student-api.service';

interface StatCard {
  label: string;
  value: string;
  icon: string;
  color: string;
}

interface CalendarCell {
  day: number | null;
  isToday: boolean;
}

interface AttendanceItem {
  subject: string;
  section: string;
  date: string;
  status: 'Present' | 'Late' | 'Absent';
}

@Component({
  selector: 'app-student-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview.html',
  styleUrls: ['./overview.scss'],
})
export class StudentOverviewComponent implements OnInit {
  private readonly authSessionStorageKey = 'attendease-auth-session';
  private readonly studentProfileStorageKey = 'student-account-profile';
  stats: StatCard[] = [
    { label: 'Attendance Rate', value: '0%', icon: 'percent', color: '#4f46e5' },
    { label: 'Present Days', value: '0', icon: 'how_to_reg', color: '#10b981' },
    { label: 'Late Days', value: '0', icon: 'schedule', color: '#f59e0b' },
    { label: 'Absent Days', value: '0', icon: 'person_off', color: '#ef4444' },
  ];

  recentAttendance: AttendanceItem[] = [];

  upcomingClasses: string[] = [];

  dayNames: string[] = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  calendarCells: CalendarCell[] = [];
  currentMonthLabel: string = '';

  private viewDate: Date = new Date();

  constructor(private readonly studentApi: StudentApiService) {}

  ngOnInit(): void {
    this.buildCalendar();
    void this.loadStudentOverviewData();
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
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, isToday: false });
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
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
    this.buildCalendar();
  }

  nextMonth(): void {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
    this.buildCalendar();
  }

  private async loadStudentOverviewData(): Promise<void> {
    const email = this.getLoggedInStudentEmail();
    if (!email) {
      this.recentAttendance = [];
      this.upcomingClasses = [];
      this.applyAttendanceStats([]);
      return;
    }

    try {
      const [attendanceRecords, assignedSchedules] = await Promise.all([
        this.studentApi.getAttendanceRecords(),
        this.studentApi.getStudentSchedulesByEmail(email),
      ]);
      const normalizedEmail = email.trim().toLowerCase();
      const ownRecords = attendanceRecords
        .filter((record) => (record.studentEmail ?? '').trim().toLowerCase() === normalizedEmail);

      this.applyAttendanceStats(ownRecords);
      this.recentAttendance = ownRecords
        .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
        .slice(0, 5)
        .map((record) => ({
          subject: record.subject,
          section: record.section,
          date: record.date,
          status: record.status
        }));

      this.upcomingClasses = assignedSchedules.map(
        (schedule) => `${schedule.subject} - ${schedule.day} ${schedule.time}`
      );
    } catch {
      this.recentAttendance = [];
      this.upcomingClasses = [];
      this.applyAttendanceStats([]);
    }
  }

  private applyAttendanceStats(records: AttendanceRecord[]): void {
    const presentCount = records.filter((item) => item.status === 'Present').length;
    const lateCount = records.filter((item) => item.status === 'Late').length;
    const absentCount = records.filter((item) => item.status === 'Absent').length;
    const denominator = records.length || 1;
    const attendanceRate = Math.round(((presentCount + lateCount) / denominator) * 100);

    this.stats = [
      { label: 'Attendance Rate', value: `${attendanceRate}%`, icon: 'percent', color: '#4f46e5' },
      { label: 'Present Days', value: String(presentCount), icon: 'how_to_reg', color: '#10b981' },
      { label: 'Late Days', value: String(lateCount), icon: 'schedule', color: '#f59e0b' },
      { label: 'Absent Days', value: String(absentCount), icon: 'person_off', color: '#ef4444' },
    ];
  }

  private getLoggedInStudentEmail(): string {
    const fromSession = this.readEmailFromStorage(this.authSessionStorageKey);
    if (fromSession) return fromSession;
    return this.readEmailFromStorage(this.studentProfileStorageKey);
  }

  private readEmailFromStorage(key: string): string {
    const raw = localStorage.getItem(key);
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw) as { role?: string; email?: string };
      if (key === this.authSessionStorageKey && parsed.role !== 'student') {
        return '';
      }
      return parsed.email?.trim().toLowerCase() ?? '';
    } catch {
      return '';
    }
  }
}
