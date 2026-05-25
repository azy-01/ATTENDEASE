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
  sections: string[];
  subjects: string[];
}

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './students.html',
  styleUrls: ['./students.scss'],
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
  isSubjectsModalOpen = false;
  subjectsModalRow: StudentDisplayRow | null = null;
  subjectsModalSubjects: string[] = [];
  editingStudentRecordId = '';
  readonly editErrorMessage = signal('');
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

  get totalEnrollments(): number {
    return this.displayRows().reduce((sum, row) => sum + row.sections.length, 0);
  }

  getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  trackByRow(_index: number, row: StudentDisplayRow): string {
    return row.student.id;
  }

  get filteredStudents(): StudentDisplayRow[] {
    const query = this.searchTerm.trim().toLowerCase();
    const list = this.displayRows();
    if (!query) {
      return list;
    }

    return list.filter((row) => {
      const subjectsLabel = row.subjects.join(' ').toLowerCase();
      const sectionsLabel = row.sections.join(' ').toLowerCase();
      return (
        row.student.name.toLowerCase().includes(query) ||
        row.student.studentId.toLowerCase().includes(query) ||
        row.student.email.toLowerCase().includes(query) ||
        sectionsLabel.includes(query) ||
        subjectsLabel.includes(query)
      );
    });
  }

  getEnrolledSubjects(row: StudentDisplayRow): string[] {
    return row.subjects;
  }

  openEnrolledSubjects(row: StudentDisplayRow): void {
    this.subjectsModalRow = row;
    this.subjectsModalSubjects = this.getEnrolledSubjects(row);
    this.isSubjectsModalOpen = true;
  }

  closeSubjectsModal(): void {
    this.isSubjectsModalOpen = false;
    this.subjectsModalRow = null;
    this.subjectsModalSubjects = [];
  }

  editStudent(student: InstructorStudent): void {
    this.isEditModalOpen = true;
    this.editingStudentRecordId = student.id;
    this.editErrorMessage.set('');
    this.editDraft = { ...student };
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editingStudentRecordId = '';
    this.editErrorMessage.set('');
    this.editDraft = { id: '', name: '', studentId: '', email: '', section: '' };
  }

  onEditFieldChange(field: keyof InstructorStudent, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.editErrorMessage.set('');
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

    this.editErrorMessage.set('');
    const updatedDraft = { ...this.editDraft, id: current.id };
    try {
      const updated = await this.api.updateInstructorStudent(current.id, updatedDraft);
      this.students.set(
        this.students().map((student) =>
          student.id !== this.editingStudentRecordId ? student : updated
        )
      );
      this.notifications.add('Student updated', `${updated.name}'s profile was updated.`, 'instructor');
      await this.loadStudents();
      this.closeEditModal();
    } catch (error) {
      this.editErrorMessage.set(
        error instanceof Error ? error.message : 'Unable to update student.'
      );
    }
  }

  async archiveStudent(student: InstructorStudent): Promise<void> {
    const result = await Swal.fire({
      title: 'Archive student?',
      html: `
        <div class="swal-archive-intro">
          <p class="swal-archive-lead">
            You are about to archive <strong>${this.escapeHtml(student.name)}</strong>.
          </p>
          <p class="swal-archive-detail">
            Login will be disabled and the student will be removed from active class lists.
            The reason below will be emailed to their Gmail.
          </p>
          <p class="swal-archive-email">${this.escapeHtml(student.email)}</p>
        </div>
      `,
      input: 'textarea',
      inputLabel: 'Reason for archiving',
      inputPlaceholder: 'Explain why this student is being archived...',
      inputAttributes: {
        'aria-label': 'Reason for archiving',
        rows: '4'
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
      confirmButtonText: 'Archive & notify',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#b91c1c',
      reverseButtons: true
    });

    if (!result.isConfirmed || typeof result.value !== 'string') {
      return;
    }

    const reason = result.value.trim();

    try {
      const emailResult = await this.api.archiveStudentAccount(
        student.email,
        reason,
        this.getAdminEmail(),
        student.name
      );
      this.students.set(this.students().filter((row) => row.id !== student.id));
      this.displayRows.set(this.displayRows().filter((row) => row.student.id !== student.id));

      if (emailResult.sent) {
        await Swal.fire({
          title: 'Student archived',
          html: `
            <p class="archive-result-lead"><strong>${this.escapeHtml(student.name)}</strong> has been archived.</p>
            <p class="archive-result-email">Notification sent to<br><strong>${this.escapeHtml(student.email)}</strong></p>
          `,
          icon: 'success',
          confirmButtonText: 'Done',
          confirmButtonColor: '#16a34a',
          customClass: { popup: 'swal-archive-result-popup' }
        });
        return;
      }

      await Swal.fire({
        title: 'Student archived',
        html: `
          <p class="archive-result-lead"><strong>${this.escapeHtml(student.name)}</strong> has been archived.</p>
          <p class="archive-result-warning">Email could not be sent:<br>${this.escapeHtml(emailResult.message)}</p>
        `,
        icon: 'warning',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d97706',
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

    for (const student of students) {
      const studentSections = student.section?.trim() ? [student.section.trim()] : [];
      rowMap.set(student.id, {
        student,
        sections: studentSections,
        subjects: [],
      });
    }

    for (const classItem of classes) {
      const subjects = this.getSubjectsForClass(classItem);

      for (const studentId of classItem.assignedStudentIds ?? []) {
        const student = studentById.get(studentId);
        if (!student) {
          continue;
        }

        const existing = rowMap.get(student.id);
        if (!existing) {
          continue;
        }

        existing.subjects = [...new Set([...existing.subjects, ...subjects])].sort((a, b) =>
          a.localeCompare(b)
        );
      }
    }

    return Array.from(rowMap.values())
      .map((row) => ({
        ...row,
        sections: [...row.sections].sort((first, second) =>
          first.localeCompare(second, undefined, { sensitivity: 'base' })
        ),
      }))
      .sort((first, second) =>
        first.student.name.localeCompare(second.student.name, undefined, { sensitivity: 'base' })
      );
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
