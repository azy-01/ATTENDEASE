import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ActivityNotification,
  NotificationRole,
  NotificationService,
} from '../../core/data/notification.service';
import {
  formatNotificationTime,
  getNotificationVisual,
  NotificationVisual,
} from '../../core/utils/notification-display.utils';

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-panel.html',
  styleUrls: ['./notification-panel.scss'],
})
export class NotificationPanelComponent {
  private readonly notificationService = inject(NotificationService);

  readonly role = input.required<NotificationRole>();

  private readonly notificationsForRole = computed(() =>
    this.notificationService.itemsForRole(this.role())()
  );

  private readonly unreadForRole = computed(() =>
    this.notificationService.unreadCountForRole(this.role())()
  );

  notifications(): ActivityNotification[] {
    return this.notificationsForRole();
  }

  unreadCount(): number {
    return this.unreadForRole();
  }

  visualFor(title: string): NotificationVisual {
    return getNotificationVisual(title);
  }

  timeLabel(createdAt: string): string {
    return formatNotificationTime(createdAt);
  }

  handleMarkAllRead(event: Event): void {
    event.stopPropagation();
    if (this.unreadCount() === 0) {
      return;
    }
    this.notificationService.markAllAsRead(this.role());
  }

  handleNotificationClick(event: Event, notif: ActivityNotification): void {
    event.stopPropagation();
    if (!notif.read) {
      this.notificationService.markAsRead(notif.id);
    }
  }

  trackById(_index: number, notif: ActivityNotification): string {
    return notif.id;
  }
}
