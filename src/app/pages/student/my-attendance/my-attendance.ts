import { ChangeDetectorRef, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentApiService, type AttendanceRecord } from '../../../core/data/student-api.service';

@Component({
  selector: 'app-my-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-attendance.html',
  styleUrls: ['./my-attendance.scss'],
})
export class MyAttendanceComponent {
  private readonly authSessionStorageKey = 'attendease-auth-session';
  selectedSubject = '';
  selectedStatus = '';
  fromDate = '';
  toDate = '';
  private studentEmail = '';

  private readonly allRecords = signal<AttendanceRecord[]>([]);

  constructor(
    private readonly studentApi: StudentApiService,
    private readonly cdr: ChangeDetectorRef
  ) {
    void this.initializePage();
  }

  get hasRecords(): boolean {
    return this.records.length > 0;
  }

  get records(): AttendanceRecord[] {
    const from = this.fromDate ? new Date(this.fromDate) : null;
    const to = this.toDate ? new Date(this.toDate) : null;

    return this.allRecords()
      .filter((record) => {
        const matchesSubject = !this.selectedSubject || record.subject === this.selectedSubject;
        const matchesStatus = !this.selectedStatus || record.status === this.selectedStatus;
        const recordDate = new Date(record.date);
        const matchesFromDate = !from || recordDate >= from;
        const matchesToDate = !to || recordDate <= to;

        return matchesSubject && matchesStatus && matchesFromDate && matchesToDate;
      })
      .sort((first, second) => this.compareAttendanceNewestFirst(first, second));
  }

  private compareAttendanceNewestFirst(first: AttendanceRecord, second: AttendanceRecord): number {
    return this.toAttendanceSortKey(second) - this.toAttendanceSortKey(first);
  }

  private toAttendanceSortKey(record: Pick<AttendanceRecord, 'date' | 'timeIn'>): number {
    const dateKey = this.toDateKey(record.date);
    if (!dateKey) {
      return 0;
    }

    const [year, month, day] = dateKey.split('-').map((part) => Number(part));
    const minutesSinceMidnight = this.toTimeSortValue(record.timeIn);
    const hours = minutesSinceMidnight >= 0 ? Math.floor(minutesSinceMidnight / 60) : 0;
    const minutes = minutesSinceMidnight >= 0 ? minutesSinceMidnight % 60 : 0;
    return new Date(year, month - 1, day, hours, minutes).getTime();
  }

  private toTimeSortValue(timeIn: string): number {
    const trimmed = timeIn.trim();
    if (!trimmed || trimmed === '--') {
      return -1;
    }

    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) {
      return 0;
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) {
      hours += 12;
    }
    if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return hours * 60 + minutes;
  }

  private toDateKey(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get subjects(): string[] {
    return [...new Set(this.allRecords().map((record) => record.subject))];
  }

  clearFilters(): void {
    this.selectedSubject = '';
    this.selectedStatus = '';
    this.fromDate = '';
    this.toDate = '';
  }

  private async initializePage(): Promise<void> {
    this.resolveStudentSession();
    await this.loadAttendanceRecords();
    this.cdr.markForCheck();
  }

  private async loadAttendanceRecords(): Promise<void> {
    if (!this.studentEmail) {
      this.allRecords.set([]);
      return;
    }

    try {
      const records = await this.studentApi.getAttendanceRecords();
      const normalizedEmail = this.studentEmail.trim().toLowerCase();
      this.allRecords.set(
        records.filter((record) => (record.studentEmail ?? '').trim().toLowerCase() === normalizedEmail)
      );
    } catch {
      this.allRecords.set([]);
    }
    this.cdr.markForCheck();
  }

  private resolveStudentSession(): void {
    const rawSession = localStorage.getItem(this.authSessionStorageKey);
    if (!rawSession) return;

    try {
      const parsed = JSON.parse(rawSession) as { email?: string };
      this.studentEmail = parsed.email?.trim().toLowerCase() ?? '';
    } catch {
      localStorage.removeItem(this.authSessionStorageKey);
    }
  }
}
