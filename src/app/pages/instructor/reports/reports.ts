import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface AttendanceRecord {
  studentName: string;
  studentId: string;
  section: string;
  subject: string;
  date: string;
  timeIn: string;
  status: 'Present' | 'Late' | 'Absent';
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss'],
})
export class Reports {
  classFilter = 'All Classes';
  startDate = '';
  endDate = '';

  readonly records: AttendanceRecord[] = [
    { studentName: 'Azryth Sacuan', studentId: '20241234567', section: 'BSIT1A', subject: 'Programming', date: '2026-04-15', timeIn: '07:58 AM', status: 'Present' },
    { studentName: 'Glaiza Kaye Valcorza', studentId: '2024123456', section: 'BSIT1B', subject: 'Programming', date: '2026-04-15', timeIn: '08:10 AM', status: 'Late' },
    { studentName: 'Azryth Sacuan', studentId: '20241234567', section: 'BSIT1A', subject: 'Ethics', date: '2026-04-16', timeIn: '08:01 AM', status: 'Present' },
    { studentName: 'Glaiza Kaye Valcorza', studentId: '2024123456', section: 'BSIT1B', subject: 'Ethics', date: '2026-04-16', timeIn: '--', status: 'Absent' },
    { studentName: 'Azryth Sacuan', studentId: '20241234567', section: 'BSIT1A', subject: 'Database Management', date: '2026-04-18', timeIn: '07:54 AM', status: 'Present' },
    { studentName: 'Glaiza Kaye Valcorza', studentId: '2024123456', section: 'BSIT1B', subject: 'Database Management', date: '2026-04-18', timeIn: '08:05 AM', status: 'Late' },
  ];

  get classOptions(): string[] {
    return [...new Set(this.records.map((record) => record.section))].sort();
  }

  get filteredRecords(): AttendanceRecord[] {
    return this.records.filter((record) => {
      if (this.classFilter !== 'All Classes' && record.section !== this.classFilter) return false;
      if (this.startDate && record.date < this.startDate) return false;
      if (this.endDate && record.date > this.endDate) return false;
      return true;
    });
  }

  get attendanceRate(): number {
    const total = this.filteredRecords.length;
    if (!total) return 0;
    const presentCount = this.filteredRecords.filter((record) => record.status === 'Present').length;
    return Math.round((presentCount / total) * 100);
  }

  get totalRecords(): number {
    return this.filteredRecords.length;
  }

  get totalStudents(): number {
    return new Set(this.filteredRecords.map((record) => record.studentId)).size;
  }

  get totalClasses(): number {
    return new Set(this.filteredRecords.map((record) => record.section)).size;
  }

  get statusBreakdown(): Array<{ label: string; count: number; percent: number }> {
    const statuses: Array<'Present' | 'Late' | 'Absent'> = ['Present', 'Late', 'Absent'];
    const total = this.filteredRecords.length;
    return statuses.map((label) => {
      const count = this.filteredRecords.filter((record) => record.status === label).length;
      const percent = total ? Math.round((count / total) * 100) : 0;
      return { label, count, percent };
    });
  }

  get sectionBreakdown(): Array<{ section: string; count: number; percent: number }> {
    const total = this.filteredRecords.length;
    return this.classOptions.map((section) => {
      const count = this.filteredRecords.filter((record) => record.section === section).length;
      const percent = total ? Math.round((count / total) * 100) : 0;
      return { section, count, percent };
    });
  }

  exportCsv(): void {
    if (!this.filteredRecords.length) {
      return;
    }

    const headers = ['Student', 'ID', 'Section', 'Subject', 'Date', 'Time In', 'Status'];
    const rows = this.filteredRecords.map((record) => [
      record.studentName,
      record.studentId,
      record.section,
      record.subject,
      record.date,
      record.timeIn,
      record.status,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `attendance-reports-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
