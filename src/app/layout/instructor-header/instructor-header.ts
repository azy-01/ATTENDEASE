import { Component, Input, Output, EventEmitter, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationRole, NotificationService } from '../../core/data/notification.service';

@Component({
  selector: 'app-instructor-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './instructor-header.html',
  styleUrls: ['./instructor-header.scss'],
})
export class InstructorHeaderComponent {
  private readonly authSessionStorageKey = 'attendease-auth-session';
  private readonly themeStorageKey = 'attendease-theme';
  private readonly router = inject(Router);
  readonly notificationService = inject(NotificationService);
  private readonly notificationRole = this.resolveNotificationRole();

  @Input() pageTitle: string = 'Overview';
  @Input() userName: string = '';
  @Input() sidebarOpen: boolean = false;

  @Output() menuToggle = new EventEmitter<void>();
  profileMenuOpen = false;
  notificationMenuOpen = false;
  isDarkMode = localStorage.getItem(this.themeStorageKey) === 'dark';
  readonly notifications = this.notificationService.itemsForRole(this.notificationRole);
  readonly unreadCount = this.notificationService.unreadCountForRole(this.notificationRole);

  get userInitial(): string {
    const name = this.userName?.trim();
    return name ? name.charAt(0).toUpperCase() : '?';
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

  private resolveNotificationRole(): NotificationRole {
    const raw = localStorage.getItem(this.authSessionStorageKey);
    if (!raw) return 'instructor';

    try {
      const session = JSON.parse(raw) as { role?: NotificationRole };
      const role = session.role;
      if (role === 'instructor' || role === 'admin' || role === 'superadmin') {
        return role;
      }
    } catch {
      return 'instructor';
    }

    return 'instructor';
  }

  logout(event: Event): void {
    event.stopPropagation();
    this.profileMenuOpen = false;
    this.notificationMenuOpen = false;
    void this.router.navigate(['/logout']);
  }
}