import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { StudentHeaderComponent } from '../student-header/student-header';
import { StudentSidebarComponent } from '../student-sidebar/student-sidebar';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    StudentHeaderComponent,
    StudentSidebarComponent,
  ],
  templateUrl: './student-layout.html',
  styleUrls: ['./student-layout.scss'],
})
export class StudentLayoutComponent implements OnInit, OnDestroy {
  sidebarOpen: boolean = false;
  pageTitle: string = 'Overview';
  pageSubtitle: string = 'Welcome, NRCK';
  userName: string = 'NRCK';
  private routeSub?: Subscription;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.updatePageTitle(this.router.url);
    this.routeSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navEvent = event as NavigationEnd;
        this.updatePageTitle(navEvent.urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private updatePageTitle(url: string): void {
    if (url.includes('/student/schedule')) {
      this.pageTitle = 'Schedule';
      this.pageSubtitle = 'Your weekly class schedule';
    } else if (url.includes('/student/attendance')) {
      this.pageTitle = 'Attendance Records';
      this.pageSubtitle = 'View your attendance history';
    } else if (url.includes('/student/qr-code')) {
      this.pageTitle = 'My QR Code';
      this.pageSubtitle = 'Your personal attendance QR code';
    } else if (url.includes('/student/settings')) {
      this.pageTitle = 'Account & Settings';
      this.pageSubtitle = 'Manage your profile and preferences';
    } else if (url.includes('/student/account')) {
      this.pageTitle = 'Account & Settings';
      this.pageSubtitle = 'Manage your profile and preferences';
    } else {
      this.pageTitle = 'Overview';
      this.pageSubtitle = 'Welcome, NRCK';
    }
  }
}
