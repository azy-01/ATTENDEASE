import { Injectable } from '@angular/core';

export type AuthSessionRole = 'instructor' | 'student' | 'admin' | 'superadmin';

export interface AuthSession {
  role: AuthSessionRole;
  fullName: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly authSessionStorageKey = 'attendease-auth-session';
  private readonly studentProfileStorageKey = 'student-account-profile';

  getSession(): AuthSession | null {
    const raw = localStorage.getItem(this.authSessionStorageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<AuthSession>;
      if (!parsed.role || !parsed.fullName || !parsed.email) {
        return null;
      }
      return {
        role: parsed.role,
        fullName: parsed.fullName.trim(),
        email: parsed.email.trim().toLowerCase(),
      };
    } catch {
      localStorage.removeItem(this.authSessionStorageKey);
      return null;
    }
  }

  clearSession(): void {
    localStorage.removeItem(this.authSessionStorageKey);
    localStorage.removeItem(this.studentProfileStorageKey);
  }

  getReturnPath(role: AuthSessionRole | undefined): string {
    if (role === 'student') {
      return '/student/overview';
    }
    if (role === 'admin' || role === 'superadmin') {
      return '/instructor/students';
    }
    return '/instructor/overview';
  }
}
