export type AccountEmailRole = 'instructor' | 'student';

export interface AccountEmailContent {
  subject: string;
  message: string;
  /** Short reason for templates that render a separate `{{reason}}` line (reject/archive). */
  reason?: string;
}

function roleArticle(roleLabel: 'instructor' | 'student'): string {
  return roleLabel === 'instructor' ? 'an instructor' : 'a student';
}

/**
 * Returns the public app URL used in account notification emails.
 */
export function getAccountEmailAppUrl(appUrl?: string): string {
  const trimmed = appUrl?.trim();
  if (trimmed) {
    return trimmed.replace(/\/+$/, '');
  }
  return 'http://localhost:4200';
}

/**
 * Builds the registration-received email (E1) for self-signup.
 */
export function buildRegistrationReceivedEmail(
  _firstName: string,
  accountRole: AccountEmailRole
): AccountEmailContent {
  const roleLabel = accountRole === 'instructor' ? 'instructor' : 'student';

  return {
    subject: `We received your AttendEase ${roleLabel} registration`,
    message: [
      `We received your registration for AttendEase as ${roleArticle(roleLabel)}.`,
      'Your account is pending admin approval. You will receive another email when it is approved or if it is not approved.',
      'Do not try to log in until you are approved.',
      '',
      'If you did not submit this registration, contact your administrator.'
    ].join('\n')
  };
}

/**
 * Builds the account-approved email (E2).
 */
export function buildApprovalEmail(
  accountRole: AccountEmailRole,
  appUrl?: string
): AccountEmailContent {
  const roleLabel = accountRole === 'instructor' ? 'instructor' : 'student';
  const loginUrl = getAccountEmailAppUrl(appUrl);

  return {
    subject: `Your AttendEase ${roleLabel} account has been approved`,
    message: [
      `Your ${roleLabel} registration for AttendEase has been approved.`,
      `You can now log in at ${loginUrl} with your Gmail address and password.`
    ].join('\n')
  };
}

/**
 * Builds the registration-rejected email (E3).
 */
export function buildRejectionEmail(
  accountRole: AccountEmailRole,
  reason: string
): AccountEmailContent {
  const roleLabel = accountRole === 'instructor' ? 'instructor' : 'student';
  const trimmedReason = reason.trim();

  return {
    subject: `Your AttendEase ${roleLabel} registration was not approved`,
    message: [
      `Your ${roleLabel} registration for AttendEase was not approved.`,
      'You may contact your administrator or submit a new registration if appropriate.'
    ].join('\n'),
    reason: trimmedReason
  };
}

/**
 * Builds the admin alert email (E5) for new pending registrations.
 */
export function buildAdminRegistrationAlertEmail(payload: {
  applicantName: string;
  applicantEmail: string;
  accountRole: AccountEmailRole;
  submittedAt: string;
  appUrl?: string;
}): AccountEmailContent {
  const roleLabel = payload.accountRole === 'instructor' ? 'instructor' : 'student';
  const baseUrl = getAccountEmailAppUrl(payload.appUrl);
  const reviewUrl = `${baseUrl}/instructor/pending-account-approval`;
  const submittedLabel = formatEmailTimestamp(payload.submittedAt);

  return {
    subject: `New AttendEase registration: ${payload.applicantName} (${roleLabel})`,
    message: [
      'A new registration is waiting for review.',
      '',
      `Name: ${payload.applicantName.trim()}`,
      `Email: ${payload.applicantEmail.trim()}`,
      `Role: ${roleLabel}`,
      `Submitted: ${submittedLabel}`,
      '',
      `Review pending registrations: ${reviewUrl}`
    ].join('\n')
  };
}

function formatEmailTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}
