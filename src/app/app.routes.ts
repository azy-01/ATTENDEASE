import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing';
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
import { StudentLayoutComponent } from './layout/student-layout/student-layout';
import { StudentOverviewComponent } from './pages/student/overview/overview';
import { MyAttendanceComponent } from './pages/student/my-attendance/my-attendance';
import { StudentScheduleComponent } from './pages/student/schedule/schedule';
import { StudentQrCodeComponent } from './pages/student/qr-code/qr-code';
import { StudentSettingsComponent } from './pages/student/settings/settings';

export const routes: Routes = [
    { path: '', component: LandingComponent },
    {
        path: 'instructor',
        component: InstructorLayoutComponent,
        children: [
            { path: 'overview', component: OverviewComponent },
            { path: 'attendance', component: AttendanceComponent },
            { path: 'records', component: RecordsComponent },
            { path: 'students', component: StudentsComponent },
            { path: 'classes', component: ClassesComponent },
            { path: 'schedules', component: SchedulesComponent },
            { path: 'reports', component: Reports },
            { path: 'settings', component: SettingsComponent },
            { path: 'account', component: AccountComponent },
            { path: '', redirectTo: 'overview', pathMatch: 'full' },
        ],
    },
    {
        path: 'student',
        component: StudentLayoutComponent,
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