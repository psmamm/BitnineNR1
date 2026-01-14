/**
 * TOTP (Time-based One-Time Password) Implementation
 * Compatible with Google Authenticator, Microsoft Authenticator, Authy, etc.
 * Implements RFC 6238
 */

// Base32 encoding/decoding for TOTP secrets
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Uint8Array): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return result;
}

function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Generate a random TOTP secret
 * Returns a 20-byte (160-bit) secret encoded as Base32
 */
export async function generateTOTPSecret(): Promise<string> {
  const buffer = new Uint8Array(20);
  crypto.getRandomValues(buffer);
  return base32Encode(buffer);
}

/**
 * Generate HMAC-SHA1 hash
 */
async function hmacSHA1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
  return new Uint8Array(signature);
}

/**
 * Generate TOTP code for a given secret and time
 * @param secret - Base32 encoded secret
 * @param timestamp - Unix timestamp in seconds (defaults to current time)
 * @param period - Time period in seconds (default: 30)
 * @param digits - Number of digits in OTP (default: 6)
 */
export async function generateTOTP(
  secret: string,
  timestamp?: number,
  period: number = 30,
  digits: number = 6
): Promise<string> {
  const time = timestamp ?? Math.floor(Date.now() / 1000);
  const counter = Math.floor(time / period);

  // Convert counter to 8-byte big-endian buffer
  const counterBuffer = new Uint8Array(8);
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }

  // Decode the base32 secret
  const key = base32Decode(secret);

  // Generate HMAC-SHA1 hash
  const hash = await hmacSHA1(key, counterBuffer);

  // Dynamic truncation (RFC 4226)
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  // Generate OTP
  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

/**
 * Verify a TOTP code
 * Allows for time drift by checking codes within a window
 * @param secret - Base32 encoded secret
 * @param code - The OTP code to verify
 * @param window - Number of periods to check before and after current time (default: 1)
 */
export async function verifyTOTP(
  secret: string,
  code: string,
  window: number = 1
): Promise<boolean> {
  const currentTime = Math.floor(Date.now() / 1000);
  const period = 30;

  // Check codes within the time window
  for (let i = -window; i <= window; i++) {
    const checkTime = currentTime + (i * period);
    const expectedCode = await generateTOTP(secret, checkTime, period);

    if (expectedCode === code.padStart(6, '0')) {
      return true;
    }
  }

  return false;
}

/**
 * Generate a TOTP URI for QR code generation
 * This URI can be used to generate a QR code that authenticator apps can scan
 * @param secret - Base32 encoded secret
 * @param email - User's email address
 * @param issuer - Application name (default: "CIRCL")
 */
export function generateTOTPUri(
  secret: string,
  email: string,
  issuer: string = 'CIRCL'
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);

  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate backup codes for account recovery
 * These can be used if the user loses access to their authenticator app
 * @param count - Number of backup codes to generate (default: 8)
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing characters

  for (let i = 0; i < count; i++) {
    let code = '';
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);

    for (let j = 0; j < 8; j++) {
      code += chars[randomBytes[j] % chars.length];
    }

    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }

  return codes;
}

/**
 * Hash backup codes for secure storage
 * Backup codes should be hashed before storing in the database
 */
export async function hashBackupCode(code: string): Promise<string> {
  const normalized = code.replace(/-/g, '').toUpperCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a backup code against a list of hashed codes
 */
export async function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): Promise<{ valid: boolean; index: number }> {
  const hashedInput = await hashBackupCode(code);

  for (let i = 0; i < hashedCodes.length; i++) {
    if (hashedCodes[i] === hashedInput) {
      return { valid: true, index: i };
    }
  }

  return { valid: false, index: -1 };
}
