import { Injectable, computed, signal } from '@angular/core';

export interface ActivityNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly storageKey = 'attendease-notifications';
  private readonly maxItems = 50;

  readonly items = signal<ActivityNotification[]>(this.loadItems());
  readonly unreadCount = computed(() => this.items().filter((item) => !item.read).length);

  add(title: string, message: string): void {
    const nextItem: ActivityNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
      read: false,
    };

    const updated = [nextItem, ...this.items()].slice(0, this.maxItems);
    this.items.set(updated);
    this.persist(updated);
  }

  markAllAsRead(): void {
    const updated = this.items().map((item) => ({ ...item, read: true }));
    this.items.set(updated);
    this.persist(updated);
  }

  private loadItems(): ActivityNotification[] {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as ActivityNotification[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) =>
        Boolean(item?.id && item?.title && item?.message && item?.createdAt)
      );
    } catch {
      localStorage.removeItem(this.storageKey);
      return [];
    }
  }

  private persist(items: ActivityNotification[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }
}
