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
  id?: string;
  studentEmail?: string;
  studentName?: string;
  subject: string;
  section: string;
  date: string;
  timeIn: string;
  status: 'Present' | 'Late' | 'Absent';
  method?: 'qr' | 'manual';
}

export interface StudentProfile {
  id: string;
  fullName: string;
  email: string;
  qrCodeValue?: string;
}

export interface InstructorClass {
  id: string;
  name: string;
  program: string;
  yearLevel: string;
  day?: string;
  time?: string;
  studentCount: number;
  assignedStudentIds?: string[];
  assignedInstructorIds?: string[];
  assignedSubjects?: string[];
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
  manualAttendanceCode?: string;
  startedAt?: string;
}

export interface InstructorAccount {
  id: string;
  fullName: string;
  email: string;
  qrCodeValue?: string;
}

export interface AuthAccount {
  id: string;
  role: 'instructor' | 'student' | 'admin' | 'superadmin';
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  password: string;
  qrCodeValue: string;
  approvalStatus: 'pending' | 'approved';
  createdBy: 'self' | 'admin';
  allowedClassIds?: string[];
  allowedSubjects?: string[];
}

interface DefaultAccountSeed {
  id: string;
  fullName: string;
  email: string;
  qrCodeValue: string;
}

@Injectable({ providedIn: 'root' })
export class StudentApiService {
  private readonly db: Firestore = getFirestore(
    getApps()[0] ?? initializeApp(environment.firebase)
  );
  private readonly defaultStudentAccount: DefaultAccountSeed = {
    id: 'std-acc-1',
    fullName: 'Tiesha Kate D. Regular',
    email: 'regular.tieshakated@gmail.com',
    qrCodeValue: 'ATTENDEASE-STUDENT-STD-ACC-1'
  };
  private readonly defaultInstructorAccount: DefaultAccountSeed = {
    id: 'ins-acc-1',
    fullName: 'Azryth Sacuan',
    email: 'sacuan.azryth0@gmail.com',
    qrCodeValue: 'ATTENDEASE-INSTRUCTOR-INS-ACC-1'
  };
  private readonly defaultAuthAccounts: AuthAccount[] = [
    {
      id: 'auth-ins-1',
      role: 'instructor',
      firstName: 'Instructor',
      lastName: 'Demo',
      fullName: 'Instructor Demo',
      email: 'instructor@gmail.com',
      password: 'Instructor123',
      qrCodeValue: 'ATTENDEASE-INSTRUCTOR-AUTH-INS-1',
      approvalStatus: 'approved',
      createdBy: 'self'
    },
    {
      id: 'auth-admin-1',
      role: 'admin',
      firstName: 'Admin',
      lastName: 'Account',
      fullName: 'Admin Account',
      email: 'admin@attendease.com',
      password: 'Admin123',
      qrCodeValue: 'ATTENDEASE-ADMIN-AUTH-ADMIN-1',
      approvalStatus: 'approved',
      createdBy: 'admin'
    },
    {
      id: 'auth-superadmin-1',
      role: 'superadmin',
      firstName: 'Super',
      lastName: 'Admin',
      fullName: 'Super Admin',
      email: 'superadmin@attendease.com',
      password: 'SuperAdmin123',
      qrCodeValue: 'ATTENDEASE-SUPERADMIN-AUTH-SUPERADMIN-1',
      approvalStatus: 'approved',
      createdBy: 'admin'
    },
    {
      id: 'auth-std-1',
      role: 'student',
      firstName: 'Student',
      lastName: 'Demo',
      fullName: 'Student Demo',
      email: 'student@email.com',
      password: 'Student123',
      qrCodeValue: 'ATTENDEASE-STUDENT-AUTH-STD-1',
      approvalStatus: 'approved',
      createdBy: 'self'
    },
    {
      id: 'auth-std-2',
      role: 'student',
      firstName: 'Student',
      lastName: 'Gmail',
      fullName: 'Student Gmail',
      email: 'student@gmail.com',
      password: 'Student123',
      qrCodeValue: 'ATTENDEASE-STUDENT-AUTH-STD-2',
      approvalStatus: 'approved',
      createdBy: 'self'
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
      password: payload.password,
      qrCodeValue: this.createUniqueQrCodeValue(payload.role, id),
      approvalStatus: 'pending',
      createdBy: 'self',
      allowedClassIds: [],
      allowedSubjects: []
    };
    await setDoc(doc(this.db, 'authAccounts', id), nextAccount);
    return nextAccount;
  }

