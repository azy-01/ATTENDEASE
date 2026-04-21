import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import Swal from 'sweetalert2';

interface ClassCard {
  id: string;
  name: string;
  program: string;
  yearLevel: string;
  studentCount: number;
  status: 'active' | 'inactive';
}

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="top">
        <button type="button" (click)="openAddModal()">+ Add Class</button>
      </div>
      <div class="cards">
        <article class="class-card" *ngFor="let classItem of classes">
          <div class="head">
            <strong>{{ classItem.name }}</strong>
            <span>{{ classItem.status }}</span>
          </div>
          <p>{{ classItem.program }} • {{ classItem.yearLevel }}</p>
          <small>{{ classItem.studentCount }} students</small>
          <div class="actions">
            <button type="button" (click)="editClass(classItem)">Edit</button>
            <button type="button" class="danger" (click)="deleteClass(classItem)">Delete</button>
          </div>
        </article>
      </div>

      <div class="modal-backdrop" *ngIf="isModalOpen" (click)="closeModal()">
        <div class="modal-card" role="dialog" aria-modal="true" aria-label="Class form modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>{{ isEditMode ? 'Edit Class' : 'Add Class' }}</h3>
            <button type="button" class="icon-close" (click)="closeModal()" aria-label="Close class modal">×</button>
          </div>

          <div class="modal-body">
            <label>
              <span>Class Name</span>
              <input type="text" [value]="classDraft.name" (input)="onDraftFieldChange('name', $event)" placeholder="BSIT1A" />
            </label>
            <label>
              <span>Program</span>
              <input type="text" [value]="classDraft.program" (input)="onDraftFieldChange('program', $event)" placeholder="Information Technology" />
            </label>
            <label>
              <span>Year Level</span>
              <input type="text" [value]="classDraft.yearLevel" (input)="onDraftFieldChange('yearLevel', $event)" placeholder="1st Year" />
            </label>
            <label>
              <span>Status</span>
              <select [value]="classDraft.status" (change)="onStatusChange($event)">
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </label>
          </div>
          <p class="form-error" *ngIf="formError">{{ formError }}</p>

          <div class="modal-actions">
            <button type="button" class="btn-ghost" (click)="closeModal()">Cancel</button>
            <button type="button" class="btn-primary" (click)="saveClass()">
              {{ isEditMode ? 'Save Changes' : 'Add Class' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 16px; }
    .top { display: flex; justify-content: flex-end; }
    .top button {
      border: none; border-radius: 9px; padding: 10px 14px; background: #4f46e5;
      color: #fff; font-weight: 600; cursor: pointer;
    }
    .cards { min-height: 240px; }
    .class-card {
      width: 290px; background: #fff; border: 1px solid #edf0f5; border-radius: 14px; padding: 16px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    }
    .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .head span { font-size: 11px; color: #15803d; background: #dcfce7; border-radius: 999px; padding: 2px 10px; }
    p { margin: 0; font-size: 13px; color: #6b7280; }
    small { color: #9ca3af; display: inline-block; margin-top: 8px; }
    .actions { display: flex; gap: 8px; margin-top: 14px; }
    .actions button {
      flex: 1; height: 34px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; cursor: pointer;
    }
    .actions button.danger { color: #dc2626; border-color: #fecaca; }
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
    .modal-body input,
    .modal-body select {
      height: 38px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      background: #fff;
      color: #111827;
      padding: 0 10px;
      font-size: 13px;
    }
    .form-error {
      margin: 0;
      padding: 0 16px;
      color: #dc2626;
      font-size: 12px;
      font-weight: 600;
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
    :host-context(body.dark-mode) .class-card,
    .dark-mode .class-card {
      background: #111827;
      border-color: #1f2937;
      box-shadow: none;
    }
    :host-context(body.dark-mode) .head strong,
    .dark-mode .head strong { color: #e5e7eb; }
    :host-context(body.dark-mode) p,
    .dark-mode p { color: #94a3b8; }
    :host-context(body.dark-mode) small,
    .dark-mode small { color: #64748b; }
    :host-context(body.dark-mode) .actions button,
    .dark-mode .actions button {
      background: #0f172a;
      border-color: #374151;
      color: #cbd5e1;
    }
    :host-context(body.dark-mode) .modal-card,
    .dark-mode .modal-card {
      background: #111827;
      border-color: #374151;
    }
    :host-context(body.dark-mode) .modal-head,
    :host-context(body.dark-mode) .modal-actions,
    .dark-mode .modal-head,
    .dark-mode .modal-actions {
      border-color: #1f2937;
    }
    :host-context(body.dark-mode) .modal-head h3,
    .dark-mode .modal-head h3 { color: #e5e7eb; }
    :host-context(body.dark-mode) .icon-close,
    :host-context(body.dark-mode) .btn-ghost,
    .dark-mode .icon-close,
    .dark-mode .btn-ghost {
      background: #0f172a;
      border-color: #374151;
      color: #cbd5e1;
    }
    :host-context(body.dark-mode) .modal-body label span,
    .dark-mode .modal-body label span { color: #94a3b8; }
    :host-context(body.dark-mode) .modal-body input,
    :host-context(body.dark-mode) .modal-body select,
    .dark-mode .modal-body input,
    .dark-mode .modal-body select {
      background: #0f172a;
      border-color: #374151;
      color: #e5e7eb;
    }
    :host-context(body.dark-mode) .form-error,
    .dark-mode .form-error { color: #fca5a5; }
  `],
})
export class ClassesComponent {
  private readonly classesStorageKey = 'attendease-instructor-classes';
  classes: ClassCard[] = [
    {
      id: 'default-bsit2c',
      name: 'BSIT2C',
      program: 'Information Technology',
      yearLevel: '1st Year',
      studentCount: 0,
      status: 'active',
    },
  ];
  isModalOpen = false;
  isEditMode = false;
  editingClassId = '';
  formError = '';
  classDraft: ClassCard = {
    id: '',
    name: '',
    program: '',
    yearLevel: '',
    studentCount: 0,
    status: 'active',
  };

  constructor() {
    this.loadClasses();
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.isModalOpen = true;
    this.editingClassId = '';
    this.formError = '';
    this.classDraft = {
      id: '',
      name: '',
      program: '',
      yearLevel: '',
      studentCount: 0,
      status: 'active',
    };
  }

  editClass(classItem: ClassCard): void {
    this.isEditMode = true;
    this.isModalOpen = true;
    this.editingClassId = classItem.id;
    this.formError = '';
    this.classDraft = { ...classItem };
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingClassId = '';
    this.formError = '';
  }

  onDraftFieldChange(field: 'name' | 'program' | 'yearLevel', event: Event): void {
    const target = event.target as HTMLInputElement;
    this.classDraft = {
      ...this.classDraft,
      [field]: target.value,
    };
  }

  onStatusChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.classDraft = {
      ...this.classDraft,
      status: target.value === 'inactive' ? 'inactive' : 'active',
    };
  }

  saveClass(): void {
    const draft = {
      ...this.classDraft,
      name: this.classDraft.name.trim(),
      program: this.classDraft.program.trim(),
      yearLevel: this.classDraft.yearLevel.trim(),
    };
    if (!draft.name || !draft.program || !draft.yearLevel) {
      this.formError = 'Please fill out Class Name, Program, and Year Level.';
      return;
    }
    const duplicateName = this.classes.some((row) => {
      const isSameRecord = this.isEditMode && row.id === this.editingClassId;
      return !isSameRecord && row.name.toLowerCase() === draft.name.toLowerCase();
    });
    if (duplicateName) {
      this.formError = 'Class name already exists. Use a different class name.';
      return;
    }

    if (!this.isEditMode) {
      this.classes = [...this.classes, { ...draft, id: this.createClassId() }];
      this.persistClasses();
      this.closeModal();
      return;
    }

    this.classes = this.classes.map((row) => {
      if (row.id !== this.editingClassId) {
        return row;
      }
      return draft;
    });
    this.persistClasses();
    this.closeModal();
  }

  async deleteClass(classItem: ClassCard): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete class?',
      text: `This will permanently remove ${classItem.name}.`,
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

    this.classes = this.classes.filter((row) => row !== classItem);
    this.persistClasses();
  }

  private createClassId(): string {
    return `class-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private persistClasses(): void {
    localStorage.setItem(this.classesStorageKey, JSON.stringify(this.classes));
  }

  private loadClasses(): void {
    const savedClasses = localStorage.getItem(this.classesStorageKey);
    if (!savedClasses) {
      return;
    }

    try {
      const parsed = JSON.parse(savedClasses) as ClassCard[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        this.classes = parsed;
      }
    } catch {
      // Ignore corrupted local data and keep defaults.
    }
  }
}
