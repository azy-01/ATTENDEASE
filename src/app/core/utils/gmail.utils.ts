const GMAIL_DOMAIN = 'gmail.com';

/** Gmail local-part rules: letters, numbers, dots, plus; no leading/trailing dots or consecutive dots. */
const GMAIL_LOCAL_PART_REGEX = /^[a-z0-9](?:[a-z0-9.+]*[a-z0-9])?$/;

const BLOCKED_LOCAL_PARTS = new Set([
  'test',
  'fake',
  'temp',
  'example',
  'noreply',
  'no-reply',
  'donotreply',
  'mailinator',
  'trash',
  'spam',
  'disposable',
]);

export function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase();
}

export function isGmailAddress(email: string): boolean {
  return getGmailValidationError(email) === null;
}

/**
 * Returns a user-facing validation message, or null when the address is acceptable
 * for registration and EmailJS notifications.
 */
export function getGmailValidationError(email: string): string | null {
  const normalized = normalizeEmailAddress(email);
  if (!normalized) {
    return 'Gmail address is required.';
  }

  const atIndex = normalized.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return 'Please enter a valid @gmail.com address.';
  }

  const localPart = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);

  if (domain !== GMAIL_DOMAIN) {
    return 'Only personal @gmail.com addresses are accepted for registration and email notifications.';
  }

  if (localPart.length < 6 || localPart.length > 64) {
    return 'Gmail usernames must be between 6 and 64 characters.';
  }

  if (!GMAIL_LOCAL_PART_REGEX.test(localPart)) {
    return 'Please enter a valid Gmail username (letters, numbers, dots, or plus signs only).';
  }

  if (localPart.includes('..')) {
    return 'Gmail addresses cannot contain consecutive dots.';
  }

  if (BLOCKED_LOCAL_PARTS.has(localPart)) {
    return 'Please use your real Gmail address, not a placeholder or disposable-style username.';
  }

  return null;
}

export const GMAIL_REQUIRED_MESSAGE =
  'A valid @gmail.com address is required for registration and approval notifications.';
