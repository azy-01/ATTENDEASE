import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import Swal from 'sweetalert2';

interface StudentRow {
  name: string;
  studentId: string;
  email: string;
  section: string;
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
        <button type="button" (click)="openAddModal()">+ Add Student</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Student ID</th>
              <th>Email</th>
              <th>Section</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let student of filteredStudents">
              <td class="name-cell">{{ student.name }}</td>
              <td>{{ student.studentId }}</td>
              <td>{{ student.email }}</td>
              <td>{{ student.section }}</td>
              <td><span class="badge">active</span></td>
              <td>
                <div class="actions">
                  <button type="button" class="action-btn" (click)="editStudent(student)" aria-label="Edit student">
                    ✎
                  </button>
                  <button type="button" class="action-btn danger" (click)="deleteStudent(student)" aria-label="Delete student">
                    🗑
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-backdrop" *ngIf="isEditModalOpen" (click)="closeEditModal()">
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

      <div class="modal-backdrop" *ngIf="isAddModalOpen" (click)="closeAddModal()">
        <div class="modal-card" role="dialog" aria-modal="true" aria-label="Add student" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>Add Student</h3>
            <button type="button" class="icon-close" (click)="closeAddModal()" aria-label="Close add student modal">×</button>
          </div>

          <div class="modal-body">
            <label>
              <span>Name</span>
              <input type="text" [value]="addDraft.name" (input)="onAddFieldChange('name', $event)" />
            </label>
            <label>
              <span>Student ID</span>
              <input type="text" [value]="addDraft.studentId" (input)="onAddFieldChange('studentId', $event)" />
            </label>
            <label>
              <span>Email</span>
              <input type="email" [value]="addDraft.email" (input)="onAddFieldChange('email', $event)" />
            </label>
            <label>
              <span>Section</span>
              <input type="text" [value]="addDraft.section" (input)="onAddFieldChange('section', $event)" />
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-ghost" (click)="closeAddModal()">Cancel</button>
            <button type="button" class="btn-primary" (click)="saveNewStudent()">Add Student</button>
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
    .toolbar { display: flex; gap: 10px; padding: 12px; justify-content: space-between; }
    .toolbar input { flex: 1; height: 38px; border-radius: 8px; border: 1px solid #e5e7eb; padding: 0 12px; font-size: 13px; }
    .toolbar button {
      height: 38px; border: none; border-radius: 8px; padding: 0 14px;
      background: #4f46e5; color: #fff; font-weight: 600; cursor: pointer;
    }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 12px; border-bottom: 1px solid #f0f2f6; text-align: left; color: #4b5563; }
    .name-cell { font-weight: 700; }
    th { color: #6b7280; font-weight: 600; }
    .badge { background: #dcfce7; color: #166534; border-radius: 999px; padding: 2px 10px; font-size: 11px; font-weight: 600; }
    .actions { display: flex; gap: 8px; }
    .action-btn {
      width: 30px;
      height: 30px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #fff;
      color: #6b7280;
      cursor: pointer;
      display: grid;
      place-items: center;
      line-height: 1;
      font-size: 14px;
    }
    .action-btn:hover { background: #f9fafb; }
    .action-btn.danger { color: #dc2626; border-color: #fecaca; }
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
      color: #94a3b8;
    }
    :host-context(body.dark-mode) .action-btn:hover { background: #111827; }
    :host-context(body.dark-mode) .action-btn.danger { color: #fca5a5; border-color: #7f1d1d; }
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
  students: StudentRow[] = [
    { name: 'Glaiza Kaye Valcorza', studentId: '2024123456', email: 'asdfg@gmail.com', section: 'BSIT1B' },
    { name: 'Azryth Sacuan', studentId: '20241234567', email: 'abcdefg@gmail.com', section: 'BSIT1A' },
  ];
  searchTerm = '';
  isEditModalOpen = false;
  isAddModalOpen = false;
  editingStudentId = '';
  editDraft: StudentRow = {
    name: '',
    studentId: '',
    email: '',
    section: '',
  };
  addDraft: StudentRow = {
    name: '',
    studentId: '',
    email: '',
    section: '',
  };

  openAddModal(): void {
    this.isAddModalOpen = true;
    this.addDraft = { name: '', studentId: '', email: '', section: '' };
  }

  closeAddModal(): void {
    this.isAddModalOpen = false;
    this.addDraft = { name: '', studentId: '', email: '', section: '' };
  }

  onAddFieldChange(field: keyof StudentRow, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.addDraft = {
      ...this.addDraft,
      [field]: target.value,
    };
  }

  saveNewStudent(): void {
    const newStudent: StudentRow = {
      name: this.addDraft.name.trim(),
      studentId: this.addDraft.studentId.trim(),
      email: this.addDraft.email.trim(),
      section: this.addDraft.section.trim(),
    };

    if (!newStudent.name || !newStudent.studentId || !newStudent.email || !newStudent.section) {
      return;
    }

    const hasDuplicateId = this.students.some((student) => student.studentId === newStudent.studentId);
    if (hasDuplicateId) {
      return;
    }

    this.students = [...this.students, newStudent];
    this.closeAddModal();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
  }

  get filteredStudents(): StudentRow[] {
    const query = this.searchTerm.trim().toLowerCase();
    if (!query) {
      return this.students;
    }

    return this.students.filter((student) => {
      return (
        student.name.toLowerCase().includes(query) ||
        student.studentId.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        student.section.toLowerCase().includes(query)
      );
    });
  }

  editStudent(student: StudentRow): void {
    this.isEditModalOpen = true;
    this.editingStudentId = student.studentId;
    this.editDraft = { ...student };
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editingStudentId = '';
    this.editDraft = { name: '', studentId: '', email: '', section: '' };
  }

  onEditFieldChange(field: keyof StudentRow, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.editDraft = {
      ...this.editDraft,
      [field]: target.value,
    };
  }

  saveEditedStudent(): void {
    if (!this.editingStudentId) {
      return;
    }

    this.students = this.students.map((student) => {
      if (student.studentId !== this.editingStudentId) {
        return student;
      }

      return { ...this.editDraft };
    });

    this.closeEditModal();
  }

  async deleteStudent(student: StudentRow): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete student?',
      text: `This will remove ${student.name} from your class list.`,
      icon: 'warning',
      customClass: {
        popup: 'swal-delete-popup',
      },
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    this.students = this.students.filter((row) => row.studentId !== student.studentId);
  }
}
