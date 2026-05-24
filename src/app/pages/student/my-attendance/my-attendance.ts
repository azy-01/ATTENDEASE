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

    return this.allRecords().filter((record) => {
      const matchesSubject = !this.selectedSubject || record.subject === this.selectedSubject;
      const matchesStatus = !this.selectedStatus || record.status === this.selectedStatus;
      const recordDate = new Date(record.date);
      const matchesFromDate = !from || recordDate >= from;
      const matchesToDate = !to || recordDate <= to;

      return matchesSubject && matchesStatus && matchesFromDate && matchesToDate;
    });
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
