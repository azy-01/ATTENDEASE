import { Component, Input, Output, EventEmitter, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../core/data/notification.service';

@Component({
  selector: 'app-student-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-header.html',
  styleUrls: ['./student-header.scss'],
})
export class StudentHeaderComponent {
  private readonly themeStorageKey = 'attendease-theme';
  private readonly router = inject(Router);
  readonly notificationService = inject(NotificationService);
  private readonly notificationRole = 'student' as const;

  @Input() pageTitle: string = 'Student Dashboard';
  @Input() pageSubtitle: string = 'Welcome';
  @Input() userName: string = 'Student';
  @Input() sidebarOpen: boolean = false;

  @Output() menuToggle = new EventEmitter<void>();
  profileMenuOpen = false;
  notificationMenuOpen = false;
  isDarkMode = localStorage.getItem(this.themeStorageKey) === 'dark';
  readonly notifications = this.notificationService.itemsForRole(this.notificationRole);
  readonly unreadCount = this.notificationService.unreadCountForRole(this.notificationRole);

  get userInitial(): string {
    return this.userName ? this.userName.charAt(0).toUpperCase() : 'S';
  }

  toggleSidebar(): void {
    this.menuToggle.emit();
  }

  @HostListener('document:click')
  closeMenus(): void {
    this.profileMenuOpen = false;
    this.notificationMenuOpen = false;
  }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.profileMenuOpen = !this.profileMenuOpen;
    this.notificationMenuOpen = false;
  }

  toggleNotificationMenu(event: Event): void {
    event.stopPropagation();
    this.notificationMenuOpen = !this.notificationMenuOpen;
    this.profileMenuOpen = false;
  }

  navigateTo(route: string, event: Event): void {
    event.stopPropagation();
    this.profileMenuOpen = false;
    this.notificationMenuOpen = false;
    void this.router.navigate([route]);
  }

  toggleTheme(event: Event): void {
    event.stopPropagation();
    this.isDarkMode = !this.isDarkMode;
    document.body.classList.toggle('dark-mode', this.isDarkMode);
    localStorage.setItem(this.themeStorageKey, this.isDarkMode ? 'dark' : 'light');
    this.profileMenuOpen = false;
  }

  markAllNotificationsAsRead(event: Event): void {
    event.stopPropagation();
    this.notificationService.markAllAsRead(this.notificationRole);
  }

  logout(event: Event): void {
    event.stopPropagation();
    this.profileMenuOpen = false;
    this.notificationMenuOpen = false;
    void this.router.navigate(['/logout']);
  }
}
