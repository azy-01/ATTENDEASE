import { Injectable } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  runTransaction,
  setDoc,
  writeBatch,
  where,
  type Firestore
} from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { environment } from '../../../environments/environment';

export interface ScheduleItem {
  day: string;
  time: string;
  subject: string;
  instructorName: string;
  room: string;
  classMode: string;
}

export interface InstructorScheduleViewItem {
  day: string;
  time: string;
  subject: string;
  program: string;
  yearLevel: string;
  section: string;
  room: string;
  classMode: string;
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
  section?: string;
  day?: string;
  time?: string;
  room?: string;
  classMode?: 'Face-to-face Class' | 'Online Class';
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
    const normalizedFullName = `${payload.firstName.trim()} ${payload.lastName.trim()}`.trim();
    const existing = await this.findAuthAccountByEmail(payload.role, normalizedEmail);
    if (existing) {
      throw new Error('Account already exists for this role and email.');
    }
    const existingByName = await this.findAuthAccountByFullName(payload.role, normalizedFullName);
    if (existingByName) {
      throw new Error('Account already exists for this role and full name.');
    }

    const id = doc(collection(this.db, 'authAccounts')).id;
    const nextAccount: AuthAccount = {
      id,
      role: payload.role,
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      fullName: normalizedFullName,
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
    const normalizedFullName = `${payload.firstName.trim()} ${payload.lastName.trim()}`.trim();
    const existing = await this.findAuthAccountByEmail(payload.role, normalizedEmail);
    if (existing) {
      throw new Error('Account already exists for this role and email.');
    }
    const existingByName = await this.findAuthAccountByFullName(payload.role, normalizedFullName);
    if (existingByName) {
      throw new Error('Account already exists for this role and full name.');
    }
    const normalizedStudentId = (payload.studentId ?? '').trim();
    if (payload.role === 'student') {
      if (!normalizedStudentId) {
        throw new Error('Student ID is required for student accounts.');
      }
      const existingByStudentId = await this.findInstructorStudentByStudentId(normalizedStudentId);
      if (existingByStudentId) {
        throw new Error('Student account already exists for this Student ID.');
      }
    }

    const id = doc(collection(this.db, 'authAccounts')).id;
    const nextAccount: AuthAccount = {
      id,
      role: payload.role,
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      fullName: normalizedFullName,
      email: normalizedEmail,
      password: payload.password,
      qrCodeValue: this.createUniqueQrCodeValue(payload.role, id),
      approvalStatus: 'approved',
      createdBy: 'admin',
      allowedClassIds: [],
      allowedSubjects: []
    };
    const batch = writeBatch(this.db);
    batch.set(doc(this.db, 'authAccounts', id), nextAccount);
    this.queueRoleCollectionSync(batch, nextAccount, {
      studentId: normalizedStudentId,
      section: payload.section?.trim() || ''
    });
    await batch.commit();
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
    const hasLinkedProfile = await this.hasLinkedRoleProfile(account);
    if (!hasLinkedProfile) {
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

  async isAuthSessionValid(
    role: 'instructor' | 'student' | 'admin' | 'superadmin',
    email: string
  ): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return false;
    }
    const account = await this.findAuthAccountByEmail(role, normalizedEmail);
    if (!account || account.approvalStatus !== 'approved') {
      return false;
    }
    return this.hasLinkedRoleProfile(account);
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
    const authDocRef = doc(this.db, 'authAccounts', accountId);
    const authSnapshot = await getDoc(authDocRef);
    if (!authSnapshot.exists()) {
      return null;
    }
    const data = authSnapshot.data() as AuthAccount;
    const approvedAccount: AuthAccount = {
      ...data,
      id: String(data.id ?? authSnapshot.id),
      approvalStatus: 'approved',
      allowedClassIds: data.allowedClassIds ?? [],
      allowedSubjects: data.allowedSubjects ?? []
    };

    const batch = writeBatch(this.db);
    batch.set(authDocRef, { approvalStatus: 'approved' }, { merge: true });
    this.queueRoleCollectionSync(batch, approvedAccount);
    await batch.commit();
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

  async deleteManagedAccountByEmail(
    role: 'instructor' | 'student' | 'admin' | 'superadmin',
    email: string
  ): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return;
    }

    const authRef = collection(this.db, 'authAccounts');
    const authQuery = query(authRef, where('role', '==', role), where('email', '==', normalizedEmail));
    const authSnapshot = await getDocs(authQuery);
    const batch = writeBatch(this.db);

