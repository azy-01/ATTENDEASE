import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';
import { environment } from '../../../environments/environment';
import { getGmailValidationError, normalizeEmailAddress } from '../utils/gmail.utils';
import {
  buildAdminRegistrationAlertEmail,
  buildApprovalEmail,
  buildRegistrationReceivedEmail,
  buildRejectionEmail,
  type AccountEmailRole
} from './account-email.copy';

export type ArchivedAccountRole = AccountEmailRole;

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
  /** Separate from message so EmailJS templates can show `Reason: {{reason}}` without duplicating the body. */
  reason?: string;
  accountRole?: ArchivedAccountRole;
}

export interface RegistrationReceivedEmailPayload {
  toEmail: string;
  recipientName: string;
  firstName: string;
  accountRole: AccountEmailRole;
}

export interface AdminRegistrationAlertPayload {
  applicantName: string;
  applicantEmail: string;
  accountRole: AccountEmailRole;
  submittedAt: string;
}

export interface RoleApprovalEmailPayload {
  toEmail: string;
  recipientName: string;
  accountRole: AccountEmailRole;
}

export interface RoleRejectionEmailPayload {
  toEmail: string;
  recipientName: string;
  accountRole: AccountEmailRole;
  reason: string;
}

export interface AccountEmailResult {
  sent: boolean;
  message: string;
}

/**
 * Sends account notifications to the user's Gmail via EmailJS.
 * Configure `environment.accountEmail.emailjs` with your EmailJS credentials.
 * The EmailJS template must use dynamic `{{subject}}` and `{{message}}` fields.
 */
@Injectable({ providedIn: 'root' })
export class AccountEmailService {
  private emailJsInitialized = false;

  async sendRegistrationReceivedNotification(
    payload: RegistrationReceivedEmailPayload
  ): Promise<AccountEmailResult> {
    const content = buildRegistrationReceivedEmail(payload.firstName, payload.accountRole);

    return this.sendNotification({
      toEmail: payload.toEmail,
      recipientName: payload.recipientName,
      subject: content.subject,
      message: content.message,
      reason: content.reason,
      accountRole: payload.accountRole
    });
  }

  async sendAdminRegistrationAlert(
    payload: AdminRegistrationAlertPayload
  ): Promise<AccountEmailResult> {
    const adminEmails = environment.accountEmail?.adminNotifyEmails ?? [];
    if (!adminEmails.length) {
      return { sent: false, message: 'No admin notification emails configured.' };
    }

    const content = buildAdminRegistrationAlertEmail({
      ...payload,
      appUrl: environment.accountEmail?.appUrl
    });

    const failures: string[] = [];
    let sentCount = 0;

    for (const adminEmail of adminEmails) {
      const result = await this.sendNotification({
        toEmail: adminEmail,
        recipientName: 'AttendEase Admin',
        subject: content.subject,
        message: content.message,
        accountRole: payload.accountRole
      });

      if (result.sent) {
        sentCount += 1;
        continue;
      }

      failures.push(`${adminEmail}: ${result.message}`);
    }

    if (sentCount > 0) {
      return {
        sent: true,
        message: `Admin alert sent to ${sentCount} recipient(s).`
      };
    }

    return {
      sent: false,
      message: failures.join(' ') || 'Unable to notify administrators.'
    };
  }

  async sendRoleApprovalNotification(payload: RoleApprovalEmailPayload): Promise<AccountEmailResult> {
    const content = buildApprovalEmail(payload.accountRole, environment.accountEmail?.appUrl);

    return this.sendApprovalNotification({
      toEmail: payload.toEmail,
      recipientName: payload.recipientName,
      subject: content.subject,
      message: content.message,
      accountRole: payload.accountRole
    });
  }

  async sendRoleRejectionNotification(payload: RoleRejectionEmailPayload): Promise<AccountEmailResult> {
    const content = buildRejectionEmail(payload.accountRole, payload.reason);

    return this.sendRejectionNotification({
      toEmail: payload.toEmail,
      recipientName: payload.recipientName,
      subject: content.subject,
      message: content.message,
      reason: content.reason,
      accountRole: payload.accountRole
    });
  }

  async sendArchiveNotification(
    payload: AccountArchiveEmailPayload,
    role: ArchivedAccountRole = 'instructor'
  ): Promise<AccountEmailResult> {
    const subject =
      role === 'student'
        ? 'Your AttendEase student account has been archived'
        : 'Your AttendEase instructor account has been archived';

    const trimmedReason = payload.reason.trim();

    return this.sendNotification({
      toEmail: payload.toEmail,
      recipientName: payload.recipientName,
      subject,
      message: `Your AttendEase ${role} account has been archived.`,
      reason: trimmedReason,
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

    const reason = payload.reason?.trim() ?? '';

    const templateParams: Record<string, string> = {
      to_email: normalizedEmail,
      user_email: normalizedEmail,
      email: normalizedEmail,
      user_name: recipientName,
      to_name: recipientName,
      reason,
      subject,
      message,
      account_role: accountRole,
      time: new Date().toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
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
