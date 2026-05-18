import { Injectable } from '@angular/core';
import type { VerificationDocument } from './student-api.service';

/**
 * Prepares verification files for Firestore (Spark plan — no Firebase Storage required).
 * Files are stored as base64 data URLs on the auth account document.
 */
@Injectable({ providedIn: 'root' })
export class VerificationUploadService {
  readonly maxFiles = 2;
  readonly maxFileSizeBytes = 400 * 1024;
  readonly maxTotalEncodedBytes = 900_000;
  readonly allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]);

  /**
   * Validates selected verification files before encoding.
   *
   * @returns Error message when invalid; otherwise `null`.
   */
  validateFiles(files: File[]): string | null {
    if (!files.length) {
      return 'Please upload at least one document (school ID or proof of enrollment).';
    }
    if (files.length > this.maxFiles) {
      return `You can upload up to ${this.maxFiles} files.`;
    }
    for (const file of files) {
      if (!this.allowedMimeTypes.has(file.type)) {
        return `"${file.name}" is not supported. Use JPG, PNG, WEBP, GIF, or PDF.`;
      }
      if (file.size > this.maxFileSizeBytes) {
        return `"${file.name}" exceeds the 400 KB limit. Use a smaller photo or compress the file.`;
      }
    }
    return null;
  }

  /**
   * Encodes verification files as data URLs for storage in Firestore.
   */
  async prepareVerificationDocuments(files: File[]): Promise<VerificationDocument[]> {
    const validationError = this.validateFiles(files);
    if (validationError) {
      throw new Error(validationError);
    }

    const documents = await Promise.all(files.map((file) => this.fileToVerificationDocument(file)));
    const totalEncoded = documents.reduce((sum, doc) => sum + doc.fileUrl.length, 0);
    if (totalEncoded > this.maxTotalEncodedBytes) {
      throw new Error(
        'Uploaded files are too large together. Use smaller images or upload fewer files (max 400 KB each).'
      );
    }
    return documents;
  }

  private fileToVerificationDocument(file: File): Promise<VerificationDocument> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const fileUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!fileUrl) {
          reject(new Error(`Failed to read "${file.name}".`));
          return;
        }
        resolve({
          fileName: file.name,
          fileUrl,
          contentType: file.type,
          uploadedAt: new Date().toISOString(),
          sizeBytes: file.size
        });
      };
      reader.onerror = () => reject(new Error(`Failed to read "${file.name}".`));
      reader.readAsDataURL(file);
    });
  }
}
