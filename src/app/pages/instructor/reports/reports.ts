import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  StudentApiService,
  type AttendanceRecord as ApiAttendanceRecord,
  type AttendanceStatus,
  type AuthAccount,
  type InstructorClass,
} from '../../../core/data/student-api.service';

interface ReportRow {
  recordId: string;
  studentName: string;
  studentId: string;
  studentEmail: string;
  section: string;
  subject: string;
  date: string;
  timeIn: string;
  status: AttendanceStatus;
}

const REPORT_STATUSES: AttendanceStatus[] = ['Present', 'Late', 'Absent', 'Excused'];

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss'],
})
export class Reports implements OnInit {
  private readonly api = inject(StudentApiService);
  private readonly authSessionStorageKey = 'attendease-auth-session';

  classFilter = 'All Classes';
  startDate = '';
  endDate = '';

  readonly isLoading = signal(true);
  readonly loadError = signal('');
  private readonly records = signal<ReportRow[]>([]);

  private role: 'instructor' | 'admin' | 'superadmin' | 'student' | '' = '';
  private email = '';

  ngOnInit(): void {
    this.resolveSession();
    void this.loadReports();
  }

  get classOptions(): string[] {
    return [...new Set(this.records().map((record) => record.section).filter(Boolean))].sort();
  }

  get filteredRecords(): ReportRow[] {
    return this.records()
      .filter((record) => {
        if (this.classFilter !== 'All Classes' && record.section !== this.classFilter) {
          return false;
        }
        const recordKey = this.toDateKey(record.date);
        if (this.startDate && recordKey && recordKey < this.startDate) {
          return false;
        }
        if (this.endDate && recordKey && recordKey > this.endDate) {
          return false;
        }
        return true;
      })
      .sort((first, second) => this.compareAttendanceNewestFirst(first, second));
  }

  get attendanceRate(): number {
    const total = this.filteredRecords.length;
    if (!total) {
      return 0;
    }
    const presentCount = this.filteredRecords.filter((record) => record.status === 'Present').length;
    return Math.round((presentCount / total) * 100);
  }

  get totalRecords(): number {
    return this.filteredRecords.length;
  }

  get totalStudents(): number {
    const ids = this.filteredRecords.map((record) => record.studentId || record.studentEmail);
    return new Set(ids.filter(Boolean)).size;
  }

  get totalClasses(): number {
    return new Set(this.filteredRecords.map((record) => record.section).filter(Boolean)).size;
  }

  get statusBreakdown(): Array<{ label: string; count: number; percent: number }> {
    const total = this.filteredRecords.length;
    return REPORT_STATUSES.map((label) => {
      const count = this.filteredRecords.filter((record) => record.status === label).length;
      const percent = total ? Math.round((count / total) * 100) : 0;
      return { label, count, percent };
    }).filter((item) => item.count > 0 || total === 0);
  }

  get sectionBreakdown(): Array<{ section: string; count: number; percent: number }> {
    const total = this.filteredRecords.length;
    const sections = [...new Set(this.filteredRecords.map((record) => record.section).filter(Boolean))].sort();
    return sections.map((section) => {
      const count = this.filteredRecords.filter((record) => record.section === section).length;
      const percent = total ? Math.round((count / total) * 100) : 0;
      return { section, count, percent };
    });
  }

  statusClass(status: AttendanceStatus): string {
    return status.toLowerCase();
  }

