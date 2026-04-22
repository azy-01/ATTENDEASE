import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

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

  fullName = 'NRCK';
  email = 'nerickjanio77@gmail.com';
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

    this.fullName = trimmedName;
    this.email = trimmedEmail;

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

  async logout(): Promise<void> {
    const result = await Swal.fire({
      title: 'Log out?',
      text: 'You will need to sign in again to continue.',
      icon: 'warning',
      customClass: {
        popup: 'swal-delete-popup',
      },
      showCancelButton: true,
      confirmButtonText: 'Yes, log out',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    this.router.navigate(['/']);
  }
}
