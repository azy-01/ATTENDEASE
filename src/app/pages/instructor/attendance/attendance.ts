import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Session {
  subject: string;
  section: string;
  date: string;
  status: 'active' | 'completed' | 'cancelled';
}

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.html',
  styleUrls: ['./attendance.scss'],
})
export class AttendanceComponent {

  selectedSection: string = '';
  selectedSubject: string = '';
  isStarting: boolean = false;

  sections: string[] = [
    'BSIT-1A', 'BSIT-1B', 'BSIT-2A', 'BSIT-2B',
    'BSIT-3A', 'BSIT-3B', 'BSIT-4A', 'BSIT-4B',
    'BSCS-1A', 'BSCS-2A', 'BSCS-3A', 'BSCS-4A',
    'BSIT2C',
  ];

  subjects: string[] = [
    'Ethics',
    'Mathematics',
    'Science',
    'English',
    'Filipino',
    'Programming',
    'Networking',
    'Database Management',
    'Web Development',
    'Capstone Project',
  ];

  recentSessions: Session[] = [
    { subject: 'Ethics', section: 'BSIT2C', date: '2026-04-18', status: 'completed' },
    { subject: 'Ethics', section: 'BSIT2C', date: '2026-04-15', status: 'completed' },
  ];

  startSession(): void {
    if (!this.selectedSection || !this.selectedSubject) return;

    this.isStarting = true;

    setTimeout(() => {
      this.isStarting = false;

      // Add new session to the top of the list
      const today = new Date().toISOString().split('T')[0];
      this.recentSessions.unshift({
        subject: this.selectedSubject,
        section: this.selectedSection,
        date: today,
        status: 'active',
      });

      // Reset form
      this.selectedSection = '';
      this.selectedSubject = '';
    }, 1000);
  }
}