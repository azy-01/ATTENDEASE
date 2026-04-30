import { Injectable } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  where,
  type Firestore
} from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { environment } from '../../../environments/environment';

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
  id: string;
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
  section: string;
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

export interface AuthAccount {
  id: string;
  role: 'instructor' | 'student';
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  password: string;
}

interface DefaultAccountSeed {
  id: string;
  fullName: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class StudentApiService {
  private readonly db: Firestore = getFirestore(
    getApps()[0] ?? initializeApp(environment.firebase)
  );
  private readonly defaultStudentAccount: DefaultAccountSeed = {
    id: 'std-acc-1',
    fullName: 'Tiesha Kate D. Regular',
    email: 'regular.tieshakated@gmail.com'
  };
  private readonly defaultInstructorAccount: DefaultAccountSeed = {
    id: 'ins-acc-1',
    fullName: 'Azryth Sacuan',
    email: 'sacuan.azryth0@gmail.com'
  };
  private readonly defaultAuthAccounts: AuthAccount[] = [
    {
      id: 'auth-ins-1',
      role: 'instructor',
      firstName: 'Instructor',
      lastName: 'Demo',
      fullName: 'Instructor Demo',
      email: 'instructor@gmail.com',
      password: 'Instructor123'
    },
    {
      id: 'auth-std-1',
      role: 'student',
      firstName: 'Student',
      lastName: 'Demo',
      fullName: 'Student Demo',
      email: 'student@email.com',
      password: 'Student123'
    },
    {
      id: 'auth-std-2',
      role: 'student',
      firstName: 'Student',
      lastName: 'Gmail',
      fullName: 'Student Gmail',
      email: 'student@gmail.com',
      password: 'Student123'
    }
  ];

  ensureDefaultAccounts(): Promise<void> {
    const studentWrite = setDoc(
      doc(this.db, 'students', this.defaultStudentAccount.id),
      this.defaultStudentAccount,
      { merge: true }
    );
    const instructorWrite = setDoc(
      doc(this.db, 'instructorAccounts', this.defaultInstructorAccount.id),
      this.defaultInstructorAccount,
      { merge: true }
    );
    const authWrites = this.defaultAuthAccounts.map((account) =>
      setDoc(doc(this.db, 'authAccounts', account.id), account, { merge: true })
    );
    return Promise.all([studentWrite, instructorWrite, ...authWrites]).then(() => undefined);
  }

  async registerAccount(payload: {
    role: 'instructor' | 'student';
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<AuthAccount> {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const existing = await this.findAuthAccountByEmail(payload.role, normalizedEmail);
    if (existing) {
      throw new Error('Account already exists for this role and email.');
    }

    const id = doc(collection(this.db, 'authAccounts')).id;
    const nextAccount: AuthAccount = {
      id,
      role: payload.role,
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      fullName: `${payload.firstName.trim()} ${payload.lastName.trim()}`.trim(),
      email: normalizedEmail,
      password: payload.password
    };
    await setDoc(doc(this.db, 'authAccounts', id), nextAccount);

    if (payload.role === 'student') {
      await setDoc(
        doc(this.db, 'students', `std-${id}`),
        {
          id: `std-${id}`,
          fullName: nextAccount.fullName,
          email: nextAccount.email
        },
        { merge: true }
      );
    } else {
      await setDoc(
        doc(this.db, 'instructorAccounts', `ins-${id}`),
        {
          id: `ins-${id}`,
          fullName: nextAccount.fullName,
          email: nextAccount.email
        },
        { merge: true }
      );
    }

    return nextAccount;
  }

  async authenticateAccount(payload: {
    role: 'instructor' | 'student';
    email: string;
    password: string;
  }): Promise<AuthAccount | null> {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const account = await this.findAuthAccountByEmail(payload.role, normalizedEmail);
    if (!account) {
      return null;
    }
    return account.password === payload.password ? account : null;
  }

  getSchedules(): Promise<ScheduleItem[]> {
    return this.listCollection<ScheduleItem>('schedules');
  }

  getAttendanceRecords(): Promise<AttendanceRecord[]> {
    return this.listCollection<AttendanceRecord>('attendanceRecords');
  }

  getStudentProfile(email?: string): Promise<StudentProfile | null> {
    if (!email) {
      return this.listCollection<StudentProfile>('students').then((students) => students[0] ?? null);
    }

    const studentsRef = collection(this.db, 'students');
    const studentsQuery = query(studentsRef, where('email', '==', email));
    return getDocs(studentsQuery).then((snapshot) => {
      const firstDoc = snapshot.docs[0];
      if (!firstDoc) return null;
      const data = firstDoc.data() as Omit<StudentProfile, 'id'> & Partial<Pick<StudentProfile, 'id'>>;
      return {
        id: String(data.id ?? firstDoc.id),
        fullName: data.fullName ?? '',
        email: data.email ?? ''
      };
    });
  }

  getInstructorClasses(): Promise<InstructorClass[]> {
    return this.listCollection<InstructorClass>('instructorClasses');
  }

  addInstructorClass(payload: InstructorClass): Promise<InstructorClass> {
    const id = payload.id || doc(collection(this.db, 'instructorClasses')).id;
    const next = { ...payload, id };
    return setDoc(doc(this.db, 'instructorClasses', id), next).then(() => next);
  }

  updateInstructorClass(id: string, payload: InstructorClass): Promise<InstructorClass> {
    const next = { ...payload, id };
    return setDoc(doc(this.db, 'instructorClasses', id), next, { merge: true }).then(() => next);
  }

  deleteInstructorClass(id: string): Promise<void> {
    return deleteDoc(doc(this.db, 'instructorClasses', id));
  }

  getInstructorStudents(): Promise<InstructorStudent[]> {
    return this.listCollection<InstructorStudent>('instructorStudents');
  }

  addInstructorStudent(payload: InstructorStudent): Promise<InstructorStudent> {
    const id = payload.id || doc(collection(this.db, 'instructorStudents')).id;
    const next = { ...payload, id };
    return setDoc(doc(this.db, 'instructorStudents', id), next).then(() => next);
  }

  updateInstructorStudent(id: string, payload: InstructorStudent): Promise<InstructorStudent> {
    const next = { ...payload, id };
    return setDoc(doc(this.db, 'instructorStudents', id), next, { merge: true }).then(() => next);
  }

  deleteInstructorStudent(id: string): Promise<void> {
    return deleteDoc(doc(this.db, 'instructorStudents', id));
  }

  getInstructorSchedules(): Promise<InstructorSchedule[]> {
    return this.listCollection<InstructorSchedule>('instructorSchedules');
  }

  async getStudentSchedulesByEmail(email: string): Promise<ScheduleItem[]> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return [];

    const [students, schedules] = await Promise.all([
      this.getInstructorStudents(),
      this.getInstructorSchedules()
    ]);

    const student = students.find(
      (item) => item.email.trim().toLowerCase() === normalizedEmail
    );
    const studentSection = student?.section?.trim().toLowerCase() ?? '';
    if (!studentSection) return [];

    return schedules
      .filter((item) => (item.section ?? '').trim().toLowerCase() === studentSection)
      .map((item) => ({
        day: item.day,
        time: item.time,
        subject: item.title,
        meta: `${item.section ?? ''} - ${item.meta}`,
        mode: item.mode
      }));
  }

  addInstructorSchedule(payload: InstructorSchedule): Promise<InstructorSchedule> {
    const id = payload.id || doc(collection(this.db, 'instructorSchedules')).id;
    const next = { ...payload, id };
    return setDoc(doc(this.db, 'instructorSchedules', id), next).then(() => next);
  }

  updateInstructorSchedule(id: string, payload: InstructorSchedule): Promise<InstructorSchedule> {
    const next = { ...payload, id };
    return setDoc(doc(this.db, 'instructorSchedules', id), next, { merge: true }).then(() => next);
  }

  deleteInstructorSchedule(id: string): Promise<void> {
    return deleteDoc(doc(this.db, 'instructorSchedules', id));
  }

  getInstructorSessions(): Promise<InstructorSession[]> {
    return this.listCollection<InstructorSession>('instructorSessions');
  }

  addInstructorSession(payload: InstructorSession): Promise<InstructorSession> {
    const id = payload.id || doc(collection(this.db, 'instructorSessions')).id;
    const next = { ...payload, id };
    return setDoc(doc(this.db, 'instructorSessions', id), next).then(() => next);
  }

  getInstructorAccount(): Promise<InstructorAccount | null> {
    return this.listCollection<InstructorAccount>('instructorAccounts').then(
      (accounts) => accounts[0] ?? null
    );
  }

  updateInstructorAccount(id: string, payload: InstructorAccount): Promise<InstructorAccount> {
    const next = { ...payload, id };
    return setDoc(doc(this.db, 'instructorAccounts', id), next, { merge: true }).then(() => next);
  }

  private listCollection<T>(collectionName: string): Promise<T[]> {
    const ref = collection(this.db, collectionName);
    return getDocs(ref).then((snapshot) =>
      snapshot.docs.map((item) => {
        const data = item.data() as T;
        if (typeof data === 'object' && data !== null) {
          const withId = data as T & { id?: string };
          return { ...withId, id: withId.id ?? item.id } as T;
        }
        return data;
      })
    );
  }

  private findAuthAccountByEmail(
    role: 'instructor' | 'student',
    email: string
  ): Promise<AuthAccount | null> {
    const authRef = collection(this.db, 'authAccounts');
    const authQuery = query(authRef, where('role', '==', role), where('email', '==', email));
    return getDocs(authQuery).then((snapshot) => {
      const firstDoc = snapshot.docs[0];
      if (!firstDoc) return null;
      const data = firstDoc.data() as Omit<AuthAccount, 'id'> & Partial<Pick<AuthAccount, 'id'>>;
      return {
        id: String(data.id ?? firstDoc.id),
        role: data.role ?? role,
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        fullName: data.fullName ?? '',
        email: data.email ?? '',
        password: data.password ?? ''
      };
    });
  }
}
