import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import {
  StudentApiService,
  type AttendanceRecord as ApiAttendanceRecord,
  type AttendanceStatus,
  type AuthAccount,
  type InstructorClass,
} from '../../../core/data/student-api.service';

interface AttendanceRow {
  recordId: string;
  studentEmail: string;
  student: string;
  id: string;
  section: string;
  subject: string;
  date: string;
  timeIn: string;
  status: AttendanceStatus;
}

const ATTENDANCE_STATUSES: AttendanceStatus[] = ['Present', 'Late', 'Absent', 'Excused'];

@Component({
  selector: 'app-records',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="toolbar">
        <input type="text" placeholder="Search by name or ID..." [(ngModel)]="searchTerm" />
        <select [(ngModel)]="selectedStatus">
          <option value="">All Status</option>
          <option *ngFor="let status of statusOptions" [value]="status">{{ status }}</option>
        </select>
        <label class="date-field">
          <span>From</span>
          <input type="date" [(ngModel)]="fromDate" />
        </label>
        <label class="date-field">
          <span>To</span>
          <input type="date" [(ngModel)]="toDate" />
        </label>
        <button type="button" (click)="exportCsv()" [disabled]="!filteredRecords.length">Export</button>
      </div>

      <p class="load-hint" *ngIf="isLoading()">Loading attendance records…</p>
      <p class="load-error" *ngIf="!isLoading() && loadError()">{{ loadError() }}</p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>ID</th>
              <th>Section</th>
              <th>Subject</th>
              <th>Date</th>
              <th>Time In</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let record of filteredRecords; trackBy: trackByRecordId">
              <td class="name-cell">{{ record.student }}</td>
              <td>{{ record.id }}</td>
              <td>{{ record.section }}</td>
              <td>{{ record.subject }}</td>
              <td>{{ record.date }}</td>
              <td>{{ record.timeIn }}</td>
              <td>
                <span class="status-badge" [ngClass]="statusClass(record.status)">{{ record.status }}</span>
              </td>
              <td>
                <div class="actions">
                  <button
                    type="button"
                    class="action-btn"
                    (click)="editStatus(record)"
                    [disabled]="isSaving()"
                    aria-label="Edit attendance status for {{ record.student }}"
                  >
                    Edit status
                  </button>
                  <button
                    type="button"
                    class="archive-btn"
                    (click)="archiveRecord(record)"
                    [disabled]="isSaving()"
                    aria-label="Archive attendance record for {{ record.student }}"
                  >
                    Archive
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="!isLoading() && !filteredRecords.length">
              <td colspan="8" class="empty">No records found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 14px; }
    .toolbar, .table-wrap {
      background: #fff; border: 1px solid #edf0f5; border-radius: 12px;
    }
    .toolbar { display: grid; gap: 10px; padding: 12px; grid-template-columns: 1fr 140px 150px 150px 92px; align-items: end; }
    .date-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .date-field span { font-size: 11px; color: #6b7280; font-weight: 600; }
    .toolbar input, .toolbar select, .toolbar button {
      height: 38px; border-radius: 8px; border: 1px solid #e5e7eb; padding: 0 12px; font-size: 13px;
      background: #fff; color: #374151;
    }
    .toolbar button { font-weight: 600; cursor: pointer; }
    .toolbar button:disabled { cursor: not-allowed; opacity: 0.6; }
    .load-hint { margin: 0; font-size: 13px; color: #6b7280; }
    .load-error { margin: 0; font-size: 13px; color: #b91c1c; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 12px; border-bottom: 1px solid #f0f2f6; text-align: left; color: #4b5563; vertical-align: middle; }
    .name-cell { font-weight: 700; }
    th { color: #6b7280; font-weight: 600; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .action-btn, .archive-btn {
      height: 32px; border-radius: 8px; padding: 0 10px; font-size: 12px; font-weight: 600; cursor: pointer;
    }
    .action-btn {
      border: 1px solid #dbeafe; background: #eff6ff; color: #1d4ed8;
    }
    .action-btn:hover:not(:disabled) { background: #dbeafe; }
    .archive-btn {
      border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c;
    }
    .archive-btn:hover:not(:disabled) { background: #fee2e2; }
    .action-btn:disabled, .archive-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .status-badge {
      display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px;
      font-size: 11px; font-weight: 700; letter-spacing: 0.02em;
    }
    .status-badge.present { background: #dcfce7; color: #166534; }
    .status-badge.late { background: #fef3c7; color: #92400e; }
    .status-badge.absent { background: #fee2e2; color: #991b1b; }
    .status-badge.excused { background: #e0e7ff; color: #3730a3; }
    .empty { text-align: center; color: #9ca3af; padding: 28px 12px; }
    @media (max-width: 1100px) { .toolbar { grid-template-columns: 1fr 1fr; } }
    :host-context(body.dark-mode) .toolbar,
    :host-context(body.dark-mode) .table-wrap,
    .dark-mode .toolbar,
    .dark-mode .table-wrap {
      background: #111827;
      border-color: #1f2937;
    }
    :host-context(body.dark-mode) .toolbar input,
    :host-context(body.dark-mode) .toolbar select,
    :host-context(body.dark-mode) .toolbar button,
    .dark-mode .toolbar input,
    .dark-mode .toolbar select,
    .dark-mode .toolbar button {
      background: #0f172a;
      border-color: #374151;
      color: #e5e7eb;
    }
    :host-context(body.dark-mode) .toolbar input[type='date']::-webkit-calendar-picker-indicator,
    .dark-mode .toolbar input[type='date']::-webkit-calendar-picker-indicator {
      width: 1.125rem;
      height: 1.125rem;
      opacity: 1;
      cursor: pointer;
      background: center / contain no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23e2e8f0'%3E%3Cpath d='M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z'/%3E%3C/svg%3E");
      color: transparent;
    }
    :host-context(body.dark-mode) .date-field span,
    .dark-mode .date-field span { color: #94a3b8; }
    :host-context(body.dark-mode) th,
    :host-context(body.dark-mode) td,
    .dark-mode th,
    .dark-mode td {
      border-bottom-color: #1f2937;
      color: #cbd5e1;
    }
    :host-context(body.dark-mode) th,
    .dark-mode th { color: #94a3b8; }
    :host-context(body.dark-mode) .empty,
    .dark-mode .empty { color: #64748b; }
    :host-context(body.dark-mode) .load-hint,
    .dark-mode .load-hint { color: #94a3b8; }
  `],
})
export class RecordsComponent implements OnInit {
  private readonly api = inject(StudentApiService);
  private readonly authSessionStorageKey = 'attendease-auth-session';

  readonly statusOptions = ATTENDANCE_STATUSES;
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly loadError = signal('');
  readonly records = signal<AttendanceRow[]>([]);

  searchTerm = '';
  selectedStatus: '' | AttendanceStatus = '';
  fromDate = '';
  toDate = '';

  private role: 'instructor' | 'admin' | 'superadmin' | 'student' | '' = '';
  private email = '';

  get filteredRecords(): AttendanceRow[] {
    const term = this.searchTerm.trim().toLowerCase();
    const fromKey = this.fromDate.trim();
    const toKey = this.toDate.trim();

    return this.records()
      .filter((record) => {
        const matchesSearch = !term
          || record.student.toLowerCase().includes(term)
          || record.id.toLowerCase().includes(term);

        const matchesStatus = !this.selectedStatus || record.status === this.selectedStatus;

        const recordKey = this.toDateKey(record.date);
        const matchesFrom = !fromKey || (recordKey !== '' && recordKey >= fromKey);
        const matchesTo = !toKey || (recordKey !== '' && recordKey <= toKey);

        return matchesSearch && matchesStatus && matchesFrom && matchesTo;
      })
      .sort((first, second) => this.compareAttendanceNewestFirst(first, second));
  }

  ngOnInit(): void {
    this.resolveSession();
    void this.loadRecords();
  }

  trackByRecordId(_index: number, record: AttendanceRow): string {
    return record.recordId;
  }

  statusClass(status: AttendanceStatus): string {
    return status.toLowerCase();
  }

  async editStatus(record: AttendanceRow): Promise<void> {
    const statusOptionsHtml = ATTENDANCE_STATUSES.map(
      (status) =>
        `<option value="${status}" ${status === record.status ? 'selected' : ''}>${status}</option>`
    ).join('');

    const result = await Swal.fire({
      title: 'Edit attendance status',
      html: `
        <p style="margin:0 0 12px;color:#6b7280;font-size:13px;">
          Update status for <strong>${this.escapeHtml(record.student)}</strong>
          (${this.escapeHtml(record.subject)} · ${this.escapeHtml(record.date)})
        </p>
        <label for="attendance-status-select" style="display:block;text-align:left;font-size:12px;font-weight:600;color:#374151;margin-bottom:6px;">
          Status
        </label>
        <select id="attendance-status-select" class="swal2-input" style="width:100%;margin:0;height:42px;">
          ${statusOptionsHtml}
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: 'Save status',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2563eb',
      reverseButtons: true,
      focusConfirm: false,
      preConfirm: () => {
        const select = document.getElementById('attendance-status-select') as HTMLSelectElement | null;
        const value = select?.value as AttendanceStatus | undefined;
        if (!value || !ATTENDANCE_STATUSES.includes(value)) {
          Swal.showValidationMessage('Select a valid attendance status.');
          return undefined;
        }
        return value;
      },
    });

    if (!result.isConfirmed || !result.value) {
      return;
    }

    const nextStatus = result.value;
    if (nextStatus === record.status) {
      return;
    }

    this.isSaving.set(true);
    try {
      const updated = await this.api.updateAttendanceRecordStatus(record.recordId, nextStatus);
      if (!updated) {
        await this.showError('Unable to update this record. It may have been archived or removed.');
        return;
      }

      this.records.update((rows) =>
        rows.map((row) =>
          row.recordId === record.recordId ? { ...row, status: nextStatus } : row
        )
      );
    } catch {
      await this.showError('Unable to update attendance status right now.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async archiveRecord(record: AttendanceRow): Promise<void> {
    const result = await Swal.fire({
      title: 'Archive attendance record?',
      html: `<p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
        This removes <strong>${this.escapeHtml(record.student)}</strong>'s entry for
        ${this.escapeHtml(record.subject)} on ${this.escapeHtml(record.date)} from active records.</p>`,
      input: 'textarea',
      inputLabel: 'Reason for archiving',
      inputPlaceholder: 'Explain why this record is being archived...',
      inputAttributes: { 'aria-label': 'Reason for archiving' },
      inputValidator: (value) => (!value?.trim() ? 'A reason is required before archiving.' : null),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Archive record',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#b91c1c',
      reverseButtons: true,
    });

    if (!result.isConfirmed || typeof result.value !== 'string') {
      return;
    }

    this.isSaving.set(true);
    try {
      const archived = await this.api.archiveAttendanceRecord(
        record.recordId,
        result.value.trim(),
        this.getActorEmail()
      );
      if (!archived) {
        await this.showError('Unable to archive this record. It may already be archived.');
        return;
      }

      this.records.update((rows) => rows.filter((row) => row.recordId !== record.recordId));
      await Swal.fire({
        title: 'Record archived',
        text: 'The attendance entry was removed from active records.',
        icon: 'success',
        confirmButtonColor: '#16a34a',
      });
    } catch {
      await this.showError('Unable to archive this record right now.');
    } finally {
      this.isSaving.set(false);
    }
  }

  exportCsv(): void {
    const rows = this.filteredRecords;
    if (!rows.length) {
      return;
    }

    const headers = ['Student', 'ID', 'Section', 'Subject', 'Date', 'Time In', 'Status'];
    const csvRows = rows.map((record) => [
      record.student,
      record.id,
      record.section,
      record.subject,
      record.date,
      record.timeIn,
      record.status,
    ]);

    const csvContent = [headers, ...csvRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `attendance-records-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private async loadRecords(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');

    try {
      const attendancePromise = this.api.getAttendanceRecords();
      const scopePromise = this.resolveScope();
      const [attendance, scope] = await Promise.all([attendancePromise, scopePromise]);

      const scopedAttendance = this.filterAttendanceForScope(attendance, scope);
      const rows = this.mapAttendanceRows(scopedAttendance);
      this.records.set(rows);

      void this.enrichStudentIds(rows);
    } catch {
      this.records.set([]);
      this.loadError.set('Unable to load attendance records. Please refresh and try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async enrichStudentIds(rows: AttendanceRow[]): Promise<void> {
    const needsLookup = rows.some((row) => row.id === '—');
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
          if (row.id !== '—' || !row.studentEmail) {
            return row;
          }
          const fromMap = studentIdByEmail.get(row.studentEmail);
          return fromMap && fromMap !== '—' ? { ...row, id: fromMap } : row;
        })
      );
    } catch {
      // Keep rows visible without blocking the table on student lookup.
    }
  }

  private mapAttendanceRows(attendance: ApiAttendanceRecord[]): AttendanceRow[] {
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
          student: (record.studentName ?? studentEmail) || 'Unknown student',
          id: '—',
          section: record.section ?? '',
          subject: record.subject ?? '',
          date: record.date ?? '',
          timeIn: record.timeIn ?? '--',
          status: this.normalizeStatus(record.status),
        };
      })
      .filter((row): row is AttendanceRow => row !== null)
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

  private compareAttendanceNewestFirst(first: AttendanceRow, second: AttendanceRow): number {
    return this.toAttendanceSortKey(second) - this.toAttendanceSortKey(first);
  }

  private toAttendanceSortKey(record: Pick<AttendanceRow, 'date' | 'timeIn'>): number {
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

  private getActorEmail(): string {
    return this.email || 'instructor';
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private async showError(message: string): Promise<void> {
    await Swal.fire({
      title: 'Action failed',
      text: message,
      icon: 'error',
      confirmButtonColor: '#4f46e5',
    });
  }
}


