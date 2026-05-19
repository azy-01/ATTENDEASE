import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StudentApiService, type InstructorAccount } from '../../../core/data/student-api.service';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <section class="card">
        <h3>Profile</h3>
        <div class="profile-head">
          <div class="avatar">{{ userInitial }}</div>
          <div>
            <strong>{{ fullName() }}</strong>
            <p>{{ email() }}</p>
          </div>
        </div>

        <label>Full Name</label>
        <input [ngModel]="fullName()" (ngModelChange)="fullName.set($event)" />
        <label>Email</label>
        <input [ngModel]="email()" (ngModelChange)="email.set($event)" />
        <button type="button" class="save-btn" (click)="saveChanges()">Save Changes</button>
        <p class="save-message" *ngIf="saveMessage()">{{ saveMessage() }}</p>
      </section>

    </div>
  `,
  styles: [`
    .page { max-width: 780px; display: flex; flex-direction: column; gap: 14px; }
    .card { background: #fff; border: 1px solid #edf0f5; border-radius: 12px; padding: 18px; }
    h3 { margin: 0 0 16px; font-size: 20px; }
    .profile-head { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
    .avatar {
      width: 46px; height: 46px; border-radius: 50%; background: #eef2ff; color: #4f46e5;
      display: grid; place-items: center; font-weight: 700;
    }
    .profile-head p { margin: 2px 0 0; color: #6b7280; font-size: 13px; }
    label { display: block; margin: 10px 0 6px; font-size: 13px; color: #374151; font-weight: 600; }
    input { width: 100%; height: 38px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0 12px; color: #6b7280; }
    .save-btn {
      margin-top: 14px; border: none; border-radius: 8px; padding: 10px 16px; background: #4f46e5;
      color: #fff; cursor: pointer; font-weight: 600;
    }
    .save-message { margin: 8px 0 0; color: #16a34a; font-size: 12px; }
    :host-context(body.dark-mode) .card {
      background: #111827;
      border-color: #1f2937;
    }
    :host-context(body.dark-mode) h3,
    :host-context(body.dark-mode) .profile-head strong { color: #e5e7eb; }
    :host-context(body.dark-mode) .profile-head p,
    :host-context(body.dark-mode) label { color: #94a3b8; }
    :host-context(body.dark-mode) input {
      background: #0f172a;
      border-color: #374151;
      color: #cbd5e1;
    }
    :host-context(body.dark-mode) .save-message { color: #86efac; }
  `],
})
export class AccountComponent {
  private readonly profileStorageKey = 'instructor-account-profile';
  private readonly authSessionStorageKey = 'attendease-auth-session';
  private accountId = '';
  private currentRole: 'instructor' | 'admin' | 'superadmin' = 'instructor';

  readonly fullName = signal('');
  readonly email = signal('');
  readonly saveMessage = signal('');

  get userInitial(): string {
    const name = this.fullName().trim();
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  constructor(private readonly api: StudentApiService) {
    this.loadProfileFromSession();
    this.loadProfileFromLocalStorage();
    if (this.currentRole === 'instructor') {
      void this.loadProfileFromApi();
    }
  }

  async saveChanges(): Promise<void> {
    const trimmedName = this.fullName().trim();
    const trimmedEmail = this.email().trim();

    if (!trimmedName || !trimmedEmail) {
      this.saveMessage.set('Name and email are required.');
      return;
    }

    this.fullName.set(trimmedName);
    this.email.set(trimmedEmail);
    localStorage.setItem(
      this.profileStorageKey,
      JSON.stringify({ fullName: this.fullName(), email: this.email() })
    );
    localStorage.setItem(
      this.authSessionStorageKey,
      JSON.stringify({
        role: this.currentRole,
        fullName: this.fullName(),
        email: this.email().trim().toLowerCase()
      })
    );

    const payload: InstructorAccount = {
      id: this.accountId,
      fullName: this.fullName(),
      email: this.email(),
    };

    if (this.currentRole !== 'instructor') {
      this.saveMessage.set('Changes saved for current session.');
      return;
    }

    try {
      if (!this.accountId) {
        const existing = await this.api.getInstructorAccountByEmail(trimmedEmail);
        if (existing?.id) {
          this.accountId = existing.id;
          payload.id = existing.id;
        }
      }

      const updated = await this.api.updateInstructorAccount(this.accountId, payload);
      this.accountId = updated.id;
      this.fullName.set(updated.fullName);
      this.email.set(updated.email);
      this.saveMessage.set('Changes saved.');
    } catch {
      this.saveMessage.set('Changes saved locally. API not reachable.');
    }
  }

  private loadProfileFromLocalStorage(): void {
    const savedProfile = localStorage.getItem(this.profileStorageKey);
    if (!savedProfile) return;

    try {
      const parsed = JSON.parse(savedProfile) as { fullName?: string; email?: string };
      if (parsed.fullName && !this.fullName().trim()) this.fullName.set(parsed.fullName);
      if (parsed.email && !this.email().trim()) this.email.set(parsed.email);
    } catch {
      localStorage.removeItem(this.profileStorageKey);
    }
  }

  private loadProfileFromSession(): void {
    const rawSession = localStorage.getItem(this.authSessionStorageKey);
    if (!rawSession) return;
    try {
      const session = JSON.parse(rawSession) as {
        role?: 'instructor' | 'admin' | 'superadmin';
        fullName?: string;
        email?: string;
      };
      if (session.role) this.currentRole = session.role;
      if (session.fullName?.trim()) this.fullName.set(session.fullName.trim());
      if (session.email?.trim()) this.email.set(session.email.trim());
    } catch {
      localStorage.removeItem(this.authSessionStorageKey);
    }
  }

  private async loadProfileFromApi(): Promise<void> {
    const sessionEmail = this.email().trim();
    if (!sessionEmail) return;

    try {
      const account = await this.api.getInstructorAccountByEmail(sessionEmail);
      if (!account) return;

      this.accountId = account.id;
      this.fullName.set(account.fullName);
      this.email.set(account.email);
    } catch {
      // Keep session and local fallback values.
    }
  }

}
