import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import Swal from 'sweetalert2';
import { StudentApiService, type AuthAccount, type InstructorClass, type InstructorStudent } from '../../../core/data/student-api.service';
import { NotificationService } from '../../../core/data/notification.service';
import {
  CLASS_FORM_STEPS,
  DEFAULT_PROGRAMS,
  DEFAULT_YEAR_LEVELS,
  PROGRAM_OTHER_VALUE,
  WEEKDAY_OPTIONS,
  distinctSorted,
  formatStudentLabel,
  formatWeekdayLabel,
  isTimeRangeValid,
  type ClassFormStep,
} from './class-form.utils';

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
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
            <button type="button" *ngIf="isAdmin" class="archive-btn" (click)="archiveClass(classItem)" aria-label="Archive class">
              <svg class="archive-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  fill="currentColor"
                  d="M20.54 5.23l-1.39-1.68A2 2 0 0 0 17.52 3H6.48c-.66 0-1.26.33-1.62.88L3.46 5.23A1 1 0 0 0 4 7h16a1 1 0 0 0 .54-1.77zM5.12 9l.81 9.12A2 2 0 0 0 7.92 20h8.16a2 2 0 0 0 1.99-1.88L18.88 9H5.12z"
                />
              </svg>
              <span>Archive</span>
            </button>
          </div>
        </article>
      </div>

      <div class="modal-backdrop" *ngIf="isModalOpen" (click)="closeModal()">
        <div
          class="modal-card class-form-modal"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="isEditMode ? 'Edit class' : 'Add class'"
          (click)="$event.stopPropagation()"
        >
          <div class="modal-head">
            <div class="modal-head-text">
              <h3>{{ isEditMode ? 'Edit Class' : 'Add Class' }}</h3>
              <p class="modal-subtitle" *ngIf="classDraft.name.trim()">{{ classDraft.name }}</p>
            </div>
            <button type="button" class="icon-close" (click)="closeModal()" aria-label="Close class modal">×</button>
          </div>

          <nav class="step-progress" aria-label="Form progress">
            <button
              type="button"
              class="step-pill"
              *ngFor="let step of formSteps"
              [class.active]="formStep === step.num"
              [class.done]="formStep > step.num"
              [attr.aria-current]="formStep === step.num ? 'step' : null"
              [disabled]="!canNavigateToStep(step.num)"
              (click)="goToStep(step.num)"
            >
              <span class="step-num">{{ step.num }}</span>
              <span class="step-label">{{ step.label }}</span>
            </button>
          </nav>

          <div class="modal-body">
            <!-- Step 1: Class details -->
            <div class="form-step" *ngIf="formStep === 1">
              <h4 class="form-section-title">Class details</h4>
              <p class="form-section-hint">Basic information about this class.</p>
              <div class="form-grid">
                <label class="field-full">
                  <span>Class Name <em class="required">*</em></span>
                  <input
                    type="text"
                    [value]="classDraft.name"
                    (input)="onDraftFieldChange('name', $event)"
                    placeholder="e.g. BSIT1A"
                    [attr.aria-invalid]="fieldErrors['name'] ? true : null"
                  />
                  <span class="field-error" *ngIf="fieldErrors['name']">{{ fieldErrors['name'] }}</span>
                </label>
                <label>
                  <span>Program <em class="required">*</em></span>
                  <select [value]="programSelectValue" (change)="onProgramSelectChange($event)">
                    <option value="">Select program</option>
                    <option *ngFor="let program of programPresets" [value]="program">{{ program }}</option>
                    <option [value]="programOtherValue">Other (type custom)</option>
                  </select>
                  <span class="field-error" *ngIf="fieldErrors['program'] && !showProgramOther">{{ fieldErrors['program'] }}</span>
                </label>
                <label *ngIf="showProgramOther" class="field-full">
                  <span>Custom program <em class="required">*</em></span>
                  <input
                    type="text"
                    [value]="classDraft.program"
                    (input)="onDraftFieldChange('program', $event)"
                    placeholder="Enter program name"
                    [attr.aria-invalid]="fieldErrors['program'] ? true : null"
                  />
                </label>
                <label [class.field-full]="!showProgramOther">
                  <span>Year Level <em class="required">*</em></span>
                  <select [value]="classDraft.yearLevel" (change)="onYearLevelChange($event)">
                    <option value="">Select year level</option>
                    <option *ngFor="let level of yearLevelPresets" [value]="level">{{ level }}</option>
                  </select>
                  <span class="field-error" *ngIf="fieldErrors['yearLevel']">{{ fieldErrors['yearLevel'] }}</span>
                </label>
                <label>
                  <span>Status</span>
                  <select [value]="classDraft.status" (change)="onStatusChange($event)">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>
            </div>

            <!-- Step 2: Schedule -->
            <div class="form-step" *ngIf="formStep === 2">
              <h4 class="form-section-title">Schedule &amp; location</h4>
              <p class="form-section-hint">When and where this class meets.</p>
              <div class="form-grid">
                <label>
                  <span>Class Day <em class="required">*</em></span>
                  <select [value]="classDraft.day || ''" (change)="onDayChange($event)">
                    <option value="">Select day</option>
                    <option *ngFor="let day of weekdayOptions" [value]="day.value">{{ day.label }}</option>
                  </select>
                  <span class="field-error" *ngIf="fieldErrors['day']">{{ fieldErrors['day'] }}</span>
                </label>
                <label>
                  <span>Class Mode <em class="required">*</em></span>
                  <select [value]="classDraft.classMode || ''" (change)="onClassModeChange($event)">
                    <option value="">Select class mode</option>
                    <option value="Face-to-face Class">Face-to-face</option>
                    <option value="Online Class">Online</option>
                  </select>
                  <span class="field-error" *ngIf="fieldErrors['classMode']">{{ fieldErrors['classMode'] }}</span>
                </label>
                <label class="field-full">
                  <span>Class Time <em class="required">*</em></span>
                  <div class="time-range">
                    <input type="time" [value]="startTimeValue" (input)="onStartTimeChange($event)" aria-label="Start time" />
                    <span class="time-separator">to</span>
                    <input type="time" [value]="endTimeValue" (input)="onEndTimeChange($event)" aria-label="End time" />
                  </div>
                  <span class="field-error" *ngIf="fieldErrors['time']">{{ fieldErrors['time'] }}</span>
                </label>
                <label class="field-full">
                  <span>{{ roomFieldLabel }}</span>
                  <input
                    type="text"
                    [value]="classDraft.room || ''"
                    (input)="onDraftFieldChange('room', $event)"
                    [placeholder]="roomFieldPlaceholder"
                  />
                  <span class="field-hint" *ngIf="isOnlineClassMode">Paste your Google Meet or other meeting link.</span>
                </label>
              </div>
            </div>

            <!-- Step 3: Assignments -->
            <div class="form-step" *ngIf="formStep === 3">
              <h4 class="form-section-title">Assignments</h4>
              <p class="form-section-hint">Optional — assign instructors, subjects, and students.</p>

              <div class="assignment-block" *ngIf="isAdmin">
                <div class="assignment-head">
                  <span>Instructors</span>
                  <span class="assignment-count">{{ assignedInstructorCount }} selected</span>
                </div>
                <input
                  type="search"
                  class="search-input"
                  [value]="instructorSearchQuery"
                  (input)="onInstructorSearchChange($event)"
                  placeholder="Search by name or email"
                  aria-label="Search instructors"
                />
                <div class="picker-list" *ngIf="filteredInstructors().length; else noInstructors">
                  <label class="student-option" *ngFor="let instructor of filteredInstructors()">
                    <input
                      type="checkbox"
                      [checked]="isInstructorAssigned(instructor.id)"
                      (change)="toggleInstructorAssignment(instructor.id, $event)"
                    />
                    <span class="option-text">
                      <span class="option-main">{{ instructor.fullName }}</span>
                      <span class="option-sub">{{ instructor.email }}</span>
                    </span>
                  </label>
                </div>
                <ng-template #noInstructors>
                  <p class="empty-students">{{ instructors().length ? 'No instructors match your search.' : 'No instructors available.' }}</p>
                </ng-template>
              </div>

              <div class="assignment-block" *ngIf="isAdmin">
                <div class="assignment-head">
                  <span>Subjects</span>
                  <span class="assignment-count">{{ (classDraft.assignedSubjects ?? []).length }} added</span>
                </div>
                <div class="subject-chips" *ngIf="(classDraft.assignedSubjects ?? []).length">
                  <span class="chip" *ngFor="let subject of classDraft.assignedSubjects">
                    {{ subject }}
                    <button type="button" class="chip-remove" (click)="removeSubject(subject)" [attr.aria-label]="'Remove ' + subject">×</button>
                  </span>
                </div>
                <input
                  type="text"
                  class="subject-input"
                  [value]="subjectInputDraft"
                  (input)="onSubjectDraftInput($event)"
                  (keydown)="onSubjectDraftKeydown($event)"
                  placeholder="Type a subject and press Enter"
                  aria-label="Add subject"
                />
                <span class="field-hint">Press Enter after each subject to add it.</span>
              </div>

              <div class="assignment-block">
                <div class="assignment-head">
                  <span>Students</span>
                  <span class="assignment-count">{{ assignedStudentCount }} selected</span>
                </div>
                <ng-container *ngIf="students().length; else noStudentsAvailable">
                  <input
                    type="search"
                    class="search-input"
                    [value]="studentSearchQuery"
                    (input)="onStudentSearchChange($event)"
                    placeholder="Search students by name, ID, or section"
                    aria-label="Search students"
                  />
                  <label class="student-option select-all-toggle" *ngIf="filteredStudents().length">
                    <input
                      type="checkbox"
                      [checked]="areAllVisibleStudentsAssigned()"
                      [indeterminate]="isSomeVisibleStudentAssigned() && !areAllVisibleStudentsAssigned()"
                      (change)="toggleAllVisibleStudents($event)"
                    />
                    <span>Select all ({{ filteredStudents().length }})</span>
                  </label>
                  <div class="picker-list picker-list-tall" *ngIf="filteredStudents().length; else noMatchingStudents">
                    <label class="student-option" *ngFor="let student of filteredStudents()">
                      <input
                        type="checkbox"
                        [checked]="isStudentAssigned(student.id)"
                        (change)="toggleStudentAssignment(student.id, $event)"
                      />
                      <span>{{ formatStudentDisplay(student) }}</span>
                    </label>
                  </div>
                  <ng-template #noMatchingStudents>
                    <p class="empty-students">No students match your search.</p>
                  </ng-template>
                </ng-container>
                <ng-template #noStudentsAvailable>
                  <p class="empty-students">No students available. Add students first.</p>
                </ng-template>
              </div>
            </div>

            <!-- Step 4: Review -->
            <div class="form-step" *ngIf="formStep === 4">
              <h4 class="form-section-title">Review &amp; confirm</h4>
              <p class="form-section-hint">Check everything before saving.</p>
              <div class="review-grid">
                <section class="summary-card">
                  <h5>Class details</h5>
                  <dl>
                    <div><dt>Name</dt><dd>{{ classDraft.name || '—' }}</dd></div>
                    <div><dt>Program</dt><dd>{{ classDraft.program || '—' }}</dd></div>
                    <div><dt>Year level</dt><dd>{{ classDraft.yearLevel || '—' }}</dd></div>
                    <div><dt>Status</dt><dd>{{ classDraft.status === 'inactive' ? 'Inactive' : 'Active' }}</dd></div>
                  </dl>
                </section>
                <section class="summary-card">
                  <h5>Schedule</h5>
                  <dl>
                    <div><dt>Day</dt><dd>{{ formatDayLabel(classDraft.day) }}</dd></div>
                    <div><dt>Time</dt><dd>{{ buildClassTimeRange() || '—' }}</dd></div>
                    <div><dt>Mode</dt><dd>{{ classDraft.classMode || '—' }}</dd></div>
                    <div><dt>{{ roomFieldLabel }}</dt><dd>{{ classDraft.room || '—' }}</dd></div>
                  </dl>
                </section>
                <section class="summary-card summary-card-wide" *ngIf="isAdmin">
                  <h5>Assignments</h5>
                  <dl>
                    <div><dt>Instructors</dt><dd>{{ reviewInstructorNames }}</dd></div>
                    <div><dt>Subjects</dt><dd>{{ reviewSubjectList }}</dd></div>
                    <div><dt>Students</dt><dd>{{ assignedStudentCount }} assigned</dd></div>
                  </dl>
                </section>
                <section class="summary-card summary-card-wide" *ngIf="!isAdmin">
                  <h5>Students</h5>
                  <dl>
                    <div><dt>Assigned</dt><dd>{{ assignedStudentCount }} student(s)</dd></div>
                  </dl>
                </section>
              </div>
            </div>
          </div>

          <p class="form-error" *ngIf="formError" role="alert">{{ formError }}</p>

          <div class="modal-actions sticky-actions">
            <button type="button" class="btn-ghost" (click)="closeModal()">Cancel</button>
            <div class="action-group">
              <button type="button" class="btn-ghost" *ngIf="formStep > 1" (click)="prevStep()">Back</button>
              <button type="button" class="btn-primary" *ngIf="formStep < 4" (click)="nextStep()">Next</button>
              <button type="button" class="btn-primary" *ngIf="formStep === 4" (click)="saveClass()">
                {{ isEditMode ? 'Save Changes' : 'Add Class' }}
              </button>
            </div>
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

      <button
        type="button"
        class="fab-add-class"
        *ngIf="isAdmin"
        (click)="openAddModal()"
        aria-label="Add class"
      >
        <span class="fab-icon-wrap" aria-hidden="true">
          <span class="material-icons fab-icon">add</span>
        </span>
        <span class="fab-label">Add Class</span>
      </button>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 16px; padding-bottom: 80px; }
    .fab-add-class {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 100;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 18px 10px 12px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      background: #4f46e5;
      color: #fff;
      font-size: 0.875rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      line-height: 1.2;
      cursor: pointer;
      box-shadow:
        0 1px 2px rgba(15, 23, 42, 0.06),
        0 4px 14px rgba(79, 70, 229, 0.2);
      transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }
    .fab-add-class:hover {
      background: #4338ca;
      border-color: rgba(255, 255, 255, 0.16);
      transform: translateY(-2px);
      box-shadow:
        0 2px 4px rgba(15, 23, 42, 0.08),
        0 8px 22px rgba(79, 70, 229, 0.26);
    }
    .fab-add-class:active {
      transform: translateY(0) scale(0.98);
      background: #4338ca;
      box-shadow:
        0 1px 2px rgba(15, 23, 42, 0.06),
        0 2px 8px rgba(79, 70, 229, 0.18);
    }
    .fab-add-class:focus-visible {
      outline: 2px solid #a5b4fc;
      outline-offset: 2px;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
    }
    .fab-icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.14);
      flex-shrink: 0;
    }
    .fab-icon {
      font-size: 18px;
      line-height: 1;
      color: #fff;
    }
    .fab-label {
      padding-right: 2px;
      white-space: nowrap;
    }
    @media (max-width: 680px) {
      .fab-add-class {
        bottom: 20px;
        right: 20px;
        padding: 9px 16px 9px 11px;
        gap: 8px;
        font-size: 0.8125rem;
      }
      .fab-icon-wrap {
        width: 26px;
        height: 26px;
      }
      .fab-icon { font-size: 17px; }
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
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; align-items: center; }
    .actions button:not(.archive-btn) {
      flex: 1; min-width: 72px; height: 34px; border: 1px solid #e5e7eb; border-radius: 8px;
      background: #fff; cursor: pointer; font-size: 12px; font-weight: 600;
      transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
    }
    .actions button:not(.archive-btn):hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }
    .actions button.btn-secondary { color: #374151; }
    .actions .archive-btn { flex: 0 0 auto; height: 34px; }
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
    .class-form-modal { width: min(720px, 100%); }
    .modal-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid #f0f2f6;
      flex-shrink: 0;
    }
    .modal-head-text { min-width: 0; }
    .modal-head h3 { margin: 0; font-size: 16px; color: #111827; }
    .modal-subtitle { margin: 4px 0 0; font-size: 12px; color: #6b7280; font-weight: 500; }
    .step-progress {
      display: flex;
      gap: 6px;
      padding: 10px 16px;
      border-bottom: 1px solid #f0f2f6;
      overflow-x: auto;
      flex-shrink: 0;
    }
    .step-pill {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 10px;
      border: 1px solid #e5e7eb;
      border-radius: 999px;
      background: #f9fafb;
      color: #6b7280;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .step-pill:disabled { cursor: default; opacity: 0.55; }
    .step-pill.active {
      background: #eef2ff;
      border-color: #c7d2fe;
      color: #4338ca;
    }
    .step-pill.done:not(:disabled) {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #15803d;
    }
    .step-num {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.06);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      flex-shrink: 0;
    }
    .step-pill.active .step-num { background: #4f46e5; color: #fff; }
    .step-pill.done .step-num { background: #16a34a; color: #fff; }
    .step-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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
      padding: 16px;
      overflow-y: auto;
      overflow-x: hidden;
      min-width: 0;
      flex: 1;
    }
    .form-step { display: flex; flex-direction: column; gap: 12px; }
    .form-section-title { margin: 0; font-size: 15px; color: #111827; font-weight: 700; }
    .form-section-hint { margin: 0; font-size: 12px; color: #9ca3af; }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .field-full { grid-column: 1 / -1; }
    .modal-body label { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .modal-body label span { font-size: 12px; color: #6b7280; font-weight: 600; }
    .required { font-style: normal; color: #dc2626; font-weight: 700; }
    .field-error { font-size: 11px; color: #dc2626; font-weight: 600; }
    .field-hint { font-size: 11px; color: #9ca3af; font-weight: 500; }
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
    .assignment-block {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      border: 1px solid #edf0f5;
      border-radius: 10px;
      background: #fafbfc;
    }
    .assignment-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .assignment-head > span:first-child { font-size: 13px; color: #374151; font-weight: 700; }
    .assignment-count { font-size: 11px; color: #6b7280; font-weight: 600; }
    .search-input,
    .subject-input {
      height: 38px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      background: #fff;
      color: #111827;
      padding: 0 10px;
      font-size: 13px;
    }
    .subject-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px 4px 10px;
      border-radius: 999px;
      background: #eef2ff;
      color: #4338ca;
      font-size: 12px;
      font-weight: 600;
    }
    .chip-remove {
      width: 18px;
      height: 18px;
      border: none;
      border-radius: 50%;
      background: rgba(67, 56, 202, 0.15);
      color: #4338ca;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      padding: 0;
    }
    .picker-list {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 8px 10px;
      max-height: 200px;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      background: #fff;
    }
    .picker-list-tall { max-height: 240px; }
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
    .student-option .option-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;
    }
    .student-option .option-main {
      font-size: 13px;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }
    .student-option .option-sub {
      font-size: 11px;
      color: #9ca3af;
      font-weight: 500;
      overflow-wrap: anywhere;
    }
    .student-option span:not(.option-main):not(.option-sub) {
      min-width: 0;
      overflow-wrap: anywhere;
      word-break: break-word;
      line-height: 1.2;
    }
    .review-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .summary-card {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 12px;
      background: #fafbfc;
    }
    .summary-card-wide { grid-column: 1 / -1; }
    .summary-card h5 { margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; }
    .summary-card dl { margin: 0; display: flex; flex-direction: column; gap: 8px; }
    .summary-card dl > div { display: grid; grid-template-columns: 100px 1fr; gap: 8px; font-size: 13px; }
    .summary-card dt { margin: 0; color: #9ca3af; font-weight: 600; }
    .summary-card dd { margin: 0; color: #111827; font-weight: 500; overflow-wrap: anywhere; }
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
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      padding: 14px 16px;
      border-top: 1px solid #f0f2f6;
      flex-wrap: wrap;
      flex-shrink: 0;
      background: #fff;
    }
    .sticky-actions { position: sticky; bottom: 0; z-index: 1; }
    .action-group { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }
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
      .form-grid, .review-grid { grid-template-columns: 1fr; }
      .time-range { grid-template-columns: 1fr 14px 1fr; gap: 6px; }
      .modal-actions { flex-direction: column; align-items: stretch; }
      .action-group { margin-left: 0; width: 100%; }
      .action-group .btn-ghost, .action-group .btn-primary { flex: 1; }
      .step-label { display: none; }
      .step-pill { padding: 8px; }
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
    :host-context(body.dark-mode) .actions button:not(.archive-btn),
    .dark-mode .actions button:not(.archive-btn) {
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
    :host-context(body.dark-mode) .modal-subtitle,
    .dark-mode .modal-subtitle { color: #94a3b8; }
    :host-context(body.dark-mode) .step-progress,
    .dark-mode .step-progress { border-color: #1f2937; }
    :host-context(body.dark-mode) .step-pill,
    .dark-mode .step-pill {
      background: #0f172a;
      border-color: #374151;
      color: #94a3b8;
    }
    :host-context(body.dark-mode) .step-pill.active,
    .dark-mode .step-pill.active {
      background: #1e1b4b;
      border-color: #4338ca;
      color: #c7d2fe;
    }
    :host-context(body.dark-mode) .form-section-title,
    .dark-mode .form-section-title { color: #e5e7eb; }
    :host-context(body.dark-mode) .assignment-block,
    :host-context(body.dark-mode) .summary-card,
    .dark-mode .assignment-block,
    .dark-mode .summary-card {
      background: #0f172a;
      border-color: #374151;
    }
    :host-context(body.dark-mode) .search-input,
    :host-context(body.dark-mode) .subject-input,
    .dark-mode .search-input,
    .dark-mode .subject-input {
      background: #111827;
      border-color: #374151;
      color: #e5e7eb;
    }
    :host-context(body.dark-mode) .chip,
    .dark-mode .chip { background: #1e1b4b; color: #c7d2fe; }
    :host-context(body.dark-mode) .summary-card dd,
    .dark-mode .summary-card dd { color: #e5e7eb; }
    :host-context(body.dark-mode) .sticky-actions,
    .dark-mode .sticky-actions { background: #111827; }
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
    :host-context(body.dark-mode) .fab-add-class,
    .dark-mode .fab-add-class {
      background: #4f46e5;
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow:
        0 1px 2px rgba(0, 0, 0, 0.2),
        0 4px 16px rgba(0, 0, 0, 0.35);
    }
    :host-context(body.dark-mode) .fab-add-class:hover,
    .dark-mode .fab-add-class:hover {
      background: #4338ca;
      border-color: rgba(255, 255, 255, 0.14);
      box-shadow:
        0 2px 4px rgba(0, 0, 0, 0.25),
        0 8px 22px rgba(0, 0, 0, 0.42);
    }
    :host-context(body.dark-mode) .fab-icon-wrap,
    .dark-mode .fab-icon-wrap {
      background: rgba(255, 255, 255, 0.12);
    }
  `],
})
export class ClassesComponent {
  private readonly authSessionStorageKey = 'attendease-auth-session';
  readonly classes = signal<InstructorClass[]>([]);
  readonly weekdayOptions = WEEKDAY_OPTIONS;
  readonly formSteps = CLASS_FORM_STEPS;
  readonly programOtherValue = PROGRAM_OTHER_VALUE;
  readonly students = signal<InstructorStudent[]>([]);
  readonly instructors = signal<AuthAccount[]>([]);
  isAdmin = false;
  private role: 'instructor' | 'admin' | 'superadmin' | 'student' | '' = '';
  private sessionEmail = '';
  isModalOpen = false;
  isEditMode = false;
  editingClassId = '';
  formStep: ClassFormStep = 1;
  formError = '';
  fieldErrors: Record<string, string> = {};
  selectedSection = '';
  programSelectValue = '';
  showProgramOther = false;
  instructorSearchQuery = '';
  studentSearchQuery = '';
  subjectInputDraft = '';
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
    this.formStep = 1;
    this.formError = '';
    this.fieldErrors = {};
    this.instructorSearchQuery = '';
    this.studentSearchQuery = '';
    this.subjectInputDraft = '';
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
    this.syncProgramSelect();
  }

  editClass(classItem: InstructorClass): void {
    this.isEditMode = true;
    this.isModalOpen = true;
    this.editingClassId = classItem.id;
    this.formStep = 1;
    this.formError = '';
    this.fieldErrors = {};
    this.instructorSearchQuery = '';
    this.studentSearchQuery = '';
    this.subjectInputDraft = '';
    this.classDraft = {
      ...classItem,
      assignedStudentIds: [...(classItem.assignedStudentIds ?? [])],
      assignedInstructorIds: [...(classItem.assignedInstructorIds ?? [])],
      assignedSubjects: [...(classItem.assignedSubjects ?? [])],
    };
    this.selectedSection = classItem.section ?? '';
    this.applyTimeDraftFromClassTime(classItem.time ?? '');
    this.syncProgramSelect();
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingClassId = '';
    this.formStep = 1;
    this.formError = '';
    this.fieldErrors = {};
    this.instructorSearchQuery = '';
    this.studentSearchQuery = '';
    this.subjectInputDraft = '';
  }

  get programPresets(): string[] {
    const excluded = new Set([
      'SIA',
      'Information Technology',
      'Computer Science',
      'BS Information Technology',
    ].map((p) => p.trim().toLowerCase()));

    return distinctSorted([
      ...DEFAULT_PROGRAMS,
      ...this.classes().map((classItem) => classItem.program),
    ]).filter((program) => !excluded.has(program.trim().toLowerCase()));
  }

  get yearLevelPresets(): string[] {
    return distinctSorted([
      ...DEFAULT_YEAR_LEVELS,
      ...this.classes().map((classItem) => classItem.yearLevel),
    ]);
  }

  get availableSections(): string[] {
    return distinctSorted(this.students().map((student) => student.section ?? ''));
  }

  get isOnlineClassMode(): boolean {
    return this.classDraft.classMode === 'Online Class';
  }

  get roomFieldLabel(): string {
    return this.isOnlineClassMode ? 'Meeting link' : 'Room';
  }

  get roomFieldPlaceholder(): string {
    return this.isOnlineClassMode ? 'https://meet.google.com/...' : 'Room 201';
  }

  get assignedInstructorCount(): number {
    return (this.classDraft.assignedInstructorIds ?? []).length;
  }

  get assignedStudentCount(): number {
    return (this.classDraft.assignedStudentIds ?? []).length;
  }

  get reviewInstructorNames(): string {
    const assignedIds = this.classDraft.assignedInstructorIds ?? [];
    if (!assignedIds.length) {
      return 'None';
    }
    const names = this.instructors()
      .filter((instructor) => assignedIds.includes(instructor.id))
      .map((instructor) => instructor.fullName);
    return names.length ? names.join(', ') : 'None';
  }

  get reviewSubjectList(): string {
    const subjects = this.classDraft.assignedSubjects ?? [];
    return subjects.length ? subjects.join(', ') : 'None';
  }

  formatStudentDisplay(student: InstructorStudent): string {
    return formatStudentLabel(student.name, student.studentId ?? '');
  }

  formatDayLabel(day?: string): string {
    return day?.trim() ? formatWeekdayLabel(day) : '—';
  }

  canNavigateToStep(step: ClassFormStep): boolean {
    return step <= this.formStep;
  }

  goToStep(step: ClassFormStep): void {
    if (step === this.formStep) {
      return;
    }
    if (step < this.formStep) {
      this.formStep = step;
      this.formError = '';
      this.fieldErrors = {};
      return;
    }
    for (let current = this.formStep; current < step; current++) {
      if (!this.validateStep(current as ClassFormStep)) {
        this.formStep = current as ClassFormStep;
        return;
      }
    }
    this.formStep = step;
    this.formError = '';
    this.fieldErrors = {};
  }

  nextStep(): void {
    if (!this.validateStep(this.formStep)) {
      return;
    }
    if (this.formStep < 4) {
      this.formStep = (this.formStep + 1) as ClassFormStep;
      this.formError = '';
      this.fieldErrors = {};
    }
  }

  prevStep(): void {
    if (this.formStep > 1) {
      this.formStep = (this.formStep - 1) as ClassFormStep;
      this.formError = '';
      this.fieldErrors = {};
    }
  }

  onProgramSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    this.programSelectValue = value;
    this.clearFieldError('program');
    if (value === PROGRAM_OTHER_VALUE) {
      this.showProgramOther = true;
      if (this.programPresets.includes(this.classDraft.program.trim())) {
        this.classDraft = { ...this.classDraft, program: '' };
      }
      return;
    }
    this.showProgramOther = false;
    this.classDraft = {
      ...this.classDraft,
      program: value,
    };
  }

  onYearLevelChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.classDraft = {
      ...this.classDraft,
      yearLevel: target.value,
    };
    this.clearFieldError('yearLevel');
  }

  onInstructorSearchChange(event: Event): void {
    this.instructorSearchQuery = (event.target as HTMLInputElement).value;
  }

  onStudentSearchChange(event: Event): void {
    this.studentSearchQuery = (event.target as HTMLInputElement).value;
  }

  onSectionSelectChange(event: Event): void {
    const section = (event.target as HTMLSelectElement).value.trim();
    this.selectedSection = section;
    this.studentSearchQuery = '';
    this.classDraft = {
      ...this.classDraft,
      section,
    };
    this.clearFieldError('section');
  }

  onSubjectDraftInput(event: Event): void {
    this.subjectInputDraft = (event.target as HTMLInputElement).value;
  }

  onSubjectDraftKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    this.addSubjectFromDraft();
  }

  addSubjectFromDraft(): void {
    const value = this.subjectInputDraft.trim();
    if (!value) {
      return;
    }
    const current = [...(this.classDraft.assignedSubjects ?? [])];
    if (!current.includes(value)) {
      current.push(value);
    }
    this.classDraft = {
      ...this.classDraft,
      assignedSubjects: current,
    };
    this.subjectInputDraft = '';
  }

  removeSubject(subject: string): void {
    const current = (this.classDraft.assignedSubjects ?? []).filter((item) => item !== subject);
    this.classDraft = {
      ...this.classDraft,
      assignedSubjects: current,
    };
  }

  filteredInstructors(): AuthAccount[] {
    const query = this.instructorSearchQuery.trim().toLowerCase();
    const allInstructors = this.instructors();
    if (!query) {
      return allInstructors;
    }
    return allInstructors.filter(
      (instructor) =>
        instructor.fullName.toLowerCase().includes(query) ||
        instructor.email.toLowerCase().includes(query)
    );
  }

  onDraftFieldChange(field: 'name' | 'program' | 'yearLevel' | 'room', event: Event): void {
    const target = event.target as HTMLInputElement;
    this.classDraft = {
      ...this.classDraft,
      [field]: target.value,
      ...(field === 'name' ? { section: target.value } : {}),
    };
    this.clearFieldError(field);
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
    this.clearFieldError('day');
  }

  onClassModeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const classMode = target.value.trim();
    this.classDraft = {
      ...this.classDraft,
      classMode: classMode === 'Face-to-face Class' || classMode === 'Online Class' ? classMode : undefined,
    };
    this.clearFieldError('classMode');
  }

  onStartTimeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.startTimeValue = target.value;
    this.clearFieldError('time');
  }

  onEndTimeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.endTimeValue = target.value;
    this.clearFieldError('time');
  }

  async saveClass(): Promise<void> {
    if (!this.validateStep(1)) {
      this.formStep = 1;
      return;
    }
    if (!this.validateStep(2)) {
      this.formStep = 2;
      return;
    }
    this.formError = '';
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
        this.notifications.add('Class created', `${created.name} was created successfully.`, 'instructor');
        await this.syncInstructorAllowedClasses();
      } catch {
        this.classes.set([...this.classes(), newClass]);
        this.notifications.add('Class created', `${newClass.name} was created successfully.`, 'instructor');
      }
      this.closeModal();
      return;
    }

    try {
      const updated = await this.api.updateInstructorClass(this.editingClassId, draft);
      this.classes.set(
        this.classes().map((row) => (row.id !== this.editingClassId ? row : updated))
      );
      this.notifications.add('Class updated', `${updated.name} was updated.`, 'instructor');
      await this.syncInstructorAllowedClasses();
    } catch {
      this.classes.set(
        this.classes().map((row) => (row.id !== this.editingClassId ? row : draft))
      );
      this.notifications.add('Class updated', `${draft.name} was updated.`, 'instructor');
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
    const query = this.studentSearchQuery.trim().toLowerCase();
    let list = this.students();
    if (query) {
      list = list.filter(
        (student) =>
          student.name.toLowerCase().includes(query) ||
          (student.studentId ?? '').toLowerCase().includes(query) ||
          (student.section ?? '').toLowerCase().includes(query)
      );
    }
    return list;
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

  async archiveClass(classItem: InstructorClass): Promise<void> {
    const result = await Swal.fire({
      title: 'Archive class?',
      html: `<p style="margin:0;color:#6b7280;font-size:13px;">
        This will remove <strong>${classItem.name}</strong> from active classes and unassign all instructors.</p>`,
      input: 'textarea',
      inputLabel: 'Reason for archiving',
      inputPlaceholder: 'Explain why this class is being archived...',
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
      customClass: {
        popup: 'swal-delete-popup',
      },
      showCancelButton: true,
      confirmButtonText: 'Archive class',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#b91c1c',
      reverseButtons: true,
    });

    if (!result.isConfirmed || typeof result.value !== 'string') {
      return;
    }

    try {
      const archived = await this.api.archiveInstructorClass(
        classItem.id,
        result.value.trim(),
        this.getAdminEmail()
      );
      if (!archived) {
        this.notifications.add('Archive failed', `Unable to archive ${classItem.name}.`, 'instructor');
        return;
      }
      this.classes.set(this.classes().filter((row) => row.id !== classItem.id));
      await this.syncInstructorAllowedClasses();
      this.notifications.add('Class archived', `${classItem.name} was moved to Archives.`, 'instructor');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to archive class.';
      this.notifications.add('Archive failed', message, 'instructor');
    }
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

  buildClassTimeRange(): string {
    const start = this.formatWithPeriod(this.startTimeValue);
    const end = this.formatWithPeriod(this.endTimeValue);
    if (!start || !end) return '';
    return `${start} - ${end}`;
  }

  private validateStep(step: ClassFormStep): boolean {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!this.classDraft.name.trim()) {
        errors['name'] = 'Class name is required.';
      }
      if (!this.classDraft.program.trim()) {
        errors['program'] = 'Program is required.';
      }
      if (!this.classDraft.yearLevel.trim()) {
        errors['yearLevel'] = 'Year level is required.';
      }
    }

    if (step === 2) {
      if (!(this.classDraft.day ?? '').trim()) {
        errors['day'] = 'Class day is required.';
      }
      if (!this.classDraft.classMode) {
        errors['classMode'] = 'Class mode is required.';
      }
      if (!isTimeRangeValid(this.startTimeValue, this.endTimeValue)) {
        errors['time'] = 'End time must be after start time.';
      }
    }

    this.fieldErrors = errors;
    if (Object.keys(errors).length) {
      this.formError = 'Please fix the highlighted fields before continuing.';
      return false;
    }
    this.formError = '';
    return true;
  }

  private syncProgramSelect(): void {
    const program = this.classDraft.program.trim();
    if (program && this.programPresets.includes(program)) {
      this.programSelectValue = program;
      this.showProgramOther = false;
      return;
    }
    if (program) {
      this.programSelectValue = PROGRAM_OTHER_VALUE;
      this.showProgramOther = true;
      return;
    }
    this.programSelectValue = '';
    this.showProgramOther = false;
  }

  private clearFieldError(field: string): void {
    if (!this.fieldErrors[field]) {
      return;
    }
    const next = { ...this.fieldErrors };
    delete next[field];
    this.fieldErrors = next;
    if (!Object.keys(this.fieldErrors).length) {
      this.formError = '';
    }
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
