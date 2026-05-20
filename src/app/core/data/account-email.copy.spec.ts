import {
  buildAdminRegistrationAlertEmail,
  buildApprovalEmail,
  buildRegistrationReceivedEmail,
  buildRejectionEmail,
  getAccountEmailAppUrl
} from './account-email.copy';

describe('account-email.copy', () => {
  it('returns configured app URL without trailing slash', () => {
    expect(getAccountEmailAppUrl('https://attendease.example/app/')).toBe('https://attendease.example/app');
  });

  it('builds registration received copy for instructor signup', () => {
    const content = buildRegistrationReceivedEmail('Juan', 'instructor');

    expect(content.subject).toBe('We received your AttendEase instructor registration');
    expect(content.message).toContain('We received your registration for AttendEase as an instructor.');
    expect(content.message).toContain('pending admin approval');
    expect(content.message).not.toContain('Hello Juan');
    expect(content.reason).toBeUndefined();
  });

  it('builds approval copy with login URL', () => {
    const content = buildApprovalEmail('student', 'http://localhost:4200');

    expect(content.subject).toBe('Your AttendEase student account has been approved');
    expect(content.message).toContain('http://localhost:4200');
  });

  it('builds rejection copy with reason separated from message', () => {
    const content = buildRejectionEmail('instructor', 'Missing verification document');

    expect(content.subject).toBe('Your AttendEase instructor registration was not approved');
    expect(content.message).not.toContain('Reason:');
    expect(content.reason).toBe('Missing verification document');
  });

  it('builds admin alert copy with review link', () => {
    const content = buildAdminRegistrationAlertEmail({
      applicantName: 'Juan Cruz',
      applicantEmail: 'juan@gmail.com',
      accountRole: 'instructor',
      submittedAt: '2026-05-20T10:00:00.000Z',
      appUrl: 'http://localhost:4200'
    });

    expect(content.subject).toContain('Juan Cruz');
    expect(content.message).toContain('juan@gmail.com');
    expect(content.message).toContain('/instructor/pending-account-approval');
  });
});
