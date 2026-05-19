import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { StudentApiService, type InstructorScheduleViewItem } from '../../../core/data/student-api.service';

const DAY_ORDER = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
  'UNSCHEDULED',
] as const;

interface ScheduleDayGroup {
  day: string;
  items: InstructorScheduleViewItem[];
}

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedules.html',
  styleUrls: ['./schedules.scss'],
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

  get groupedDays(): ScheduleDayGroup[] {
    const grouped: Record<string, InstructorScheduleViewItem[]> = {};
    this.schedules().forEach((item) => {
      const day = item.day?.trim().toUpperCase() || 'UNSCHEDULED';
      grouped[day] ??= [];
      grouped[day].push(item);
    });

    return Object.keys(grouped)
      .sort((a, b) => this.getDaySortIndex(a) - this.getDaySortIndex(b))
      .map((day) => ({
        day,
        items: [...grouped[day]].sort(
          (a, b) => this.parseStartMinutes(a.time) - this.parseStartMinutes(b.time)
        ),
      }));
  }

  get totalClasses(): number {
    return this.schedules().length;
  }

  get uniqueSections(): number {
    const sections = new Set(
      this.schedules()
        .map((item) => item.section?.trim())
        .filter((section): section is string => Boolean(section))
    );
    return sections.size;
  }

  trackByDay(_index: number, group: ScheduleDayGroup): string {
    return group.day;
  }

  trackByItem(_index: number, item: InstructorScheduleViewItem): string {
    return `${item.day}-${item.subject}-${item.time}-${item.section}`;
  }

  formatDayLabel(day: string): string {
    const normalized = day.trim();
    if (!normalized || normalized === 'UNSCHEDULED') return 'Unscheduled';
    return normalized.charAt(0) + normalized.slice(1).toLowerCase();
  }

  getTimeStart(time: string): string {
    const parts = this.splitTimeRange(time);
    return parts.start || time || '—';
  }

  getTimeEnd(time: string): string {
    const parts = this.splitTimeRange(time);
    return parts.end || '';
  }

  isOnlineMode(classMode: string): boolean {
    return /online|virtual|remote|async/i.test(classMode);
  }

  getModeIcon(classMode: string): string {
    return this.isOnlineMode(classMode) ? 'laptop' : 'groups';
  }

  private splitTimeRange(time: string): { start: string; end: string } {
    const trimmed = time?.trim() ?? '';
    if (!trimmed) return { start: '—', end: '' };
    const parts = trimmed.split(/\s*[-–—]\s*/);
    if (parts.length < 2) return { start: trimmed, end: '' };
    return { start: parts[0].trim(), end: parts.slice(1).join(' - ').trim() };
  }

  private getDaySortIndex(day: string): number {
    const index = DAY_ORDER.indexOf(day.toUpperCase() as (typeof DAY_ORDER)[number]);
    return index === -1 ? DAY_ORDER.length : index;
  }

  private parseStartMinutes(time: string): number {
    const start = this.splitTimeRange(time).start;
    const match = start.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return Number.MAX_SAFE_INTEGER;

    let hours = Number.parseInt(match[1], 10);
    const minutes = Number.parseInt(match[2], 10);
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
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
              classMode: classItem.classMode ?? 'N/A',
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
      const parsed = JSON.parse(rawSession) as {
        role?: 'instructor' | 'admin' | 'superadmin' | 'student';
        email?: string;
      };
      this.role = parsed.role ?? '';
      this.sessionEmail = (parsed.email ?? '').trim().toLowerCase();
    } catch {
      localStorage.removeItem(this.authSessionStorageKey);
    }
  }
}