  async createManagedAccount(payload: {
    role: 'instructor' | 'student';
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    studentId?: string;
    section?: string;
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
      password: payload.password,
      qrCodeValue: this.createUniqueQrCodeValue(payload.role, id),
      approvalStatus: 'approved',
      createdBy: 'admin',
      allowedClassIds: [],
      allowedSubjects: []
    };
    await setDoc(doc(this.db, 'authAccounts', id), nextAccount);
    await this.syncAccountToRoleCollection(nextAccount, {
      studentId: payload.studentId?.trim() || '',
      section: payload.section?.trim() || ''
    });
    return nextAccount;
  }

  async authenticateAccount(payload: {
    role: 'instructor' | 'student' | 'admin' | 'superadmin';
    email: string;
    password: string;
  }): Promise<AuthAccount | null> {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const account = await this.findAuthAccountByEmail(payload.role, normalizedEmail);
    if (!account) {
      return null;
    }
    if (account.password !== payload.password) {
      return null;
    }
    if (account.approvalStatus !== 'approved') {
      return null;
    }
    if (account.qrCodeValue) {
      return account;
    }

    const withQrCode: AuthAccount = {
      ...account,
      qrCodeValue: this.createUniqueQrCodeValue(account.role, account.id)
    };
    await setDoc(doc(this.db, 'authAccounts', account.id), { qrCodeValue: withQrCode.qrCodeValue }, { merge: true });

    if (account.role === 'student') {
      await this.syncStudentQrCodeByEmail(account.email, withQrCode.qrCodeValue);
    } else {
      await this.syncInstructorQrCodeByEmail(account.email, withQrCode.qrCodeValue);
    }
    return withQrCode;
  }

  async getPendingAccounts(): Promise<AuthAccount[]> {
    const authRef = collection(this.db, 'authAccounts');
    const pendingQuery = query(authRef, where('approvalStatus', '==', 'pending'));
    const snapshot = await getDocs(pendingQuery);
    return snapshot.docs.map((item) => {
      const data = item.data() as Omit<AuthAccount, 'id'> & Partial<Pick<AuthAccount, 'id'>>;
      return {
        id: String(data.id ?? item.id),
        role: data.role ?? 'student',
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        fullName: data.fullName ?? '',
        email: data.email ?? '',
        password: data.password ?? '',
        qrCodeValue: data.qrCodeValue ?? '',
        approvalStatus: data.approvalStatus ?? 'pending',
        createdBy: data.createdBy ?? 'self',
        allowedClassIds: data.allowedClassIds ?? [],
        allowedSubjects: data.allowedSubjects ?? []
      };
    });
  }

  async getAuthAccountsByRole(role: 'instructor' | 'student' | 'admin' | 'superadmin'): Promise<AuthAccount[]> {
    const authRef = collection(this.db, 'authAccounts');
    const roleQuery = query(authRef, where('role', '==', role));
    const snapshot = await getDocs(roleQuery);
    return snapshot.docs.map((item) => {
      const data = item.data() as Omit<AuthAccount, 'id'> & Partial<Pick<AuthAccount, 'id'>>;
      return {
        id: String(data.id ?? item.id),
        role: data.role ?? role,
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        fullName: data.fullName ?? '',
        email: data.email ?? '',
        password: data.password ?? '',
        qrCodeValue: data.qrCodeValue ?? '',
        approvalStatus: data.approvalStatus ?? 'pending',
        createdBy: data.createdBy ?? 'self',
        allowedClassIds: data.allowedClassIds ?? [],
        allowedSubjects: data.allowedSubjects ?? []
      };
    });
  }

