export interface NotificationVisual {
  icon: string;
  accent: string;
  accentBg: string;
}

/** Maps notification titles to icon and accent colors for the activity feed. */
export function getNotificationVisual(title: string): NotificationVisual {
  const normalized = title.toLowerCase();

  if (normalized.includes('fail') || normalized.includes('error')) {
    return { icon: 'error_outline', accent: '#dc2626', accentBg: '#fef2f2' };
  }
  if (normalized.includes('attendance')) {
    return { icon: 'fact_check', accent: '#059669', accentBg: '#ecfdf5' };
  }
  if (normalized.includes('class') || normalized.includes('archive')) {
    return { icon: 'class', accent: '#4f46e5', accentBg: '#eef2ff' };
  }
  if (normalized.includes('student')) {
    return { icon: 'person', accent: '#2563eb', accentBg: '#eff6ff' };
  }
  if (normalized.includes('registration')) {
    return { icon: 'person_add', accent: '#7c3aed', accentBg: '#f5f3ff' };
  }

  return { icon: 'notifications', accent: '#4f46e5', accentBg: '#f5f3ff' };
}

/** Human-readable relative time for notification timestamps. */
export function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) {
    return 'Just now';
  }

  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) {
    return 'Just now';
  }

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    return 'Just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
