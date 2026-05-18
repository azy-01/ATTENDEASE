import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing';
import { LogoutComponent } from './pages/logout/logout';
import { InstructorLayoutComponent } from './layout/instructor-layout/instructor-layout';
import { OverviewComponent } from './pages/instructor/overview/overview';
import { AttendanceComponent } from './pages/instructor/attendance/attendance';
import { RecordsComponent } from './pages/instructor/records/records';
import { StudentsComponent } from './pages/instructor/students/students';
import { ClassesComponent } from './pages/instructor/classes/classes';
import { SchedulesComponent } from './pages/instructor/schedules/schedules';
import { Reports } from './pages/instructor/reports/reports';
import { SettingsComponent } from './pages/instructor/settings/settings';
import { AccountComponent } from './pages/instructor/account/account';
import { InstructorsManagementComponent } from './pages/instructor/instructors/instructors';
import { PendingAccountApprovalComponent } from './pages/instructor/pending-account-approval/pending-account-approval';
import { InstructorAccountsComponent } from './pages/instructor/instructor-accounts/instructor-accounts';
import { ArchivedInstructorAccountsComponent } from './pages/instructor/archived-instructor-accounts/archived-instructor-accounts';
import { StudentLayoutComponent } from './layout/student-layout/student-layout';
import { StudentOverviewComponent } from './pages/student/overview/overview';
import { MyAttendanceComponent } from './pages/student/my-attendance/my-attendance';
import { StudentScheduleComponent } from './pages/student/schedule/schedule';
import { StudentQrCodeComponent } from './pages/student/qr-code/qr-code';
import { StudentSettingsComponent } from './pages/student/settings/settings';
import { allowRoles, allowRolesForChildren } from './core/auth/auth.guard';

export const routes: Routes = [
    { path: '', component: LandingComponent },
    { path: 'logout', component: LogoutComponent },
    {
        path: 'instructor',
        component: InstructorLayoutComponent,
        canActivate: [allowRoles(['instructor', 'admin', 'superadmin'])],
        canActivateChild: [allowRolesForChildren(['instructor', 'admin', 'superadmin'])],
        children: [
            { path: 'overview', component: OverviewComponent, canActivate: [allowRoles(['instructor'])] },
            { path: 'attendance', component: AttendanceComponent, canActivate: [allowRoles(['instructor'])] },
            { path: 'records', component: RecordsComponent },
            { path: 'students', component: StudentsComponent },
            { path: 'classes', component: ClassesComponent },
            { path: 'schedules', component: SchedulesComponent },
            { path: 'reports', component: Reports, canActivate: [allowRoles(['instructor'])] },
            { path: 'settings', component: SettingsComponent },
            { path: 'instructors', component: InstructorsManagementComponent },
            { path: 'pending-account-approval', component: PendingAccountApprovalComponent },
            { path: 'instructor-accounts', component: InstructorAccountsComponent, canActivate: [allowRoles(['admin', 'superadmin'])] },
            { path: 'archived-instructor-accounts', component: ArchivedInstructorAccountsComponent, canActivate: [allowRoles(['admin', 'superadmin'])] },
            { path: 'account', component: AccountComponent },
            { path: '', redirectTo: 'overview', pathMatch: 'full' },
        ],
    },
    {
        path: 'student',
        component: StudentLayoutComponent,
        canActivate: [allowRoles(['student'])],
        canActivateChild: [allowRolesForChildren(['student'])],
        children: [
            { path: 'overview', component: StudentOverviewComponent },
            { path: 'schedule', component: StudentScheduleComponent },
            { path: 'attendance', component: MyAttendanceComponent },
            { path: 'qr-code', component: StudentQrCodeComponent },
            { path: 'settings', component: StudentSettingsComponent },
            { path: 'account', redirectTo: 'settings', pathMatch: 'full' },
            { path: '', redirectTo: 'overview', pathMatch: 'full' },
        ],
    },
];