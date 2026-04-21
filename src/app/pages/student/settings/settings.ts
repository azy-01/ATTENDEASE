import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-student-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
})
export class StudentSettingsComponent {
  fullName = 'NRCK';
  email = 'nerickjanio77@gmail.com';
  saveMessage = '';

  constructor(private router: Router) {}

  saveChanges(): void {
    this.saveMessage = 'Settings saved.';
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
