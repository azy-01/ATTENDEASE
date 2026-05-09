import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';

type UserRole = 'instructor' | 'student' | 'admin' | 'superadmin';

interface AuthSession {
  role: UserRole;
  fullName: string;
  email: string;
}

const authSessionStorageKey = 'attendease-auth-session';

function readAuthSession(): AuthSession | null {
  const rawSession = localStorage.getItem(authSessionStorageKey);
  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    localStorage.removeItem(authSessionStorageKey);
    return null;
  }
}

function resolveUnauthorizedRedirect(role: UserRole): string {
  return role === 'student' ? '/student/overview' : '/instructor/overview';
}

export function allowRoles(allowedRoles: UserRole[]): CanActivateFn {
  return () => {
    const router = inject(Router);
    const session = readAuthSession();

    if (!session) {
      return router.createUrlTree(['/']);
    }

    if (!allowedRoles.includes(session.role)) {
      return router.createUrlTree([resolveUnauthorizedRedirect(session.role)]);
    }

    return true;
  };
}

export function allowRolesForChildren(allowedRoles: UserRole[]): CanActivateChildFn {
  return (childRoute, state) => allowRoles(allowedRoles)(childRoute, state);
}
