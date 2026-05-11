import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import Swal from 'sweetalert2';
import { StudentApiService, type AuthAccount, type InstructorClass, type InstructorStudent } from '../../../core/data/student-api.service';
import { NotificationService } from '../../../core/data/notification.service';

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="top">
        <button type="button" *ngIf="isAdmin" (click)="openAddModal()">+ Add Class</button>
      </div>
      <div class="cards">
        <article class="class-card" *ngFor="let classItem of classes()">
          <div class="head">
            <strong>{{ classItem.name }}</strong>
            <span>{{ classItem.status }}</span>
          </div>
          <p>{{ classItem.program }} • {{ classItem.yearLevel }}</p>
          <p class="class-schedule">{{ classItem.day || 'No day set' }} • {{ classItem.time || 'No time set' }}</p>
          <p class="class-extra">{{ classItem.classMode || 'No class mode set' }} • Room: {{ classItem.room || 'N/A' }}</p>
          <small>{{ classItem.studentCount }} students</small>
          <div class="student-list">
            <strong>Assigned Instructors</strong>
            <ul *ngIf="getAssignedInstructors(classItem).length; else noAssignedInstructors">
              <li *ngFor="let instructor of getAssignedInstructors(classItem)">{{ instructor.fullName }}</li>
            </ul>
            <ng-template #noAssignedInstructors>
              <p class="empty-students">No instructors assigned yet.</p>
            </ng-template>
          </div>
          <div class="student-list">
            <strong>Assigned Subjects</strong>
            <ul *ngIf="(classItem.assignedSubjects ?? []).length; else noAssignedSubjects">
              <li *ngFor="let subject of classItem.assignedSubjects">{{ subject }}</li>
            </ul>
            <ng-template #noAssignedSubjects>
              <p class="empty-students">No subjects assigned yet.</p>
            </ng-template>
          </div>
          <div class="actions">
            <button type="button" class="btn-secondary" (click)="openStudentsView(classItem)">View</button>
            <button type="button" *ngIf="isAdmin" (click)="editClass(classItem)">Edit</button>
            <button type="button" *ngIf="isAdmin" class="danger" (click)="deleteClass(classItem)">Delete</button>
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
            <label>
              <span>Class Day</span>
              <select [value]="classDraft.day || ''" (change)="onDayChange($event)">
                <option value="">Select day</option>
                <option *ngFor="let day of weekdays" [value]="day">{{ day }}</option>
              </select>
            </label>
            <label>
              <span>Class Time</span>
              <div class="time-range">
                <input type="time" [value]="startTimeValue" (input)="onStartTimeChange($event)" />
                <span class="time-separator">-</span>
                <input type="time" [value]="endTimeValue" (input)="onEndTimeChange($event)" />
              </div>
            </label>
            <label>
              <span>Class Mode</span>
              <select [value]="classDraft.classMode || ''" (change)="onClassModeChange($event)">
                <option value="">Select class mode</option>
                <option value="Face-to-face Class">Face-to-face Class</option>
                <option value="Online Class">Online Class</option>
              </select>
            </label>
            <label>
              <span>Room</span>
              <input type="text" [value]="classDraft.room || ''" (input)="onDraftFieldChange('room', $event)" placeholder="Room 201 / Google Meet" />
            </label>
            <div class="student-picker" *ngIf="isAdmin">
              <span>Assign Instructors</span>
              <div class="picker-list" *ngIf="instructors().length; else noInstructors">
                <label class="student-option" *ngFor="let instructor of instructors()">
                  <input
                    type="checkbox"
                    [checked]="isInstructorAssigned(instructor.id)"
                    (change)="toggleInstructorAssignment(instructor.id, $event)"
                  />
                  <span>{{ instructor.fullName }} ({{ instructor.email }})</span>
                </label>
              </div>
              <ng-template #noInstructors>
                <p class="empty-students">No instructors available.</p>
              </ng-template>
            </div>
            <div class="student-picker" *ngIf="isAdmin">
              <span>Assign Subjects</span>
              <label>
                <span>Assign Subject</span>
                <input
                  type="text"
                  [value]="assignedSubjectsInput"
                  (input)="onSubjectInputChange($event)"
                  placeholder="Programming, Database Management"
                />
              </label>
            </div>
            <div class="student-picker">
              <span>Assign Students</span>
              <label>
                <span>Section</span>
                <input
                  type="text"
                  [value]="selectedSection"
                  (input)="onSectionChange($event)"
                  placeholder="Type section to auto-filter students"
                />
              </label>
              <label class="student-option select-all-toggle" *ngIf="filteredStudents().length">
                <input
                  type="checkbox"
                  [checked]="areAllVisibleStudentsAssigned()"
                  [indeterminate]="isSomeVisibleStudentAssigned() && !areAllVisibleStudentsAssigned()"
                  (change)="toggleAllVisibleStudents($event)"
                />
                <span>Select All</span>
              </label>
              <div class="picker-list" *ngIf="students().length; else noStudents">
                <label class="student-option" *ngFor="let student of filteredStudents()">
                  <input
                    type="checkbox"
                    [checked]="isStudentAssigned(student.id)"
                    (change)="toggleStudentAssignment(student.id, $event)"
                  />
                  <span>{{ student.name }} ({{ student.studentId }})</span>
                </label>
              </div>
              <ng-template #noStudents>
                <p class="empty-students">No students available. Add students first.</p>
              </ng-template>
              <p class="empty-students" *ngIf="students().length && selectedSection && !filteredStudents().length">
                No students found in this section.
              </p>
            </div>
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

      <div class="modal-backdrop" *ngIf="isStudentsViewOpen" (click)="closeStudentsView()">
        <div class="modal-card" role="dialog" aria-modal="true" aria-label="Assigned students" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>Assigned Students - {{ viewingClassName }}</h3>
            <button type="button" class="icon-close" (click)="closeStudentsView()" aria-label="Close students view modal">×</button>
          </div>
          <div class="modal-body view-students-body">
            <ul *ngIf="viewingStudents.length; else noViewStudents">
              <li *ngFor="let student of viewingStudents">{{ student.name }} ({{ student.studentId || 'No Student ID' }}) - {{ student.section || 'No section' }}</li>
            </ul>
            <ng-template #noViewStudents>
              <p class="empty-students">No students assigned yet.</p>
            </ng-template>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-primary" (click)="closeStudentsView()">Close</button>
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
    .cards {
      min-height: 240px;
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      align-content: flex-start;
    }
    .class-card {
      width: 290px; background: #fff; border: 1px solid #edf0f5; border-radius: 14px; padding: 16px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    }
    .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .head span { font-size: 11px; color: #15803d; background: #dcfce7; border-radius: 999px; padding: 2px 10px; }
    p { margin: 0; font-size: 13px; color: #6b7280; }
    .class-schedule { margin-top: 6px; font-weight: 600; color: #374151; }
    .class-extra { margin-top: 4px; font-size: 12px; color: #6b7280; }
    small { color: #9ca3af; display: inline-block; margin-top: 8px; }
    .actions { display: flex; gap: 8px; margin-top: 14px; }
    .actions button {
      flex: 1; height: 34px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; cursor: pointer;
    }
    .actions button.btn-secondary { color: #374151; }
    .actions button.danger { color: #dc2626; border-color: #fecaca; }
    .student-list {
      margin-top: 12px;
      border-top: 1px solid #f0f2f6;
      padding-top: 10px;
    }
    .student-list strong {
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      color: #374151;
    }
    .student-list ul {
      margin: 0;
      padding-left: 16px;
      max-height: 96px;
      overflow: auto;
    }
    .student-list li {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 2px;
    }
    .empty-students { margin: 0; font-size: 12px; color: #9ca3af; }
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
      width: min(640px, 100%);
      max-height: calc(100vh - 32px);
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      box-shadow: 0 20px 45px rgba(15, 23, 42, 0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
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
      overflow-y: auto;
      overflow-x: hidden;
      min-width: 0;
    }
    .modal-body label { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
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
    .time-range {
      display: grid;
      grid-template-columns: 1fr 22px 1fr;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .time-range input,
    .time-range select { min-width: 0; }
    .time-separator {
      text-align: center;
      color: #6b7280;
      font-weight: 600;
    }
    .student-picker {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .student-picker > span { font-size: 12px; color: #6b7280; font-weight: 600; }
    .picker-list {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 8px 10px;
      max-height: 160px;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }
    .student-option {
      display: flex !important;
      flex-direction: row !important;
      align-items: flex-start;
      gap: 8px !important;
      margin: 0;
      font-weight: 500;
      color: #374151;
      min-width: 0;
    }
    .student-option span {
      min-width: 0;
      overflow-wrap: anywhere;
      word-break: break-word;
      line-height: 1.2;
    }
    .student-option input {
      width: 15px;
      height: 15px;
      margin: 0;
      padding: 0;
    }
    .select-all-toggle {
      align-items: center;
      font-weight: 600;
      margin-top: 2px;
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
      flex-wrap: wrap;
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
    .view-students-body {
      display: block;
    }
    .view-students-body ul {
      margin: 0;
      padding-left: 18px;
      max-height: 320px;
      overflow: auto;
    }
    .view-students-body li {
      font-size: 13px;
      color: #374151;
      margin-bottom: 6px;
    }
    @media (max-width: 680px) {
      .modal-body { grid-template-columns: 1fr; }
      .time-range { grid-template-columns: 1fr 14px 1fr; gap: 6px; }
      .modal-actions { justify-content: stretch; }
      .btn-ghost, .btn-primary { flex: 1; }
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
    :host-context(body.dark-mode) .student-list strong,
    .dark-mode .student-list strong { color: #cbd5e1; }
    :host-context(body.dark-mode) .student-list,
    .dark-mode .student-list { border-color: #1f2937; }
    :host-context(body.dark-mode) .class-extra,
    .dark-mode .class-extra { color: #94a3b8; }
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
    :host-context(body.dark-mode) .picker-list,
    .dark-mode .picker-list {
      background: #0f172a;
      border-color: #374151;
    }
    :host-context(body.dark-mode) .student-option,
    .dark-mode .student-option { color: #cbd5e1; }
    :host-context(body.dark-mode) .empty-students,
    .dark-mode .empty-students { color: #94a3b8; }
    :host-context(body.dark-mode) .form-error,
    .dark-mode .form-error { color: #fca5a5; }
    :host-context(body.dark-mode) .view-students-body li,
    .dark-mode .view-students-body li { color: #cbd5e1; }
  `],
})
export class ClassesComponent {
  private readonly authSessionStorageKey = 'attendease-auth-session';
  readonly classes = signal<InstructorClass[]>([]);
  readonly weekdays: string[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  readonly students = signal<InstructorStudent[]>([]);
  readonly instructors = signal<AuthAccount[]>([]);
  isAdmin = false;
  private role: 'instructor' | 'admin' | 'superadmin' | 'student' | '' = '';
  private sessionEmail = '';
  isModalOpen = false;
  isEditMode = false;
  editingClassId = '';
  formError = '';
  selectedSection = '';
  isStudentsViewOpen = false;
  viewingClassName = '';
  viewingStudents: InstructorStudent[] = [];
  startTimeValue = '08:00';
  endTimeValue = '09:00';
  classDraft: InstructorClass = {
    id: '',
    name: '',
    program: '',
    yearLevel: '',
    section: '',
    day: '',
    time: '',
    room: '',
    classMode: undefined,
    studentCount: 0,
    assignedStudentIds: [],
    assignedInstructorIds: [],
    assignedSubjects: [],
    status: 'active',
  };

  constructor(
    private readonly api: StudentApiService,
    private readonly notifications: NotificationService
  ) {
    this.resolveSessionRole();
    void this.loadClasses();
    void this.loadStudents();
    void this.loadInstructors();
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
      section: '',
      day: '',
      time: '',
      room: '',
      classMode: undefined,
      studentCount: 0,
      assignedStudentIds: [],
      assignedInstructorIds: [],
      assignedSubjects: [],
      status: 'active',
    };
    this.selectedSection = '';
    this.startTimeValue = '08:00';
    this.endTimeValue = '09:00';
  }

  editClass(classItem: InstructorClass): void {
    this.isEditMode = true;
    this.isModalOpen = true;
    this.editingClassId = classItem.id;
    this.formError = '';
    this.classDraft = {
      ...classItem,
      assignedStudentIds: [...(classItem.assignedStudentIds ?? [])],
      assignedInstructorIds: [...(classItem.assignedInstructorIds ?? [])],
      assignedSubjects: [...(classItem.assignedSubjects ?? [])],
    };
    this.selectedSection = classItem.section ?? '';
    this.applyTimeDraftFromClassTime(classItem.time ?? '');
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingClassId = '';
    this.formError = '';
  }

  onDraftFieldChange(field: 'name' | 'program' | 'yearLevel' | 'room', event: Event): void {
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

  onDayChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.classDraft = {
      ...this.classDraft,
      day: target.value.trim(),
    };
  }

  onClassModeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const classMode = target.value.trim();
    this.classDraft = {
      ...this.classDraft,
      classMode: classMode === 'Face-to-face Class' || classMode === 'Online Class' ? classMode : undefined,
    };
  }

  onStartTimeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.startTimeValue = target.value;
  }

  onEndTimeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.endTimeValue = target.value;
  }

  onSectionChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const section = target.value.trim();
    this.selectedSection = section;
    this.classDraft = {
      ...this.classDraft,
      section,
    };
  }

  onSubjectInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const assignedSubjects = target.value
      .split(',')
      .map((subject) => subject.trim())
      .filter((subject) => Boolean(subject));
    this.classDraft = {
      ...this.classDraft,
      assignedSubjects: [...new Set(assignedSubjects)],
    };
  }

  get assignedSubjectsInput(): string {
    return (this.classDraft.assignedSubjects ?? []).join(', ');
  }

  async saveClass(): Promise<void> {
    const assignedStudentIds = [...(this.classDraft.assignedStudentIds ?? [])];
    const assignedInstructorIds = [...(this.classDraft.assignedInstructorIds ?? [])];
    const assignedSubjects = [...(this.classDraft.assignedSubjects ?? [])];
    const draft = {
      ...this.classDraft,
      name: this.classDraft.name.trim(),
      program: this.classDraft.program.trim(),
      yearLevel: this.classDraft.yearLevel.trim(),
      section: (this.classDraft.section ?? '').trim(),
      day: (this.classDraft.day ?? '').trim(),
      time: this.buildClassTimeRange(),
      room: (this.classDraft.room ?? '').trim(),
      classMode: this.classDraft.classMode,
      assignedStudentIds,
      assignedInstructorIds,
      assignedSubjects,
      studentCount: assignedStudentIds.length,
    };
    if (!draft.name || !draft.program || !draft.yearLevel || !draft.day || !draft.time) {
      this.formError = 'Please fill out Class Name, Program, Year Level, Day, and Time.';
      return;
    }
    const duplicateName = this.classes().some((row) => {
      const isSameRecord = this.isEditMode && row.id === this.editingClassId;
      return !isSameRecord && row.name.toLowerCase() === draft.name.toLowerCase();
    });
    if (duplicateName) {
      this.formError = 'Class name already exists. Use a different class name.';
      return;
    }

    if (!this.isEditMode) {
      const newClass = { ...draft, id: this.createClassId() };
      try {
        const created = await this.api.addInstructorClass(newClass);
        this.classes.set([...this.classes(), created]);
        this.notifications.add('Class created', `${created.name} was created successfully.`);
        await this.syncInstructorAllowedClasses();
      } catch {
        this.classes.set([...this.classes(), newClass]);
        this.notifications.add('Class created', `${newClass.name} was created successfully.`);
      }
      this.closeModal();
      return;
    }

    try {
      const updated = await this.api.updateInstructorClass(this.editingClassId, draft);
      this.classes.set(
        this.classes().map((row) => (row.id !== this.editingClassId ? row : updated))
      );
      this.notifications.add('Class updated', `${updated.name} was updated.`);
      await this.syncInstructorAllowedClasses();
    } catch {
      this.classes.set(
        this.classes().map((row) => (row.id !== this.editingClassId ? row : draft))
      );
      this.notifications.add('Class updated', `${draft.name} was updated.`);
    }
    this.closeModal();
  }

  isStudentAssigned(studentId: string): boolean {
    return (this.classDraft.assignedStudentIds ?? []).includes(studentId);
  }

  toggleStudentAssignment(studentId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = new Set(this.classDraft.assignedStudentIds ?? []);
    if (checked) {
      current.add(studentId);
    } else {
      current.delete(studentId);
    }
    this.classDraft = {
      ...this.classDraft,
      assignedStudentIds: [...current],
      studentCount: current.size,
    };
  }

  toggleAllVisibleStudents(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = new Set(this.classDraft.assignedStudentIds ?? []);
    const visibleStudentIds = this.filteredStudents().map((student) => student.id);
    if (checked) {
      visibleStudentIds.forEach((studentId) => current.add(studentId));
    } else {
      visibleStudentIds.forEach((studentId) => current.delete(studentId));
    }
    this.classDraft = {
      ...this.classDraft,
      assignedStudentIds: [...current],
      studentCount: current.size,
    };
  }

  areAllVisibleStudentsAssigned(): boolean {
    const visibleStudents = this.filteredStudents();
    if (!visibleStudents.length) {
      return false;
    }
    const assignedIds = new Set(this.classDraft.assignedStudentIds ?? []);
    return visibleStudents.every((student) => assignedIds.has(student.id));
  }

  isSomeVisibleStudentAssigned(): boolean {
    const visibleStudents = this.filteredStudents();
    if (!visibleStudents.length) {
      return false;
    }
    const assignedIds = new Set(this.classDraft.assignedStudentIds ?? []);
    return visibleStudents.some((student) => assignedIds.has(student.id));
  }

  isInstructorAssigned(instructorId: string): boolean {
    const assignedInstructorIds = this.classDraft.assignedInstructorIds ?? [];
    return assignedInstructorIds.includes(instructorId);
  }

  toggleInstructorAssignment(instructorId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = new Set(this.classDraft.assignedInstructorIds ?? []);
    if (checked) {
      current.add(instructorId);
    } else {
      current.delete(instructorId);
    }
    this.classDraft = {
      ...this.classDraft,
      assignedInstructorIds: [...current],
    };
  }

  getAssignedStudents(classItem: InstructorClass): InstructorStudent[] {
    const assignedIds = classItem.assignedStudentIds ?? [];
    if (!assignedIds.length) {
      return [];
    }
    const allStudents = this.students();
    return assignedIds
      .map((studentId) => allStudents.find((student) => student.id === studentId))
      .filter((student): student is InstructorStudent => Boolean(student));
  }

  filteredStudents(): InstructorStudent[] {
    const allStudents = this.students();
    const normalizedSection = this.selectedSection.trim().toLowerCase();
    if (!normalizedSection) {
      return allStudents;
    }
    return allStudents.filter(
      (student) => (student.section ?? '').trim().toLowerCase() === normalizedSection
    );
  }

  getAssignedInstructors(classItem: InstructorClass): AuthAccount[] {
    const assignedInstructorIds = classItem.assignedInstructorIds ?? [];
    if (!assignedInstructorIds.length) {
      return [];
    }
    const allInstructors = this.instructors();
    return assignedInstructorIds
      .map((instructorId) => allInstructors.find((instructor) => instructor.id === instructorId))
      .filter((instructor): instructor is AuthAccount => Boolean(instructor));
  }

  async deleteClass(classItem: InstructorClass): Promise<void> {
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

    try {
      await this.api.deleteInstructorClass(classItem.id);
    } catch {
      // Keep UI responsive with local removal fallback.
    }
    this.classes.set(this.classes().filter((row) => row.id !== classItem.id));
    await this.syncInstructorAllowedClasses();
  }

  openStudentsView(classItem: InstructorClass): void {
    this.viewingClassName = classItem.name;
    this.viewingStudents = this.getAssignedStudents(classItem);
    this.isStudentsViewOpen = true;
  }

  closeStudentsView(): void {
    this.isStudentsViewOpen = false;
    this.viewingClassName = '';
    this.viewingStudents = [];
  }

  private createClassId(): string {
    return `class-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private async loadClasses(): Promise<void> {
    try {
      const loadedClasses = await this.api.getInstructorClasses();
      const normalizedClasses = loadedClasses.map((item) => {
        const assignedStudentIds = item.assignedStudentIds ?? [];
        const assignedInstructorIds = item.assignedInstructorIds ?? [];
        const assignedSubjects = item.assignedSubjects ?? [];
        return {
          ...item,
          assignedStudentIds,
          assignedInstructorIds,
          assignedSubjects,
          studentCount: assignedStudentIds.length || item.studentCount || 0,
        };
      });

      if (this.role !== 'instructor' || !this.sessionEmail) {
        this.classes.set(normalizedClasses);
        return;
      }

      const account = await this.api.getAuthAccountByEmail('instructor', this.sessionEmail);
      const allowedClassIds = new Set(account?.allowedClassIds ?? []);
      this.classes.set(
        normalizedClasses.filter((item) => allowedClassIds.has(item.id))
      );
    } catch {
      this.classes.set([]);
    }
  }

  private async loadStudents(): Promise<void> {
    try {
      const allStudents = await this.api.getInstructorStudents();
      if (this.role !== 'instructor') {
        this.students.set(allStudents);
        return;
      }
      const [account, allClasses] = await Promise.all([
        this.api.getAuthAccountByEmail('instructor', this.sessionEmail),
        this.api.getInstructorClasses()
      ]);
      const allowedClassIds = new Set(account?.allowedClassIds ?? []);
      const allowedStudentIds = new Set(
        allClasses
          .filter((classItem) => allowedClassIds.has(classItem.id))
          .flatMap((classItem) => classItem.assignedStudentIds ?? [])
      );
      this.students.set(
        allStudents.filter((student) => allowedStudentIds.has(student.id))
      );
    } catch {
      this.students.set([]);
    }
  }

  private async loadInstructors(): Promise<void> {
    try {
      this.instructors.set(await this.api.getAuthAccountsByRole('instructor'));
    } catch {
      this.instructors.set([]);
    }
  }

  private async syncInstructorAllowedClasses(): Promise<void> {
    const currentClasses = this.classes();
    const currentInstructors = this.instructors();
    await Promise.all(
      currentInstructors.map((instructor) => {
        const classesForInstructor = currentClasses.filter((classItem) =>
          (classItem.assignedInstructorIds ?? []).includes(instructor.id)
        );
        const allowedClassIds = classesForInstructor.map((classItem) => classItem.id);
        const allowedSubjects = [...new Set(
          classesForInstructor.reduce<string[]>(
            (allSubjects, classItem) => [...allSubjects, ...(classItem.assignedSubjects ?? [])],
            []
          )
        )];
        return this.api.updateAuthAccount(instructor.id, { allowedClassIds, allowedSubjects });
      })
    );
    await this.loadInstructors();
  }

  private resolveSessionRole(): void {
    const rawSession = localStorage.getItem(this.authSessionStorageKey);
    if (!rawSession) return;
    try {
      const parsed = JSON.parse(rawSession) as { role?: 'instructor' | 'admin' | 'superadmin' | 'student'; email?: string };
      this.role = parsed.role ?? '';
      this.sessionEmail = (parsed.email ?? '').trim().toLowerCase();
      this.isAdmin = this.role === 'admin' || this.role === 'superadmin';
    } catch {
      localStorage.removeItem(this.authSessionStorageKey);
    }
  }

  private buildClassTimeRange(): string {
    const start = this.formatWithPeriod(this.startTimeValue);
    const end = this.formatWithPeriod(this.endTimeValue);
    if (!start || !end) return '';
    return `${start} - ${end}`;
  }

  private applyTimeDraftFromClassTime(raw: string): void {
    const segments = raw
      .split('-')
      .map((item) => item.trim())
      .filter((item) => Boolean(item));
    const parsedStart = this.parseTimeSegment(segments[0] ?? '');
    const parsedEnd = this.parseTimeSegment(segments[1] ?? '');
    this.startTimeValue = parsedStart;
    this.endTimeValue = parsedEnd;
  }

  private parseTimeSegment(raw: string): string {
    const normalized = raw.toUpperCase().replace(/\s+/g, ' ').trim();
    const amPmMatch = normalized.match(/^(\d{1,2}):([0-5]\d)\s?(AM|PM)$/);
    if (amPmMatch) {
      const hour12 = Number(amPmMatch[1]);
      const minute = amPmMatch[2];
      const period = amPmMatch[3] === 'PM' ? 'PM' : 'AM';
      const hour24 = period === 'PM'
        ? (hour12 % 12) + 12
        : (hour12 % 12);
      return `${String(hour24).padStart(2, '0')}:${minute}`;
    }

    const twentyFourMatch = normalized.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (twentyFourMatch) {
      const hour24 = Number(twentyFourMatch[1]);
      const minute = twentyFourMatch[2];
      return `${String(hour24).padStart(2, '0')}:${minute}`;
    }

    return '08:00';
  }

  private formatWithPeriod(time24: string): string {
    const match = time24.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (!match) return '';
    const hour = Number(match[1]);
    const minute = match[2];
    const period: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${String(hour12).padStart(2, '0')}:${minute} ${period}`;
  }
}
