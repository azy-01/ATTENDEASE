import { ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentApiService, type AttendanceRecord } from '../../../core/data/student-api.service';
import jsQR from 'jsqr';

@Component({
  selector: 'app-my-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-attendance.html',
  styleUrls: ['./my-attendance.scss'],
})
export class MyAttendanceComponent implements OnDestroy {
  @ViewChild('scannerVideo') private scannerVideoRef?: ElementRef<HTMLVideoElement>;
  private readonly authSessionStorageKey = 'attendease-auth-session';
  private readonly studentProfileStorageKey = 'student-account-profile';
  selectedSubject = '';
  selectedStatus = '';
  fromDate = '';
  toDate = '';
  attendanceMethod: 'qr' | 'manual' = 'qr';
  qrPayloadInput = '';
  manualCodeInput = '';
  submitError = '';
  submitSuccess = '';
  activeSessionLabel = '';
  activeSessionManualCode = '';
  hasActiveSession = false;
  isSubmitting = false;
  scannerSupported = false;
  isScannerOpen = false;
  isScannerStarting = false;
  scannerError = '';
  scannerStatus = '';
  availableCameras: Array<{ deviceId: string; label: string }> = [];
  selectedCameraId = '';
  private studentEmail = '';
  private studentName = '';
  private studentQrCodeValue = '';
  private scannerStream: MediaStream | null = null;
  private scanIntervalId: number | null = null;
  private isDetecting = false;
  private barcodeDetector: {
    detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
  } | null = null;
  private scanCanvas: HTMLCanvasElement | null = null;
  private scanContext: CanvasRenderingContext2D | null = null;

  private readonly allRecords = signal<AttendanceRecord[]>([]);

  constructor(
    private readonly studentApi: StudentApiService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.scannerSupported = this.canUseCameraScanner();
    void this.initializePage();
  }

  ngOnDestroy(): void {
    this.stopQrScanner();
  }

  get hasRecords(): boolean {
    return this.records.length > 0;
  }

  get records(): AttendanceRecord[] {
    const from = this.fromDate ? new Date(this.fromDate) : null;
    const to = this.toDate ? new Date(this.toDate) : null;

    return this.allRecords().filter((record) => {
      const matchesSubject = !this.selectedSubject || record.subject === this.selectedSubject;
      const matchesStatus = !this.selectedStatus || record.status === this.selectedStatus;
      const recordDate = new Date(record.date);
      const matchesFromDate = !from || recordDate >= from;
      const matchesToDate = !to || recordDate <= to;

      return matchesSubject && matchesStatus && matchesFromDate && matchesToDate;
    });
  }

  get subjects(): string[] {
    return [...new Set(this.allRecords().map((record) => record.subject))];
  }

  clearFilters(): void {
    this.selectedSubject = '';
    this.selectedStatus = '';
    this.fromDate = '';
    this.toDate = '';
  }

  onMethodChange(method: 'qr' | 'manual'): void {
    if (method !== 'qr') {
      this.stopQrScanner();
    }

    this.attendanceMethod = method;
    this.submitError = '';
    this.submitSuccess = '';
    this.cdr.markForCheck();
  }

