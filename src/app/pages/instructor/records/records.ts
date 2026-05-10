import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StudentApiService, type AttendanceRecord as ApiAttendanceRecord } from '../../../core/data/student-api.service';

interface AttendanceRecord {
  student: string;
  id: string;
  section: string;
  subject: string;
  date: string;
  timeIn: string;
  status: 'Present' | 'Late' | 'Absent';
}

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
          <option value="Present">Present</option>
          <option value="Late">Late</option>
          <option value="Absent">Absent</option>
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
            <tr *ngFor="let record of filteredRecords">
              <td class="name-cell">{{ record.student }}</td>
              <td>{{ record.id }}</td>
              <td>{{ record.section }}</td>
              <td>{{ record.subject }}</td>
              <td>{{ record.date }}</td>
              <td>{{ record.timeIn }}</td>
              <td>{{ record.status }}</td>
              <td>
                <button type="button" class="link" (click)="removeRecord(record.id, record.date)">Remove</button>
              </td>
            </tr>
            <tr *ngIf="!filteredRecords.length">
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
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 12px; border-bottom: 1px solid #f0f2f6; text-align: left; color: #4b5563; }
    .name-cell { font-weight: 700; }
    th { color: #6b7280; font-weight: 600; }
    .link {
      border: 0;
      background: transparent;
      color: #2563eb;
      cursor: pointer;
      font-weight: 600;
      padding: 0;
    }
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
  `],
})
export class RecordsComponent implements OnInit {
  private readonly authSessionStorageKey = 'attendease-auth-session';
  private role: 'instructor' | 'admin' | 'superadmin' | 'student' | '' = '';
  private email = '';
  searchTerm = '';
  selectedStatus: '' | AttendanceRecord['status'] = '';
  fromDate = '';
  toDate = '';

  records: AttendanceRecord[] = [];

  constructor(private readonly api: StudentApiService) {}

  ngOnInit(): void {
    this.resolveSession();
    void this.loadRecords();
  }

  get filteredRecords(): AttendanceRecord[] {
    const term = this.searchTerm.trim().toLowerCase();
    const from = this.fromDate ? new Date(this.fromDate) : null;
    const to = this.toDate ? new Date(this.toDate) : null;

    return this.records.filter((record) => {
      const matchesSearch = !term
        || record.student.toLowerCase().includes(term)
        || record.id.toLowerCase().includes(term);

      const matchesStatus = !this.selectedStatus || record.status === this.selectedStatus;

      const recordDate = new Date(record.date);
      const matchesFrom = !from || recordDate >= from;
      const matchesTo = !to || recordDate <= to;

      return matchesSearch && matchesStatus && matchesFrom && matchesTo;
    });
  }

  removeRecord(id: string, date: string): void {
    this.records = this.records.filter((record) => !(record.id === id && record.date === date));
  }

  exportCsv(): void {
    if (!this.filteredRecords.length) {
      return;
    }

    const headers = ['Student', 'ID', 'Section', 'Subject', 'Date', 'Time In', 'Status'];
    const rows = this.filteredRecords.map((record) => [
      record.student,
      record.id,
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
    link.setAttribute('download', `attendance-records-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private async loadRecords(): Promise<void> {
    try {
      const [attendance, students] = await Promise.all([
        this.api.getAttendanceRecords(),
        this.api.getInstructorStudents()
      ]);
      const studentByEmail = new Map(
        students.map((student) => [(student.email ?? '').trim().toLowerCase(), student])
      );

      const normalized = this.normalizeAttendance(attendance, studentByEmail);
      if (this.role !== 'instructor' || !this.email) {
        this.records = normalized;
        return;
      }

      const [account, classes] = await Promise.all([
        this.api.getAuthAccountByEmail('instructor', this.email),
        this.api.getInstructorClasses()
      ]);
      const allowedClassNames = new Set(
        classes
          .filter((item) => (account?.allowedClassIds ?? []).includes(item.id))
          .map((item) => item.name.trim().toLowerCase())
          .filter((item) => Boolean(item))
      );
      const allowedSubjects = new Set(
        (account?.allowedSubjects ?? [])
          .map((item) => item.trim().toLowerCase())
          .filter((item) => Boolean(item))
      );

      this.records = normalized.filter((record) => {
        const section = record.section.trim().toLowerCase();
        const subject = record.subject.trim().toLowerCase();
        const matchesClass = allowedClassNames.size > 0 && allowedClassNames.has(section);
        if (!matchesClass) return false;
        return allowedSubjects.size > 0 ? allowedSubjects.has(subject) : true;
      });
    } catch {
      this.records = [];
    }
  }

  private normalizeAttendance(
    attendance: ApiAttendanceRecord[],
    studentByEmail: Map<string, { studentId: string; fullName?: string; name?: string }>
  ): AttendanceRecord[] {
    return attendance.map((record) => {
      const emailKey = (record.studentEmail ?? '').trim().toLowerCase();
      const matchedStudent = studentByEmail.get(emailKey);
      return {
        student: (record.studentName ?? matchedStudent?.name ?? emailKey) || 'Unknown student',
        id: matchedStudent?.studentId ?? 'N/A',
        section: record.section ?? '',
        subject: record.subject ?? '',
        date: record.date ?? '',
        timeIn: record.timeIn ?? '--',
        status: record.status
      };
    });
  }

  private resolveSession(): void {
    const raw = localStorage.getItem(this.authSessionStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { role?: 'instructor' | 'admin' | 'superadmin' | 'student'; email?: string };
      this.role = parsed.role ?? '';
      this.email = (parsed.email ?? '').trim().toLowerCase();
    } catch {
      localStorage.removeItem(this.authSessionStorageKey);
    }
  }
}
