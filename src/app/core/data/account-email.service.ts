import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { getGmailValidationError, normalizeEmailAddress } from '../utils/gmail.utils';

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
  async sendArchiveNotification(payload: AccountArchiveEmailPayload): Promise<AccountEmailResult> {
    return this.sendNotification({
      toEmail: payload.toEmail,
      recipientName: payload.recipientName,
      subject: 'Your AttendEase instructor account has been archived',
      message: payload.reason.trim()
    });
  }

  async sendApprovalNotification(payload: AccountStatusEmailPayload): Promise<AccountEmailResult> {
    return this.sendNotification(payload);
  }

  async sendRejectionNotification(payload: AccountStatusEmailPayload): Promise<AccountEmailResult> {
    return this.sendNotification(payload);
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

    const emailjs = environment.accountEmail?.emailjs;
    if (!emailjs?.serviceId || !emailjs?.templateId || !emailjs?.publicKey) {
      return {
        sent: false,
        message:
          'Email service is not configured. Add EmailJS credentials to environment.ts to notify users automatically.'
      };
    }

    const message = payload.message.trim();
    const subject = payload.subject.trim();

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: emailjs.serviceId,
          template_id: emailjs.templateId,
          user_id: emailjs.publicKey,
          template_params: {
            to_email: normalizedEmail,
            user_email: normalizedEmail,
            user_name: payload.recipientName.trim() || 'User',
            reason: message,
            subject,
            message
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          sent: false,
          message: errorText.trim() || 'Email provider rejected the request.'
        };
      }

      return { sent: true, message: `Notification sent to ${normalizedEmail}.` };
    } catch {
      return { sent: false, message: 'Unable to reach the email service. Check your network connection.' };
    }
  }
}
