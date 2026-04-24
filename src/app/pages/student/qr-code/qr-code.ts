import { Component, signal } from '@angular/core';
import QRCode from 'qrcode';
import { StudentApiService } from '../../../core/data/student-api.service';

@Component({
  selector: 'app-student-qr-code',
  standalone: true,
  templateUrl: './qr-code.html',
  styleUrls: ['./qr-code.scss'],
})
export class StudentQrCodeComponent {
  private readonly profileStorageKey = 'student-account-profile';

  readonly fullName = signal('NRCK');
  readonly email = signal('nerickjanio77@gmail.com');
  readonly qrImage = signal('');
  readonly isGeneratingQr = signal(true);

  constructor(private readonly studentApi: StudentApiService) {
    void this.initializeProfile();
  }

  async downloadQrCode(): Promise<void> {
    const image = this.qrImage();
    if (!image) return;

    const link = document.createElement('a');
    link.href = image;
    link.download = `attendease-qr-${this.fullName().toLowerCase().replace(/\s+/g, '-')}.png`;
    link.click();
  }

  private loadProfileFromLocalStorage(): void {
    const savedProfile = localStorage.getItem(this.profileStorageKey);
    if (!savedProfile) return;

    try {
      const parsed = JSON.parse(savedProfile) as { fullName?: string; email?: string };
      if (parsed.fullName) this.fullName.set(parsed.fullName);
      if (parsed.email) this.email.set(parsed.email);
    } catch {
      localStorage.removeItem(this.profileStorageKey);
    }
  }

  private async initializeProfile(): Promise<void> {
    this.loadProfileFromLocalStorage();

    try {
      const studentProfile = await this.studentApi.getStudentProfile(this.email());
      if (studentProfile) {
        this.fullName.set(studentProfile.fullName);
        this.email.set(studentProfile.email);
      }
    } catch {
      // Keep current local profile when API is unavailable.
    }

    await this.generateQrCode();
  }

  private async generateQrCode(): Promise<void> {
    this.isGeneratingQr.set(true);
    const payload = JSON.stringify({
      app: 'ATTENDEASE',
      role: 'student',
      fullName: this.fullName(),
      email: this.email(),
    });

    try {
      this.qrImage.set(
        await QRCode.toDataURL(payload, {
          width: 280,
          margin: 1,
        })
      );
    } catch {
      this.qrImage.set('');
    } finally {
      this.isGeneratingQr.set(false);
    }
  }
}
