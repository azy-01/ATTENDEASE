import { TestBed } from '@angular/core/testing';
import emailjs from '@emailjs/browser';
import { AccountEmailService } from './account-email.service';

vi.mock('@emailjs/browser', () => ({
  default: {
    init: vi.fn(),
    send: vi.fn().mockResolvedValue({ status: 200, text: 'OK' })
  }
}));

describe('AccountEmailService', () => {
  let service: AccountEmailService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountEmailService);
  });

  it('sends registration received notification with expected subject', async () => {
    const result = await service.sendRegistrationReceivedNotification({
      toEmail: 'applicant@gmail.com',
      recipientName: 'Juan Cruz',
      firstName: 'Juan',
      accountRole: 'instructor'
    });

    expect(result.sent).toBe(true);
    expect(emailjs.send).toHaveBeenCalledTimes(1);

    const templateParams = vi.mocked(emailjs.send).mock.calls[0][2] as Record<string, string>;
    expect(templateParams['subject']).toBe('We received your AttendEase instructor registration');
    expect(templateParams['message']).toContain('We received your registration for AttendEase as an instructor.');
    expect(templateParams['reason']).toBe('');
  });

  it('sends role approval notification with login URL', async () => {
    const result = await service.sendRoleApprovalNotification({
      toEmail: 'applicant@gmail.com',
      recipientName: 'Juan Cruz',
      accountRole: 'student'
    });

    expect(result.sent).toBe(true);

    const templateParams = vi.mocked(emailjs.send).mock.calls[0][2] as Record<string, string>;
    expect(templateParams['subject']).toBe('Your AttendEase student account has been approved');
    expect(templateParams['message']).toContain('http://localhost:4200');
    expect(templateParams['reason']).toBe('');
  });

  it('sends role rejection notification with reason', async () => {
    const result = await service.sendRoleRejectionNotification({
      toEmail: 'applicant@gmail.com',
      recipientName: 'Juan Cruz',
      accountRole: 'instructor',
      reason: 'Invalid ID'
    });

    expect(result.sent).toBe(true);

    const templateParams = vi.mocked(emailjs.send).mock.calls[0][2] as Record<string, string>;
    expect(templateParams['subject']).toBe('Your AttendEase instructor registration was not approved');
    expect(templateParams['message']).not.toContain('Reason:');
    expect(templateParams['reason']).toBe('Invalid ID');
  });

  it('skips admin alert when no admin emails are configured', async () => {
    const result = await service.sendAdminRegistrationAlert({
      applicantName: 'Juan Cruz',
      applicantEmail: 'juan@gmail.com',
      accountRole: 'instructor',
      submittedAt: '2026-05-20T10:00:00.000Z'
    });

    expect(result.sent).toBe(false);
    expect(result.message).toContain('No admin notification emails configured');
    expect(emailjs.send).not.toHaveBeenCalled();
  });
});
