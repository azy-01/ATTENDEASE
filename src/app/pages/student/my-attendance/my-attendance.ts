import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface AttendanceRecord {
  subject: string;
  section: string;
  date: string;
  timeIn: string;
  status: 'Present' | 'Late' | 'Absent';
}

@Component({
  selector: 'app-my-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-attendance.html',
  styleUrls: ['./my-attendance.scss'],
})
export class MyAttendanceComponent {
  selectedSubject = '';
  selectedStatus = '';
  fromDate = '';
  toDate = '';

  records: AttendanceRecord[] = [];

  get hasRecords(): boolean {
    return this.records.length > 0;
  }
}
