import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { InstructorHeaderComponent } from '../instructor-header/instructor-header';
import { InstructorSidebarComponent } from '../instructor-sidebar/instructor-sidebar';

@Component({
  selector: 'app-instructor-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    InstructorHeaderComponent,
    InstructorSidebarComponent,
  ],
  templateUrl: './instructor-layout.html',
  styleUrls: ['./instructor-layout.scss'],
})
export class InstructorLayoutComponent {
  sidebarOpen: boolean = false;
  pageTitle: string = 'Overview';
  userName: string = 'Azryth Sacuan';

  constructor(private router: Router) {
    this.updatePageTitle(this.router.url);
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updatePageTitle(event.urlAfterRedirects);
      }
    });
  }

  private updatePageTitle(url: string): void {
    const segment = url.split('/')[2] || 'overview';
    const titles: Record<string, string> = {
      overview: 'Overview',
      attendance: 'Attendance Session',
      records: 'Attendance Records',
      students: 'Students',
      classes: 'Classes',
      schedules: 'Schedules',
      reports: 'Reports',
      settings: 'Settings',
      account: 'Account',
    };
    this.pageTitle = titles[segment] ?? 'Overview';
  }
}