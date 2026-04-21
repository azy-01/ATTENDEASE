import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <section class="card">
        <h3>General</h3>
        <label>System Name</label>
        <input [(ngModel)]="systemName" />
        <label>Late Cutoff (minutes)</label>
        <input [(ngModel)]="lateCutoff" />
        <small>Students scanning after this many minutes will be marked as late.</small>
        <label>Absent Cutoff (minutes)</label>
        <input [(ngModel)]="absentCutoff" />
        <small>Students scanning after this many minutes will be marked as absent.</small>
        <div class="actions">
          <button type="button" class="save-btn" (click)="saveChanges()">Save Changes</button>
          <small class="save-message" *ngIf="saveMessage">{{ saveMessage }}</small>
        </div>
      </section>

    </div>
  `,
  styles: [`
    .page { display: grid; gap: 14px; max-width: 820px; }
    .card { background: #fff; border: 1px solid #edf0f5; border-radius: 12px; padding: 18px; }
    h3 { margin: 0 0 14px; font-size: 20px; }
    label { display: block; margin: 10px 0 6px; font-size: 13px; color: #374151; font-weight: 600; }
    input { width: 100%; height: 38px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0 12px; }
    small { display: block; margin-top: 6px; color: #9ca3af; font-size: 12px; }
    .actions { margin-top: 14px; display: flex; align-items: center; gap: 10px; }
    .save-btn { height: 36px; border: none; border-radius: 8px; background: #4f46e5; color: #fff; font-size: 13px; font-weight: 600; padding: 0 14px; cursor: pointer; }
    .save-message { margin-top: 0; color: #16a34a; }
    .toggle-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .toggle-row p { margin: 2px 0 0; color: #6b7280; font-size: 13px; }
    .toggle-row input { width: 42px; height: 24px; }
    :host-context(body.dark-mode) .card {
      background: #111827;
      border-color: #1f2937;
    }
    :host-context(body.dark-mode) h3,
    :host-context(body.dark-mode) .toggle-row strong { color: #e5e7eb; }
    :host-context(body.dark-mode) label,
    :host-context(body.dark-mode) .toggle-row p { color: #94a3b8; }
    :host-context(body.dark-mode) input {
      background: #0f172a;
      border-color: #374151;
      color: #e5e7eb;
    }
    :host-context(body.dark-mode) small { color: #64748b; }
    :host-context(body.dark-mode) .save-message { color: #4ade80; }
  `],
})
export class SettingsComponent {
  systemName = 'AttendEase';
  lateCutoff = '15';
  absentCutoff = '30';
  saveMessage = '';

  saveChanges(): void {
    this.saveMessage = 'Settings saved.';
    setTimeout(() => {
      this.saveMessage = '';
    }, 2000);
  }
}
