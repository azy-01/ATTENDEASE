import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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
  constructor(private router: Router) {}

  // ── Stats ──────────────────────────────────────────────
  stats: StatCard[] = [
    { label: 'Present Today', value: 0, icon: 'how_to_reg', color: '#10b981' },
    { label: 'Absent Today', value: 0, icon: 'person_off', color: '#ef4444' },
    { label: 'Late Today', value: 0, icon: 'schedule', color: '#f59e0b' },
    { label: 'Total Students', value: 2, icon: 'group', color: '#6366f1' },
  ];

  attendanceLogs: any[] = [];
  activeSessions: any[] = [];
  attendanceRate: number = 0;

  // ── Calendar ───────────────────────────────────────────
  dayNames: string[] = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  calendarCells: CalendarCell[] = [];
  currentMonthLabel: string = '';

  private viewDate: Date = new Date();

  ngOnInit(): void {
    this.buildCalendar();
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
}