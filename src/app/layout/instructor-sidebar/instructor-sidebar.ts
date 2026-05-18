import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface NavItem {
  route: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-instructor-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './instructor-sidebar.html',
  styleUrls: ['./instructor-sidebar.scss'],
})
export class InstructorSidebarComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Output() closeSidebar = new EventEmitter<void>();
  private readonly authSessionStorageKey = 'attendease-auth-session';
  private currentRole: 'instructor' | 'admin' | 'superadmin' = 'instructor';

  navItems: NavItem[] = [];

  constructor() { }

  ngOnInit(): void {
    this.resolveSessionRole();
    this.navItems = this.buildNavItems();
  }

  close(): void {
    this.closeSidebar.emit();
  }

  private resolveSessionRole(): void {
    const rawSession = localStorage.getItem(this.authSessionStorageKey);
    if (!rawSession) return;
    try {
      const parsed = JSON.parse(rawSession) as { role?: string };
      if (parsed.role === 'admin' || parsed.role === 'superadmin') {
        this.currentRole = parsed.role;
      }
    } catch {
      localStorage.removeItem(this.authSessionStorageKey);
    }
  }

  private buildNavItems(): NavItem[] {
    const items: NavItem[] = [];

    if (this.currentRole === 'instructor') {
      items.push({ route: '/instructor/overview', icon: 'dashboard', label: 'Overview' });
    }

    items.push(
      { route: '/instructor/students', icon: 'people', label: 'Students' },
      { route: '/instructor/classes', icon: 'menu_book', label: 'Classes' },
    );

    if (this.currentRole === 'admin' || this.currentRole === 'superadmin') {
      items.splice(
        2,
        0,
        { route: '/instructor/instructor-accounts', icon: 'groups', label: 'Instructor Accounts' },
        { route: '/instructor/instructors', icon: 'person_add', label: 'Account Creation' },
        { route: '/instructor/pending-account-approval', icon: 'how_to_reg', label: 'Pending Approvals' },
        { route: '/instructor/archived-instructor-accounts', icon: 'inventory_2', label: 'Archives' }
      );
    } else {
      items.splice(
        2,
        0,
        { route: '/instructor/attendance', icon: 'event_available', label: 'Attendance' },
        { route: '/instructor/schedules', icon: 'calendar_month', label: 'Schedules' },
        { route: '/instructor/records', icon: 'description', label: 'Records' }
      );
      items.push({ route: '/instructor/reports', icon: 'bar_chart', label: 'Reports' });
    }

    items.push({ route: '/instructor/account', icon: 'person', label: 'Account' });

    return items;
  }
}