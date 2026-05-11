import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { StudentApiService, type InstructorScheduleViewItem } from '../../../core/data/student-api.service';

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <p class="manage-note">Schedules are managed from assigned classes and are view-only.</p>
      <section class="group" *ngFor="let day of groupedDays">
        <h3>{{ day.day }}</h3>
        <div class="row" *ngFor="let item of day.items">
          <div class="row-main">
            <strong>{{ item.subject }}</strong>
            <span class="pill">{{ item.time }}</span>
          </div>
          <div class="details">
            <span><strong>Program:</strong> {{ item.program || 'N/A' }}</span>
            <span><strong>Year:</strong> {{ item.yearLevel || 'N/A' }}</span>
            <span><strong>Section:</strong> {{ item.section || 'N/A' }}</span>
            <span><strong>Day:</strong> {{ item.day || 'N/A' }}</span>
            <span><strong>Room:</strong> {{ item.room || 'N/A' }}</span>
            <span><strong>Class Mode:</strong> {{ item.classMode || 'N/A' }}</span>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 14px; }
    .manage-note { margin: 0; font-size: 12px; color: #6b7280; }
    .group { background: #fff; border: 1px solid #edf0f5; border-radius: 12px; padding: 14px; }
    h3 { margin: 0 0 10px; font-size: 14px; color: #4b5563; letter-spacing: 0.6px; }
    .row { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 10px; background: #f9fafb; margin-bottom: 8px; }
    .row-main { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .row-main strong { font-size: 14px; color: #111827; }
    .pill { font-size: 12px; color: #374151; background: #e5e7eb; border-radius: 999px; padding: 3px 8px; }
    .details { display: grid; grid-template-columns: repeat(2, minmax(160px, 1fr)); gap: 6px 12px; }
    .details span { font-size: 12px; color: #4b5563; }
    .details strong { font-size: 12px; color: #111827; }
    :host-context(body.dark-mode) .group,
    .dark-mode .group {
      background: #111827;
      border-color: #1f2937;
    }
    :host-context(body.dark-mode) h3,
    .dark-mode h3 { color: #94a3b8; }
    :host-context(body.dark-mode) .row,
    .dark-mode .row { background: #0f172a; }
    :host-context(body.dark-mode) .manage-note,
    :host-context(body.dark-mode) .details span,
    .dark-mode .manage-note,
    .dark-mode .details span { color: #94a3b8; }
    :host-context(body.dark-mode) .details strong,
    :host-context(body.dark-mode) .row-main strong,
    .dark-mode .details strong,
    .dark-mode .row-main strong { color: #e5e7eb; }
    :host-context(body.dark-mode) .pill,
    .dark-mode .pill {
      color: #cbd5e1;
      background: #1f2937;
    }
  `],
})
export class SchedulesComponent {
  private readonly authSessionStorageKey = 'attendease-auth-session';
  readonly schedules = signal<InstructorScheduleViewItem[]>([]);
  private role: 'instructor' | 'admin' | 'superadmin' | 'student' | '' = '';
  private sessionEmail = '';

  constructor(private readonly api: StudentApiService) {
    this.resolveSession();
    void this.loadSchedules();
  }

  get groupedDays(): { day: string; items: InstructorScheduleViewItem[] }[] {
    const grouped: Record<string, InstructorScheduleViewItem[]> = {};
    this.schedules().forEach((item) => {
      const day = item.day?.trim() || 'UNSCHEDULED';
      grouped[day] ??= [];
      grouped[day].push(item);
    });
    return Object.keys(grouped).map((day) => ({
      day,
      items: grouped[day]
    }));
  }

  private async loadSchedules(): Promise<void> {
    try {
      const allClasses = await this.api.getInstructorClasses();
      if (this.role !== 'instructor' || !this.sessionEmail) {
        this.schedules.set(
          allClasses.flatMap((classItem) => {
            const subjects = (classItem.assignedSubjects ?? []).length
              ? classItem.assignedSubjects ?? []
              : [classItem.name?.trim() || 'Untitled Subject'];
            return subjects.map((subject) => ({
              subject: subject.trim(),
              program: classItem.program ?? '',
              yearLevel: classItem.yearLevel ?? '',
              section: classItem.section?.trim() || classItem.name || '',
              time: classItem.time ?? '',
              day: classItem.day ?? '',
              room: classItem.room?.trim() || 'N/A',
              classMode: classItem.classMode ?? 'N/A'
            }));
          })
        );
        return;
      }

      this.schedules.set(await this.api.getInstructorScheduleByEmail(this.sessionEmail));
    } catch {
      this.schedules.set([]);
    }
  }

  private resolveSession(): void {
    const rawSession = localStorage.getItem(this.authSessionStorageKey);
    if (!rawSession) return;
    try {
      const parsed = JSON.parse(rawSession) as { role?: 'instructor' | 'admin' | 'superadmin' | 'student'; email?: string };
      this.role = parsed.role ?? '';
      this.sessionEmail = (parsed.email ?? '').trim().toLowerCase();
    } catch {
      localStorage.removeItem(this.authSessionStorageKey);
    }
  }
}
