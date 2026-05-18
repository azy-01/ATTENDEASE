import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import Swal from 'sweetalert2';
import { AccountEmailService } from '../../../core/data/account-email.service';
import { StudentApiService, type AuthAccount, type InstructorClass } from '../../../core/data/student-api.service';

@Component({
  selector: 'app-instructor-accounts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <section class="card">
        <h3>Instructor Accounts</h3>
        <p class="section-sub">All instructor login accounts in the system.</p>

        <p class="empty" *ngIf="!activeAccounts().length">No active instructor accounts found.</p>

        <div class="table-wrap" *ngIf="activeAccounts().length">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Allowed Classes</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let account of activeAccounts()">
                <td>{{ account.fullName }}</td>
                <td>{{ account.email }}</td>
                <td>
                  <ng-container *ngIf="getAllowedClassLabels(account).length; else noClassAccess">
                    {{ getAllowedClassLabels(account).join(', ') }}
                  </ng-container>
                  <ng-template #noClassAccess>
                    <span class="text-muted">No classes assigned</span>
                  </ng-template>
                </td>
                <td>
                  <span class="badge" [class.pending]="account.approvalStatus === 'pending'">
                    {{ account.approvalStatus }}
                  </span>
                </td>
                <td>{{ account.createdBy }}</td>
                <td class="actions-cell">
                  <button
                    type="button"
                    class="assign-btn"
                    (click)="openClassAssignment(account)"
                    [disabled]="account.approvalStatus !== 'approved'"
                  >
                    Set Classes
                  </button>
                  <button
                    type="button"
                    class="archive-btn"
                    *ngIf="account.approvalStatus === 'approved'"
                    (click)="archiveAccount(account)"
                    aria-label="Archive instructor account"
                  >
                    <svg class="archive-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path
                        fill="currentColor"
                        d="M20.54 5.23l-1.39-1.68A2 2 0 0 0 17.52 3H6.48c-.66 0-1.26.33-1.62.88L3.46 5.23A1 1 0 0 0 4 7h16a1 1 0 0 0 .54-1.77zM5.12 9l.81 9.12A2 2 0 0 0 7.92 20h8.16a2 2 0 0 0 1.99-1.88L18.88 9H5.12z"
                      />
                    </svg>
                    <span>Archive</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="modal-backdrop" *ngIf="editingAccount()" (click)="closeClassAssignment()">
        <div class="modal-card" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <h4>Set Allowed Classes</h4>
          <p class="section-sub">Select classes that {{ editingAccount()?.fullName }} can instruct.</p>
          <div class="class-options" *ngIf="classes().length; else noClasses">
            <label class="class-option" *ngFor="let classItem of classes()">
              <input
                type="checkbox"
                [checked]="isClassSelected(classItem.id)"
                (change)="toggleClassSelection(classItem.id, $event)"
              />
              <span>{{ classItem.name }} ({{ classItem.program }} - {{ classItem.yearLevel }})</span>
            </label>
          </div>
          <ng-template #noClasses>
            <p class="empty">No class records found. Add classes first.</p>
          </ng-template>
          <p class="save-message" *ngIf="saveMessage()">{{ saveMessage() }}</p>
          <div class="modal-actions">
            <button type="button" class="ghost-btn" (click)="closeClassAssignment()">Cancel</button>
            <button type="button" class="assign-btn" (click)="saveClassAssignment()">Save</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 14px; }
    .card { background: #fff; border: 1px solid #edf0f5; border-radius: 12px; padding: 18px; }
    h3 { margin: 0 0 8px; font-size: 20px; }
    .section-sub { margin: 0 0 14px; color: #6b7280; font-size: 13px; }
    .empty { margin: 0; color: #6b7280; font-size: 13px; }
    .table-wrap { border: 1px solid #edf0f5; border-radius: 10px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 11px 12px; border-bottom: 1px solid #f0f2f6; text-align: left; }
    th { color: #6b7280; font-weight: 700; background: #f8fafc; }
    td { color: #374151; }
    .text-muted { color: #9ca3af; font-size: 12px; }
    .badge {
      display: inline-block;
      padding: 2px 9px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      color: #166534;
      background: #dcfce7;
      text-transform: capitalize;
    }
    .badge.pending { color: #9a3412; background: #ffedd5; }
    .actions-cell {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .assign-btn {
      border: none;
      border-radius: 8px;
      height: 32px;
      padding: 0 10px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      background: #4f46e5;
      color: #fff;
    }
    .assign-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      display: grid;
      place-items: center;
      padding: 16px;
      z-index: 1200;
    }
    .modal-card {
      width: min(520px, 100%);
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px;
    }
    h4 { margin: 0 0 6px; color: #111827; }
    .class-options {
      border: 1px solid #edf0f5;
      border-radius: 8px;
      padding: 8px 10px;
      max-height: 220px;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 10px 0;
    }
    .class-option {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #374151;
      font-size: 13px;
    }
    .class-option input {
      width: 15px;
      height: 15px;
      margin: 0;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 12px;
    }
    .ghost-btn {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 0 12px;
      height: 32px;
      background: #fff;
      color: #374151;
      cursor: pointer;
    }
    .save-message { margin: 0; color: #16a34a; font-size: 12px; }
    :host-context(body.dark-mode) .card { background: #111827; border-color: #1f2937; }
    :host-context(body.dark-mode) h3 { color: #e5e7eb; }
    :host-context(body.dark-mode) .section-sub,
    :host-context(body.dark-mode) .empty { color: #94a3b8; }
    :host-context(body.dark-mode) .table-wrap { border-color: #374151; }
    :host-context(body.dark-mode) th {
      color: #94a3b8;
      background: #0f172a;
      border-bottom-color: #374151;
    }
    :host-context(body.dark-mode) td {
      color: #cbd5e1;
      border-bottom-color: #1f2937;
    }
    :host-context(body.dark-mode) .text-muted { color: #94a3b8; }
    :host-context(body.dark-mode) .modal-card {
      background: #111827;
      border-color: #374151;
    }
    :host-context(body.dark-mode) h4 { color: #e5e7eb; }
    :host-context(body.dark-mode) .class-options {
      border-color: #374151;
      background: #0f172a;
    }
    :host-context(body.dark-mode) .class-option { color: #cbd5e1; }
    :host-context(body.dark-mode) .ghost-btn {
      border-color: #374151;
      background: #0f172a;
      color: #cbd5e1;
    }
    :host-context(body.dark-mode) .save-message { color: #86efac; }
  `],
})
export class InstructorAccountsComponent {
  private readonly authSessionStorageKey = 'attendease-auth-session';
  readonly accounts = signal<AuthAccount[]>([]);
  readonly classes = signal<InstructorClass[]>([]);
  readonly editingAccount = signal<AuthAccount | null>(null);
  readonly selectedClassIds = signal<string[]>([]);
  readonly saveMessage = signal('');
  readonly activeAccounts = computed(() =>
    this.accounts().filter((account) => account.approvalStatus !== 'archived')
  );

  constructor(
    private readonly api: StudentApiService,
    private readonly accountEmail: AccountEmailService
  ) {
    void this.loadAccounts();
    void this.loadClasses();
  }

  async archiveAccount(account: AuthAccount): Promise<void> {
    const result = await Swal.fire({
      title: 'Archive instructor account?',
      html: `<p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
        This will disable login for <strong>${account.fullName}</strong> (${account.email}).
        The reason below will be emailed to their Gmail.</p>`,
      input: 'textarea',
      inputLabel: 'Reason for archiving',
      inputPlaceholder: 'Explain why this account is being archived...',
      inputAttributes: {
        'aria-label': 'Reason for archiving'
      },
      inputValidator: (value) => {
        if (!value?.trim()) {
          return 'A reason is required before archiving.';
        }
        return null;
      },
      icon: 'warning',
      customClass: { popup: 'swal-delete-popup' },
      showCancelButton: true,
      confirmButtonText: 'Archive & notify',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#b91c1c',
      reverseButtons: true
    });

    if (!result.isConfirmed || typeof result.value !== 'string') {
      return;
    }

    const reason = result.value.trim();
    try {
      const archived = await this.api.archiveInstructorAccount(
        account.id,
        reason,
        this.getAdminEmail()
      );
      if (!archived) {
        await Swal.fire({
          title: 'Archive failed',
          text: 'Unable to archive this account. Please try again.',
          icon: 'error',
          confirmButtonColor: '#4f46e5',
          customClass: { popup: 'swal-archive-result-popup' }
        });
        return;
      }

      const emailResult = await this.accountEmail.sendArchiveNotification({
        toEmail: account.email,
        recipientName: account.fullName,
        reason
      });

      this.accounts.set(this.accounts().filter((item) => item.id !== account.id));

      if (emailResult.sent) {
        await Swal.fire({
          title: 'Account archived',
          html: `
            <p class="archive-result-lead"><strong>${this.escapeHtml(account.fullName)}</strong> has been archived.</p>
            <p class="archive-result-email">Notification sent to<br><strong>${this.escapeHtml(account.email)}</strong></p>
          `,
          icon: 'success',
          confirmButtonText: 'Done',
          confirmButtonColor: '#16a34a',
          customClass: { popup: 'swal-archive-result-popup' }
        });
        return;
      }

      await Swal.fire({
        title: 'Account archived',
        html: `
          <p class="archive-result-lead"><strong>${this.escapeHtml(account.fullName)}</strong> has been archived.</p>
          <p class="archive-result-warning">Email could not be sent:<br>${this.escapeHtml(emailResult.message)}</p>
        `,
        icon: 'warning',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d97706',
        customClass: { popup: 'swal-archive-result-popup' }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to archive account.';
      await Swal.fire({
        title: 'Archive failed',
        text: message,
        icon: 'error',
        confirmButtonColor: '#4f46e5',
        customClass: { popup: 'swal-archive-result-popup' }
      });
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  getAllowedClassLabels(account: AuthAccount): string[] {
    const ids = account.allowedClassIds ?? [];
    if (!ids.length) {
      return [];
    }
    const classMap = new Map(this.classes().map((item) => [item.id, item.name]));
    return ids.map((id) => classMap.get(id)).filter((name): name is string => Boolean(name));
  }

  openClassAssignment(account: AuthAccount): void {
    this.editingAccount.set(account);
    this.selectedClassIds.set([...(account.allowedClassIds ?? [])]);
    this.saveMessage.set('');
  }

  closeClassAssignment(): void {
    this.editingAccount.set(null);
    this.selectedClassIds.set([]);
    this.saveMessage.set('');
  }

  isClassSelected(classId: string): boolean {
    return this.selectedClassIds().includes(classId);
  }

  toggleClassSelection(classId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.selectedClassIds());
    if (checked) {
      next.add(classId);
    } else {
      next.delete(classId);
    }
    this.selectedClassIds.set([...next]);
  }

  async saveClassAssignment(): Promise<void> {
    const account = this.editingAccount();
    if (!account) {
      return;
    }
    try {
      await this.api.updateAuthAccount(account.id, { allowedClassIds: this.selectedClassIds() });
      this.accounts.set(
        this.accounts().map((item) =>
          item.id === account.id ? { ...item, allowedClassIds: this.selectedClassIds() } : item
        )
      );
      this.saveMessage.set('Allowed classes updated.');
    } catch {
      this.saveMessage.set('Unable to save class assignments.');
    }
  }

  private async loadAccounts(): Promise<void> {
    try {
      const authAccounts = await this.api.getAuthAccountsByRole('instructor');
      this.accounts.set(authAccounts);
    } catch {
      this.accounts.set([]);
    }
  }

  private async loadClasses(): Promise<void> {
    try {
      this.classes.set(await this.api.getInstructorClasses());
    } catch {
      this.classes.set([]);
    }
  }

  private getAdminEmail(): string {
    const rawSession = localStorage.getItem(this.authSessionStorageKey);
    if (!rawSession) {
      return 'admin';
    }
    try {
      const parsed = JSON.parse(rawSession) as { email?: string };
      return parsed.email?.trim().toLowerCase() || 'admin';
    } catch {
      return 'admin';
    }
  }
}