  async startQrScanner(): Promise<void> {
    if (!this.scannerSupported || this.isScannerOpen || this.isScannerStarting) {
      return;
    }

    this.scannerError = '';
    this.scannerStatus = 'Requesting camera access. Please allow permission in your browser.';
    this.isScannerStarting = true;

    try {
      await this.refreshAvailableCameras();
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
      this.scannerStatus = 'Camera is active. Point it at the QR code.';
    } catch (error) {
      const errorName = (error as { name?: string })?.name ?? '';
      this.scannerError = errorName === 'NotAllowedError'
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

    this.scannerError = '';
    this.scannerStatus = 'Switching camera...';
    this.isScannerStarting = true;

    try {
      await this.openSelectedCameraStream();
      this.attachStreamToVideo();
      this.scannerStatus = 'Camera is active. Point it at the QR code.';
    } catch {
      this.scannerError = 'Unable to switch camera. Please select another device.';
    } finally {
      this.isScannerStarting = false;
      this.cdr.markForCheck();
    }
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

  async submitAttendance(): Promise<void> {
    if (this.isSubmitting || !this.hasActiveSession) {
      return;
    }

    this.submitError = '';
    this.submitSuccess = '';

    if (!this.studentEmail) {
      this.submitError = 'Student session is missing. Please sign in again.';
      this.cdr.markForCheck();
      return;
    }

    if (!this.studentQrCodeValue) {
      this.submitError = 'Your student QR code is not available yet. Please refresh or sign in again.';
      this.cdr.markForCheck();
      return;
    }

    if (this.attendanceMethod === 'qr') {
      const payloadInput = this.qrPayloadInput.trim();
      if (!payloadInput) {
        this.submitError = 'Scan a QR code first or paste the QR payload before submitting.';
        this.cdr.markForCheck();
        return;
      }

      const qrCodeValue = this.extractQrCodeValue(payloadInput);
      if (!qrCodeValue || qrCodeValue !== this.studentQrCodeValue) {
        this.submitError = 'QR payload does not match your registered QR code.';
        this.cdr.markForCheck();
        return;
      }
    } else {
      const manualCode = this.manualCodeInput.trim();
      if (!manualCode) {
        this.submitError = 'Enter the manual attendance code provided by your instructor.';
        this.cdr.markForCheck();
        return;
      }
    }

    this.isSubmitting = true;
    this.cdr.markForCheck();
    try {
      const result = await this.studentApi.submitStudentAttendance({
        studentEmail: this.studentEmail,
        studentName: this.studentName,
        studentQrCodeValue: this.studentQrCodeValue,
        method: this.attendanceMethod,
        manualCode: this.attendanceMethod === 'manual' ? this.manualCodeInput.trim() : undefined
      });

      if (!result.success) {
        if (result.reason === 'NO_ACTIVE_SESSION') {
          this.submitError = 'No active instructor session right now.';
        } else if (result.reason === 'INVALID_MANUAL_CODE') {
          this.submitError = 'Manual attendance code is incorrect for the active session.';
        } else {
          this.submitError = 'Attendance already recorded for this active session.';
        }
        await this.refreshActiveSessionState();
        this.cdr.markForCheck();
        return;
      }

      this.submitSuccess = `Attendance recorded for ${result.session.subject} (${result.session.section}).`;
      this.qrPayloadInput = '';
      this.manualCodeInput = '';
      await this.loadAttendanceRecords();
    } catch {
      this.submitError = 'Unable to submit attendance right now.';
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
    }
  }

  private async initializePage(): Promise<void> {
    this.resolveStudentSession();
    await Promise.all([
      this.loadStudentProfile(),
      this.refreshActiveSessionState()
    ]);
    await this.loadAttendanceRecords();
    this.cdr.markForCheck();
  }

  private async loadAttendanceRecords(): Promise<void> {
    if (!this.studentEmail) {
      this.allRecords.set([]);
      return;
    }

    try {
      const records = await this.studentApi.getAttendanceRecords();
      const normalizedEmail = this.studentEmail.trim().toLowerCase();
      this.allRecords.set(
        records.filter((record) => (record.studentEmail ?? '').trim().toLowerCase() === normalizedEmail)
      );
    } catch {
      this.allRecords.set([]);
    }
    this.cdr.markForCheck();
  }

  private resolveStudentSession(): void {
    const rawSession = localStorage.getItem(this.authSessionStorageKey);
    if (!rawSession) return;

    try {
      const parsed = JSON.parse(rawSession) as { email?: string; fullName?: string };
      this.studentEmail = parsed.email?.trim().toLowerCase() ?? '';
      this.studentName = parsed.fullName?.trim() ?? '';
    } catch {
      localStorage.removeItem(this.authSessionStorageKey);
    }
  }

  private async loadStudentProfile(): Promise<void> {
    if (!this.studentEmail) return;

    try {
      const profile = await this.studentApi.getStudentProfile(this.studentEmail);
      if (profile) {
        this.studentName = profile.fullName || this.studentName;
        this.studentQrCodeValue = profile.qrCodeValue?.trim() ?? '';
      }
    } catch {
      this.studentQrCodeValue = '';
    }

    if (!this.studentQrCodeValue) {
      this.studentQrCodeValue = this.readCachedStudentQrCode();
    }
    this.cdr.markForCheck();
  }

  /** Same key as login / QR Code page — Firestore may not have synced `qrCodeValue` yet. */
  private readCachedStudentQrCode(): string {
    const raw = localStorage.getItem(this.studentProfileStorageKey);
    if (!raw) return '';

    try {
      const parsed = JSON.parse(raw) as { email?: string; qrCodeValue?: string };
      const cachedEmail = parsed.email?.trim().toLowerCase() ?? '';
      if (cachedEmail && cachedEmail !== this.studentEmail) {
        return '';
      }
      return parsed.qrCodeValue?.trim() ?? '';
    } catch {
      return '';
    }
  }

  private async refreshActiveSessionState(): Promise<void> {
    try {
      const activeSessions = await this.studentApi.getActiveInstructorSessions();
      const latest = activeSessions[0];
      this.hasActiveSession = Boolean(latest);
      this.activeSessionLabel = latest ? `${latest.subject} • ${latest.section} • ${latest.date}` : '';
      this.activeSessionManualCode = latest?.manualAttendanceCode?.trim() ?? '';
    } catch {
      this.hasActiveSession = false;
      this.activeSessionLabel = '';
      this.activeSessionManualCode = '';
    }
    this.cdr.markForCheck();
  }

  private extractQrCodeValue(payload: string): string {
    if (!payload) return '';

    try {
      const parsed = JSON.parse(payload) as { qrCodeValue?: string; role?: string };
      if (parsed.role !== 'student') {
        return '';
      }
      return parsed.qrCodeValue?.trim() ?? '';
    } catch {
      return payload;
    }
  }

  private canUseCameraScanner(): boolean {
    return Boolean(
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices?.getUserMedia
    );
  }

  private setupBarcodeDetector(): void {
    const detectorConstructor = (window as unknown as {
      BarcodeDetector?: new (options?: { formats?: string[] }) => {
        detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
      };
    }).BarcodeDetector;

    if (!detectorConstructor) {
      this.barcodeDetector = null;
      return;
    }

    try {
      this.barcodeDetector = new detectorConstructor({
        formats: ['qr_code']
      });
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

      this.qrPayloadInput = payload;
      this.scannerStatus = 'QR detected and inserted.';
      this.stopQrScanner();
    } catch {
      this.scannerError = 'Unable to read QR code from camera stream.';
      this.stopQrScanner();
    } finally {
      this.isDetecting = false;
      this.cdr.markForCheck();
    }
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
    this.availableCameras = cameras.map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Camera ${index + 1}`
    }));

    if (!this.availableCameras.length) {
      throw new Error('NO_CAMERA');
    }

    const selectedExists = this.availableCameras.some((camera) => camera.deviceId === this.selectedCameraId);
    if (!selectedExists) {
      const iriunCamera = this.availableCameras.find((camera) =>
        camera.label.toLowerCase().includes('iriun')
      );
      this.selectedCameraId = iriunCamera?.deviceId ?? this.availableCameras[0].deviceId;
    }
  }

  private async openSelectedCameraStream(): Promise<void> {
    this.stopCurrentCameraStream();

    const constraints: MediaStreamConstraints = {
      video: this.selectedCameraId
        ? { deviceId: { exact: this.selectedCameraId } }
        : true,
      audio: false
    };
    this.scannerStream = await navigator.mediaDevices.getUserMedia(constraints);

    if (!this.availableCameras.length) {
      await this.refreshAvailableCameras();
    }
  }

  private stopCurrentCameraStream(): void {
    if (!this.scannerStream) {
      return;
    }

    this.scannerStream.getTracks().forEach((track) => track.stop());
    this.scannerStream = null;
  }
}
