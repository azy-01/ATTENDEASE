import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-instructor-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './instructor-header.html',
  styleUrls: ['./instructor-header.scss'],
})
export class InstructorHeaderComponent {
  @Input() pageTitle: string = 'Overview';
  @Input() userName: string = 'Azryth Sacuan';
  @Input() sidebarOpen: boolean = false;

  @Output() menuToggle = new EventEmitter<void>();

  get userInitial(): string {
    return this.userName ? this.userName.charAt(0).toUpperCase() : 'A';
  }

  toggleSidebar(): void {
    this.menuToggle.emit();
  }
}