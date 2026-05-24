import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import jsQR from 'jsqr';
import {
  FACE_TO_FACE_CLASS_MODE,
  StudentApiService,
  type AttendanceRecord,
  type InstructorAttendanceFailureReason,
  type InstructorSession,
  type InstructorStudent,
} from '../../../core/data/student-api.service';
import { NotificationService } from '../../../core/data/notification.service';

type TakeAttendanceTab = 'manual' | 'qr';

interface SuggestionItem {
  student: InstructorStudent;
  alreadyMarked: boolean;
}

@Component({
  selector: 'app-take-attendance-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './take-attendance-panel.component.html',
  styleUrls: ['./take-attendance-panel.component.scss'],
})
export class TakeAttendancePanelComponent implements OnChanges, OnDestroy {
  @ViewChild('scannerVideo') private scannerVideoRef?: ElementRef<HTMLVideoElement>;

  @Input({ required: true }) sessions: InstructorSession[] = [];
  @Input({ required: true }) instructorAuthId = '';

  @Output() readonly attendanceMarked = new EventEmitter<void>();

  readonly activeTab = signal<TakeAttendanceTab>('manual');
  readonly enrichedSessions = signal<InstructorSession[]>([]);
  readonly selectedSessionId = signal('');
  readonly roster = signal<InstructorStudent[]>([]);
  readonly sessionRecords = signal<AttendanceRecord[]>([]);
  readonly isLoadingRoster = signal(false);
  readonly isMarking = signal(false);
  readonly markMessage = signal('');
  readonly markError = signal('');

  readonly searchQuery = signal('');
  selectedStudent: InstructorStudent | null = null;
  markStatus: 'Present' | 'Late' = 'Present';
  qrMarkStatus: 'Present' | 'Late' = 'Present';

  suggestionHighlightIndex = -1;
  suggestionsOpen = false;

  scannerSupported = false;
  isScannerOpen = false;
  isScannerStarting = false;
  scannerError = '';
  scannerStatus = '';
  availableCameras: Array<{ deviceId: string; label: string; isRear: boolean }> = [];
  selectedCameraId = '';

  private userPickedCamera = false;

