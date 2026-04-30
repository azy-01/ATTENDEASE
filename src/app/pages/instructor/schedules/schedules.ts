import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { StudentApiService, type InstructorSchedule } from '../../../core/data/student-api.service';

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="top">
        <button type="button" (click)="onAddSchedule()">+ Add Schedule</button>
      </div>
      <section class="group" *ngFor="let day of groupedDays">
        <h3>{{ day.day }}</h3>
        <div class="row" *ngFor="let item of day.items">
          <div class="left">
            <span>{{ item.time }}</span>
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.meta }}</p>
            </div>
          </div>
          <div class="right">
            <span>{{ item.mode }}</span>
            <button type="button" class="icon-btn" (click)="onEditSchedule(item)" aria-label="Edit schedule">
              <span class="material-icons">edit</span>
            </button>
            <button type="button" class="icon-btn delete" (click)="onDeleteSchedule(item)" aria-label="Delete schedule">
              <span class="material-icons">delete_outline</span>
            </button>
          </div>
        </div>
      </section>
    </div>

    <div class="modal-overlay" *ngIf="isModalOpen" (click)="closeModal()">
      <div class="modal" (click)="$event.stopPropagation()">
        <h3>{{ isEditing ? 'Edit Schedule' : 'Add Schedule' }}</h3>

        <label>
          Subject
          <input type="text" [(ngModel)]="draftSchedule.title" />
        </label>

        <label>
          Day
          <select [(ngModel)]="draftSchedule.day">
            <option *ngFor="let day of weekdays" [value]="day">{{ day }}</option>
          </select>
        </label>

        <label>
          Time
          <input type="text" [(ngModel)]="draftSchedule.time" placeholder="08:00 - 09:30" />
        </label>

        <label>
          Section
          <input type="text" [(ngModel)]="draftSchedule.section" placeholder="BSIT-1A" />
        </label>

        <label>
          Details
          <input type="text" [(ngModel)]="draftSchedule.meta" placeholder="BSIT-1A • 101" />
        </label>

        <label>
          Mode
          <select [(ngModel)]="draftSchedule.mode">
            <option value="Face-To-Face">Face-To-Face</option>
            <option value="Online">Online</option>
          </select>
        </label>

        <p class="error" *ngIf="modalError">{{ modalError }}</p>

        <div class="modal-actions">
          <button type="button" class="secondary" (click)="closeModal()">Cancel</button>
          <button type="button" class="primary" (click)="saveSchedule()">
            {{ isEditing ? 'Save Changes' : 'Add Schedule' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 14px; }
    .top { display: flex; justify-content: flex-end; }
    .top button {
      border: none; border-radius: 9px; padding: 10px 14px; background: #4f46e5; color: #fff; font-weight: 600; cursor: pointer;
    }
    .group { background: #fff; border: 1px solid #edf0f5; border-radius: 12px; padding: 14px; }
    h3 { margin: 0 0 10px; font-size: 14px; color: #4b5563; letter-spacing: 0.6px; }
    .row { display: flex; justify-content: space-between; gap: 10px; padding: 10px; border-radius: 10px; background: #f9fafb; margin-bottom: 8px; }
    .left { display: flex; gap: 12px; align-items: center; }
    .left span { font-size: 12px; color: #6b7280; }
    strong { font-size: 14px; color: #111827; }
    p { margin: 2px 0 0; font-size: 12px; color: #6b7280; }
    .right { font-size: 12px; color: #374151; display: flex; align-items: center; gap: 8px; }
    .icon-btn {
      width: 30px;
      height: 30px;
      border: 1px solid #1d4ed8;
      border-radius: 8px;
      background: #eff6ff;
      cursor: pointer;
      color: #1d4ed8;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .icon-btn:hover { background: #dbeafe; }
    .icon-btn .material-icons { font-size: 18px; line-height: 1; }
    .icon-btn.delete {
      border-color: #dc2626;
      background: #fef2f2;
      color: #dc2626;
    }
    .icon-btn.delete:hover { background: #fee2e2; }
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      z-index: 1000;
    }
    .modal {
      width: min(460px, 100%);
      background: #fff;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .modal h3 {
      margin: 0;
      font-size: 18px;
      color: #111827;
      letter-spacing: normal;
    }
    .modal label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 13px;
      color: #4b5563;
    }
    .modal input,
    .modal select {
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 9px 10px;
      font-size: 14px;
      color: #111827;
      background: #fff;
    }
    .error {
      margin: 0;
      font-size: 12px;
      color: #b91c1c;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 4px;
    }
    .modal-actions button {
      border: none;
      border-radius: 8px;
      padding: 9px 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .modal-actions .secondary {
      background: #e5e7eb;
      color: #1f2937;
    }
    .modal-actions .primary {
      background: #4f46e5;
      color: #fff;
    }
    :host-context(body.dark-mode) .group,
    .dark-mode .group {
      background: #111827;
      border-color: #1f2937;
    }
    :host-context(body.dark-mode) h3,
    .dark-mode h3 { color: #94a3b8; }
    :host-context(body.dark-mode) .row,
    .dark-mode .row { background: #0f172a; }
    :host-context(body.dark-mode) .left span,
    :host-context(body.dark-mode) p,
    :host-context(body.dark-mode) .right,
    .dark-mode .left span,
    .dark-mode p,
    .dark-mode .right { color: #94a3b8; }
    :host-context(body.dark-mode) .icon-btn,
    .dark-mode .icon-btn {
      border-color: #60a5fa;
      background: #0b1a33;
      color: #60a5fa;
    }
    :host-context(body.dark-mode) .icon-btn:hover,
    .dark-mode .icon-btn:hover { background: #13294d; }
    :host-context(body.dark-mode) .icon-btn.delete,
    .dark-mode .icon-btn.delete {
      border-color: #f87171;
      background: #2f1215;
      color: #f87171;
    }
    :host-context(body.dark-mode) .icon-btn.delete:hover,
    .dark-mode .icon-btn.delete:hover { background: #3f1519; }
    :host-context(body.dark-mode) .modal,
    .dark-mode .modal {
      background: #111827;
      border-color: #1f2937;
    }
    :host-context(body.dark-mode) .modal h3,
    .dark-mode .modal h3 { color: #e5e7eb; }
    :host-context(body.dark-mode) .modal label,
    .dark-mode .modal label { color: #94a3b8; }
    :host-context(body.dark-mode) .modal input,
    :host-context(body.dark-mode) .modal select,
    .dark-mode .modal input,
    .dark-mode .modal select {
      background: #0f172a;
      border-color: #334155;
      color: #e5e7eb;
    }
    :host-context(body.dark-mode) .modal-actions .secondary,
    .dark-mode .modal-actions .secondary {
      background: #334155;
      color: #e5e7eb;
    }
    :host-context(body.dark-mode) strong,
    .dark-mode strong { color: #e5e7eb; }
  `],
})
export class SchedulesComponent {
  weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  readonly schedules = signal<InstructorSchedule[]>([]);
  isModalOpen = false;
  isEditing = false;
  editingSchedule: InstructorSchedule | null = null;
  modalError = '';
  draftSchedule: InstructorSchedule = this.createEmptySchedule();

  constructor(private readonly api: StudentApiService) {
    void this.loadSchedules();
  }

  get groupedDays(): { day: string; items: InstructorSchedule[] }[] {
    const grouped: Record<string, InstructorSchedule[]> = {};
    this.schedules().forEach((item) => {
      grouped[item.day] ??= [];
      grouped[item.day].push(item);
    });
    return Object.keys(grouped).map((day) => ({ day, items: grouped[day] }));
  }

  onAddSchedule(): void {
    this.isEditing = false;
    this.editingSchedule = null;
    this.modalError = '';
    this.draftSchedule = this.createEmptySchedule();
    this.isModalOpen = true;
  }

  onEditSchedule(item: InstructorSchedule): void {
    this.isEditing = true;
    this.editingSchedule = item;
    this.modalError = '';
    this.draftSchedule = { ...item };
    this.isModalOpen = true;
  }

  async onDeleteSchedule(item: InstructorSchedule): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete schedule?',
      text: `This will remove "${item.title}" from your schedule list.`,
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
    if (!result.isConfirmed) return;
    try {
      await this.api.deleteInstructorSchedule(item.id);
    } catch {
      // Keep UI update even if backend call fails.
    }
    this.schedules.set(this.schedules().filter((schedule) => schedule.id !== item.id));
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.modalError = '';
  }

  async saveSchedule(): Promise<void> {
    const cleaned: InstructorSchedule = {
      id: this.draftSchedule.id || `schedule-${Date.now()}`,
      title: this.draftSchedule.title.trim(),
      day: this.draftSchedule.day,
      time: this.draftSchedule.time.trim(),
      section: this.draftSchedule.section.trim(),
      meta: this.draftSchedule.meta.trim(),
      mode: this.draftSchedule.mode,
    };

    if (!cleaned.title || !cleaned.time || !cleaned.section || !cleaned.meta) {
      this.modalError = 'Please fill in subject, time, section, and details.';
      return;
    }

    if (this.isEditing && this.editingSchedule) {
      try {
        const updated = await this.api.updateInstructorSchedule(this.editingSchedule.id, cleaned);
        this.schedules.set(
          this.schedules().map((item) =>
            item.id === this.editingSchedule?.id ? updated : item
          )
        );
      } catch {
        this.schedules.set(
          this.schedules().map((item) =>
            item.id === this.editingSchedule?.id ? cleaned : item
          )
        );
      }
    } else {
      try {
        const created = await this.api.addInstructorSchedule(cleaned);
        this.schedules.set([...this.schedules(), created]);
      } catch {
        this.schedules.set([...this.schedules(), cleaned]);
      }
    }

    this.closeModal();
  }

  private createEmptySchedule(): InstructorSchedule {
    return {
      id: '',
      day: 'MONDAY',
      time: '',
      title: '',
      section: '',
      meta: '',
      mode: 'Face-To-Face',
    };
  }

  private async loadSchedules(): Promise<void> {
    try {
      this.schedules.set(await this.api.getInstructorSchedules());
    } catch {
      this.schedules.set([]);
    }
  }
}
