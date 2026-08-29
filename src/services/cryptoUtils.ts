/**
 * Cryptographic Utility Service (Government-Grade Security)
 * Provides SHA-256 hashing, RFC 6238 TOTP (Web Crypto HMAC-SHA1),
 * Base32 encoding/decoding, secure random tokens, and recovery code hashing.
 */

// Base32 Character map for standard TOTP secrets (RFC 3548 / RFC 6238)
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Compute SHA-256 hash of a string, File, Blob, or ArrayBuffer.
 * Returns a 64-character lowercase hexadecimal hash string.
 */
export async function computeSHA256(input: string | ArrayBuffer | Uint8Array | Blob): Promise<string> {
  let uint8: Uint8Array;
  if (typeof input === 'string') {
    uint8 = new TextEncoder().encode(input);
  } else if (input instanceof Uint8Array) {
    uint8 = input;
  } else if (input instanceof ArrayBuffer) {
    uint8 = new Uint8Array(input);
  } else if (typeof Blob !== 'undefined' && input instanceof Blob) {
    const ab = await input.arrayBuffer();
    uint8 = new Uint8Array(ab);
  } else {
    throw new Error('Unsupported input type for SHA-256 computation');
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', uint8 as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a cryptographically secure random token.
 */
export function generateCryptographicNonce(prefix: string = 'kmc_tx'): string {
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  const hex = Array.from(array).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${Date.now()}_${hex}`;
}

/**
 * Generate a standard 16-character Base32 TOTP secret.
 */
export function generateBase32Secret(length: number = 16): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += BASE32_CHARS[array[i] % BASE32_CHARS.length];
  }
  return result;
}

/**
 * Convert Base32 secret string to Uint8Array buffer.
 */
export function base32ToUint8Array(base32Str: string): Uint8Array {
  const clean = base32Str.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(Math.floor((clean.length * 5) / 8));

  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return output;
}

/**
 * Convert integer to big-endian 8-byte buffer (for TOTP time counter).
 */
function intToBigEndian8Bytes(num: number): ArrayBuffer {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Math.floor(num / 0x100000000), false);
  view.setUint32(4, num >>> 0, false);
  return buffer;
}

/**
 * Generate 6-digit TOTP code for a given timestamp counter (RFC 6238).
 */
export async function generateTOTPCode(
  base32Secret: string,
  timeStepCounter = Math.floor(Date.now() / 30000)
): Promise<string> {
  const keyBytes = base32ToUint8Array(base32Secret);
  const timeBytes = intToBigEndian8Bytes(timeStepCounter);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'HMAC', hash: { name: 'SHA-1' } },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, timeBytes);
  const hashArray = new Uint8Array(signature);
  const offset = hashArray[hashArray.length - 1] & 0xf;
  const binaryCode =
    ((hashArray[offset] & 0x7f) << 24) |
    ((hashArray[offset + 1] & 0xff) << 16) |
    ((hashArray[offset + 2] & 0xff) << 8) |
    (hashArray[offset + 3] & 0xff);

  const otp = (binaryCode % 1000000).toString().padStart(6, '0');
  return otp;
}

/**
 * Verify 6-digit TOTP code against secret, checking current and neighboring time steps.
 */
export async function verifyTOTPCode(
  base32Secret: string,
  userCode: string,
  windowSteps: number = 1
): Promise<boolean> {
  const currentStep = Math.floor(Date.now() / 30000);
  const cleanCode = userCode.trim();

  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const expected = await generateTOTPCode(base32Secret, currentStep + offset);
    if (expected === cleanCode) {
      return true;
    }
  }
  return false;
}
