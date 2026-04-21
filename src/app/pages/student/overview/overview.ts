import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  stats: StatCard[] = [
    { label: 'Attendance Rate', value: '93%', icon: 'percent', color: '#4f46e5' },
    { label: 'Present Days', value: '14', icon: 'how_to_reg', color: '#10b981' },
    { label: 'Late Days', value: '2', icon: 'schedule', color: '#f59e0b' },
    { label: 'Absent Days', value: '1', icon: 'person_off', color: '#ef4444' },
  ];

  recentAttendance: AttendanceItem[] = [
    { subject: 'Programming', section: 'BSIT-2A', date: '2026-04-20', status: 'Present' },
    { subject: 'Database Management', section: 'BSIT-2A', date: '2026-04-18', status: 'Late' },
    { subject: 'Networking', section: 'BSIT-2A', date: '2026-04-16', status: 'Present' },
  ];

  upcomingClasses: string[] = [
    'Programming - Wed 10:00 AM',
    'Database Management - Thu 1:00 PM',
  ];

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
}
