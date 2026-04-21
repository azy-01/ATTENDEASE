import { Component } from '@angular/core';

@Component({
  selector: 'app-student-qr-code',
  standalone: true,
  templateUrl: './qr-code.html',
  styleUrls: ['./qr-code.scss'],
})
export class StudentQrCodeComponent {
  fullName = 'NRCK';
  qrImage = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=student-NRCK-attendease';
}
