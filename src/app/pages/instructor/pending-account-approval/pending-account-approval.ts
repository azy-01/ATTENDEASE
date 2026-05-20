import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import Swal from 'sweetalert2';
import { AccountEmailService } from '../../../core/data/account-email.service';
import {
  StudentApiService,
  type AuthAccount,
  type VerificationDocument
} from '../../../core/data/student-api.service';

@Component({
  selector: 'app-pending-account-approval',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <section class="card">
        <h3>Pending Account Approval</h3>
        <p class="section-sub">
          Review new instructor and student registrations. Select a row to view full details, then approve or reject.
        </p>

        <ng-container *ngIf="isAdmin; else noAccess">
          <p class="save-message" *ngIf="message()">{{ message() }}</p>
          <p class="empty" *ngIf="!pendingAccounts().length">No pending registrations.</p>

          <div
            class="pending-row"
            *ngFor="let account of pendingAccounts()"
            role="button"
            tabindex="0"
            [attr.aria-label]="'Review registration for ' + account.fullName"
            (click)="openDetail(account)"
            (keydown.enter)="openDetail(account)"
            (keydown.space)="$event.preventDefault(); openDetail(account)"
          >
            <div class="pending-summary">
              <strong>{{ account.fullName }}</strong>
              <p>{{ account.email }} • {{ account.role }}</p>
              <p class="submitted-at" *ngIf="account.createdAt">Submitted {{ formatDate(account.createdAt) }}</p>
            </div>
            <span class="review-hint">View details →</span>
          </div>
        </ng-container>
      </section>
    </div>

    <div
      class="detail-overlay"
      *ngIf="selectedAccount()"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="'Registration details for ' + selectedAccount()!.fullName"
      (click)="closeDetail()"
    >
      <section class="detail-panel" (click)="$event.stopPropagation()">
        <button type="button" class="detail-close" (click)="closeDetail()" aria-label="Close details">×</button>

        <h4>{{ selectedAccount()!.fullName }}</h4>
        <p class="detail-role">{{ selectedAccount()!.role | titlecase }} registration</p>

        <dl class="detail-fields">
          <div class="detail-field">
            <dt>First name</dt>
            <dd>{{ selectedAccount()!.firstName }}</dd>
          </div>
          <div class="detail-field">
            <dt>Last name</dt>
            <dd>{{ selectedAccount()!.lastName }}</dd>
          </div>
          <div class="detail-field">
            <dt>Gmail</dt>
            <dd>{{ selectedAccount()!.email }}</dd>
          </div>
          <div class="detail-field">
            <dt>Role</dt>
            <dd>{{ selectedAccount()!.role }}</dd>
          </div>
          <div class="detail-field" *ngIf="selectedAccount()!.createdAt">
            <dt>Submitted</dt>
            <dd>{{ formatDate(selectedAccount()!.createdAt!) }}</dd>
          </div>
          <div class="detail-field">
            <dt>Registration type</dt>
            <dd>{{ selectedAccount()!.createdBy === 'admin' ? 'Created by admin' : 'Self-registration' }}</dd>
          </div>
        </dl>

        <div class="verification-docs" *ngIf="selectedAccount()!.verificationDocuments?.length; else noDocs">
          <p class="docs-label">Uploaded proof</p>
          <ul>
            <li *ngFor="let doc of selectedAccount()!.verificationDocuments">
              <img
                *ngIf="isImageDoc(doc)"
                class="doc-preview"
                [src]="doc.fileUrl"
                [alt]="doc.fileName"
              />
              <a [href]="doc.fileUrl" target="_blank" rel="noopener noreferrer" [attr.download]="doc.fileName">
                {{ doc.fileName }}
              </a>
              <span class="doc-meta">{{ formatDocMeta(doc) }}</span>
            </li>
          </ul>
        </div>
        <ng-template #noDocs>
          <p class="docs-missing">No verification documents uploaded.</p>
        </ng-template>

        <div class="detail-actions">
          <button type="button" class="reject-btn" (click)="rejectRegistration(selectedAccount()!)">
            Reject
          </button>
          <button type="button" class="approve-btn" (click)="approveRegistration(selectedAccount()!.id)">
            Approve
          </button>
        </div>
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
      border: 1px solid #edf0f5; border-radius: 10px; padding: 12px 14px; margin-bottom: 8px;
      cursor: pointer; transition: border-color .15s, box-shadow .15s;
    }
    .pending-row:hover, .pending-row:focus-visible {
      border-color: #c7d2fe; box-shadow: 0 0 0 3px rgba(79, 70, 229, .12); outline: none;
    }
    .pending-summary { flex: 1; min-width: 0; }
    .pending-row p { margin: 4px 0 0; color: #6b7280; font-size: 12px; }
    .submitted-at { font-size: 11px !important; color: #9ca3af !important; }
    .review-hint { flex-shrink: 0; font-size: 12px; font-weight: 600; color: #4f46e5; }
    .detail-overlay {
      position: fixed; inset: 0; z-index: 1200;
      background: rgba(15, 23, 42, .45); display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .detail-panel {
      position: relative; width: min(560px, 100%); max-height: 90vh; overflow-y: auto;
      background: #fff; border-radius: 14px; padding: 22px 20px 18px; border: 1px solid #e5e7eb;
      box-shadow: 0 20px 50px rgba(15, 23, 42, .18);
    }
    .detail-close {
      position: absolute; top: 10px; right: 12px; border: none; background: transparent;
      font-size: 24px; line-height: 1; color: #6b7280; cursor: pointer;
    }
    .detail-panel h4 { margin: 0 0 4px; font-size: 20px; }
    .detail-role { margin: 0 0 16px; color: #6b7280; font-size: 13px; text-transform: capitalize; }
    .detail-fields { margin: 0 0 16px; display: grid; gap: 10px; }
    .detail-field { display: grid; grid-template-columns: 120px 1fr; gap: 8px; font-size: 13px; }
    .detail-field dt { margin: 0; color: #6b7280; font-weight: 500; }
    .detail-field dd { margin: 0; color: #111827; font-weight: 600; word-break: break-word; }
    .verification-docs { margin-top: 4px; }
    .docs-label { margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #374151; }
    .verification-docs ul { margin: 0; padding-left: 18px; }
    .verification-docs li { margin-bottom: 10px; font-size: 12px; }
    .doc-preview {
      display: block; max-width: 100%; max-height: 200px; object-fit: contain;
      border-radius: 6px; border: 1px solid #e5e7eb; margin-bottom: 6px;
    }
    .verification-docs a { color: #4f46e5; font-weight: 600; text-decoration: none; }
    .verification-docs a:hover { text-decoration: underline; }
    .doc-meta { margin-left: 6px; color: #9ca3af; font-size: 11px; }
    .docs-missing { margin: 0 0 12px; font-size: 12px; color: #b45309; }
    .detail-actions {
      display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; padding-top: 14px;
      border-top: 1px solid #edf0f5;
    }
    .approve-btn, .reject-btn {
      border: none; border-radius: 8px; padding: 9px 14px; cursor: pointer; font-weight: 600; font-size: 13px;
    }
    .approve-btn { background: #16a34a; color: #fff; }
    .reject-btn { background: #fff; color: #b91c1c; border: 1px solid #fecaca; }
    .reject-btn:hover { background: #fef2f2; }
    .save-message { margin: 8px 0 12px; color: #16a34a; font-size: 12px; }
    .no-access { margin: 0; color: #b91c1c; font-size: 13px; }
    :host-context(body.dark-mode) .card { background: #111827; border-color: #1f2937; }
    :host-context(body.dark-mode) h3 { color: #e5e7eb; }
    :host-context(body.dark-mode) .section-sub,
    :host-context(body.dark-mode) .empty,
    :host-context(body.dark-mode) .pending-row p { color: #94a3b8; }
    :host-context(body.dark-mode) .pending-row {
      border-color: #374151; background: #0f172a;
    }
    :host-context(body.dark-mode) .pending-row:hover,
    :host-context(body.dark-mode) .pending-row:focus-visible { border-color: #6366f1; }
    :host-context(body.dark-mode) .review-hint { color: #a5b4fc; }
    :host-context(body.dark-mode) .detail-panel { background: #111827; border-color: #374151; }
    :host-context(body.dark-mode) .detail-panel h4,
    :host-context(body.dark-mode) .detail-field dd { color: #e5e7eb; }
    :host-context(body.dark-mode) .detail-role,
    :host-context(body.dark-mode) .detail-field dt { color: #94a3b8; }
    :host-context(body.dark-mode) .docs-label { color: #e5e7eb; }
    :host-context(body.dark-mode) .verification-docs a { color: #a5b4fc; }
    :host-context(body.dark-mode) .detail-actions { border-color: #374151; }
    :host-context(body.dark-mode) .reject-btn { background: #1f2937; border-color: #7f1d1d; color: #fca5a5; }
    :host-context(body.dark-mode) .save-message { color: #86efac; }
    :host-context(body.dark-mode) .no-access { color: #fca5a5; }
    :host-context(body.dark-mode) .docs-missing { color: #fcd34d; }
  `],
})
export class PendingAccountApprovalComponent {
  private readonly authSessionStorageKey = 'attendease-auth-session';
  isAdmin = false;
  readonly message = signal('');
  readonly pendingAccounts = signal<AuthAccount[]>([]);
  readonly selectedAccount = signal<AuthAccount | null>(null);

  constructor(
    private readonly api: StudentApiService,
    private readonly accountEmail: AccountEmailService
  ) {
    this.resolveSessionRole();
    if (this.isAdmin) {
      void this.loadPendingAccounts();
    }
  }

  isImageDoc(doc: VerificationDocument): boolean {
    return doc.contentType.startsWith('image/');
  }

  formatDocMeta(doc: VerificationDocument): string {
    const sizeKb = doc.sizeBytes < 1024 * 1024
      ? `${Math.round(doc.sizeBytes / 1024)} KB`
      : `${(doc.sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${sizeKb} • ${doc.contentType.includes('pdf') ? 'PDF' : 'Image'}`;
  }

  formatDate(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  openDetail(account: AuthAccount): void {
    this.selectedAccount.set(account);
  }

  closeDetail(): void {
    this.selectedAccount.set(null);
  }

  async approveRegistration(accountId: string): Promise<void> {
    const account = this.pendingAccounts().find((item) => item.id === accountId)
      ?? this.selectedAccount();
    if (!account) {
      this.message.set('Unable to approve account.');
      return;
    }

    const approved = await this.api.approveAccount(accountId);
    if (!approved) {
      this.message.set('Unable to approve account.');
      return;
    }

    const accountRole = account.role === 'student' ? 'student' : 'instructor';
    const emailResult = await this.accountEmail.sendRoleApprovalNotification({
      toEmail: account.email,
      recipientName: account.fullName,
      accountRole
    });

    this.removePending(accountId);
    this.closeDetail();

    if (emailResult.sent) {
      await Swal.fire({
        title: 'Registration approved',
        html: `<p><strong>${this.escapeHtml(account.fullName)}</strong> was approved.</p>
          <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Notification sent to ${this.escapeHtml(account.email)}</p>`,
        icon: 'success',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    await Swal.fire({
      title: 'Registration approved',
      text: `The account was approved, but the email could not be sent: ${emailResult.message}`,
      icon: 'warning',
      confirmButtonColor: '#4f46e5'
    });
  }

  async rejectRegistration(account: AuthAccount): Promise<void> {
    const result = await Swal.fire({
      title: 'Reject registration?',
      html: `<p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
        <strong>${this.escapeHtml(account.fullName)}</strong> (${this.escapeHtml(account.email)})
        will be removed from pending approvals. The reason below will be emailed to their Gmail.</p>`,
      input: 'textarea',
      inputLabel: 'Reason for rejection',
      inputPlaceholder: 'Explain why this registration was not approved...',
      inputAttributes: { 'aria-label': 'Reason for rejection' },
      inputValidator: (value) => {
        if (!value?.trim()) {
          return 'A reason is required before rejecting.';
        }
        return null;
      },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Reject & notify',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#b91c1c',
      reverseButtons: true
    });

    if (!result.isConfirmed || typeof result.value !== 'string') {
      return;
    }

    const reason = result.value.trim();
    try {
      const rejected = await this.api.rejectPendingAccount(account.id);
      if (!rejected) {
        await Swal.fire({
          title: 'Rejection failed',
          text: 'Unable to reject this registration. Please try again.',
          icon: 'error',
          confirmButtonColor: '#4f46e5'
        });
        return;
      }

      const accountRole = account.role === 'student' ? 'student' : 'instructor';
      const emailResult = await this.accountEmail.sendRoleRejectionNotification({
        toEmail: account.email,
        recipientName: account.fullName,
        accountRole,
        reason
      });

      this.removePending(account.id);
      this.closeDetail();

      if (emailResult.sent) {
        await Swal.fire({
          title: 'Registration rejected',
          html: `<p><strong>${this.escapeHtml(account.fullName)}</strong> was rejected.</p>
            <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Notification sent to ${this.escapeHtml(account.email)}</p>`,
          icon: 'success',
          confirmButtonColor: '#4f46e5'
        });
        return;
      }

      await Swal.fire({
        title: 'Registration rejected',
        text: `The registration was removed, but the email could not be sent: ${emailResult.message}`,
        icon: 'warning',
        confirmButtonColor: '#4f46e5'
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Unable to reject this registration.';
      await Swal.fire({
        title: 'Rejection failed',
        text,
        icon: 'error',
        confirmButtonColor: '#4f46e5'
      });
    }
  }

  private removePending(accountId: string): void {
    this.pendingAccounts.set(this.pendingAccounts().filter((item) => item.id !== accountId));
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