  exportCsv(): void {
    if (!this.filteredRecords.length) {
      return;
    }

    const headers = ['Student', 'ID', 'Section', 'Subject', 'Date', 'Time In', 'Status'];
    const rows = this.filteredRecords.map((record) => [
      record.studentName,
      record.studentId,
      record.section,
      record.subject,
      record.date,
      record.timeIn,
      record.status,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `attendance-reports-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private async loadReports(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');

    try {
      const [attendance, scope] = await Promise.all([
        this.api.getAttendanceRecords(),
        this.resolveScope(),
      ]);

      const scopedAttendance = this.filterAttendanceForScope(attendance, scope);
      const rows = this.mapReportRows(scopedAttendance);
      this.records.set(rows);
      void this.enrichStudentIds(rows);
    } catch {
      this.records.set([]);
      this.loadError.set('Unable to load reports. Please refresh and try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async enrichStudentIds(rows: ReportRow[]): Promise<void> {
    const needsLookup = rows.some((row) => row.studentId === '—');
    if (!needsLookup) {
      return;
    }

    try {
      const students = await this.api.getInstructorStudents();
      const studentIdByEmail = new Map(
        students.map((student) => [
          (student.email ?? '').trim().toLowerCase(),
          (student.studentId ?? '').trim() || '—',
        ])
      );

      this.records.update((current) =>
        current.map((row) => {
          if (row.studentId !== '—' || !row.studentEmail) {
            return row;
          }
          const fromMap = studentIdByEmail.get(row.studentEmail);
          return fromMap && fromMap !== '—' ? { ...row, studentId: fromMap } : row;
        })
      );
    } catch {
      // Keep reports visible if student lookup fails.
    }
  }

  private mapReportRows(attendance: ApiAttendanceRecord[]): ReportRow[] {
    return attendance
      .map((record) => {
        const recordId = (record.id ?? '').trim();
        if (!recordId) {
          return null;
        }

        const studentEmail = (record.studentEmail ?? '').trim().toLowerCase();
        return {
          recordId,
          studentEmail,
          studentName: (record.studentName ?? studentEmail) || 'Unknown student',
          studentId: '—',
          section: record.section ?? '',
          subject: record.subject ?? '',
          date: record.date ?? '',
          timeIn: record.timeIn ?? '--',
          status: this.normalizeStatus(record.status),
        };
      })
      .filter((row): row is ReportRow => row !== null)
      .sort((first, second) => this.compareAttendanceNewestFirst(first, second));
  }

  private async resolveScope(): Promise<{
    isStaff: boolean;
    sectionKeys: Set<string>;
    subjectKeys: Set<string>;
  }> {
    const isStaff = this.role === 'admin' || this.role === 'superadmin';
    if (isStaff) {
      return { isStaff: true, sectionKeys: new Set(), subjectKeys: new Set() };
    }

    if (this.role !== 'instructor' || !this.email) {
      return { isStaff: false, sectionKeys: new Set(), subjectKeys: new Set() };
    }

    const [account, classes] = await Promise.all([
      this.api.getAuthAccountByEmail('instructor', this.email),
      this.api.getInstructorClasses(),
    ]);

    const scopedClasses = this.resolveScopedClasses(classes, account);
    const sectionKeys = this.buildScopedSectionKeys(scopedClasses);
    const subjectKeys = new Set(
      (account?.allowedSubjects ?? [])
        .map((item) => item.trim().toLowerCase())
        .filter((item) => Boolean(item))
    );

    return { isStaff: false, sectionKeys, subjectKeys };
  }

  private filterAttendanceForScope(
    attendance: ApiAttendanceRecord[],
    scope: { isStaff: boolean; sectionKeys: Set<string>; subjectKeys: Set<string> }
  ): ApiAttendanceRecord[] {
    if (scope.isStaff) {
      return attendance;
    }

    if (!scope.sectionKeys.size) {
      return [];
    }

    return attendance.filter((record) => {
      const section = (record.section ?? '').trim().toLowerCase();
      const subject = (record.subject ?? '').trim().toLowerCase();
      if (!scope.sectionKeys.has(section)) {
        return false;
      }
      return scope.subjectKeys.size > 0 ? scope.subjectKeys.has(subject) : true;
    });
  }

  private resolveScopedClasses(
    classes: InstructorClass[],
    account: AuthAccount | null
  ): InstructorClass[] {
    const allowedClassIds = account?.allowedClassIds ?? [];
    let scopedClasses = allowedClassIds.length
      ? classes.filter((item) => allowedClassIds.includes(item.id))
      : [];

    if (!scopedClasses.length && account?.id) {
      scopedClasses = classes.filter((item) =>
        (item.assignedInstructorIds ?? []).includes(account.id)
      );
    }

    return scopedClasses.filter((item) => item.status !== 'archived');
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

  private normalizeStatus(status: ApiAttendanceRecord['status'] | string | undefined): AttendanceStatus {
    if (status === 'Late' || status === 'Absent' || status === 'Excused') {
      return status;
    }
    return 'Present';
  }

  private compareAttendanceNewestFirst(first: ReportRow, second: ReportRow): number {
    return this.toAttendanceSortKey(second) - this.toAttendanceSortKey(first);
  }

  private toAttendanceSortKey(record: Pick<ReportRow, 'date' | 'timeIn'>): number {
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

  private resolveSession(): void {
    const raw = localStorage.getItem(this.authSessionStorageKey);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as {
        role?: 'instructor' | 'admin' | 'superadmin' | 'student';
        email?: string;
      };
      this.role = parsed.role ?? '';
      this.email = (parsed.email ?? '').trim().toLowerCase();
    } catch {
      localStorage.removeItem(this.authSessionStorageKey);
    }
  }
}
