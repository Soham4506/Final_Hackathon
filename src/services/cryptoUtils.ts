/**
 * Cryptographic Utility Service (Government-Grade Security)
 * Provides SHA-256 hashing and secure cryptographic tokens using Web Crypto API.
 */

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
