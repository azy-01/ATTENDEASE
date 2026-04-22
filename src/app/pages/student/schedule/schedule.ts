import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { StudentApiService, type ScheduleItem } from '../../../core/data/student-api.service';

@Component({
  selector: 'app-student-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule.html',
  styleUrls: ['./schedule.scss'],
})
export class StudentScheduleComponent {
  schedules: ScheduleItem[] = [];

  constructor(private readonly studentApi: StudentApiService) {
    void this.loadSchedules();
  }

  get groupedDays(): { day: string; items: ScheduleItem[] }[] {
    const grouped: Record<string, ScheduleItem[]> = {};
    this.schedules.forEach((item) => {
      grouped[item.day] ??= [];
      grouped[item.day].push(item);
    });
    return Object.keys(grouped).map((day) => ({ day, items: grouped[day] }));
  }

  private async loadSchedules(): Promise<void> {
    try {
      this.schedules = await this.studentApi.getSchedules();
    } catch {
      this.schedules = [];
    }
  }
}
