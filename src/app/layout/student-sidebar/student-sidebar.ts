import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import Swal from 'sweetalert2';

interface NavItem {
  route: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-student-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-sidebar.html',
  styleUrls: ['./student-sidebar.scss'],
})
export class StudentSidebarComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Output() closeSidebar = new EventEmitter<void>();
  isDarkMode = false;
  private readonly themeStorageKey = 'attendease-theme';
  private readonly authSessionStorageKey = 'attendease-auth-session';

  // Student view keeps only learner-specific pages.
  navItems: NavItem[] = [
    { route: '/student/overview', icon: 'dashboard', label: 'Overview' },
    { route: '/student/schedule', icon: 'calendar_month', label: 'Schedule' },
    { route: '/student/attendance', icon: 'fact_check', label: 'Attendance' },
    { route: '/student/qr-code', icon: 'qr_code_2', label: 'QR Code' },
    { route: '/student/settings', icon: 'manage_accounts', label: 'Account & Settings' },
  ];

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.isDarkMode = localStorage.getItem(this.themeStorageKey) === 'dark';
    document.body.classList.toggle('dark-mode', this.isDarkMode);
  }

  close(): void {
    this.closeSidebar.emit();
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    document.body.classList.toggle('dark-mode', this.isDarkMode);
    localStorage.setItem(this.themeStorageKey, this.isDarkMode ? 'dark' : 'light');
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

    localStorage.removeItem(this.authSessionStorageKey);
    this.router.navigate(['/']);
  }
}
