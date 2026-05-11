import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface NavItem {
  route: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-student-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-sidebar.html',
  styleUrls: ['./student-sidebar.scss'],
})
export class StudentSidebarComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Output() closeSidebar = new EventEmitter<void>();

  // Student view keeps only learner-specific pages.
  navItems: NavItem[] = [
    { route: '/student/overview', icon: 'dashboard', label: 'Overview' },
    { route: '/student/schedule', icon: 'calendar_month', label: 'Schedule' },
    { route: '/student/attendance', icon: 'fact_check', label: 'Attendance' },
    { route: '/student/qr-code', icon: 'qr_code_2', label: 'QR Code' },
  ];

  constructor() { }

  ngOnInit(): void {}

  close(): void {
    this.closeSidebar.emit();
  }

}
