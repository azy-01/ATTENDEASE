import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { getGmailValidationError, normalizeEmailAddress } from '../../../core/utils/gmail.utils';

@Component({
  selector: 'app-student-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
})
export class StudentSettingsComponent {
  private readonly profileStorageKey = 'student-account-profile';
  private readonly settingsStorageKey = 'student-settings-preferences';
  fullName = 'Tiesha Kate D. Regular';
  email = 'regular.tieshakated@gmail.com';
  emailNotifications = true;
  attendanceReminders = true;
  saveMessage = '';

  constructor(private router: Router) {
    const savedProfile = localStorage.getItem(this.profileStorageKey);
    if (savedProfile) {
      try {
        const parsedProfile = JSON.parse(savedProfile) as { fullName?: string; email?: string };
        if (parsedProfile.fullName) this.fullName = parsedProfile.fullName;
        if (parsedProfile.email) this.email = parsedProfile.email;
      } catch {
        localStorage.removeItem(this.profileStorageKey);
      }
    }

    const savedSettings = localStorage.getItem(this.settingsStorageKey);
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings) as {
          emailNotifications?: boolean;
          attendanceReminders?: boolean;
        };
        if (typeof parsedSettings.emailNotifications === 'boolean') {
          this.emailNotifications = parsedSettings.emailNotifications;
        }
        if (typeof parsedSettings.attendanceReminders === 'boolean') {
          this.attendanceReminders = parsedSettings.attendanceReminders;
        }
      } catch {
        localStorage.removeItem(this.settingsStorageKey);
      }
    }
  }

  get avatarInitial(): string {
    return this.fullName.trim().charAt(0).toUpperCase() || 'S';
  }

  saveChanges(): void {
    const trimmedName = this.fullName.trim();
    const trimmedEmail = this.email.trim();

    if (!trimmedName || !trimmedEmail) {
      this.saveMessage = 'Name and email are required.';
      return;
    }

    const gmailError = getGmailValidationError(trimmedEmail);
    if (gmailError) {
      this.saveMessage = gmailError;
      return;
    }

    this.fullName = trimmedName;
    this.email = normalizeEmailAddress(trimmedEmail);

    localStorage.setItem(
      this.profileStorageKey,
      JSON.stringify({ fullName: this.fullName, email: this.email })
    );
    localStorage.setItem(
      this.settingsStorageKey,
      JSON.stringify({
        emailNotifications: this.emailNotifications,
        attendanceReminders: this.attendanceReminders,
      })
    );

    this.saveMessage = 'Account and settings saved.';
    setTimeout(() => {
      this.saveMessage = '';
    }, 2000);
  }

  logout(): void {
    void this.router.navigate(['/logout']);
  }
}
