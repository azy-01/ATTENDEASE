import { Injectable } from '@angular/core';
import {
  collection,
  deleteDoc,
  deleteField,
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
import { AccountEmailService, type AccountEmailResult } from './account-email.service';
import { VerificationUploadService } from './verification-upload.service';
import {
  getGmailValidationError,
  isGmailAddress,
  normalizeEmailAddress,
} from '../utils/gmail.utils';

export { isGmailAddress } from '../utils/gmail.utils';

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

export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'Excused';

export interface AttendanceRecord {
  id?: string;
  studentEmail?: string;
  studentName?: string;
  subject: string;
  section: string;
  date: string;
  timeIn: string;
  status: AttendanceStatus;
  method?: 'qr' | 'manual';
  recordState?: 'active' | 'archived';
  archiveReason?: string;
  archivedAt?: string;
  archivedBy?: string;
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
  status: 'active' | 'inactive' | 'archived';
  archiveReason?: string;
  archivedAt?: string;
  archivedBy?: string;
}

export interface InstructorStudent {
  id: string;
  name: string;
  studentId: string;
  email: string;
  section: string;
  createdAt?: string;
  status?: 'active' | 'archived';
  archiveReason?: string;
  archivedAt?: string;
  archivedBy?: string;
  archivedFromClassIds?: string[];
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

export type InstructorClassMode = 'Face-to-face Class' | 'Online Class';

export const FACE_TO_FACE_CLASS_MODE: InstructorClassMode = 'Face-to-face Class';

export interface InstructorSession {
  id: string;
  subject: string;
  section: string;
  date: string;
  status: 'active' | 'completed' | 'cancelled';
  manualAttendanceCode?: string;
  startedAt?: string;
  /** Set when the instructor ends the session. */
  endedAt?: string;
  /** When set, session is hidden from instructor Recent Sessions (records unchanged). */
  hiddenFromListAt?: string;
  /** Auth account id (`authAccounts` document id) — scopes session to one instructor. */
  instructorAuthId?: string;
  /** Resolved from the class when the session is created. */
  classMode?: InstructorClassMode;
  classId?: string;
}

export type InstructorAttendanceFailureReason =
  | 'SESSION_NOT_ACTIVE'
  | 'SESSION_NOT_OWNED'
  | 'FACE_TO_FACE_ONLY'
  | 'STUDENT_NOT_IN_CLASS'
  | 'ALREADY_RECORDED'
  | 'INVALID_STUDENT';

export interface InstructorAccount {
  id: string;
  fullName: string;
  email: string;
  qrCodeValue?: string;
}

export interface VerificationDocument {
  fileName: string;
  fileUrl: string;
  contentType: string;
  uploadedAt: string;
  sizeBytes: number;
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
  approvalStatus: 'pending' | 'approved' | 'archived';
  createdBy: 'self' | 'admin';
  createdAt?: string;
  allowedClassIds?: string[];
  allowedSubjects?: string[];
  verificationDocuments?: VerificationDocument[];
  archiveReason?: string;
  archivedAt?: string;
  archivedBy?: string;
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

  constructor(
    private readonly verificationUpload: VerificationUploadService,
    private readonly accountEmail: AccountEmailService
  ) {}
  private readonly defaultStudentAccount: DefaultAccountSeed = {
    id: 'std-acc-1',
    fullName: 'Tiesha Kate D. Regular',
    email: 'regular.tieshakated@gmail.com',
    qrCodeValue: 'ATTENDEASE-STUDENT-STD-ACC-1'
  };
  private readonly defaultInstructorAccount: DefaultAccountSeed = {
    id: 'ins-acc-1',
    fullName: 'Instructor Demo',
    email: 'instructor@gmail.com',
    qrCodeValue: 'ATTENDEASE-INSTRUCTOR-AUTH-INS-1'
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
      email: 'student@gmail.com',
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
      email: 'student2@gmail.com',
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
    const roleSyncBatch = writeBatch(this.db);
    for (const account of this.defaultAuthAccounts) {
      if (account.role === 'student' && account.qrCodeValue) {
        this.queueRoleCollectionSync(roleSyncBatch, account);
      }
    }
    return Promise.all([studentWrite, instructorWrite, ...authWrites])
      .then(() => roleSyncBatch.commit())
      .then(() => undefined);
  }

  async registerAccount(payload: {
    role: 'instructor' | 'student';
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    verificationFiles?: File[];
  }): Promise<AuthAccount> {
    const normalizedEmail = normalizeEmailAddress(payload.email);
    const gmailError = getGmailValidationError(normalizedEmail);
    if (gmailError) {
      throw new Error(gmailError);
    }
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
    const verificationDocuments = payload.verificationFiles?.length
      ? await this.verificationUpload.prepareVerificationDocuments(payload.verificationFiles)
      : [];

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
      createdAt: new Date().toISOString(),
      allowedClassIds: [],
      allowedSubjects: [],
      ...(verificationDocuments.length ? { verificationDocuments } : {})
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
    const normalizedEmail = normalizeEmailAddress(payload.email);
    const gmailError = getGmailValidationError(normalizedEmail);
    if (gmailError) {
      throw new Error(gmailError);
    }
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
      createdAt: new Date().toISOString(),
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
    if (account.approvalStatus === 'archived' || account.approvalStatus !== 'approved') {
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
    if (!account || account.approvalStatus === 'archived' || account.approvalStatus !== 'approved') {
      return false;
    }
    return this.hasLinkedRoleProfile(account);
  }

  async getArchivedInstructorAccounts(): Promise<AuthAccount[]> {
    const authRef = collection(this.db, 'authAccounts');
    const archivedQuery = query(
      authRef,
      where('role', '==', 'instructor'),
      where('approvalStatus', '==', 'archived')
    );
    const snapshot = await getDocs(archivedQuery);
    return snapshot.docs.map((item) => this.mapAuthAccountDoc(item.id, item.data()));
  }

  async archiveInstructorAccount(
    accountId: string,
    reason: string,
    archivedBy: string
  ): Promise<AuthAccount | null> {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      throw new Error('Archive reason is required.');
    }

    const authDocRef = doc(this.db, 'authAccounts', accountId);
    const authSnapshot = await getDoc(authDocRef);
    if (!authSnapshot.exists()) {
      return null;
    }

    const account = this.mapAuthAccountDoc(authSnapshot.id, authSnapshot.data());
    if (account.role !== 'instructor') {
      throw new Error('Only instructor accounts can be archived from this page.');
    }
    if (account.approvalStatus === 'archived') {
      throw new Error('This account is already archived.');
    }
    if (account.approvalStatus === 'pending') {
      throw new Error('Pending accounts must be approved or rejected before archiving.');
    }

    const archivedAt = new Date().toISOString();
    const archivedAccount: AuthAccount = {
      ...account,
      approvalStatus: 'archived',
      allowedClassIds: [],
      allowedSubjects: [],
      archiveReason: trimmedReason,
      archivedAt,
      archivedBy: archivedBy.trim() || 'admin'
    };

    const batch = writeBatch(this.db);
    batch.set(
      authDocRef,
      {
        approvalStatus: 'archived',
        allowedClassIds: [],
        allowedSubjects: [],
        archiveReason: trimmedReason,
        archivedAt,
        archivedBy: archivedAccount.archivedBy
      },
      { merge: true }
    );

    const classes = await this.getInstructorClasses();
    for (const classItem of classes) {
      const assignedIds = classItem.assignedInstructorIds ?? [];
      if (!assignedIds.includes(accountId)) {
        continue;
      }
      const nextAssignedIds = assignedIds.filter((id) => id !== accountId);
      batch.set(
        doc(this.db, 'instructorClasses', classItem.id),
        { assignedInstructorIds: nextAssignedIds },
        { merge: true }
      );
    }

    await batch.commit();
    return archivedAccount;
  }

  async unarchiveInstructorAccount(accountId: string): Promise<AuthAccount | null> {
    const authDocRef = doc(this.db, 'authAccounts', accountId);
    const authSnapshot = await getDoc(authDocRef);
    if (!authSnapshot.exists()) {
      return null;
    }

    const account = this.mapAuthAccountDoc(authSnapshot.id, authSnapshot.data());
    if (account.role !== 'instructor') {
      throw new Error('Only instructor accounts can be unarchived from this page.');
    }
    if (account.approvalStatus !== 'archived') {
      throw new Error('This account is not archived.');
    }

    const restoredAccount: AuthAccount = {
      ...account,
      approvalStatus: 'approved',
      allowedClassIds: account.allowedClassIds ?? [],
      allowedSubjects: account.allowedSubjects ?? [],
      archiveReason: undefined,
      archivedAt: undefined,
      archivedBy: undefined
    };

    const batch = writeBatch(this.db);
    batch.set(
      authDocRef,
      {
        approvalStatus: 'approved',
        archiveReason: deleteField(),
        archivedAt: deleteField(),
        archivedBy: deleteField()
      },
      { merge: true }
    );
    this.queueRoleCollectionSync(batch, restoredAccount);
    await batch.commit();
    return restoredAccount;
  }

  async getPendingAccounts(): Promise<AuthAccount[]> {
    const authRef = collection(this.db, 'authAccounts');
    const pendingQuery = query(authRef, where('approvalStatus', '==', 'pending'));
    const snapshot = await getDocs(pendingQuery);
    return snapshot.docs.map((item) => this.mapAuthAccountDoc(item.id, item.data()));
  }

  async getAuthAccountsByRole(role: 'instructor' | 'student' | 'admin' | 'superadmin'): Promise<AuthAccount[]> {
    const authRef = collection(this.db, 'authAccounts');
    const roleQuery = query(authRef, where('role', '==', role));
    const snapshot = await getDocs(roleQuery);
    return snapshot.docs.map((item) => this.mapAuthAccountDoc(item.id, item.data(), role));
  }

  async approveAccount(accountId: string): Promise<AuthAccount | null> {
    const authDocRef = doc(this.db, 'authAccounts', accountId);
    const authSnapshot = await getDoc(authDocRef);
    if (!authSnapshot.exists()) {
      return null;
    }
    const data = authSnapshot.data() as AuthAccount;
    if (data.approvalStatus !== 'pending') {
      return null;
    }
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

  async rejectPendingAccount(accountId: string): Promise<AuthAccount | null> {
    const authDocRef = doc(this.db, 'authAccounts', accountId);
    const authSnapshot = await getDoc(authDocRef);
    if (!authSnapshot.exists()) {
      return null;
    }
    const data = this.mapAuthAccountDoc(authSnapshot.id, authSnapshot.data());
    if (data.approvalStatus !== 'pending') {
      throw new Error('Only pending registrations can be rejected.');
    }
    await deleteDoc(authDocRef);
    return data;
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
    if (payload.email !== undefined) {
      const gmailError = getGmailValidationError(payload.email);
      if (
        gmailError &&
        (existing.role === 'instructor' || existing.role === 'student')
      ) {
        throw new Error(gmailError);
      }
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
    return this.listCollection<AttendanceRecord>('attendanceRecords').then((records) =>
      records.filter((record) => (record.recordState ?? 'active') !== 'archived')
    );
  }

  async updateAttendanceRecordStatus(
    recordId: string,
    status: AttendanceStatus
  ): Promise<AttendanceRecord | null> {
    const normalizedId = recordId.trim();
    if (!normalizedId) {
      return null;
    }

    const recordRef = doc(this.db, 'attendanceRecords', normalizedId);
    const snapshot = await getDoc(recordRef);
    if (!snapshot.exists()) {
      return null;
    }

    const existing = snapshot.data() as AttendanceRecord;
    if ((existing.recordState ?? 'active') === 'archived') {
      return null;
    }

    const next: AttendanceRecord = {
      ...existing,
      id: normalizedId,
      status
    };
    await setDoc(recordRef, next, { merge: true });
    return next;
  }

  async archiveAttendanceRecord(
    recordId: string,
    reason: string,
    archivedBy: string
  ): Promise<AttendanceRecord | null> {
    const normalizedId = recordId.trim();
    const trimmedReason = reason.trim();
    const trimmedArchivedBy = archivedBy.trim();
    if (!normalizedId || !trimmedReason || !trimmedArchivedBy) {
      return null;
    }

    const recordRef = doc(this.db, 'attendanceRecords', normalizedId);
    const snapshot = await getDoc(recordRef);
    if (!snapshot.exists()) {
      return null;
    }

    const existing = snapshot.data() as AttendanceRecord;
    if ((existing.recordState ?? 'active') === 'archived') {
      return null;
    }

    const next: AttendanceRecord = {
      ...existing,
      id: normalizedId,
      recordState: 'archived',
      archiveReason: trimmedReason,
      archivedAt: new Date().toISOString(),
      archivedBy: trimmedArchivedBy
    };
    await setDoc(recordRef, next, { merge: true });
    return next;
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

  async getStudentProfileByQrCode(qrCodeValue: string): Promise<StudentProfile | null> {
    const normalizedQrCode = qrCodeValue.trim();
    if (!normalizedQrCode) {
      return null;
    }

    const fromStudents = await this.queryStudentProfileByQrCode(normalizedQrCode);
    if (fromStudents?.email) {
      return fromStudents;
    }

    const authAccount = await this.findAuthAccountByQrCode(normalizedQrCode);
    if (authAccount?.role === 'student' && authAccount.email) {
      const qr = authAccount.qrCodeValue?.trim() ?? normalizedQrCode;
      await this.syncStudentQrCodeByEmail(authAccount.email, qr);
      return {
        id: `std-${authAccount.id}`,
        fullName: authAccount.fullName,
        email: authAccount.email,
        qrCodeValue: qr
      };
    }

    const legacyEmail = this.parseLegacyStudentQrEmail(normalizedQrCode);
    if (!legacyEmail) {
      return null;
    }

    const profileByEmail = await this.getStudentProfile(legacyEmail);
    if (profileByEmail?.email) {
      return profileByEmail;
    }

    const authByEmail = await this.findAuthAccountByEmail('student', legacyEmail);
    if (!authByEmail?.email) {
      return null;
    }

    const qr = authByEmail.qrCodeValue?.trim() ?? normalizedQrCode;
    await this.syncStudentQrCodeByEmail(authByEmail.email, qr);
    return {
      id: `std-${authByEmail.id}`,
      fullName: authByEmail.fullName,
      email: authByEmail.email,
      qrCodeValue: qr
    };
  }

  async getInstructorClasses(): Promise<InstructorClass[]> {
    const allClasses = await this.listCollection<InstructorClass>('instructorClasses');
    return allClasses.filter((classItem) => classItem.status !== 'archived');
  }

  async getArchivedInstructorClasses(): Promise<InstructorClass[]> {
    const allClasses = await this.listCollection<InstructorClass>('instructorClasses');
    return allClasses.filter((classItem) => classItem.status === 'archived');
  }

  async archiveInstructorClass(
    classId: string,
    reason: string,
    archivedBy: string
  ): Promise<InstructorClass | null> {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      throw new Error('Archive reason is required.');
    }

    const classRef = doc(this.db, 'instructorClasses', classId);
    const classSnapshot = await getDoc(classRef);
    if (!classSnapshot.exists()) {
      return null;
    }

    const existing = classSnapshot.data() as InstructorClass;
    if (existing.status === 'archived') {
      throw new Error('This class is already archived.');
    }

    const archivedAt = new Date().toISOString();
    const archivedByValue = archivedBy.trim() || 'admin';
    const batch = writeBatch(this.db);
    batch.set(
      classRef,
      {
        status: 'archived',
        archiveReason: trimmedReason,
        archivedAt,
        archivedBy: archivedByValue,
        assignedInstructorIds: []
      },
      { merge: true }
    );

    const allClasses = await this.listCollection<InstructorClass>('instructorClasses');
    const activeClassMap = new Map(
      allClasses
        .filter((classItem) => classItem.status !== 'archived' && classItem.id !== classId)
        .map((classItem) => [classItem.id, classItem])
    );
    const instructors = await this.getAuthAccountsByRole('instructor');
    for (const instructor of instructors) {
      const allowedClassIds = instructor.allowedClassIds ?? [];
      if (!allowedClassIds.includes(classId)) {
        continue;
      }
      const nextAllowedClassIds = allowedClassIds.filter((id) => id !== classId);
      const nextAllowedSubjects = [
        ...new Set(
          nextAllowedClassIds.flatMap((id) => activeClassMap.get(id)?.assignedSubjects ?? [])
        )
      ];
      batch.set(
        doc(this.db, 'authAccounts', instructor.id),
        { allowedClassIds: nextAllowedClassIds, allowedSubjects: nextAllowedSubjects },
        { merge: true }
      );
    }

    await batch.commit();
    return {
      ...existing,
      id: classId,
      status: 'archived',
      archiveReason: trimmedReason,
      archivedAt,
      archivedBy: archivedByValue,
      assignedInstructorIds: []
    };
  }

  async unarchiveInstructorClass(classId: string): Promise<InstructorClass | null> {
    const classRef = doc(this.db, 'instructorClasses', classId);
    const classSnapshot = await getDoc(classRef);
    if (!classSnapshot.exists()) {
      return null;
    }

    const existing = classSnapshot.data() as InstructorClass;
    if (existing.status !== 'archived') {
      throw new Error('This class is not archived.');
    }

    await setDoc(
      classRef,
      {
        status: 'active',
        archiveReason: deleteField(),
        archivedAt: deleteField(),
        archivedBy: deleteField()
      },
      { merge: true }
    );

    return {
      ...existing,
      id: classId,
      status: 'active',
      archiveReason: undefined,
      archivedAt: undefined,
      archivedBy: undefined
    };
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
    const allStudents = await this.listCollection<InstructorStudent>('instructorStudents');
    return allStudents
      .filter((student) => (student.status ?? 'active') !== 'archived')
      .sort((first, second) => this.compareStudentRecency(second, first));
  }

  async getArchivedStudents(): Promise<InstructorStudent[]> {
    const allStudents = await this.listCollection<InstructorStudent>('instructorStudents');
    return allStudents.filter((student) => student.status === 'archived');
  }

  async archiveStudentAccount(
    email: string,
    reason: string,
    archivedBy: string,
    recipientName = ''
  ): Promise<AccountEmailResult> {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      throw new Error('Archive reason is required.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Student email is required.');
    }

    const archivedAt = new Date().toISOString();
    const archivedByValue = archivedBy.trim() || 'admin';
    const batch = writeBatch(this.db);

    const authAccount = await this.findAuthAccountByEmail('student', normalizedEmail);
    if (authAccount) {
      if (authAccount.approvalStatus === 'archived') {
        throw new Error('This student account is already archived.');
      }
      batch.set(
        doc(this.db, 'authAccounts', authAccount.id),
        {
          approvalStatus: 'archived',
          archiveReason: trimmedReason,
          archivedAt,
          archivedBy: archivedByValue
        },
        { merge: true }
      );
    }

    const [rosterSnapshot, classesSnapshot] = await Promise.all([
      getDocs(query(collection(this.db, 'instructorStudents'), where('email', '==', normalizedEmail))),
      getDocs(collection(this.db, 'instructorClasses'))
    ]);

    const archivedRosterIds = new Set<string>();
    const classIdsByStudentId = new Map<string, string[]>();

    rosterSnapshot.docs.forEach((rosterDoc) => {
      archivedRosterIds.add(rosterDoc.id);
    });

    if (archivedRosterIds.size) {
      classesSnapshot.docs.forEach((classDoc) => {
        const classData = classDoc.data() as Partial<InstructorClass>;
        const assignedStudentIds = classData.assignedStudentIds ?? [];
        const nextAssignedStudentIds = assignedStudentIds.filter((studentId) => {
          if (!archivedRosterIds.has(studentId)) {
            return true;
          }
          const existingClassIds = classIdsByStudentId.get(studentId) ?? [];
          existingClassIds.push(classDoc.id);
          classIdsByStudentId.set(studentId, existingClassIds);
          return false;
        });
        if (nextAssignedStudentIds.length !== assignedStudentIds.length) {
          batch.set(
            doc(this.db, 'instructorClasses', classDoc.id),
            {
              assignedStudentIds: nextAssignedStudentIds,
              studentCount: nextAssignedStudentIds.length
            },
            { merge: true }
          );
        }
      });
    }

    rosterSnapshot.docs.forEach((rosterDoc) => {
      batch.set(
        doc(this.db, 'instructorStudents', rosterDoc.id),
        {
          status: 'archived',
          archiveReason: trimmedReason,
          archivedAt,
          archivedBy: archivedByValue,
          archivedFromClassIds: classIdsByStudentId.get(rosterDoc.id) ?? []
        },
        { merge: true }
      );
    });

    if (!authAccount && !archivedRosterIds.size) {
      throw new Error('No student record found for this email.');
    }

    await batch.commit();

    const rosterName = rosterSnapshot.docs[0]?.data() as Partial<InstructorStudent> | undefined;
    const notifyName =
      recipientName.trim() ||
      authAccount?.fullName?.trim() ||
      rosterName?.name?.trim() ||
      'Student';

    return this.accountEmail.sendArchiveNotification(
      {
        toEmail: normalizedEmail,
        recipientName: notifyName,
        reason: trimmedReason
      },
      'student'
    );
  }

  async unarchiveStudentAccount(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Student email is required.');
    }

    const batch = writeBatch(this.db);
    const authAccount = await this.findAuthAccountByEmail('student', normalizedEmail);
    const [rosterSnapshot, classesSnapshot] = await Promise.all([
      getDocs(query(collection(this.db, 'instructorStudents'), where('email', '==', normalizedEmail))),
      getDocs(collection(this.db, 'instructorClasses'))
    ]);
    const hasArchivedRoster = rosterSnapshot.docs.some(
      (rosterDoc) => (rosterDoc.data() as InstructorStudent).status === 'archived'
    );

    if (!authAccount && !hasArchivedRoster) {
      throw new Error('No archived student record found for this email.');
    }

    if (authAccount?.approvalStatus === 'archived') {
      const restoredAccount: AuthAccount = {
        ...authAccount,
        approvalStatus: 'approved',
        archiveReason: undefined,
        archivedAt: undefined,
        archivedBy: undefined
      };
      batch.set(
        doc(this.db, 'authAccounts', authAccount.id),
        {
          approvalStatus: 'approved',
          archiveReason: deleteField(),
          archivedAt: deleteField(),
          archivedBy: deleteField()
        },
        { merge: true }
      );
      this.queueRoleCollectionSync(batch, restoredAccount);
    }

    const classDocsById = new Map(classesSnapshot.docs.map((classDoc) => [classDoc.id, classDoc]));
    const studentsToRestoreByClassId = new Map<string, Set<string>>();

    rosterSnapshot.docs.forEach((rosterDoc) => {
      const rosterData = rosterDoc.data() as InstructorStudent;
      (rosterData.archivedFromClassIds ?? []).forEach((classId) => {
        const studentIds = studentsToRestoreByClassId.get(classId) ?? new Set<string>();
        studentIds.add(rosterDoc.id);
        studentsToRestoreByClassId.set(classId, studentIds);
      });

      batch.set(
        doc(this.db, 'instructorStudents', rosterDoc.id),
        {
          status: 'active',
          archiveReason: deleteField(),
          archivedAt: deleteField(),
          archivedBy: deleteField(),
          archivedFromClassIds: deleteField()
        },
        { merge: true }
      );
    });

    studentsToRestoreByClassId.forEach((studentIds, classId) => {
      const classDoc = classDocsById.get(classId);
      if (!classDoc) {
        return;
      }

      const classData = classDoc.data() as Partial<InstructorClass>;
      const assignedStudentIds = classData.assignedStudentIds ?? [];
      const missingStudentIds = [...studentIds].filter(
        (studentId) => !assignedStudentIds.includes(studentId)
      );
      if (!missingStudentIds.length) {
        return;
      }

      const nextAssignedStudentIds = [...assignedStudentIds, ...missingStudentIds];
      batch.set(
        doc(this.db, 'instructorClasses', classId),
        {
          assignedStudentIds: nextAssignedStudentIds,
          studentCount: nextAssignedStudentIds.length
        },
        { merge: true }
      );
    });

    await batch.commit();
  }

  addInstructorStudent(payload: InstructorStudent): Promise<InstructorStudent> {
    const id = payload.id || doc(collection(this.db, 'instructorStudents')).id;
    const next = {
      ...payload,
      id,
      createdAt: payload.createdAt ?? new Date().toISOString()
    };
    return setDoc(doc(this.db, 'instructorStudents', id), next).then(() => next);
  }

  async updateInstructorStudent(id: string, payload: InstructorStudent): Promise<InstructorStudent> {
    const gmailError = getGmailValidationError(payload.email);
    if (gmailError) {
      throw new Error(gmailError);
    }
    const normalizedStudentId = (payload.studentId ?? '').trim();
    if (!normalizedStudentId) {
      throw new Error('Student ID is required.');
    }
    const existingByStudentId = await this.findInstructorStudentByStudentId(normalizedStudentId, id);
    if (existingByStudentId) {
      throw new Error('Student account already exists for this Student ID.');
    }

    const normalizedEmail = normalizeEmailAddress(payload.email);
    const authId = id.startsWith('instr-std-') ? id.slice(10) : null;
    if (authId) {
      const existingAuth = await this.findAuthAccountByEmail('student', normalizedEmail);
      if (existingAuth && existingAuth.id !== authId) {
        throw new Error('An account already exists with this email address.');
      }
    }

    const next = {
      ...payload,
      id,
      studentId: normalizedStudentId,
      email: normalizedEmail,
    };

    const batch = writeBatch(this.db);
    batch.set(doc(this.db, 'instructorStudents', id), next, { merge: true });

    if (authId) {
      batch.set(
        doc(this.db, 'students', `std-${authId}`),
        {
          fullName: payload.name,
          email: normalizedEmail,
        },
        { merge: true }
      );

      const nameParts = payload.name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      batch.set(
        doc(this.db, 'authAccounts', authId),
        {
          firstName,
          lastName,
          fullName: payload.name,
          email: normalizedEmail,
        },
        { merge: true }
      );
    }

    await batch.commit();
    return next;
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

  /**
   * All sessions (any instructor). Used for manual code uniqueness and student active-session discovery.
   */
  private listAllInstructorSessions(): Promise<InstructorSession[]> {
    return this.listCollection<InstructorSession>('instructorSessions');
  }

  /** Sessions created by the logged-in instructor (matches `authAccounts` id). */
  getInstructorSessionsForOwner(
    instructorAuthId: string,
    options?: { includeHidden?: boolean }
  ): Promise<InstructorSession[]> {
    const trimmed = instructorAuthId.trim();
    if (!trimmed) {
      return Promise.resolve([]);
    }
    const ref = collection(this.db, 'instructorSessions');
    const ownerQuery = query(ref, where('instructorAuthId', '==', trimmed));
    return getDocs(ownerQuery).then((snapshot) => {
      const sessions = snapshot.docs.map((item) => {
        const data = item.data() as InstructorSession;
        return { ...data, id: data.id ?? item.id };
      });
      if (options?.includeHidden) {
        return sessions;
      }
      return sessions.filter((session) => !session.hiddenFromListAt?.trim());
    });
  }

  async hideInstructorSessionFromList(
    sessionId: string,
    instructorAuthId: string
  ): Promise<InstructorSession | null> {
    const normalizedId = sessionId.trim();
    const ownerId = instructorAuthId.trim();
    if (!normalizedId || !ownerId) {
      return null;
    }

    const session = await this.getInstructorSessionById(normalizedId);
    if (!session) {
      return null;
    }
    if ((session.instructorAuthId ?? '').trim() !== ownerId) {
      throw new Error('SESSION_NOT_OWNED');
    }
    if (session.status === 'active') {
      throw new Error('SESSION_STILL_ACTIVE');
    }
    if (session.hiddenFromListAt?.trim()) {
      return session;
    }

    const updated: InstructorSession = {
      ...session,
      hiddenFromListAt: new Date().toISOString(),
    };
    return this.updateInstructorSession(normalizedId, updated);
  }

  async hideCompletedSessionsOlderThan(
    instructorAuthId: string,
    olderThanDays: number
  ): Promise<number> {
    const ownerId = instructorAuthId.trim();
    if (!ownerId || olderThanDays < 1) {
      return 0;
    }

    const sessions = await this.getInstructorSessionsForOwner(ownerId, { includeHidden: true });
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const toHide = sessions.filter((session) => {
      if (session.status === 'active' || session.hiddenFromListAt?.trim()) {
        return false;
      }
      const sortTime = new Date(session.startedAt ?? session.endedAt ?? session.date).getTime();
      return !Number.isNaN(sortTime) && sortTime < cutoff;
    });

    await Promise.all(
      toHide.map((session) => this.hideInstructorSessionFromList(session.id, ownerId))
    );
    return toHide.length;
  }

  async getActiveInstructorSessions(): Promise<InstructorSession[]> {
    const sessions = await this.listAllInstructorSessions();
    return sessions
      .filter((session) => session.status === 'active')
      .sort((first, second) => {
        const firstDate = new Date(first.date).getTime();
        const secondDate = new Date(second.date).getTime();
        return secondDate - firstDate;
      });
  }

  async getInstructorSessionById(sessionId: string): Promise<InstructorSession | null> {
    const normalizedId = sessionId.trim();
    if (!normalizedId) {
      return null;
    }

    const snapshot = await getDoc(doc(this.db, 'instructorSessions', normalizedId));
    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data() as InstructorSession;
    return { ...data, id: data.id ?? snapshot.id };
  }

  async getSessionRoster(sessionId: string): Promise<InstructorStudent[]> {
    const session = await this.enrichSessionClassMetadata(
      await this.getInstructorSessionById(sessionId)
    );
    if (!session || session.classMode !== FACE_TO_FACE_CLASS_MODE) {
      return [];
    }

    const classItem = await this.resolveClassForSession(session);
    if (!classItem) {
      return [];
    }

    const students = await this.getInstructorStudents();
    const assignedIds = new Set(classItem.assignedStudentIds ?? []);

    if (assignedIds.size) {
      return students
        .filter((student) => assignedIds.has(student.id))
        .sort((first, second) => first.name.localeCompare(second.name));
    }

    const sectionKey = (classItem.section?.trim() || classItem.name.trim()).toLowerCase();
    return students
      .filter((student) => {
        const studentSection = (student.section ?? '').trim().toLowerCase();
        return studentSection === sectionKey || studentSection === classItem.name.trim().toLowerCase();
      })
      .sort((first, second) => first.name.localeCompare(second.name));
  }

  async getAttendanceRecordsForSession(sessionId: string): Promise<AttendanceRecord[]> {
    const normalizedId = sessionId.trim();
    if (!normalizedId) {
      return [];
    }

    const prefix = `attendance-${normalizedId}-`;
    const records = await this.getAttendanceRecords();
    return records
      .filter((record) => (record.id ?? '').startsWith(prefix))
      .sort((first, second) => (second.timeIn ?? '').localeCompare(first.timeIn ?? ''));
  }

  async submitInstructorAttendance(payload: {
    sessionId: string;
    instructorAuthId: string;
    studentEmail: string;
    studentName: string;
    status: 'Present' | 'Late';
    method: 'qr' | 'manual';
  }): Promise<
    | { success: true; record: AttendanceRecord }
    | { success: false; reason: InstructorAttendanceFailureReason }
  > {
    const sessionId = payload.sessionId.trim();
    const instructorAuthId = payload.instructorAuthId.trim();
    const normalizedStudentEmail = payload.studentEmail.trim().toLowerCase();
    const normalizedStudentName = payload.studentName.trim();

    if (!sessionId || !instructorAuthId || !normalizedStudentEmail || !normalizedStudentName) {
      return { success: false, reason: 'INVALID_STUDENT' };
    }

    const session = await this.enrichSessionClassMetadata(
      await this.getInstructorSessionById(sessionId)
    );
    if (!session) {
      return { success: false, reason: 'SESSION_NOT_ACTIVE' };
    }

    if (session.status !== 'active') {
      return { success: false, reason: 'SESSION_NOT_ACTIVE' };
    }

    if ((session.instructorAuthId ?? '').trim() !== instructorAuthId) {
      return { success: false, reason: 'SESSION_NOT_OWNED' };
    }

    if (session.classMode !== FACE_TO_FACE_CLASS_MODE) {
      return { success: false, reason: 'FACE_TO_FACE_ONLY' };
    }

    const roster = await this.getSessionRoster(sessionId);
    const rosterStudent = roster.find(
      (student) => student.email.trim().toLowerCase() === normalizedStudentEmail
    );
    if (!rosterStudent) {
      return { success: false, reason: 'STUDENT_NOT_IN_CLASS' };
    }

    const now = new Date();
    const timeIn = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const attendanceRecordId = this.buildAttendanceRecordId(sessionId, normalizedStudentEmail);
    const nextRecord: AttendanceRecord = {
      id: attendanceRecordId,
      studentEmail: normalizedStudentEmail,
      studentName: rosterStudent.name.trim() || normalizedStudentName,
      subject: session.subject,
      section: session.section,
      date: session.date,
      timeIn,
      status: payload.status,
      method: payload.method,
    };

    const sessionRef = doc(this.db, 'instructorSessions', sessionId);
    const recordRef = doc(this.db, 'attendanceRecords', attendanceRecordId);

    try {
      await runTransaction(this.db, async (transaction) => {
        const sessionSnapshot = await transaction.get(sessionRef);
        if (!sessionSnapshot.exists()) {
          throw new Error('SESSION_NOT_ACTIVE');
        }

        const persistedSession = sessionSnapshot.data() as InstructorSession;
        if (persistedSession.status !== 'active') {
          throw new Error('SESSION_NOT_ACTIVE');
        }

        if ((persistedSession.instructorAuthId ?? '').trim() !== instructorAuthId) {
          throw new Error('SESSION_NOT_OWNED');
        }

        if (persistedSession.classMode !== FACE_TO_FACE_CLASS_MODE) {
          throw new Error('FACE_TO_FACE_ONLY');
        }

        const existingRecordSnapshot = await transaction.get(recordRef);
        if (existingRecordSnapshot.exists()) {
          throw new Error('ALREADY_RECORDED');
        }

        transaction.set(recordRef, nextRecord);
      });
      return { success: true, record: nextRecord };
    } catch (error) {
      const reason = error instanceof Error ? error.message : '';
      if (
        reason === 'ALREADY_RECORDED' ||
        reason === 'SESSION_NOT_ACTIVE' ||
        reason === 'SESSION_NOT_OWNED' ||
        reason === 'FACE_TO_FACE_ONLY'
      ) {
        return { success: false, reason: reason as InstructorAttendanceFailureReason };
      }
      return { success: false, reason: 'SESSION_NOT_ACTIVE' };
    }
  }

  async submitStudentAttendance(payload: {
    studentEmail: string;
    studentName: string;
    studentQrCodeValue: string;
    method: 'qr' | 'manual';
    manualCode?: string;
  }): Promise<
    | { success: true; record: AttendanceRecord; session: InstructorSession }
    | {
        success: false;
        reason: 'NO_ACTIVE_SESSION' | 'ALREADY_RECORDED' | 'INVALID_MANUAL_CODE' | 'ONLINE_QR_NOT_ALLOWED';
      }
  > {
    const normalizedStudentEmail = payload.studentEmail.trim().toLowerCase();
    const normalizedQrCodeValue = payload.studentQrCodeValue.trim();
    if (!normalizedStudentEmail || !normalizedQrCodeValue) {
      return { success: false, reason: 'NO_ACTIVE_SESSION' };
    }

    const activeSessions = await this.getActiveInstructorSessions();
    const latestActiveSession = await this.enrichSessionClassMetadata(activeSessions[0] ?? null);
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

    if (payload.method === 'qr' && latestActiveSession.classMode === 'Online Class') {
      return { success: false, reason: 'ONLINE_QR_NOT_ALLOWED' };
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

  async isManualAttendanceCodeUnique(code: string): Promise<boolean> {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      return false;
    }
    const sessions = await this.listAllInstructorSessions();
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

  getInstructorAccountByEmail(email: string): Promise<InstructorAccount | null> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return Promise.resolve(null);
    }

    return getDocs(
      query(collection(this.db, 'instructorAccounts'), where('email', '==', normalizedEmail))
    ).then((snapshot) => {
      const firstDoc = snapshot.docs[0];
      if (!firstDoc) {
        return null;
      }

      const data = firstDoc.data() as InstructorAccount;
      return { ...data, id: data.id ?? firstDoc.id };
    });
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

  private mapAuthAccountDoc(
    docId: string,
    data: Record<string, unknown>,
    fallbackRole: AuthAccount['role'] = 'student'
  ): AuthAccount {
    const record = data as Omit<AuthAccount, 'id'> & Partial<Pick<AuthAccount, 'id'>>;
    return {
      id: String(record.id ?? docId),
      role: record.role ?? fallbackRole,
      firstName: record.firstName ?? '',
      lastName: record.lastName ?? '',
      fullName: record.fullName ?? '',
      email: record.email ?? '',
      password: record.password ?? '',
      qrCodeValue: record.qrCodeValue ?? '',
      approvalStatus: record.approvalStatus ?? 'pending',
      createdBy: record.createdBy ?? 'self',
      createdAt: record.createdAt,
      allowedClassIds: record.allowedClassIds ?? [],
      allowedSubjects: record.allowedSubjects ?? [],
      verificationDocuments: record.verificationDocuments ?? [],
      archiveReason: record.archiveReason,
      archivedAt: record.archivedAt,
      archivedBy: record.archivedBy
    };
  }

  private queryStudentProfileByQrCode(qrCodeValue: string): Promise<StudentProfile | null> {
    const studentsRef = collection(this.db, 'students');
    const studentsQuery = query(studentsRef, where('qrCodeValue', '==', qrCodeValue));
    return getDocs(studentsQuery).then((snapshot) => {
      const firstDoc = snapshot.docs[0];
      if (!firstDoc) {
        return null;
      }
      const data = firstDoc.data() as Omit<StudentProfile, 'id'> & Partial<Pick<StudentProfile, 'id'>>;
      return {
        id: String(data.id ?? firstDoc.id),
        fullName: data.fullName ?? '',
        email: data.email ?? '',
        qrCodeValue: data.qrCodeValue ?? ''
      };
    });
  }

  private findAuthAccountByQrCode(qrCodeValue: string): Promise<AuthAccount | null> {
    const authRef = collection(this.db, 'authAccounts');
    const authQuery = query(authRef, where('qrCodeValue', '==', qrCodeValue));
    return getDocs(authQuery).then((snapshot) => {
      const studentDoc = snapshot.docs.find((item) => {
        const data = item.data() as { role?: AuthAccount['role'] };
        return data.role === 'student';
      });
      if (!studentDoc) {
        return null;
      }
      return this.mapAuthAccountDoc(studentDoc.id, studentDoc.data(), 'student');
    });
  }

  private parseLegacyStudentQrEmail(qrCodeValue: string): string | null {
    const prefix = 'ATTENDEASE-STUDENT-';
    if (!qrCodeValue.toUpperCase().startsWith(prefix)) {
      return null;
    }

    const remainder = qrCodeValue.slice(prefix.length).trim().toLowerCase();
    if (!remainder.includes('@')) {
      return null;
    }

    return remainder;
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
      return this.mapAuthAccountDoc(firstDoc.id, firstDoc.data(), role);
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

  private async findInstructorStudentByStudentId(
    studentId: string,
    excludeRecordId?: string
  ): Promise<InstructorStudent | null> {
    const normalizedStudentId = studentId.trim().toLowerCase();
    if (!normalizedStudentId) {
      return null;
    }
    const students = await this.getInstructorStudents();
    return students.find(
      (student) =>
        (student.studentId ?? '').trim().toLowerCase() === normalizedStudentId &&
        student.id !== excludeRecordId
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
    return this.mapAuthAccountDoc(firstDoc.id, firstDoc.data());
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
          section: extras.section ?? '',
          ...(account.createdAt ? { createdAt: account.createdAt } : {})
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

  async enrichSessionClassMetadata(
    session: InstructorSession | null
  ): Promise<InstructorSession | null> {
    if (!session) {
      return null;
    }

    if (session.classMode && session.classId) {
      return session;
    }

    const classItem = await this.resolveClassForSession(session);
    if (!classItem) {
      return session;
    }

    return {
      ...session,
      classId: session.classId ?? classItem.id,
      classMode: session.classMode ?? classItem.classMode,
    };
  }

  async resolveClassForSession(session: InstructorSession): Promise<InstructorClass | null> {
    const classes = await this.getInstructorClasses();
    if (session.classId) {
      const byId = classes.find((classItem) => classItem.id === session.classId);
      if (byId) {
        return byId;
      }
    }
    return this.findClassMatchingSession(session, classes);
  }

  findClassMatchingSession(
    session: Pick<InstructorSession, 'section' | 'subject'>,
    classes: InstructorClass[]
  ): InstructorClass | null {
    const section = session.section.trim();
    const subject = session.subject.trim();
    if (!section || !subject) {
      return null;
    }

    const sectionAndSubjectMatch = classes.find((classItem) => {
      const classSection = classItem.section?.trim() || classItem.name.trim();
      const sectionMatches = classItem.name.trim() === section || classSection === section;
      if (!sectionMatches) {
        return false;
      }
      const subjects = this.getClassSubjects(classItem);
      return subjects.includes(subject);
    });
    if (sectionAndSubjectMatch) {
      return sectionAndSubjectMatch;
    }

    return (
      classes.find((classItem) => {
        const classSection = classItem.section?.trim() || classItem.name.trim();
        return classItem.name.trim() === section || classSection === section;
      }) ?? null
    );
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

  private compareStudentRecency(first: InstructorStudent, second: InstructorStudent): number {
    const firstTime = first.createdAt ? new Date(first.createdAt).getTime() : 0;
    const secondTime = second.createdAt ? new Date(second.createdAt).getTime() : 0;
    if (firstTime !== secondTime) {
      return firstTime - secondTime;
    }
    return first.name.localeCompare(second.name);
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
