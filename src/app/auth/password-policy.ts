export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;

// Managed Auth hashes with bcrypt, which silently ignores bytes past 72.
// Rejecting longer input keeps a long password from verifying differently
// than the user typed it.
const rejectedCommonPasswords = new Set([
  "password",
  "password1",
  "password12",
  "password123",
  "password1234",
  "passw0rd",
  "qwerty123",
  "12345678",
  "123456789",
  "1234567890",
  "letmein1",
  "welcome1",
  "iloveyou",
  "abc12345",
  "monkey12",
  "football",
  "sunshine",
  "princess",
  "admin123",
  "oppsift1",
  "oppsift123",
]);

function isWhitespaceOnly(value: string) {
  return /^\s+$/.test(value);
}

export function validatePassword(
  password: string,
  options: { email?: string; label?: string } = {},
): string | null {
  const label = options.label ?? "Your password";

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `${label} must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `${label} must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  }
  if (isWhitespaceOnly(password)) {
    return `${label} cannot be only spaces.`;
  }
  if (/^\p{Cc}+$/u.test(password)) {
    return `${label} cannot be only control characters.`;
  }
  if (password !== password.trim()) {
    return `${label} cannot start or end with a space.`;
  }
  if (rejectedCommonPasswords.has(password.toLowerCase())) {
    return `${label} is too common. Choose something harder to guess.`;
  }

  const emailLocalPart = options.email?.split("@")[0]?.trim().toLowerCase();
  if (emailLocalPart && emailLocalPart.length >= MIN_PASSWORD_LENGTH) {
    if (password.toLowerCase() === emailLocalPart) {
      return `${label} cannot be the same as the local part of your email address.`;
    }
  }

  return null;
}

export function validateNewPassword(
  password: string,
  confirmation: string,
  options: { email?: string } = {},
): string | null {
  const policyError = validatePassword(password, {
    email: options.email,
    label: "Your password",
  });
  if (policyError) return policyError;

  if (password !== confirmation) {
    return "Passwords do not match.";
  }
  return null;
}
