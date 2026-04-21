import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-student-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-header.html',
  styleUrls: ['./student-header.scss'],
})
export class StudentHeaderComponent {
  @Input() pageTitle: string = 'Student Dashboard';
  @Input() pageSubtitle: string = 'Welcome';
  @Input() userName: string = 'Student';
  @Input() sidebarOpen: boolean = false;

  @Output() menuToggle = new EventEmitter<void>();

  get userInitial(): string {
    return this.userName ? this.userName.charAt(0).toUpperCase() : 'S';
  }

  toggleSidebar(): void {
    this.menuToggle.emit();
  }
}
