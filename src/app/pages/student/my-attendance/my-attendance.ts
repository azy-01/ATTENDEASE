import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentApiService, type AttendanceRecord } from '../../../core/data/student-api.service';

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

  private allRecords: AttendanceRecord[] = [];

  constructor(private readonly studentApi: StudentApiService) {
    void this.loadAttendanceRecords();
  }

  get hasRecords(): boolean {
    return this.records.length > 0;
  }

  get records(): AttendanceRecord[] {
    const from = this.fromDate ? new Date(this.fromDate) : null;
    const to = this.toDate ? new Date(this.toDate) : null;

    return this.allRecords.filter((record) => {
      const matchesSubject = !this.selectedSubject || record.subject === this.selectedSubject;
      const matchesStatus = !this.selectedStatus || record.status === this.selectedStatus;
      const recordDate = new Date(record.date);
      const matchesFromDate = !from || recordDate >= from;
      const matchesToDate = !to || recordDate <= to;

      return matchesSubject && matchesStatus && matchesFromDate && matchesToDate;
    });
  }

  get subjects(): string[] {
    return [...new Set(this.allRecords.map((record) => record.subject))];
  }

  clearFilters(): void {
    this.selectedSubject = '';
    this.selectedStatus = '';
    this.fromDate = '';
    this.toDate = '';
  }

  private async loadAttendanceRecords(): Promise<void> {
    try {
      this.allRecords = await this.studentApi.getAttendanceRecords();
    } catch {
      this.allRecords = [];
    }
  }
}
