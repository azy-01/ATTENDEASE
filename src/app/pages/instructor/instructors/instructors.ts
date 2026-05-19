import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StudentApiService } from '../../../core/data/student-api.service';

@Component({
  selector: 'app-instructors-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <section class="card">
        <h3>Account Creation</h3>
        <p class="section-sub">Create instructor/student accounts.</p>

        <ng-container *ngIf="isAdmin; else noAccess">
          <div class="admin-grid">
            <div class="admin-col">
              <label>
                <span>Role</span>
                <select [ngModel]="newAccountRole()" (ngModelChange)="newAccountRole.set($event)">
                  <option value="instructor">Instructor</option>
                  <option value="student">Student</option>
                </select>
              </label>
              <label>
                <span>Last Name</span>
                <input [ngModel]="newAccountLastName()" (ngModelChange)="newAccountLastName.set($event)" />
              </label>
              <label>
                <span>Password</span>
                <input type="password" [ngModel]="newAccountPassword()" (ngModelChange)="newAccountPassword.set($event)" />
              </label>
              <label *ngIf="newAccountRole() === 'student'">
                <span>Student ID</span>
                <input [ngModel]="newAccountStudentId()" (ngModelChange)="newAccountStudentId.set($event)" />
              </label>
            </div>
            <div class="admin-col">
              <label>
                <span>First Name</span>
                <input [ngModel]="newAccountFirstName()" (ngModelChange)="newAccountFirstName.set($event)" />
              </label>
              <label>
                <span>Gmail Address</span>
                <input
                  type="email"
                  [ngModel]="newAccountEmail()"
                  (ngModelChange)="newAccountEmail.set($event)"
                  placeholder="name@gmail.com"
                />
                <span class="field-hint">Instructor and student accounts must use a real @gmail.com address for notifications.</span>
              </label>
              <label *ngIf="newAccountRole() === 'student'">
                <span>Section</span>
                <input [ngModel]="newAccountSection()" (ngModelChange)="newAccountSection.set($event)" />
              </label>
            </div>
          </div>
          <button type="button" class="save-btn" (click)="createManagedAccount()">Create Account</button>
          <p class="save-message" *ngIf="message()">{{ message() }}</p>
        </ng-container>
      </section>
    </div>

    <ng-template #noAccess>
      <p class="no-access">Only admin accounts can manage user accounts.</p>
    </ng-template>
  `,
  styles: [`
    .page { max-width: 920px; display: flex; flex-direction: column; gap: 14px; }
    .card { background: #fff; border: 1px solid #edf0f5; border-radius: 12px; padding: 18px; }
    h3 { margin: 0 0 8px; font-size: 20px; }
    .section-sub { margin: 0 0 14px; color: #6b7280; font-size: 13px; }
    .admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; align-items: start; }
    .admin-col { display: flex; flex-direction: column; gap: 10px; }
    label { display: block; margin: 0; font-size: 13px; color: #374151; font-weight: 600; }
    label span { display: block; margin-bottom: 6px; }
    input, select {
      width: 100%; height: 38px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0 12px; color: #6b7280; background: #fff;
    }
    .save-btn {
      margin-top: 14px; border: none; border-radius: 8px; padding: 10px 16px; background: #4f46e5;
      color: #fff; cursor: pointer; font-weight: 600;
    }
    .save-message { margin: 8px 0 0; color: #16a34a; font-size: 12px; }
    .field-hint { display: block; margin-top: 6px; font-size: 11px; font-weight: 500; color: #6b7280; line-height: 1.4; }
    .no-access { margin: 0; color: #b91c1c; font-size: 13px; }
    :host-context(body.dark-mode) .card { background: #111827; border-color: #1f2937; }
    :host-context(body.dark-mode) h3 { color: #e5e7eb; }
    :host-context(body.dark-mode) .section-sub,
    :host-context(body.dark-mode) label { color: #94a3b8; }
    :host-context(body.dark-mode) input,
    :host-context(body.dark-mode) select {
      background: #0f172a; border-color: #374151; color: #cbd5e1;
    }
    :host-context(body.dark-mode) .save-message { color: #86efac; }
    :host-context(body.dark-mode) .no-access { color: #fca5a5; }
  `],
})
export class InstructorsManagementComponent {
  private readonly authSessionStorageKey = 'attendease-auth-session';
  isAdmin = false;

  readonly message = signal('');
  readonly newAccountRole = signal<'instructor' | 'student'>('instructor');
  readonly newAccountFirstName = signal('');
  readonly newAccountLastName = signal('');
  readonly newAccountEmail = signal('');
  readonly newAccountPassword = signal('');
  readonly newAccountStudentId = signal('');
  readonly newAccountSection = signal('');

  constructor(private readonly api: StudentApiService) {
    this.resolveSessionRole();
  }

  async createManagedAccount(): Promise<void> {
    this.message.set('');
    const role = this.newAccountRole();
    const firstName = this.newAccountFirstName().trim();
    const lastName = this.newAccountLastName().trim();
    const email = this.newAccountEmail().trim();
    const password = this.newAccountPassword().trim();
    if (!firstName || !lastName || !email || !password) {
      this.message.set('All fields are required.');
      return;
    }

    const studentId = this.newAccountStudentId().trim();
    const section = this.newAccountSection().trim();
    if (role === 'student' && !studentId) {
      this.message.set('Student ID is required for student accounts.');
      return;
    }

    try {
      await this.api.createManagedAccount({
        role,
        firstName,
        lastName,
        email,
        password,
        ...(role === 'student' ? { studentId, section } : {})
      });
      this.newAccountFirstName.set('');
      this.newAccountLastName.set('');
      this.newAccountEmail.set('');
      this.newAccountPassword.set('');
      this.newAccountStudentId.set('');
      this.newAccountSection.set('');
      this.message.set(
        role === 'student'
          ? 'Student account created. They now appear in the Students list.'
          : 'Account created and approved.'
      );
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Unable to create account.');
    }
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
}