  private readonly api = inject(StudentApiService);
  private readonly notifications = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);

  private scannerStream: MediaStream | null = null;
  private scanIntervalId: number | null = null;
  private isDetecting = false;
  private barcodeDetector: {
    detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
  } | null = null;
  private scanCanvas: HTMLCanvasElement | null = null;
  private scanContext: CanvasRenderingContext2D | null = null;

  readonly faceToFaceSessions = computed(() =>
    this.enrichedSessions()
      .filter(
        (session) =>
          session.status === 'active' && session.classMode === FACE_TO_FACE_CLASS_MODE
      )
      .sort((first, second) => this.compareSessionsByRecency(second, first))
  );

  readonly selectedSession = computed(() => {
    const id = this.selectedSessionId();
    return this.faceToFaceSessions().find((session) => session.id === id) ?? null;
  });

  readonly rosterCount = computed(() => this.roster().length);

  readonly markedEmails = computed(() => {
    const emails = new Set<string>();
    for (const record of this.sessionRecords()) {
      const email = (record.studentEmail ?? '').trim().toLowerCase();
      if (email) {
        emails.add(email);
      }
    }
    return emails;
  });

  readonly filteredSuggestions = computed((): SuggestionItem[] => {
    const query = this.normalizeName(this.searchQuery());
    const roster = this.roster();
    const marked = this.markedEmails();

    const matches = !query
      ? roster
      : roster.filter((student) => {
          const name = this.normalizeName(student.name);
          const studentId = (student.studentId ?? '').trim().toLowerCase();
          return name.includes(query) || studentId.includes(query);
        });

    return matches.slice(0, 10).map((student) => ({
      student,
      alreadyMarked: marked.has(student.email.trim().toLowerCase()),
    }));
  });

  constructor() {
    this.scannerSupported = this.canUseCameraScanner();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sessions']) {
      void this.refreshEnrichedSessions();
    }
  }

  ngOnDestroy(): void {
    this.stopQrScanner();
  }

  onTabChange(tab: TakeAttendanceTab): void {
    if (tab !== 'qr') {
      this.stopQrScanner();
    }
    this.activeTab.set(tab);
    this.clearMarkFeedback();
  }

  async onSessionChange(sessionId: string): Promise<void> {
    this.selectedSessionId.set(sessionId);
    this.clearStudentSelection();
    await this.loadSessionData();
  }

  onSearchQueryChange(value: string): void {
    this.searchQuery.set(value);
    this.selectedStudent = null;
    this.suggestionsOpen = true;
    this.suggestionHighlightIndex = -1;
    this.clearMarkFeedback();
  }

  onSearchFocus(): void {
    this.suggestionsOpen = true;
  }

  onSearchBlur(): void {
    window.setTimeout(() => {
      this.suggestionsOpen = false;
      this.cdr.markForCheck();
    }, 150);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const items = this.filteredSuggestions();
    if (!items.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.suggestionHighlightIndex = Math.min(
        this.suggestionHighlightIndex + 1,
        items.length - 1
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.suggestionHighlightIndex = Math.max(this.suggestionHighlightIndex - 1, 0);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const index = this.suggestionHighlightIndex >= 0 ? this.suggestionHighlightIndex : 0;
      const item = items[index];
      if (item && !item.alreadyMarked) {
        this.selectSuggestion(item.student);
      }
      return;
    }

    if (event.key === 'Escape') {
      this.suggestionsOpen = false;
      this.suggestionHighlightIndex = -1;
    }
  }

  selectSuggestion(student: InstructorStudent): void {
    if (this.markedEmails().has(student.email.trim().toLowerCase())) {
      return;
    }
    this.selectedStudent = student;
    this.searchQuery.set(student.name);
    this.suggestionsOpen = false;
    this.suggestionHighlightIndex = -1;
  }

  async confirmManualAttendance(): Promise<void> {
    const session = this.selectedSession();
    if (!session || this.isMarking()) {
      return;
    }

    const resolved = this.resolveStudentFromInput();
    if (!resolved) {
      await Swal.fire({
        title: 'Student not found',
        text: 'This student is not in the class list for this session.',
        icon: 'warning',
        confirmButtonColor: '#4f46e5',
      });
      return;
    }

    if (this.markedEmails().has(resolved.email.trim().toLowerCase())) {
      await Swal.fire({
        title: 'Already recorded',
        text: `${resolved.name} is already marked for this session.`,
        icon: 'info',
        confirmButtonColor: '#4f46e5',
      });
      return;
    }

    await this.markAttendance(resolved.email, resolved.name, this.markStatus, 'manual');
    this.clearStudentSelection();
  }

  async startQrScanner(): Promise<void> {
    if (!this.scannerSupported || this.isScannerOpen || this.isScannerStarting) {
      return;
    }

    this.scannerError = '';
    this.scannerStatus = 'Requesting camera access. Please allow permission in your browser.';
    this.isScannerStarting = true;

    try {
      this.selectedCameraId = '';
      this.userPickedCamera = false;
      await this.openSelectedCameraStream();
      this.isScannerOpen = true;
      this.setupBarcodeDetector();
      this.cdr.detectChanges();
      this.attachStreamToVideo();

      if (this.scanIntervalId === null) {
        this.scanIntervalId = window.setInterval(() => {
          void this.detectQrFromVideo();
        }, 350);
      }
      this.scannerStatus = 'Point the camera at the student QR code.';
    } catch (error) {
      const errorName = (error as { name?: string })?.name ?? '';
      this.scannerError =
        errorName === 'NotAllowedError'
          ? 'Camera permission was blocked. Please allow camera access for this site.'
          : 'Camera access was denied or unavailable on this device.';
      this.stopQrScanner();
    } finally {
      this.isScannerStarting = false;
      this.cdr.markForCheck();
    }
  }

  async onCameraSelectionChange(): Promise<void> {
    if (!this.selectedCameraId || !this.isScannerOpen || this.isScannerStarting) {
      return;
    }

    this.userPickedCamera = true;
    this.scannerError = '';
    this.scannerStatus = 'Switching camera...';
    this.isScannerStarting = true;

    try {
      await this.openSelectedCameraStream();
      this.attachStreamToVideo();
      this.scannerStatus = 'Point the camera at the student QR code.';
    } catch {
      this.scannerError = 'Unable to switch camera. Please select another device.';
    } finally {
      this.isScannerStarting = false;
      this.cdr.markForCheck();
    }
  }

  async flipCamera(): Promise<void> {
    if (this.availableCameras.length < 2 || !this.isScannerOpen || this.isScannerStarting) {
      return;
    }

    const currentIndex = this.availableCameras.findIndex(
      (camera) => camera.deviceId === this.selectedCameraId
    );
    const nextIndex =
      currentIndex >= 0 ? (currentIndex + 1) % this.availableCameras.length : 0;
    this.selectedCameraId = this.availableCameras[nextIndex].deviceId;
    await this.onCameraSelectionChange();
  }

  stopQrScanner(): void {
    if (this.scanIntervalId !== null) {
      window.clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }

    this.stopCurrentCameraStream();

    if (this.scannerVideoRef?.nativeElement) {
      this.scannerVideoRef.nativeElement.srcObject = null;
    }

    this.isScannerOpen = false;
    this.isDetecting = false;
    this.cdr.markForCheck();
  }

  trackByStudentId(_index: number, item: SuggestionItem): string {
    return item.student.id;
  }

  trackByRecordId(_index: number, record: AttendanceRecord): string {
    return record.id ?? `${record.studentEmail}-${record.timeIn}`;
  }

  private async refreshEnrichedSessions(): Promise<void> {
    const enriched = await Promise.all(
      this.sessions.map((session) => this.api.enrichSessionClassMetadata(session))
    );
    this.enrichedSessions.set(
      enriched.filter((session): session is InstructorSession => Boolean(session))
    );
    this.syncSelectedSession();
    this.cdr.markForCheck();
  }

  private syncSelectedSession(): void {
    const f2f = this.faceToFaceSessions();
    const current = this.selectedSessionId();
    if (current && f2f.some((session) => session.id === current)) {
      void this.loadSessionData();
      return;
    }

    const nextId = f2f[0]?.id ?? '';
    this.selectedSessionId.set(nextId);
    if (nextId) {
      void this.loadSessionData();
    } else {
      this.roster.set([]);
      this.sessionRecords.set([]);
    }
  }

  private async loadSessionData(): Promise<void> {
    const sessionId = this.selectedSessionId();
    if (!sessionId) {
      this.roster.set([]);
      this.sessionRecords.set([]);
      return;
    }

    this.isLoadingRoster.set(true);
    try {
      const [roster, records] = await Promise.all([
        this.api.getSessionRoster(sessionId),
        this.api.getAttendanceRecordsForSession(sessionId),
      ]);
      this.roster.set(roster);
      this.sessionRecords.set(records);
    } catch {
      this.roster.set([]);
      this.sessionRecords.set([]);
    } finally {
      this.isLoadingRoster.set(false);
      this.cdr.markForCheck();
    }
  }

  private resolveStudentFromInput(): InstructorStudent | null {
    if (this.selectedStudent) {
      return this.selectedStudent;
    }

    const query = this.normalizeName(this.searchQuery());
    if (!query) {
      return null;
    }

    const exactMatches = this.roster().filter(
      (student) => this.normalizeName(student.name) === query
    );
    if (exactMatches.length === 1) {
      return exactMatches[0];
    }

    const idMatch = this.roster().find(
      (student) => (student.studentId ?? '').trim().toLowerCase() === query
    );
    return idMatch ?? null;
  }

  private async markAttendance(
    studentEmail: string,
    studentName: string,
    status: 'Present' | 'Late',
    method: 'qr' | 'manual'
  ): Promise<void> {
    const session = this.selectedSession();
    if (!session || !this.instructorAuthId) {
      return;
    }

    this.isMarking.set(true);
    this.clearMarkFeedback();

    try {
      const result = await this.api.submitInstructorAttendance({
        sessionId: session.id,
        instructorAuthId: this.instructorAuthId,
        studentEmail,
        studentName,
        status,
        method,
      });

      if (!result.success) {
        await this.showFailureAlert(result.reason, studentName);
        return;
      }

      const record = result.record;
      this.markMessage.set(
        `${record.studentName} marked ${record.status} at ${record.timeIn}.`
      );
      this.notifications.add(
        'Attendance marked',
        `${record.studentName} — ${record.status} (${session.subject}, ${session.section}).`,
        'instructor'
      );
      await this.loadSessionData();
      this.attendanceMarked.emit();
    } catch {
      this.markError.set('Unable to mark attendance right now. Please try again.');
    } finally {
      this.isMarking.set(false);
      this.cdr.markForCheck();
    }
  }

  private async showFailureAlert(
    reason: InstructorAttendanceFailureReason,
    studentName: string
  ): Promise<void> {
    const messages: Record<InstructorAttendanceFailureReason, { title: string; text: string; icon: 'warning' | 'info' | 'error' }> = {
      SESSION_NOT_ACTIVE: {
        title: 'Session ended',
        text: 'This session is no longer active.',
        icon: 'warning',
      },
      SESSION_NOT_OWNED: {
        title: 'Not allowed',
        text: 'You can only mark attendance for your own sessions.',
        icon: 'error',
      },
      FACE_TO_FACE_ONLY: {
        title: 'Face-to-face only',
        text: 'Instructor marking is only available for face-to-face classes.',
        icon: 'warning',
      },
      STUDENT_NOT_IN_CLASS: {
        title: 'Student not found',
        text: `${studentName || 'This student'} is not in the class list for this session.`,
        icon: 'warning',
      },
      ALREADY_RECORDED: {
        title: 'Already recorded',
        text: `${studentName || 'This student'} is already marked for this session.`,
        icon: 'info',
      },
      INVALID_STUDENT: {
        title: 'Invalid student',
        text: 'Could not verify the student record.',
        icon: 'error',
      },
    };

    const payload = messages[reason];
    this.markError.set(payload.text);
    await Swal.fire({
      title: payload.title,
      text: payload.text,
      icon: payload.icon,
      confirmButtonColor: '#4f46e5',
    });
  }

  private async detectQrFromVideo(): Promise<void> {
    if (!this.isScannerOpen || this.isDetecting) {
      return;
    }

    const video = this.scannerVideoRef?.nativeElement;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    this.isDetecting = true;
    try {
      const payload = await this.readQrPayload(video);
      if (!payload) {
        return;
      }

      this.stopQrScanner();
      await this.handleScannedQrPayload(payload);
    } catch {
      this.scannerError = 'Unable to read QR code from camera stream.';
      this.stopQrScanner();
    } finally {
      this.isDetecting = false;
      this.cdr.markForCheck();
    }
  }

  private async handleScannedQrPayload(payload: string): Promise<void> {
    const qrCodeValue = this.extractQrCodeValue(payload);
    if (!qrCodeValue) {
      await Swal.fire({
        title: 'Invalid QR code',
        text: 'This QR code is not a valid student attendance code.',
        icon: 'warning',
        confirmButtonColor: '#4f46e5',
      });
      return;
    }

    const profile = await this.api.getStudentProfileByQrCode(qrCodeValue);
    if (!profile?.email) {
      await Swal.fire({
        title: 'Student not found',
        text: 'No registered student matches this QR code.',
        icon: 'warning',
        confirmButtonColor: '#4f46e5',
      });
      return;
    }

    const rosterStudent = this.roster().find(
      (student) => student.email.trim().toLowerCase() === profile.email.trim().toLowerCase()
    );
    if (!rosterStudent) {
      await Swal.fire({
        title: 'Student not in class',
        text: `${profile.fullName} is not enrolled in this face-to-face class.`,
        icon: 'warning',
        confirmButtonColor: '#4f46e5',
      });
      return;
    }

    if (this.markedEmails().has(profile.email.trim().toLowerCase())) {
      await Swal.fire({
        title: 'Already recorded',
        text: `${profile.fullName} is already marked for this session.`,
        icon: 'info',
        confirmButtonColor: '#4f46e5',
      });
      return;
    }

    await this.markAttendance(
      profile.email,
      profile.fullName,
      this.qrMarkStatus,
      'qr'
    );
    this.scannerStatus = `Marked ${profile.fullName} via QR scan.`;
  }

  private extractQrCodeValue(payload: string): string {
    if (!payload.trim()) {
      return '';
    }

    try {
      const parsed = JSON.parse(payload) as { qrCodeValue?: string; role?: string };
      if (parsed.role && parsed.role !== 'student') {
        return '';
      }
      return parsed.qrCodeValue?.trim() ?? '';
    } catch {
      return payload.trim();
    }
  }

  private normalizeName(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private clearStudentSelection(): void {
    this.searchQuery.set('');
    this.selectedStudent = null;
    this.suggestionsOpen = false;
    this.suggestionHighlightIndex = -1;
  }

  private clearMarkFeedback(): void {
    this.markMessage.set('');
    this.markError.set('');
  }

  private canUseCameraScanner(): boolean {
    return Boolean(
      typeof window !== 'undefined' &&
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices?.getUserMedia
    );
  }

  private setupBarcodeDetector(): void {
    const detectorConstructor = (
      window as unknown as {
        BarcodeDetector?: new (options?: { formats?: string[] }) => {
          detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
        };
      }
    ).BarcodeDetector;

    if (!detectorConstructor) {
      this.barcodeDetector = null;
      return;
    }

    try {
      this.barcodeDetector = new detectorConstructor({ formats: ['qr_code'] });
    } catch {
      this.barcodeDetector = new detectorConstructor();
    }
  }

  private attachStreamToVideo(): void {
    const video = this.scannerVideoRef?.nativeElement;
    if (!video || !this.scannerStream) {
      return;
    }

    video.srcObject = this.scannerStream;
    void video.play().catch(() => {
      this.scannerError = 'Unable to start the camera preview.';
      this.stopQrScanner();
    });
  }

  private async readQrPayload(video: HTMLVideoElement): Promise<string> {
    if (this.barcodeDetector) {
      const barcodes = await this.barcodeDetector.detect(video);
      return barcodes[0]?.rawValue?.trim() ?? '';
    }

    return this.detectWithJsQr(video);
  }

  private detectWithJsQr(video: HTMLVideoElement): string {
    if (!video.videoWidth || !video.videoHeight) {
      return '';
    }

    if (!this.scanCanvas) {
      this.scanCanvas = document.createElement('canvas');
      this.scanContext = this.scanCanvas.getContext('2d', { willReadFrequently: true });
    }

    if (!this.scanCanvas || !this.scanContext) {
      return '';
    }

    this.scanCanvas.width = video.videoWidth;
    this.scanCanvas.height = video.videoHeight;
    this.scanContext.drawImage(video, 0, 0, this.scanCanvas.width, this.scanCanvas.height);
    const frame = this.scanContext.getImageData(0, 0, this.scanCanvas.width, this.scanCanvas.height);
    const decoded = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' });
    return decoded?.data?.trim() ?? '';
  }

  private async refreshAvailableCameras(): Promise<void> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === 'videoinput');
    this.availableCameras = cameras
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: this.formatCameraLabel(device.label, index),
        isRear: this.isRearCameraLabel(device.label),
      }))
      .sort((first, second) => Number(second.isRear) - Number(first.isRear));

    if (!this.availableCameras.length && !this.scannerStream) {
      throw new Error('NO_CAMERA');
    }

    const selectedExists = this.availableCameras.some(
      (camera) => camera.deviceId === this.selectedCameraId
    );
    if (!selectedExists) {
      this.selectedCameraId = this.pickDefaultCameraId();
    }
  }

  private async openSelectedCameraStream(): Promise<void> {
    this.stopCurrentCameraStream();

    const constraints = this.buildVideoConstraints();
    try {
      this.scannerStream = await navigator.mediaDevices.getUserMedia({
        video: constraints,
        audio: false,
      });
    } catch (primaryError) {
      if (this.selectedCameraId) {
        this.scannerStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } else {
        throw primaryError;
      }
    }

    await this.refreshAvailableCameras();
    await this.ensureRearCameraWhenAvailable();
    this.syncSelectedCameraFromActiveTrack();
  }

  private buildVideoConstraints(): MediaTrackConstraints {
    if (this.selectedCameraId) {
      return {
        deviceId: { ideal: this.selectedCameraId },
        facingMode: { ideal: 'environment' },
      };
    }

    return { facingMode: { ideal: 'environment' } };
  }

  private async ensureRearCameraWhenAvailable(): Promise<void> {
    if (this.userPickedCamera) {
      return;
    }

    const rearCamera = this.findRearCamera();
    if (!rearCamera || rearCamera.deviceId === this.selectedCameraId) {
      return;
    }

    const activeDeviceId = this.getActiveCameraDeviceId();
    if (activeDeviceId === rearCamera.deviceId) {
      this.selectedCameraId = rearCamera.deviceId;
      return;
    }

    this.selectedCameraId = rearCamera.deviceId;
    this.stopCurrentCameraStream();

    try {
      this.scannerStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { ideal: rearCamera.deviceId } },
        audio: false,
      });
    } catch {
      this.scannerStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
    }
  }

  private syncSelectedCameraFromActiveTrack(): void {
    const activeDeviceId = this.getActiveCameraDeviceId();
    if (!activeDeviceId) {
      return;
    }

    const matchingCamera = this.availableCameras.find(
      (camera) => camera.deviceId === activeDeviceId
    );
    if (matchingCamera) {
      this.selectedCameraId = matchingCamera.deviceId;
    }
  }

  private getActiveCameraDeviceId(): string {
    const track = this.scannerStream?.getVideoTracks()[0];
    return track?.getSettings().deviceId ?? '';
  }

  private pickDefaultCameraId(): string {
    return this.findRearCamera()?.deviceId ?? this.availableCameras[0]?.deviceId ?? '';
  }

  private findRearCamera(): { deviceId: string; label: string } | undefined {
    const labeledRear = this.availableCameras.find((camera) => camera.isRear);
    if (labeledRear) {
      return labeledRear;
    }

    if (this.availableCameras.length === 2) {
      return this.availableCameras[1];
    }

    return undefined;
  }

  private formatCameraLabel(rawLabel: string, index: number): string {
    const label = rawLabel.trim();
    if (label) {
      return label;
    }

    return `Camera ${index + 1}`;
  }

  private isRearCameraLabel(label: string): boolean {
    const normalized = label.toLowerCase();
    return /back|rear|environment|world|trás|arrière|wide/.test(normalized);
  }

  private compareSessionsByRecency(
    first: InstructorSession,
    second: InstructorSession
  ): number {
    const firstTime = new Date(first.startedAt ?? first.date).getTime();
    const secondTime = new Date(second.startedAt ?? second.date).getTime();
    return firstTime - secondTime;
  }

  private stopCurrentCameraStream(): void {
    if (!this.scannerStream) {
      return;
    }

    this.scannerStream.getTracks().forEach((track) => track.stop());
    this.scannerStream = null;
  }
}
