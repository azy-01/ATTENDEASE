import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';
import { environment } from '../../../environments/environment';
import { getGmailValidationError, normalizeEmailAddress } from '../utils/gmail.utils';

export type ArchivedAccountRole = 'instructor' | 'student';

export interface AccountArchiveEmailPayload {
  toEmail: string;
  recipientName: string;
  reason: string;
}

export interface AccountStatusEmailPayload {
  toEmail: string;
  recipientName: string;
  subject: string;
  message: string;
  accountRole?: ArchivedAccountRole;
}

export interface AccountEmailResult {
  sent: boolean;
  message: string;
}

/**
 * Sends account notifications to the user's Gmail via EmailJS.
 * Configure `environment.accountEmail.emailjs` with your EmailJS credentials.
 */
@Injectable({ providedIn: 'root' })
export class AccountEmailService {
  private emailJsInitialized = false;

  async sendArchiveNotification(
    payload: AccountArchiveEmailPayload,
    role: ArchivedAccountRole = 'instructor'
  ): Promise<AccountEmailResult> {
    const subject =
      role === 'student'
        ? 'Your AttendEase student account has been archived'
        : 'Your AttendEase instructor account has been archived';

    return this.sendNotification({
      toEmail: payload.toEmail,
      recipientName: payload.recipientName,
      subject,
      message: payload.reason.trim(),
      accountRole: role
    });
  }

  async sendApprovalNotification(payload: AccountStatusEmailPayload): Promise<AccountEmailResult> {
    return this.sendNotification(payload);
  }

  async sendRejectionNotification(payload: AccountStatusEmailPayload): Promise<AccountEmailResult> {
    return this.sendNotification(payload);
  }

  private ensureEmailJsInit(publicKey: string): void {
    if (this.emailJsInitialized) {
      return;
    }
    emailjs.init({ publicKey });
    this.emailJsInitialized = true;
  }

  private async sendNotification(payload: AccountStatusEmailPayload): Promise<AccountEmailResult> {
    const normalizedEmail = normalizeEmailAddress(payload.toEmail);
    if (!normalizedEmail) {
      return { sent: false, message: 'Recipient email is missing.' };
    }

    const gmailError = getGmailValidationError(normalizedEmail);
    if (gmailError) {
      return { sent: false, message: gmailError };
    }

    const emailjsConfig = environment.accountEmail?.emailjs;
    if (!emailjsConfig?.serviceId || !emailjsConfig?.templateId || !emailjsConfig?.publicKey) {
      return {
        sent: false,
        message:
          'Email service is not configured. Add EmailJS credentials to environment.ts to notify users automatically.'
      };
    }

    const message = payload.message.trim();
    const subject = payload.subject.trim();
    const recipientName = payload.recipientName.trim() || 'User';
    const accountRole = payload.accountRole ?? 'instructor';

    const templateParams: Record<string, string> = {
      to_email: normalizedEmail,
      user_email: normalizedEmail,
      email: normalizedEmail,
      user_name: recipientName,
      to_name: recipientName,
      reason: message,
      subject,
      message,
      account_role: accountRole
    };

    try {
      this.ensureEmailJsInit(emailjsConfig.publicKey);

      await emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateId, templateParams, {
        publicKey: emailjsConfig.publicKey
      });

      return { sent: true, message: `Notification sent to ${normalizedEmail}.` };
    } catch (error) {
      return {
        sent: false,
        message: this.formatEmailJsError(error)
      };
    }
  }

  private formatEmailJsError(error: unknown): string {
    if (error && typeof error === 'object') {
      const record = error as { text?: string; message?: string; status?: number };
      const detail = record.text?.trim() || record.message?.trim();
      if (detail) {
        return detail;
      }
      if (record.status === 403) {
        return 'EmailJS blocked this request. In the EmailJS dashboard, allow browser requests from http://localhost:4200 (and your production domain).';
      }
    }

    return 'Unable to reach the email service. Check your network connection and EmailJS settings.';
  }
}
