import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { StudentApiService } from '../data/student-api.service';

type UserRole = 'instructor' | 'student' | 'admin' | 'superadmin';

interface AuthSession {
  role: UserRole;
  fullName: string;
  email: string;
}

const authSessionStorageKey = 'attendease-auth-session';
const studentProfileStorageKey = 'student-account-profile';

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
  if (role === 'student') {
    return '/student/overview';
  }
  if (role === 'admin' || role === 'superadmin') {
    return '/instructor/students';
  }
  return '/instructor/overview';
}

export function allowRoles(allowedRoles: UserRole[]): CanActivateFn {
  return async () => {
    const router = inject(Router);
    const studentApi = inject(StudentApiService);
    const session = readAuthSession();

    if (!session) {
      return router.createUrlTree(['/']);
    }

    if (!allowedRoles.includes(session.role)) {
      return router.createUrlTree([resolveUnauthorizedRedirect(session.role)]);
    }

    const isSessionValid = await studentApi.isAuthSessionValid(session.role, session.email);
    if (!isSessionValid) {
      localStorage.removeItem(authSessionStorageKey);
      localStorage.removeItem(studentProfileStorageKey);
      return router.createUrlTree(['/']);
    }

    return true;
  };
}

export function allowRolesForChildren(allowedRoles: UserRole[]): CanActivateChildFn {
  return (childRoute, state) => allowRoles(allowedRoles)(childRoute, state);
}
