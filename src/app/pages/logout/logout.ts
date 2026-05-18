import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthSessionService, type AuthSession } from '../../core/auth/auth-session.service';

@Component({
  selector: 'app-logout',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './logout.html',
  styleUrls: ['./logout.scss'],
})
export class LogoutComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authSession = inject(AuthSessionService);

  session: AuthSession | null = null;
  isSigningOut = false;

  ngOnInit(): void {
    this.session = this.authSession.getSession();
    if (!this.session) {
      void this.router.navigate(['/']);
    }
  }

  get userInitial(): string {
    const name = this.session?.fullName?.trim();
    return name ? name.charAt(0).toUpperCase() : 'A';
  }

  get roleLabel(): string {
    const role = this.session?.role;
    if (role === 'student') {
      return 'Student';
    }
    if (role === 'admin') {
      return 'Administrator';
    }
    if (role === 'superadmin') {
      return 'Super Admin';
    }
    return 'Instructor';
  }

  staySignedIn(): void {
    const returnPath = this.authSession.getReturnPath(this.session?.role);
    void this.router.navigate([returnPath]);
  }

  confirmSignOut(): void {
    if (this.isSigningOut) {
      return;
    }

    this.isSigningOut = true;
    this.authSession.clearSession();
    void this.router.navigate(['/'], { queryParams: { signedOut: '1' } });
  }
}
