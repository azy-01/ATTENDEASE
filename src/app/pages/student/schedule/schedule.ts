import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface ScheduleItem {
  day: string;
  time: string;
  subject: string;
  meta: string;
  mode: 'Face-To-Face' | 'Online';
}

@Component({
  selector: 'app-student-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule.html',
  styleUrls: ['./schedule.scss'],
})
export class StudentScheduleComponent {
  schedules: ScheduleItem[] = [
    { day: 'MONDAY', time: '10:00 - 12:00', subject: 'Networking 1 (IT222)', meta: 'BSIT1A, BSIT1B, BSIT2C • Azryth Sacuan • 108', mode: 'Face-To-Face' },
    { day: 'MONDAY', time: '08:00 - 09:30', subject: 'Web Development (IT301)', meta: 'BSIT-3A • Prof. Admin • Lab 1', mode: 'Face-To-Face' },
    { day: 'MONDAY', time: '10:00 - 11:30', subject: 'Database Systems (IT302)', meta: 'BSIT-3B • Prof. Admin • Lab 2', mode: 'Face-To-Face' },
    { day: 'TUESDAY', time: '13:00 - 15:00', subject: 'Ethics (ETCHS)', meta: 'BSIT2C, BSIT2D • Azryth Sacuan • 202', mode: 'Face-To-Face' },
    { day: 'TUESDAY', time: '13:00 - 15:00', subject: 'Ethics (ETCHS)', meta: 'BSIT2C, BSIT2D • Azryth Sacuan • 202', mode: 'Face-To-Face' },
    { day: 'TUESDAY', time: '08:00 - 09:30', subject: 'Data Structures (CS201)', meta: 'BSCS-2A • Prof. Admin • Room 301', mode: 'Face-To-Face' },
    { day: 'WEDNESDAY', time: '13:00 - 14:30', subject: 'Web Development (IT301)', meta: 'BSIT-3A • Prof. Admin • LRT 1', mode: 'Online' },
  ];

  get groupedDays(): { day: string; items: ScheduleItem[] }[] {
    const grouped: Record<string, ScheduleItem[]> = {};
    this.schedules.forEach((item) => {
      grouped[item.day] ??= [];
      grouped[item.day].push(item);
    });
    return Object.keys(grouped).map((day) => ({ day, items: grouped[day] }));
  }
}
