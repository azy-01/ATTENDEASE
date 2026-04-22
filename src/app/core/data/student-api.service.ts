import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface ScheduleItem {
  day: string;
  time: string;
  subject: string;
  meta: string;
  mode: 'Face-To-Face' | 'Online';
}

export interface AttendanceRecord {
  subject: string;
  section: string;
  date: string;
  timeIn: string;
  status: 'Present' | 'Late' | 'Absent';
}

export interface StudentProfile {
  id: number;
  fullName: string;
  email: string;
}

export interface InstructorClass {
  id: string;
  name: string;
  program: string;
  yearLevel: string;
  studentCount: number;
  status: 'active' | 'inactive';
}

export interface InstructorStudent {
  id: string;
  name: string;
  studentId: string;
  email: string;
  section: string;
}

export interface InstructorSchedule {
  id: string;
  day: string;
  time: string;
  title: string;
  meta: string;
  mode: 'Face-To-Face' | 'Online';
}

export interface InstructorSession {
  id: string;
  subject: string;
  section: string;
  date: string;
  status: 'active' | 'completed' | 'cancelled';
}

export interface InstructorAccount {
  id: string;
  fullName: string;
  email: string;
}

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

@Injectable({ providedIn: 'root' })
export class StudentApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getSchedules(): Promise<ScheduleItem[]> {
    return firstValueFrom(this.http.get<ScheduleItem[]>(`${this.apiBaseUrl}/schedules`));
  }

  getAttendanceRecords(): Promise<AttendanceRecord[]> {
    return firstValueFrom(
      this.http.get<AttendanceRecord[]>(`${this.apiBaseUrl}/attendanceRecords`)
    );
  }

  getStudentProfile(email?: string): Promise<StudentProfile | null> {
    let params = new HttpParams();
    if (email) params = params.set('email', email);

    return firstValueFrom(
      this.http.get<StudentProfile[]>(`${this.apiBaseUrl}/students`, { params })
    ).then((students) => students[0] ?? null);
  }

  getInstructorClasses(): Promise<InstructorClass[]> {
    return firstValueFrom(this.http.get<InstructorClass[]>(`${this.apiBaseUrl}/instructorClasses`));
  }

  addInstructorClass(payload: InstructorClass): Promise<InstructorClass> {
    return firstValueFrom(
      this.http.post<InstructorClass>(`${this.apiBaseUrl}/instructorClasses`, payload)
    );
  }

  updateInstructorClass(id: string, payload: InstructorClass): Promise<InstructorClass> {
    return firstValueFrom(
      this.http.put<InstructorClass>(`${this.apiBaseUrl}/instructorClasses/${id}`, payload)
    );
  }

  deleteInstructorClass(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.apiBaseUrl}/instructorClasses/${id}`));
  }

  getInstructorStudents(): Promise<InstructorStudent[]> {
    return firstValueFrom(
      this.http.get<InstructorStudent[]>(`${this.apiBaseUrl}/instructorStudents`)
    );
  }

  addInstructorStudent(payload: InstructorStudent): Promise<InstructorStudent> {
    return firstValueFrom(
      this.http.post<InstructorStudent>(`${this.apiBaseUrl}/instructorStudents`, payload)
    );
  }

  updateInstructorStudent(id: string, payload: InstructorStudent): Promise<InstructorStudent> {
    return firstValueFrom(
      this.http.put<InstructorStudent>(`${this.apiBaseUrl}/instructorStudents/${id}`, payload)
    );
  }

  deleteInstructorStudent(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.apiBaseUrl}/instructorStudents/${id}`));
  }

  getInstructorSchedules(): Promise<InstructorSchedule[]> {
    return firstValueFrom(
      this.http.get<InstructorSchedule[]>(`${this.apiBaseUrl}/instructorSchedules`)
    );
  }

  addInstructorSchedule(payload: InstructorSchedule): Promise<InstructorSchedule> {
    return firstValueFrom(
      this.http.post<InstructorSchedule>(`${this.apiBaseUrl}/instructorSchedules`, payload)
    );
  }

  updateInstructorSchedule(id: string, payload: InstructorSchedule): Promise<InstructorSchedule> {
    return firstValueFrom(
      this.http.put<InstructorSchedule>(`${this.apiBaseUrl}/instructorSchedules/${id}`, payload)
    );
  }

  deleteInstructorSchedule(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.apiBaseUrl}/instructorSchedules/${id}`));
  }

  getInstructorSessions(): Promise<InstructorSession[]> {
    return firstValueFrom(
      this.http.get<InstructorSession[]>(`${this.apiBaseUrl}/instructorSessions`)
    );
  }

  addInstructorSession(payload: InstructorSession): Promise<InstructorSession> {
    return firstValueFrom(
      this.http.post<InstructorSession>(`${this.apiBaseUrl}/instructorSessions`, payload)
    );
  }

  getInstructorAccount(): Promise<InstructorAccount | null> {
    return firstValueFrom(
      this.http.get<InstructorAccount[]>(`${this.apiBaseUrl}/instructorAccounts`)
    ).then((accounts) => accounts[0] ?? null);
  }

  updateInstructorAccount(id: string, payload: InstructorAccount): Promise<InstructorAccount> {
    return firstValueFrom(
      this.http.put<InstructorAccount>(`${this.apiBaseUrl}/instructorAccounts/${id}`, payload)
    );
  }
}