    authSnapshot.docs.forEach((accountDoc) => {
      batch.delete(doc(this.db, 'authAccounts', accountDoc.id));
    });

    if (role === 'student') {
      const [studentsSnapshot, instructorStudentsSnapshot, classSnapshot] = await Promise.all([
        getDocs(query(collection(this.db, 'students'), where('email', '==', normalizedEmail))),
        getDocs(query(collection(this.db, 'instructorStudents'), where('email', '==', normalizedEmail))),
        getDocs(collection(this.db, 'instructorClasses'))
      ]);

      studentsSnapshot.docs.forEach((studentDoc) => {
        batch.delete(doc(this.db, 'students', studentDoc.id));
      });

      const removedStudentIds = new Set<string>();
      instructorStudentsSnapshot.docs.forEach((studentDoc) => {
        removedStudentIds.add(studentDoc.id);
        batch.delete(doc(this.db, 'instructorStudents', studentDoc.id));
      });

      if (removedStudentIds.size) {
        classSnapshot.docs.forEach((classDoc) => {
          const classData = classDoc.data() as Partial<InstructorClass>;
          const assignedStudentIds = classData.assignedStudentIds ?? [];
          const nextAssignedStudentIds = assignedStudentIds.filter(
            (studentId) => !removedStudentIds.has(studentId)
          );
          if (nextAssignedStudentIds.length !== assignedStudentIds.length) {
            batch.set(doc(this.db, 'instructorClasses', classDoc.id), {
              assignedStudentIds: nextAssignedStudentIds,
              studentCount: nextAssignedStudentIds.length
            }, { merge: true });
          }
        });
      }
    }

    if (role === 'instructor' || role === 'admin' || role === 'superadmin') {
      const instructorsSnapshot = await getDocs(
        query(collection(this.db, 'instructorAccounts'), where('email', '==', normalizedEmail))
      );
      instructorsSnapshot.docs.forEach((accountDoc) => {
        batch.delete(doc(this.db, 'instructorAccounts', accountDoc.id));
      });
    }

