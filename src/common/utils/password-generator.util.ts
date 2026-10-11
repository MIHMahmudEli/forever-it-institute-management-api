import { randomInt } from 'crypto';

/**
 * Generates a cryptographically secure, unpredictable temporary password.
 * Guaranteed to satisfy password policy:
 * - At least 10 characters
 * - Uppercase, lowercase, numbers, and allowed special characters
 */
export function generateTemporaryPassword(length = 10): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I, O for clarity
  const lower = 'abcdefghijkmnpqrstuvwxyz'; // Removed l, o for clarity
  const digits = '23456789'; // Removed 0, 1 for clarity
  const specials = '!@#$%&*';

  const allChars = upper + lower + digits + specials;

  // Guarantee at least one of each required character category
  const passwordChars = [
    upper[randomInt(upper.length)],
    lower[randomInt(lower.length)],
    digits[randomInt(digits.length)],
    specials[randomInt(specials.length)],
  ];

  // Fill the remaining length with random selections from allChars
  for (let i = passwordChars.length; i < length; i++) {
    passwordChars.push(allChars[randomInt(allChars.length)]);
  }

  // Shuffle using Fisher-Yates with crypto.randomInt
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('');
}