  async approveAccount(accountId: string): Promise<AuthAccount | null> {
    const authRef = collection(this.db, 'authAccounts');
    const authQuery = query(authRef, where('id', '==', accountId));
    const snapshot = await getDocs(authQuery);
    const firstDoc = snapshot.docs[0];
    if (!firstDoc) return null;
    const data = firstDoc.data() as AuthAccount;
    const approvedAccount: AuthAccount = {
      ...data,
      id: String(data.id ?? firstDoc.id),
      approvalStatus: 'approved',
      allowedClassIds: data.allowedClassIds ?? [],
      allowedSubjects: data.allowedSubjects ?? []
    };
    await setDoc(doc(this.db, 'authAccounts', approvedAccount.id), { approvalStatus: 'approved' }, { merge: true });
    await this.syncAccountToRoleCollection(approvedAccount);
    return approvedAccount;
  }

  getSchedules(): Promise<ScheduleItem[]> {
    return this.listCollection<ScheduleItem>('schedules');
  }

  getAuthAccountByEmail(
    role: 'instructor' | 'student' | 'admin' | 'superadmin',
    email: string
  ): Promise<AuthAccount | null> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return Promise.resolve(null);
    }
    return this.findAuthAccountByEmail(role, normalizedEmail);
  }

  async updateAuthAccount(id: string, payload: Partial<AuthAccount>): Promise<AuthAccount | null> {
    const existing = await this.getAuthAccountById(id);
    if (!existing) {
      return null;
    }
    const next: AuthAccount = {
      ...existing,
      ...payload,
      id: existing.id,
      allowedClassIds: payload.allowedClassIds ?? existing.allowedClassIds ?? [],
      allowedSubjects: payload.allowedSubjects ?? existing.allowedSubjects ?? []
    };
    await setDoc(doc(this.db, 'authAccounts', id), next, { merge: true });
    return next;
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
        email: data.email ?? '',
        qrCodeValue: data.qrCodeValue ?? ''
      };
    });
  }

  getStudentProfileByQrCode(qrCodeValue: string): Promise<StudentProfile | null> {
    const normalizedQrCode = qrCodeValue.trim();
    if (!normalizedQrCode) {
      return Promise.resolve(null);
    }

    const studentsRef = collection(this.db, 'students');
    const studentsQuery = query(studentsRef, where('qrCodeValue', '==', normalizedQrCode));
    return getDocs(studentsQuery).then((snapshot) => {
      const firstDoc = snapshot.docs[0];
      if (!firstDoc) return null;
      const data = firstDoc.data() as Omit<StudentProfile, 'id'> & Partial<Pick<StudentProfile, 'id'>>;
      return {
        id: String(data.id ?? firstDoc.id),
        fullName: data.fullName ?? '',
        email: data.email ?? '',
        qrCodeValue: data.qrCodeValue ?? ''
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

  async getInstructorStudents(): Promise<InstructorStudent[]> {
    const [roster, studentAuthAccounts] = await Promise.all([
      this.listCollection<InstructorStudent>('instructorStudents'),
      this.getAuthAccountsByRole('student')
    ]);

    const rosterByEmail = new Map<string, InstructorStudent>();
    for (const row of roster) {
      const key = (row.email ?? '').trim().toLowerCase();
      if (key) {
        rosterByEmail.set(key, row);
      }
    }

    const missingFromRoster: InstructorStudent[] = [];
    for (const account of studentAuthAccounts) {
      if (account.approvalStatus !== 'approved') continue;
      const key = (account.email ?? '').trim().toLowerCase();
      if (!key || rosterByEmail.has(key)) continue;

      const synthetic: InstructorStudent = {
        id: `instr-std-${account.id}`,
        name: account.fullName,
        studentId: '',
        email: account.email,
        section: ''
      };
      rosterByEmail.set(key, synthetic);
      missingFromRoster.push(synthetic);
    }

    if (missingFromRoster.length > 0) {
      void Promise.all(
        missingFromRoster.map((row) =>
          setDoc(doc(this.db, 'instructorStudents', row.id), row, { merge: true })
        )
      ).catch(() => undefined);
    }

    return Array.from(rosterByEmail.values());
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

    const [students, classes, schedules] = await Promise.all([
      this.getInstructorStudents(),
      this.getInstructorClasses(),
      this.getInstructorSchedules()
    ]);

    const student = students.find(
      (item) => item.email.trim().toLowerCase() === normalizedEmail
    );
    if (!student) return [];

    const assignedClasses = classes.filter((classItem) =>
      (classItem.assignedStudentIds ?? []).includes(student.id)
    );
    const assignedClassNames = new Set(
      assignedClasses
        .map((classItem) => (classItem.name ?? '').trim().toLowerCase())
        .filter((name) => Boolean(name))
    );
    const assignedSubjects = new Set(
      assignedClasses
        .flatMap((classItem) => classItem.assignedSubjects ?? [])
        .map((subject) => subject.trim().toLowerCase())
        .filter((subject) => Boolean(subject))
    );
    const fallbackStudentSection = (student.section ?? '').trim().toLowerCase();

    return schedules
      .filter((item) => {
        const scheduleSection = (item.section ?? '').trim().toLowerCase();
        const scheduleSubject = (item.title ?? '').trim().toLowerCase();
        const sectionMatches = assignedClassNames.size > 0
          ? assignedClassNames.has(scheduleSection)
          : fallbackStudentSection
            ? scheduleSection === fallbackStudentSection
            : false;
        if (!sectionMatches) {
          return false;
        }
        return assignedSubjects.size > 0
          ? assignedSubjects.has(scheduleSubject)
          : true;
      })
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

  async getActiveInstructorSessions(): Promise<InstructorSession[]> {
    const sessions = await this.getInstructorSessions();
    return sessions
      .filter((session) => session.status === 'active')
      .sort((first, second) => {
        const firstDate = new Date(first.date).getTime();
        const secondDate = new Date(second.date).getTime();
        return secondDate - firstDate;
      });
  }

  async submitStudentAttendance(payload: {
    studentEmail: string;
    studentName: string;
    studentQrCodeValue: string;
    method: 'qr' | 'manual';
    manualCode?: string;
  }): Promise<{ success: true; record: AttendanceRecord; session: InstructorSession } | { success: false; reason: 'NO_ACTIVE_SESSION' | 'ALREADY_RECORDED' | 'INVALID_MANUAL_CODE' }> {
    const normalizedStudentEmail = payload.studentEmail.trim().toLowerCase();
    const normalizedQrCodeValue = payload.studentQrCodeValue.trim();
    if (!normalizedStudentEmail || !normalizedQrCodeValue) {
      return { success: false, reason: 'NO_ACTIVE_SESSION' };
    }

    const activeSessions = await this.getActiveInstructorSessions();
    const latestActiveSession = activeSessions[0];
    if (!latestActiveSession) {
      return { success: false, reason: 'NO_ACTIVE_SESSION' };
    }

    if (payload.method === 'manual') {
      const submittedManualCode = (payload.manualCode ?? '').trim().toUpperCase();
      const sessionManualCode = (latestActiveSession.manualAttendanceCode ?? '').trim().toUpperCase();
      if (!submittedManualCode || !sessionManualCode || submittedManualCode !== sessionManualCode) {
        return { success: false, reason: 'INVALID_MANUAL_CODE' };
      }
    }

    const existingRecords = await this.getAttendanceRecords();
    const alreadyRecorded = existingRecords.some((record) => {
      const recordEmail = (record.studentEmail ?? '').trim().toLowerCase();
      return (
        recordEmail === normalizedStudentEmail &&
        record.subject === latestActiveSession.subject &&
        record.section === latestActiveSession.section &&
        record.date === latestActiveSession.date
      );
    });

    if (alreadyRecorded) {
      return { success: false, reason: 'ALREADY_RECORDED' };
    }

    const now = new Date();
    const timeIn = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const attendanceStatus = this.resolveAttendanceStatus(latestActiveSession, now);
    const nextRecord: AttendanceRecord = {
      id: `attendance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      studentEmail: normalizedStudentEmail,
      studentName: payload.studentName.trim(),
      subject: latestActiveSession.subject,
      section: latestActiveSession.section,
      date: latestActiveSession.date,
      timeIn,
      status: attendanceStatus,
      method: payload.method
    };

    await setDoc(doc(this.db, 'attendanceRecords', String(nextRecord.id)), nextRecord);
    return { success: true, record: nextRecord, session: latestActiveSession };
  }

  addInstructorSession(payload: InstructorSession): Promise<InstructorSession> {
    const id = payload.id || doc(collection(this.db, 'instructorSessions')).id;
    const next = { ...payload, id };
    return setDoc(doc(this.db, 'instructorSessions', id), next).then(() => next);
  }

  updateInstructorSession(id: string, payload: InstructorSession): Promise<InstructorSession> {
    const next = { ...payload, id };
    return setDoc(doc(this.db, 'instructorSessions', id), next, { merge: true }).then(() => next);
  }

  async createUniqueManualAttendanceCode(length: number = 6): Promise<string> {
    const sessions = await this.getInstructorSessions();
    const usedCodes = new Set(
      sessions
        .map((session) => (session.manualAttendanceCode ?? '').trim().toUpperCase())
        .filter((code) => Boolean(code))
    );

    let candidate = '';
    do {
      candidate = this.generateManualCode(length);
    } while (usedCodes.has(candidate));
    return candidate;
  }

  async isManualAttendanceCodeUnique(code: string): Promise<boolean> {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      return false;
    }
    const sessions = await this.getInstructorSessions();
    return !sessions.some(
      (session) => (session.manualAttendanceCode ?? '').trim().toUpperCase() === normalizedCode
    );
  }

  private resolveAttendanceStatus(
    session: InstructorSession,
    submittedAt: Date
  ): AttendanceRecord['status'] {
    const startedAtRaw = session.startedAt;
    if (!startedAtRaw) {
      return 'Present';
    }

    const startedAt = new Date(startedAtRaw);
    if (Number.isNaN(startedAt.getTime())) {
      return 'Present';
    }

    const elapsedMs = submittedAt.getTime() - startedAt.getTime();
    const elapsedMinutes = elapsedMs / (1000 * 60);

    if (elapsedMinutes >= 60) {
      return 'Absent';
    }

    if (elapsedMinutes > 30) {
      return 'Late';
    }

    return 'Present';
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
    role: 'instructor' | 'student' | 'admin' | 'superadmin',
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
        password: data.password ?? '',
        qrCodeValue: data.qrCodeValue ?? '',
        approvalStatus: data.approvalStatus ?? 'pending',
        createdBy: data.createdBy ?? 'self',
        allowedClassIds: data.allowedClassIds ?? [],
        allowedSubjects: data.allowedSubjects ?? []
      };
    });
  }

  private async getAuthAccountById(id: string): Promise<AuthAccount | null> {
    const authRef = collection(this.db, 'authAccounts');
    const authQuery = query(authRef, where('id', '==', id));
    const snapshot = await getDocs(authQuery);
    const firstDoc = snapshot.docs[0];
    if (!firstDoc) {
      return null;
    }
    const data = firstDoc.data() as Omit<AuthAccount, 'id'> & Partial<Pick<AuthAccount, 'id'>>;
    return {
      id: String(data.id ?? firstDoc.id),
      role: data.role ?? 'student',
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      fullName: data.fullName ?? '',
      email: data.email ?? '',
      password: data.password ?? '',
      qrCodeValue: data.qrCodeValue ?? '',
      approvalStatus: data.approvalStatus ?? 'pending',
      createdBy: data.createdBy ?? 'self',
      allowedClassIds: data.allowedClassIds ?? [],
      allowedSubjects: data.allowedSubjects ?? []
    };
  }

  private createUniqueQrCodeValue(role: 'instructor' | 'student' | 'admin' | 'superadmin', id: string): string {
    const rolePrefix = role === 'student'
      ? 'STUDENT'
      : role === 'admin'
        ? 'ADMIN'
      : role === 'superadmin'
        ? 'SUPERADMIN'
        : 'INSTRUCTOR';
    const randomPart = Math.random().toString(36).slice(2, 10).toUpperCase();
    return `ATTENDEASE-${rolePrefix}-${id.toUpperCase()}-${randomPart}`;
  }

  private generateManualCode(length: number): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const size = Math.max(4, Math.floor(length));
    let value = '';
    for (let index = 0; index < size; index += 1) {
      value += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return value;
  }

  private async syncStudentQrCodeByEmail(email: string, qrCodeValue: string): Promise<void> {
    const studentsRef = collection(this.db, 'students');
    const studentsQuery = query(studentsRef, where('email', '==', email));
    const snapshot = await getDocs(studentsQuery);
    const firstDoc = snapshot.docs[0];
    if (!firstDoc) {
      return;
    }
    await setDoc(doc(this.db, 'students', firstDoc.id), { qrCodeValue }, { merge: true });
  }

  private async syncInstructorQrCodeByEmail(email: string, qrCodeValue: string): Promise<void> {
    const accountsRef = collection(this.db, 'instructorAccounts');
    const accountsQuery = query(accountsRef, where('email', '==', email));
    const snapshot = await getDocs(accountsQuery);
    const firstDoc = snapshot.docs[0];
    if (!firstDoc) {
      return;
    }
    await setDoc(doc(this.db, 'instructorAccounts', firstDoc.id), { qrCodeValue }, { merge: true });
  }

  private async syncAccountToRoleCollection(
    account: AuthAccount,
    extras: { studentId?: string; section?: string } = {}
  ): Promise<void> {
    if (account.role === 'student') {
      const studentDocId = `std-${account.id}`;
      await setDoc(
        doc(this.db, 'students', studentDocId),
        {
          id: studentDocId,
          fullName: account.fullName,
          email: account.email,
          qrCodeValue: account.qrCodeValue
        },
        { merge: true }
      );

      const rosterDocId = `instr-std-${account.id}`;
      const rosterRef = doc(this.db, 'instructorStudents', rosterDocId);
      const existingByEmail = await getDocs(
        query(collection(this.db, 'instructorStudents'), where('email', '==', account.email))
      );
      const existingDoc = existingByEmail.docs.find((item) => item.id !== rosterDocId);
      if (existingDoc) {
        await setDoc(
          doc(this.db, 'instructorStudents', existingDoc.id),
          {
            name: account.fullName,
            email: account.email,
            ...(extras.studentId ? { studentId: extras.studentId } : {}),
            ...(extras.section ? { section: extras.section } : {})
          },
          { merge: true }
        );
      } else {
        await setDoc(
          rosterRef,
          {
            id: rosterDocId,
            name: account.fullName,
            studentId: extras.studentId ?? '',
            email: account.email,
            section: extras.section ?? ''
          },
          { merge: true }
        );
      }
      return;
    }

    if (account.role === 'instructor' || account.role === 'admin' || account.role === 'superadmin') {
      await setDoc(
        doc(this.db, 'instructorAccounts', `ins-${account.id}`),
        {
          id: `ins-${account.id}`,
          fullName: account.fullName,
          email: account.email,
          qrCodeValue: account.qrCodeValue
        },
        { merge: true }
      );
    }
  }
}
