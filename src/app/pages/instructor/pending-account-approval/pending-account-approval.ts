import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { StudentApiService, type AuthAccount } from '../../../core/data/student-api.service';

@Component({
  selector: 'app-pending-account-approval',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <section class="card">
        <h3>Pending Account Approval</h3>
        <p class="section-sub">Approve new instructor/student registrations.</p>

        <ng-container *ngIf="isAdmin; else noAccess">
          <p class="save-message" *ngIf="message()">{{ message() }}</p>
          <p class="empty" *ngIf="!pendingAccounts().length">No pending registrations.</p>

          <div class="pending-row" *ngFor="let account of pendingAccounts()">
            <div>
              <strong>{{ account.fullName }}</strong>
              <p>{{ account.email }} • {{ account.role }}</p>
            </div>
            <button type="button" class="approve-btn" (click)="approveRegistration(account.id)">Approve</button>
          </div>
        </ng-container>
      </section>
    </div>

    <ng-template #noAccess>
      <p class="no-access">Only admin accounts can approve registrations.</p>
    </ng-template>
  `,
  styles: [`
    .page { max-width: 920px; display: flex; flex-direction: column; gap: 14px; }
    .card { background: #fff; border: 1px solid #edf0f5; border-radius: 12px; padding: 18px; }
    h3 { margin: 0 0 8px; font-size: 20px; }
    .section-sub { margin: 0 0 14px; color: #6b7280; font-size: 13px; }
    .empty { color: #6b7280; font-size: 13px; margin: 0; }
    .pending-row {
      display: flex; justify-content: space-between; gap: 12px; align-items: center;
      border: 1px solid #edf0f5; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px;
    }
    .pending-row p { margin: 4px 0 0; color: #6b7280; font-size: 12px; }
    .approve-btn {
      border: none; border-radius: 8px; padding: 8px 12px; background: #16a34a; color: #fff; cursor: pointer; font-weight: 600;
    }
    .save-message { margin: 8px 0 12px; color: #16a34a; font-size: 12px; }
    .no-access { margin: 0; color: #b91c1c; font-size: 13px; }
    :host-context(body.dark-mode) .card { background: #111827; border-color: #1f2937; }
    :host-context(body.dark-mode) h3 { color: #e5e7eb; }
    :host-context(body.dark-mode) .section-sub,
    :host-context(body.dark-mode) .empty,
    :host-context(body.dark-mode) .pending-row p { color: #94a3b8; }
    :host-context(body.dark-mode) .pending-row { border-color: #374151; background: #0f172a; }
    :host-context(body.dark-mode) .save-message { color: #86efac; }
    :host-context(body.dark-mode) .no-access { color: #fca5a5; }
  `],
})
export class PendingAccountApprovalComponent {
  private readonly authSessionStorageKey = 'attendease-auth-session';
  isAdmin = false;
  readonly message = signal('');
  readonly pendingAccounts = signal<AuthAccount[]>([]);

  constructor(private readonly api: StudentApiService) {
    this.resolveSessionRole();
    if (this.isAdmin) {
      void this.loadPendingAccounts();
    }
  }

  async approveRegistration(accountId: string): Promise<void> {
    const approved = await this.api.approveAccount(accountId);
    if (!approved) {
      this.message.set('Unable to approve account.');
      return;
    }
    this.pendingAccounts.set(this.pendingAccounts().filter((item) => item.id !== accountId));
    this.message.set('Registration approved.');
  }

  private resolveSessionRole(): void {
    const rawSession = localStorage.getItem(this.authSessionStorageKey);
    if (!rawSession) return;
    try {
      const parsed = JSON.parse(rawSession) as { role?: string };
      this.isAdmin = parsed.role === 'admin' || parsed.role === 'superadmin';
    } catch {
      localStorage.removeItem(this.authSessionStorageKey);
    }
  }

  private async loadPendingAccounts(): Promise<void> {
    try {
      this.pendingAccounts.set(await this.api.getPendingAccounts());
    } catch {
      this.pendingAccounts.set([]);
    }
  }
}
