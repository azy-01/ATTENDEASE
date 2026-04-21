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
  selector: 'app-instructor-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './instructor-sidebar.html',
  styleUrls: ['./instructor-sidebar.scss'],
})
export class InstructorSidebarComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Output() closeSidebar = new EventEmitter<void>();
  isDarkMode = false;
  private readonly themeStorageKey = 'attendease-theme';

  navItems: NavItem[] = [
    { route: '/instructor/overview', icon: 'dashboard', label: 'Overview' },
    { route: '/instructor/attendance', icon: 'event_available', label: 'Attendance' },
    { route: '/instructor/records', icon: 'description', label: 'Records' },
    { route: '/instructor/students', icon: 'people', label: 'Students' },
    { route: '/instructor/classes', icon: 'menu_book', label: 'Classes' },
    { route: '/instructor/schedules', icon: 'calendar_month', label: 'Schedules' },
    { route: '/instructor/reports', icon: 'bar_chart', label: 'Reports' },
    { route: '/instructor/settings', icon: 'settings', label: 'Settings' },
    { route: '/instructor/account', icon: 'person', label: 'Account' },
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

    // Clear auth tokens / session here, then redirect
    // e.g. this.authService.logout();
    this.router.navigate(['/']);
  }
}