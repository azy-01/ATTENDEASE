import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentApiService, type InstructorSession } from '../../../core/data/student-api.service';

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

  recentSessions: InstructorSession[] = [];

  constructor(private readonly api: StudentApiService) {
    void this.loadSessions();
  }

  startSession(): void {
    if (!this.selectedSection || !this.selectedSubject) return;

    this.isStarting = true;

    setTimeout(async () => {
      this.isStarting = false;

      // Add new session to the top of the list
      const today = new Date().toISOString().split('T')[0];
      const newSession: InstructorSession = {
        id: `session-${Date.now()}`,
        subject: this.selectedSubject,
        section: this.selectedSection,
        date: today,
        status: 'active',
      };

      try {
        const saved = await this.api.addInstructorSession(newSession);
        this.recentSessions = [saved, ...this.recentSessions];
      } catch {
        this.recentSessions = [newSession, ...this.recentSessions];
      }

      // Reset form
      this.selectedSection = '';
      this.selectedSubject = '';
    }, 1000);
  }

  private async loadSessions(): Promise<void> {
    try {
      this.recentSessions = await this.api.getInstructorSessions();
    } catch {
      this.recentSessions = [];
    }
  }
}