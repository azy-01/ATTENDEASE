import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import Swal from 'sweetalert2';
import {
  StudentApiService,
  type AuthAccount,
  type InstructorClass,
  type InstructorStudent
} from '../../../core/data/student-api.service';

@Component({
  selector: 'app-archived-instructor-accounts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <section class="card">
        <h3>Archives</h3>
        <p class="section-sub">Archived instructor accounts, students, and classes. Admins can restore items to active use.</p>
      </section>

      <section class="card">
        <h4>Students</h4>
        <p class="empty" *ngIf="!archivedStudents().length">No archived students.</p>
        <div class="table-wrap" *ngIf="archivedStudents().length">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Student ID</th>
                <th>Email</th>
                <th>Archived</th>
                <th>Archived By</th>
                <th>Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let student of archivedStudents()">
                <td>{{ student.name }}</td>
                <td>{{ student.studentId }}</td>
                <td>{{ student.email }}</td>
                <td>{{ formatDate(student.archivedAt) }}</td>
                <td>{{ student.archivedBy || '—' }}</td>
                <td class="reason-cell">{{ student.archiveReason || '—' }}</td>
                <td>
                  <button type="button" class="restore-btn" (click)="unarchiveStudent(student)">
                    Unarchive
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <h4>Instructor Accounts</h4>
        <p class="empty" *ngIf="!archivedAccounts().length">No archived instructor accounts.</p>
        <div class="table-wrap" *ngIf="archivedAccounts().length">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Archived</th>
                <th>Archived By</th>
                <th>Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let account of archivedAccounts()">
                <td>{{ account.fullName }}</td>
                <td>{{ account.email }}</td>
                <td>{{ formatDate(account.archivedAt) }}</td>
                <td>{{ account.archivedBy || '—' }}</td>
                <td class="reason-cell">{{ account.archiveReason || '—' }}</td>
                <td>
                  <button type="button" class="restore-btn" (click)="unarchiveAccount(account)">
                    Unarchive
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <h4>Classes</h4>
        <p class="empty" *ngIf="!archivedClasses().length">No archived classes.</p>
        <div class="table-wrap" *ngIf="archivedClasses().length">
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th>Program</th>
                <th>Archived</th>
                <th>Archived By</th>
                <th>Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let classItem of archivedClasses()">
                <td>{{ classItem.name }}</td>
                <td>{{ classItem.program }} • {{ classItem.yearLevel }}</td>
                <td>{{ formatDate(classItem.archivedAt) }}</td>
                <td>{{ classItem.archivedBy || '—' }}</td>
                <td class="reason-cell">{{ classItem.archiveReason || '—' }}</td>
                <td>
                  <button type="button" class="restore-btn" (click)="unarchiveClass(classItem)">
                    Unarchive
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 14px; }
    .card { background: #fff; border: 1px solid #edf0f5; border-radius: 12px; padding: 18px; }
    h3 { margin: 0 0 8px; font-size: 20px; }
    h4 { margin: 0 0 8px; font-size: 16px; }
    .section-sub { margin: 0; color: #6b7280; font-size: 13px; }
    .empty { margin: 0 0 10px; color: #6b7280; font-size: 13px; }
    .table-wrap { border: 1px solid #edf0f5; border-radius: 10px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 11px 12px; border-bottom: 1px solid #f0f2f6; text-align: left; vertical-align: top; }
    th { color: #6b7280; font-weight: 700; background: #f8fafc; }
    td { color: #374151; }
    .reason-cell { max-width: 280px; white-space: pre-wrap; word-break: break-word; }
    .restore-btn {
      border: none;
      border-radius: 8px;
      height: 32px;
      padding: 0 12px;
      background: #16a34a;
      color: #fff;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      white-space: nowrap;
    }
    .restore-btn:hover { background: #15803d; }
    :host-context(body.dark-mode) .card { background: #111827; border-color: #1f2937; }
    :host-context(body.dark-mode) h3,
    :host-context(body.dark-mode) h4 { color: #e5e7eb; }
    :host-context(body.dark-mode) .section-sub,
    :host-context(body.dark-mode) .empty { color: #94a3b8; }
    :host-context(body.dark-mode) .table-wrap { border-color: #374151; }
    :host-context(body.dark-mode) th {
      color: #94a3b8;
      background: #0f172a;
      border-bottom-color: #374151;
    }
    :host-context(body.dark-mode) td {
      color: #cbd5e1;
      border-bottom-color: #1f2937;
    }
    :host-context(body.dark-mode) .restore-btn {
      background: #15803d;
    }
    :host-context(body.dark-mode) .restore-btn:hover {
      background: #166534;
    }
  `],
})
export class ArchivedInstructorAccountsComponent {
  readonly archivedStudents = signal<InstructorStudent[]>([]);
  readonly archivedAccounts = signal<AuthAccount[]>([]);
  readonly archivedClasses = signal<InstructorClass[]>([]);

  constructor(private readonly api: StudentApiService) {
    void this.loadArchives();
  }

  formatDate(value?: string): string {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  }

  async unarchiveAccount(account: AuthAccount): Promise<void> {
    const result = await Swal.fire({
      title: 'Unarchive instructor account?',
      html: `<p style="margin:0;color:#6b7280;font-size:13px;">
        <strong>${this.escapeHtml(account.fullName)}</strong> (${this.escapeHtml(account.email)})
        will be able to sign in again. Re-assign classes from Instructor Accounts if needed.</p>`,
      icon: 'question',
      customClass: { popup: 'swal-delete-popup' },
      showCancelButton: true,
      confirmButtonText: 'Unarchive',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#16a34a',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const restored = await this.api.unarchiveInstructorAccount(account.id);
      if (!restored) {
        await this.showError('Unable to unarchive this account.');
        return;
      }

      this.archivedAccounts.set(this.archivedAccounts().filter((item) => item.id !== account.id));
      await Swal.fire({
        title: 'Account restored',
        html: `
          <p class="archive-result-lead"><strong>${this.escapeHtml(account.fullName)}</strong> is active again.</p>
          <p class="archive-result-email">They can sign in with <strong>${this.escapeHtml(account.email)}</strong></p>
        `,
        icon: 'success',
        confirmButtonText: 'Done',
        confirmButtonColor: '#16a34a',
        customClass: { popup: 'swal-archive-result-popup' }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to unarchive account.';
      await this.showError(message);
    }
  }

  async unarchiveStudent(student: InstructorStudent): Promise<void> {
    const result = await Swal.fire({
      title: 'Unarchive student?',
      html: `<p style="margin:0;color:#6b7280;font-size:13px;">
        <strong>${this.escapeHtml(student.name)}</strong> (${this.escapeHtml(student.email)})
        will appear on the Students page again and can sign in if they have an account.</p>`,
      icon: 'question',
      customClass: { popup: 'swal-delete-popup' },
      showCancelButton: true,
      confirmButtonText: 'Unarchive',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#16a34a',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await this.api.unarchiveStudentAccount(student.email);
      this.archivedStudents.set(this.archivedStudents().filter((item) => item.id !== student.id));
      await Swal.fire({
        title: 'Student restored',
        html: `
          <p class="archive-result-lead"><strong>${this.escapeHtml(student.name)}</strong> is active again.</p>
          <p class="archive-result-email">Re-assign them to classes from the Classes page if needed.</p>
        `,
        icon: 'success',
        confirmButtonText: 'Done',
        confirmButtonColor: '#16a34a',
        customClass: { popup: 'swal-archive-result-popup' }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to unarchive student.';
      await this.showError(message);
    }
  }

  async unarchiveClass(classItem: InstructorClass): Promise<void> {
    const result = await Swal.fire({
      title: 'Unarchive class?',
      html: `<p style="margin:0;color:#6b7280;font-size:13px;">
        <strong>${this.escapeHtml(classItem.name)}</strong> will appear on the Classes page again.
        Re-assign instructors from the class editor if needed.</p>`,
      icon: 'question',
      customClass: { popup: 'swal-delete-popup' },
      showCancelButton: true,
      confirmButtonText: 'Unarchive',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#16a34a',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const restored = await this.api.unarchiveInstructorClass(classItem.id);
      if (!restored) {
        await this.showError('Unable to unarchive this class.');
        return;
      }

      this.archivedClasses.set(this.archivedClasses().filter((item) => item.id !== classItem.id));
      await Swal.fire({
        title: 'Class restored',
        html: `
          <p class="archive-result-lead"><strong>${this.escapeHtml(classItem.name)}</strong> is active again.</p>
          <p class="archive-result-email">Find it on the Classes page to assign instructors and students.</p>
        `,
        icon: 'success',
        confirmButtonText: 'Done',
        confirmButtonColor: '#16a34a',
        customClass: { popup: 'swal-archive-result-popup' }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to unarchive class.';
      await this.showError(message);
    }
  }

  private async showError(message: string): Promise<void> {
    await Swal.fire({
      title: 'Unarchive failed',
      text: message,
      icon: 'error',
      confirmButtonColor: '#4f46e5',
      customClass: { popup: 'swal-archive-result-popup' }
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private async loadArchives(): Promise<void> {
    try {
      const [students, accounts, classes] = await Promise.all([
        this.api.getArchivedStudents(),
        this.api.getArchivedInstructorAccounts(),
        this.api.getArchivedInstructorClasses()
      ]);
      this.archivedStudents.set(students);
      this.archivedAccounts.set(accounts);
      this.archivedClasses.set(classes);
    } catch {
      this.archivedStudents.set([]);
      this.archivedAccounts.set([]);
      this.archivedClasses.set([]);
    }
  }
}
