import { Injectable, computed, signal } from '@angular/core';

export type NotificationRole = 'instructor' | 'student' | 'admin' | 'superadmin';

const NOTIFICATION_ROLES: readonly NotificationRole[] = [
  'instructor',
  'student',
  'admin',
  'superadmin',
];

export interface ActivityNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  audience: NotificationRole;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly storageKey = 'attendease-notifications';
  private readonly maxItems = 50;

  private readonly allItems = signal<ActivityNotification[]>(this.loadItems());

  itemsForRole(role: NotificationRole) {
    return computed(() => this.allItems().filter((item) => item.audience === role));
  }

  unreadCountForRole(role: NotificationRole) {
    return computed(() => this.allItems().filter((item) => item.audience === role && !item.read).length);
  }

  add(title: string, message: string, audience: NotificationRole): void {
    const nextItem: ActivityNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
      read: false,
      audience,
    };

    const roleItems = this.allItems().filter((item) => item.audience === audience);
    const otherItems = this.allItems().filter((item) => item.audience !== audience);
    const updatedForRole = [nextItem, ...roleItems].slice(0, this.maxItems);
    const updated = [...updatedForRole, ...otherItems];
    this.allItems.set(updated);
    this.persist(updated);
  }

  markAllAsRead(audience: NotificationRole): void {
    const updated = this.allItems().map((item) =>
      item.audience === audience ? { ...item, read: true } : item
    );
    this.allItems.set(updated);
    this.persist(updated);
  }

  private loadItems(): ActivityNotification[] {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as Partial<ActivityNotification>[];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => Boolean(item?.id && item?.title && item?.message && item?.createdAt))
        .map((item) => ({
          id: item.id!,
          title: item.title!,
          message: item.message!,
          createdAt: item.createdAt!,
          read: Boolean(item.read),
          audience: this.normalizeAudience(item.audience),
        }));
    } catch {
      localStorage.removeItem(this.storageKey);
      return [];
    }
  }

  private normalizeAudience(audience: NotificationRole | undefined): NotificationRole {
    if (audience && NOTIFICATION_ROLES.includes(audience)) {
      return audience;
    }
    return 'instructor';
  }

  private persist(items: ActivityNotification[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }
}
