import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-student-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account.html',
  styleUrls: ['./account.scss'],
})
export class StudentAccountComponent {
  private readonly profileStorageKey = 'student-account-profile';

  fullName = 'NRCK';
  email = 'nerickjanio77@gmail.com';
  saveMessage = '';

  constructor() {
    const savedProfile = localStorage.getItem(this.profileStorageKey);
    if (!savedProfile) return;

    try {
      const parsed = JSON.parse(savedProfile) as { fullName?: string; email?: string };
      if (parsed.fullName) this.fullName = parsed.fullName;
      if (parsed.email) this.email = parsed.email;
    } catch {
      localStorage.removeItem(this.profileStorageKey);
    }
  }

  saveChanges(): void {
    const trimmedName = this.fullName.trim();
    const trimmedEmail = this.email.trim();

    if (!trimmedName || !trimmedEmail) {
      this.saveMessage = 'Name and email are required.';
      return;
    }

    this.fullName = trimmedName;
    this.email = trimmedEmail;

    localStorage.setItem(
      this.profileStorageKey,
      JSON.stringify({ fullName: this.fullName, email: this.email })
    );
    this.saveMessage = 'Changes saved.';
  }
}
