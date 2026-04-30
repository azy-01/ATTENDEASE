import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { StudentApiService, type ScheduleItem } from '../../../core/data/student-api.service';

@Component({
  selector: 'app-student-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule.html',
  styleUrls: ['./schedule.scss'],
})
export class StudentScheduleComponent {
  private readonly studentProfileStorageKey = 'student-account-profile';
  private readonly authSessionStorageKey = 'attendease-auth-session';
  readonly schedules = signal<ScheduleItem[]>([]);

  constructor(private readonly studentApi: StudentApiService) {
    void this.loadSchedules();
  }

  get groupedDays(): { day: string; items: ScheduleItem[] }[] {
    const grouped: Record<string, ScheduleItem[]> = {};
    this.schedules().forEach((item) => {
      grouped[item.day] ??= [];
      grouped[item.day].push(item);
    });
    return Object.keys(grouped).map((day) => ({ day, items: grouped[day] }));
  }

  private async loadSchedules(): Promise<void> {
    const email = this.getLoggedInStudentEmail();
    if (!email) {
      this.schedules.set([]);
      return;
    }

    try {
      this.schedules.set(await this.studentApi.getStudentSchedulesByEmail(email));
    } catch {
      this.schedules.set([]);
    }
  }

  private getLoggedInStudentEmail(): string {
    const fromSession = this.readEmailFromStorage(this.authSessionStorageKey);
    if (fromSession) return fromSession;
    return this.readEmailFromStorage(this.studentProfileStorageKey);
  }

  private readEmailFromStorage(key: string): string {
    const raw = localStorage.getItem(key);
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw) as { role?: string; email?: string };
      if (key === this.authSessionStorageKey && parsed.role !== 'student') {
        return '';
      }
      return parsed.email?.trim().toLowerCase() ?? '';
    } catch {
      return '';
    }
  }
}