    await batch.commit();
  }

  getInstructorSchedules(): Promise<InstructorSchedule[]> {
    return this.listCollection<InstructorSchedule>('instructorSchedules');
  }

  async getInstructorScheduleByEmail(email: string): Promise<InstructorScheduleViewItem[]> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return [];

    const [account, classes] = await Promise.all([
      this.getAuthAccountByEmail('instructor', normalizedEmail),
      this.getInstructorClasses()
    ]);
    if (!account) return [];

    return classes
      .filter((classItem) => (classItem.assignedInstructorIds ?? []).includes(account.id))
      .flatMap((classItem) =>
        this.getClassSubjects(classItem).map((subject) => ({
          subject,
          program: classItem.program ?? '',
          yearLevel: classItem.yearLevel ?? '',
          section: classItem.section?.trim() || classItem.name || '',
          time: classItem.time ?? '',
          day: classItem.day ?? '',
          room: classItem.room?.trim() || 'N/A',
          classMode: classItem.classMode ?? 'N/A'
        }))
      );
  }

  async getStudentSchedulesByEmail(email: string): Promise<ScheduleItem[]> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return [];

    const [students, classes, instructors] = await Promise.all([
      this.getInstructorStudents(),
      this.getInstructorClasses(),
      this.getAuthAccountsByRole('instructor')
    ]);

    const student = students.find(
      (item) => item.email.trim().toLowerCase() === normalizedEmail
    );
    if (!student) return [];

    const assignedClasses = classes.filter((classItem) =>
      (classItem.assignedStudentIds ?? []).includes(student.id)
    );
    const instructorNameById = new Map(
      instructors.map((instructor) => [instructor.id, instructor.fullName])
    );

    return assignedClasses.flatMap((classItem) => {
      const firstInstructorName = (classItem.assignedInstructorIds ?? [])
        .map((instructorId) => instructorNameById.get(instructorId)?.trim() ?? '')
        .find((name) => Boolean(name)) || 'TBA';

      return this.getClassSubjects(classItem).map((subject) => ({
        day: classItem.day ?? '',
        time: classItem.time ?? '',
        subject,
        instructorName: firstInstructorName,
        room: classItem.room?.trim() || 'N/A',
        classMode: classItem.classMode ?? 'N/A'
      }));
    });
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

    const now = new Date();
    const timeIn = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const attendanceStatus = this.resolveAttendanceStatus(latestActiveSession, now);
    const attendanceRecordId = this.buildAttendanceRecordId(latestActiveSession.id, normalizedStudentEmail);
    const nextRecord: AttendanceRecord = {
      id: attendanceRecordId,
      studentEmail: normalizedStudentEmail,
      studentName: payload.studentName.trim(),
      subject: latestActiveSession.subject,
      section: latestActiveSession.section,
      date: latestActiveSession.date,
      timeIn,
      status: attendanceStatus,
      method: payload.method
    };
    const sessionRef = doc(this.db, 'instructorSessions', latestActiveSession.id);
    const recordRef = doc(this.db, 'attendanceRecords', attendanceRecordId);

    try {
      await runTransaction(this.db, async (transaction) => {
        const sessionSnapshot = await transaction.get(sessionRef);
        if (!sessionSnapshot.exists()) {
          throw new Error('NO_ACTIVE_SESSION');
        }
        const persistedSession = sessionSnapshot.data() as InstructorSession;
        if (persistedSession.status !== 'active') {
          throw new Error('NO_ACTIVE_SESSION');
        }

        const existingRecordSnapshot = await transaction.get(recordRef);
        if (existingRecordSnapshot.exists()) {
          throw new Error('ALREADY_RECORDED');
        }

        transaction.set(recordRef, nextRecord);
      });
      return { success: true, record: nextRecord, session: latestActiveSession };
    } catch (error) {
      const reason = error instanceof Error ? error.message : '';
      if (reason === 'ALREADY_RECORDED') {
        return { success: false, reason: 'ALREADY_RECORDED' };
      }
      return { success: false, reason: 'NO_ACTIVE_SESSION' };
    }
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

  private async findAuthAccountByFullName(
    role: 'instructor' | 'student' | 'admin' | 'superadmin',
    fullName: string
  ): Promise<AuthAccount | null> {
    const normalizedFullName = fullName.trim().toLowerCase();
    if (!normalizedFullName) {
      return null;
    }

    const accounts = await this.getAuthAccountsByRole(role);
    return accounts.find(
      (account) => (account.fullName ?? '').trim().toLowerCase() === normalizedFullName
    ) ?? null;
  }

  private async findInstructorStudentByStudentId(studentId: string): Promise<InstructorStudent | null> {
    const normalizedStudentId = studentId.trim().toLowerCase();
    if (!normalizedStudentId) {
      return null;
    }
    const students = await this.getInstructorStudents();
    return students.find(
      (student) => (student.studentId ?? '').trim().toLowerCase() === normalizedStudentId
    ) ?? null;
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
    const batch = writeBatch(this.db);
    this.queueRoleCollectionSync(batch, account, extras);
    await batch.commit();
  }

  private queueRoleCollectionSync(
    batch: ReturnType<typeof writeBatch>,
    account: AuthAccount,
    extras: { studentId?: string; section?: string } = {}
  ): void {
    if (account.role === 'student') {
      const studentDocId = `std-${account.id}`;
      batch.set(
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
      batch.set(
        doc(this.db, 'instructorStudents', rosterDocId),
        {
          id: rosterDocId,
          name: account.fullName,
          studentId: extras.studentId ?? '',
          email: account.email,
          section: extras.section ?? ''
        },
        { merge: true }
      );
      return;
    }

    if (account.role === 'instructor' || account.role === 'admin' || account.role === 'superadmin') {
      batch.set(
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

  private buildAttendanceRecordId(sessionId: string, studentEmail: string): string {
    const normalizedEmail = studentEmail.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return `attendance-${sessionId}-${normalizedEmail}`;
  }

  private async hasLinkedRoleProfile(account: AuthAccount): Promise<boolean> {
    const normalizedEmail = account.email.trim().toLowerCase();
    if (!normalizedEmail) {
      return false;
    }

    if (account.role === 'student') {
      const studentsSnapshot = await getDocs(
        query(collection(this.db, 'students'), where('email', '==', normalizedEmail))
      );
      return studentsSnapshot.docs.length > 0;
    }

    if (account.role === 'admin' || account.role === 'superadmin') {
      return true;
    }

    const instructorsSnapshot = await getDocs(
      query(collection(this.db, 'instructorAccounts'), where('email', '==', normalizedEmail))
    );
    return instructorsSnapshot.docs.length > 0;
  }

  private getClassSubjects(classItem: InstructorClass): string[] {
    const normalizedSubjects = (classItem.assignedSubjects ?? [])
      .map((subject) => subject.trim())
      .filter((subject) => Boolean(subject));
    if (normalizedSubjects.length) {
      return [...new Set(normalizedSubjects)];
    }
    return [classItem.name?.trim() || 'Untitled Subject'];
  }
}
