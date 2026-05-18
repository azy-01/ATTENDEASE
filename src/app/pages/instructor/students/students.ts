import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import Swal from 'sweetalert2';
import {
  StudentApiService,
  type InstructorClass,
  type InstructorStudent
} from '../../../core/data/student-api.service';
import { NotificationService } from '../../../core/data/notification.service';

interface StudentDisplayRow {
  student: InstructorStudent;
  section: string;
  subjects: string[];
}

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="toolbar">
        <input
          type="text"
          placeholder="Search students..."
          [value]="searchTerm"
          (input)="onSearchInput($event)"
        />
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Student ID</th>
              <th>Email</th>
              <th>Section</th>
              <th>Subject</th>
              <th>Status</th>
              <th *ngIf="isAdmin">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of filteredStudents">
              <td class="name-cell">{{ row.student.name }}</td>
              <td>{{ row.student.studentId }}</td>
              <td>{{ row.student.email }}</td>
              <td>{{ row.section }}</td>
              <td>{{ row.subjects.join(', ') }}</td>
              <td><span class="badge">active</span></td>
              <td *ngIf="isAdmin">
                <div class="actions">
                  <button type="button" class="action-btn" (click)="editStudent(row.student)" aria-label="Edit student">
                    ✎
                  </button>
                  <button type="button" class="archive-btn" (click)="archiveStudent(row.student)" aria-label="Archive student">
                    <svg class="archive-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path
                        fill="currentColor"
                        d="M20.54 5.23l-1.39-1.68A2 2 0 0 0 17.52 3H6.48c-.66 0-1.26.33-1.62.88L3.46 5.23A1 1 0 0 0 4 7h16a1 1 0 0 0 .54-1.77zM5.12 9l.81 9.12A2 2 0 0 0 7.92 20h8.16a2 2 0 0 0 1.99-1.88L18.88 9H5.12z"
                      />
                    </svg>
                    <span>Archive</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-backdrop" *ngIf="isAdmin && isEditModalOpen" (click)="closeEditModal()">
        <div class="modal-card" role="dialog" aria-modal="true" aria-label="Edit student" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>Edit Student</h3>
            <button type="button" class="icon-close" (click)="closeEditModal()" aria-label="Close edit modal">×</button>
          </div>

          <div class="modal-body">
            <label>
              <span>Name</span>
              <input type="text" [value]="editDraft.name" (input)="onEditFieldChange('name', $event)" />
            </label>
            <label>
              <span>Student ID</span>
              <input type="text" [value]="editDraft.studentId" (input)="onEditFieldChange('studentId', $event)" />
            </label>
            <label>
              <span>Email</span>
              <input type="email" [value]="editDraft.email" (input)="onEditFieldChange('email', $event)" />
            </label>
            <label>
              <span>Section</span>
              <input type="text" [value]="editDraft.section" (input)="onEditFieldChange('section', $event)" />
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-ghost" (click)="closeEditModal()">Cancel</button>
            <button type="button" class="btn-primary" (click)="saveEditedStudent()">Save Changes</button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 14px; }
    .toolbar, .table-wrap {
      background: #fff; border: 1px solid #edf0f5; border-radius: 12px;
    }
    .toolbar { display: flex; gap: 10px; padding: 12px; }
    .toolbar input { flex: 1; height: 38px; border-radius: 8px; border: 1px solid #e5e7eb; padding: 0 12px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 12px; border-bottom: 1px solid #f0f2f6; text-align: left; color: #4b5563; }
    .name-cell { font-weight: 700; }
    th { color: #6b7280; font-weight: 600; }
    .badge { background: #dcfce7; color: #166534; border-radius: 999px; padding: 2px 10px; font-size: 11px; font-weight: 600; }
    .actions { display: flex; align-items: center; gap: 8px; }
    .action-btn {
      width: 32px;
      height: 32px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #fff;
      color: #4f46e5;
      cursor: pointer;
      display: grid;
      place-items: center;
      line-height: 1;
      font-size: 14px;
      transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
    }
    .action-btn:hover {
      background: #eef2ff;
      border-color: #c7d2fe;
      box-shadow: 0 1px 4px rgba(79, 70, 229, 0.12);
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      display: grid;
      place-items: center;
      z-index: 1200;
      padding: 16px;
    }
    .modal-card {
      width: min(520px, 100%);
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      box-shadow: 0 20px 45px rgba(15, 23, 42, 0.2);
    }
    .modal-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      border-bottom: 1px solid #f0f2f6;
    }
    .modal-head h3 { margin: 0; font-size: 16px; color: #111827; }
    .icon-close {
      width: 30px;
      height: 30px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #fff;
      color: #6b7280;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
    }
    .modal-body {
      padding: 14px 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .modal-body label { display: flex; flex-direction: column; gap: 6px; }
    .modal-body label span { font-size: 12px; color: #6b7280; font-weight: 600; }
    .modal-body input {
      height: 38px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      background: #fff;
      color: #111827;
      padding: 0 10px;
      font-size: 13px;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 14px 16px;
      border-top: 1px solid #f0f2f6;
    }
    .btn-ghost,
    .btn-primary {
      height: 36px;
      border-radius: 8px;
      padding: 0 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-ghost {
      border: 1px solid #e5e7eb;
      background: #fff;
      color: #374151;
    }
    .btn-primary {
      border: none;
      background: #4f46e5;
      color: #fff;
    }
    :host-context(body.dark-mode) .toolbar,
    :host-context(body.dark-mode) .table-wrap {
      background: #111827;
      border-color: #1f2937;
    }
    :host-context(body.dark-mode) .toolbar input {
      background: #0f172a;
      border-color: #374151;
      color: #e5e7eb;
    }
    :host-context(body.dark-mode) th,
    :host-context(body.dark-mode) td {
      border-bottom-color: #1f2937;
      color: #cbd5e1;
    }
    :host-context(body.dark-mode) th { color: #94a3b8; }
    :host-context(body.dark-mode) .action-btn {
      background: #0f172a;
      border-color: #374151;
      color: #a5b4fc;
    }
    :host-context(body.dark-mode) .action-btn:hover {
      background: #1e1b4b;
      border-color: #4f46e5;
    }
    :host-context(body.dark-mode) .modal-card {
      background: #111827;
      border-color: #374151;
    }
    :host-context(body.dark-mode) .modal-head,
    :host-context(body.dark-mode) .modal-actions {
      border-color: #1f2937;
    }
    :host-context(body.dark-mode) .modal-head h3 { color: #e5e7eb; }
    :host-context(body.dark-mode) .icon-close,
    :host-context(body.dark-mode) .btn-ghost {
      background: #0f172a;
      border-color: #374151;
      color: #cbd5e1;
    }
    :host-context(body.dark-mode) .modal-body label span { color: #94a3b8; }
    :host-context(body.dark-mode) .modal-body input {
      background: #0f172a;
      border-color: #374151;
      color: #e5e7eb;
    }
  `],
})
export class StudentsComponent {
  private readonly authSessionStorageKey = 'attendease-auth-session';
  readonly students = signal<InstructorStudent[]>([]);
  readonly displayRows = signal<StudentDisplayRow[]>([]);
  isAdmin = false;
  private role: 'instructor' | 'admin' | 'superadmin' | 'student' | '' = '';
  private email = '';
  searchTerm = '';
  isEditModalOpen = false;
  editingStudentRecordId = '';
  editDraft: InstructorStudent = {
    id: '',
    name: '',
    studentId: '',
    email: '',
    section: '',
  };
  constructor(
    private readonly api: StudentApiService,
    private readonly notifications: NotificationService
  ) {
    this.resolveSession();
    void this.loadStudents();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
  }

  get filteredStudents(): StudentDisplayRow[] {
    const query = this.searchTerm.trim().toLowerCase();
    const list = this.displayRows();
    if (!query) {
      return list;
    }

    return list.filter((row) => {
      const subjectsLabel = row.subjects.join(' ').toLowerCase();
      return (
        row.student.name.toLowerCase().includes(query) ||
        row.student.studentId.toLowerCase().includes(query) ||
        row.student.email.toLowerCase().includes(query) ||
        row.section.toLowerCase().includes(query) ||
        subjectsLabel.includes(query)
      );
    });
  }

  editStudent(student: InstructorStudent): void {
    this.isEditModalOpen = true;
    this.editingStudentRecordId = student.id;
    this.editDraft = { ...student };
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editingStudentRecordId = '';
    this.editDraft = { id: '', name: '', studentId: '', email: '', section: '' };
  }

  onEditFieldChange(field: keyof InstructorStudent, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.editDraft = {
      ...this.editDraft,
      [field]: target.value,
    };
  }

  async saveEditedStudent(): Promise<void> {
    if (!this.editingStudentRecordId) {
      return;
    }

    const current = this.students().find((student) => student.id === this.editingStudentRecordId);
    if (!current) return;

    const updatedDraft = { ...this.editDraft, id: current.id };
    try {
      const updated = await this.api.updateInstructorStudent(current.id, updatedDraft);
      this.students.set(
        this.students().map((student) =>
          student.id !== this.editingStudentRecordId ? student : updated
        )
      );
      this.notifications.add('Student updated', `${updated.name}'s profile was updated.`, 'instructor');
    } catch {
      this.students.set(
        this.students().map((student) =>
          student.id !== this.editingStudentRecordId ? student : updatedDraft
        )
      );
      this.notifications.add('Student updated', `${updatedDraft.name}'s profile was updated.`, 'instructor');
    }

    await this.loadStudents();
    this.closeEditModal();
  }

  async archiveStudent(student: InstructorStudent): Promise<void> {
    const result = await Swal.fire({
      title: 'Archive student?',
      html: `<p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
        This will disable login for <strong>${this.escapeHtml(student.name)}</strong> (${this.escapeHtml(student.email)})
        and remove them from active class lists.</p>`,
      input: 'textarea',
      inputLabel: 'Reason for archiving',
      inputPlaceholder: 'Explain why this student is being archived...',
      inputAttributes: {
        'aria-label': 'Reason for archiving'
      },
      inputValidator: (value) => {
        if (!value?.trim()) {
          return 'A reason is required before archiving.';
        }
        return null;
      },
      icon: 'warning',
      customClass: { popup: 'swal-delete-popup' },
      showCancelButton: true,
      confirmButtonText: 'Archive student',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#b91c1c',
      reverseButtons: true
    });

    if (!result.isConfirmed || typeof result.value !== 'string') {
      return;
    }

    try {
      await this.api.archiveStudentAccount(
        student.email,
        result.value.trim(),
        this.getAdminEmail()
      );
      this.students.set(this.students().filter((row) => row.id !== student.id));
      this.displayRows.set(this.displayRows().filter((row) => row.student.id !== student.id));
      await Swal.fire({
        title: 'Student archived',
        html: `
          <p class="archive-result-lead"><strong>${this.escapeHtml(student.name)}</strong> has been archived.</p>
          <p class="archive-result-email">Removed from active lists. Restore from <strong>Archives</strong> if needed.</p>
        `,
        icon: 'success',
        confirmButtonText: 'Done',
        confirmButtonColor: '#16a34a',
        customClass: { popup: 'swal-archive-result-popup' }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to archive student.';
      await Swal.fire({
        title: 'Archive failed',
        text: message,
        icon: 'error',
        confirmButtonColor: '#4f46e5',
        customClass: { popup: 'swal-archive-result-popup' }
      });
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private getAdminEmail(): string {
    const rawSession = localStorage.getItem(this.authSessionStorageKey);
    if (!rawSession) {
      return 'admin';
    }
    try {
      const parsed = JSON.parse(rawSession) as { email?: string };
      return parsed.email?.trim().toLowerCase() || 'admin';
    } catch {
      return 'admin';
    }
  }

  private async loadStudents(): Promise<void> {
    try {
      const [allStudents, allClasses] = await Promise.all([
        this.api.getInstructorStudents(),
        this.api.getInstructorClasses(),
      ]);

      if (this.role !== 'instructor' || !this.email) {
        this.students.set(allStudents);
        this.displayRows.set(this.buildDisplayRows(allStudents, allClasses));
        return;
      }

      const account = await this.api.getAuthAccountByEmail('instructor', this.email);
      const scopedClasses = this.resolveScopedClasses(allClasses, account);
      const scopedStudentIds = new Set(
        scopedClasses.flatMap((classItem) => classItem.assignedStudentIds ?? [])
      );
      const scopedStudents = allStudents.filter((student) => scopedStudentIds.has(student.id));
      this.students.set(scopedStudents);
      this.displayRows.set(this.buildDisplayRows(scopedStudents, scopedClasses));
    } catch {
      this.students.set([]);
      this.displayRows.set([]);
    }
  }

  private resolveScopedClasses(
    classes: InstructorClass[],
    account: { allowedClassIds?: string[]; id?: string } | null
  ): InstructorClass[] {
    const allowedClassIds = account?.allowedClassIds ?? [];
    let scopedClasses = allowedClassIds.length
      ? classes.filter((classItem) => allowedClassIds.includes(classItem.id))
      : [];

    if (!scopedClasses.length && account?.id) {
      scopedClasses = classes.filter((classItem) =>
        (classItem.assignedInstructorIds ?? []).includes(account.id ?? '')
      );
    }

    return scopedClasses;
  }

  private buildDisplayRows(
    students: InstructorStudent[],
    classes: InstructorClass[]
  ): StudentDisplayRow[] {
    const studentById = new Map(students.map((student) => [student.id, student]));
    const rowMap = new Map<string, StudentDisplayRow>();

    for (const classItem of classes) {
      const section = (classItem.section ?? '').trim() || classItem.name.trim();
      const subjects = this.getSubjectsForClass(classItem);

      for (const studentId of classItem.assignedStudentIds ?? []) {
        const student = studentById.get(studentId);
        if (!student) {
          continue;
        }

        const rowKey = `${student.id}::${section.toLowerCase()}`;
        const existing = rowMap.get(rowKey);
        if (existing) {
          existing.subjects = [...new Set([...existing.subjects, ...subjects])].sort((a, b) =>
            a.localeCompare(b)
          );
          continue;
        }

        rowMap.set(rowKey, {
          student,
          section,
          subjects: [...subjects].sort((a, b) => a.localeCompare(b)),
        });
      }
    }

    return Array.from(rowMap.values()).sort((first, second) => {
      const byName = first.student.name.localeCompare(second.student.name, undefined, {
        sensitivity: 'base',
      });
      if (byName !== 0) {
        return byName;
      }
      return first.section.localeCompare(second.section, undefined, { sensitivity: 'base' });
    });
  }

  private getSubjectsForClass(classItem: InstructorClass): string[] {
    const normalizedSubjects = (classItem.assignedSubjects ?? [])
      .map((subject) => subject.trim())
      .filter((subject) => Boolean(subject));
    if (normalizedSubjects.length) {
      return [...new Set(normalizedSubjects)];
    }
    return [classItem.name?.trim() || 'Untitled Subject'];
  }

  private resolveSession(): void {
    const rawSession = localStorage.getItem(this.authSessionStorageKey);
    if (!rawSession) return;
    try {
      const parsed = JSON.parse(rawSession) as { role?: 'instructor' | 'admin' | 'superadmin' | 'student'; email?: string };
      this.role = parsed.role ?? '';
      this.email = (parsed.email ?? '').trim().toLowerCase();
      this.isAdmin = this.role === 'admin' || this.role === 'superadmin';
    } catch {
      localStorage.removeItem(this.authSessionStorageKey);
    }
  }
}
