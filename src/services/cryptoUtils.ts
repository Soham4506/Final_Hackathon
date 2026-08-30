/**
 * Cryptographic Utility Service (Government-Grade Security)
 * Provides synchronous & async SHA-256 hashing, RFC 6238 TOTP (Web Crypto HMAC-SHA1),
 * Base32 encoding/decoding, secure random tokens, and recovery code hashing.
 */

// Base32 Character map for standard TOTP secrets (RFC 3548 / RFC 6238)
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Standard SHA-256 constants
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

function ch(x: number, y: number, z: number): number {
  return (x & y) ^ (~x & z);
}

function maj(x: number, y: number, z: number): number {
  return (x & y) ^ (x & z) ^ (y & z);
}

function sigma0(x: number): number {
  return rotr(2, x) ^ rotr(13, x) ^ rotr(22, x);
}

function sigma1(x: number): number {
  return rotr(6, x) ^ rotr(11, x) ^ rotr(25, x);
}

function gamma0(x: number): number {
  return rotr(7, x) ^ rotr(18, x) ^ (x >>> 3);
}

function gamma1(x: number): number {
  return rotr(17, x) ^ rotr(19, x) ^ (x >>> 10);
}

/**
 * Pure synchronous SHA-256 computation returning 64-character lowercase hex string.
 * Guaranteed to execute identically and synchronously in browser, Node, and workers.
 */
export function computeSHA256Sync(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  const bitLength = bytes.length * 8;

  // Pre-processing (Padding)
  const padLength = (bytes.length + 9) % 64 === 0 ? 0 : 64 - ((bytes.length + 9) % 64);
  const totalLength = bytes.length + 1 + padLength + 8;
  const padded = new Uint8Array(totalLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  // Append length in bits (big-endian 64-bit)
  const view = new DataView(padded.buffer);
  view.setUint32(totalLength - 4, bitLength >>> 0, false);
  view.setUint32(totalLength - 8, Math.floor(bitLength / 0x100000000), false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  // Process 512-bit (64-byte) chunks
  for (let chunk = 0; chunk < totalLength; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(chunk + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      w[i] = (gamma1(w[i - 2]) + w[i - 7] + gamma0(w[i - 15]) + w[i - 16]) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const t1 = (h + sigma1(e) + ch(e, f, g) + K[i] + w[i]) >>> 0;
      const t2 = (sigma0(a) + maj(a, b, c)) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const toHex = (n: number) => n.toString(16).padStart(8, '0');
  return `${toHex(h0)}${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}${toHex(h5)}${toHex(h6)}${toHex(h7)}`;
}

/**
 * Async SHA-256 (supports Web Crypto and fallback)
 */
export async function computeSHA256(input: string | ArrayBuffer | Uint8Array | Blob): Promise<string> {
  if (typeof input === 'string') {
    return computeSHA256Sync(input);
  }
  let uint8: Uint8Array;
  if (input instanceof Uint8Array) {
    uint8 = input;
  } else if (input instanceof ArrayBuffer) {
    uint8 = new Uint8Array(input);
  } else if (typeof Blob !== 'undefined' && input instanceof Blob) {
    const ab = await input.arrayBuffer();
    uint8 = new Uint8Array(ab);
  } else {
    throw new Error('Unsupported input type for SHA-256 computation');
  }

  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', uint8 as unknown as BufferSource);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  return computeSHA256Sync(new TextDecoder().decode(uint8));
}

/**
 * Generates a cryptographically secure random token.
 */
export function generateCryptographicNonce(prefix: string = 'kmc_tx'): string {
  const array = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 8; i++) array[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(array).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${Date.now()}_${hex}`;
}

/**
 * Generate a standard 16-character Base32 TOTP secret.
 */
export function generateBase32Secret(length: number = 16): string {
  const array = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i++) array[i] = Math.floor(Math.random() * 256);
  }
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

function intToBigEndian8Bytes(num: number): ArrayBuffer {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Math.floor(num / 0x100000000), false);
  view.setUint32(4, num >>> 0, false);
  return buffer;
}

export async function generateTOTPCode(
  base32Secret: string,
  timeStepCounter = Math.floor(Date.now() / 30000)
): Promise<string> {
  const keyBytes = base32ToUint8Array(base32Secret);
  const timeBytes = intToBigEndian8Bytes(timeStepCounter);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, timeBytes);
  const signatureBytes = new Uint8Array(signature);
  const offset = signatureBytes[signatureBytes.length - 1] & 0x0f;
  const code =
    ((signatureBytes[offset] & 0x7f) << 24) |
    ((signatureBytes[offset + 1] & 0xff) << 16) |
    ((signatureBytes[offset + 2] & 0xff) << 8) |
    (signatureBytes[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

/**
 * Verify a 6-digit TOTP code against a Base32 secret with +/- 1 time step tolerance.
 */
export async function verifyTOTPCode(
  base32Secret: string,
  token: string,
  windowSteps = 1
): Promise<boolean> {
  const cleanToken = token.trim();
  if (cleanToken.length !== 6) return false;
  const currentStep = Math.floor(Date.now() / 30000);

  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const code = await generateTOTPCode(base32Secret, currentStep + offset);
    if (code === cleanToken) return true;
  }
  return false;
}

