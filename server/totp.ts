import crypto from 'node:crypto';
import QRCode from 'qrcode';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function encodeBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function decodeBase32(input: string): Buffer {
  const normalized = input.toUpperCase().replace(/=+$/g, '').replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) {
      throw new Error('Invalid Base32 character');
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function generateTotpSecret(byteLength = 20): string {
  return encodeBase32(crypto.randomBytes(byteLength));
}

export function generateTotpAtStep(secretBase32: string, step: number): string {
  const key = decodeBase32(secretBase32);
  const counter = Buffer.alloc(8);
  const high = Math.floor(step / 0x100000000);
  const low = step >>> 0;
  counter.writeUInt32BE(high, 0);
  counter.writeUInt32BE(low, 4);

  const hmac = crypto.createHmac('sha1', key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1_000_000;
  return String(otp).padStart(6, '0');
}

export function verifyTotpCode(
  secretBase32: string,
  codeInput: string,
  options?: {
    windowSteps?: number;
    periodSeconds?: number;
    nowMs?: number;
    lastUsedStep?: number | null;
  },
): { valid: boolean; step: number | null } {
  const cleanCode = codeInput.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanCode)) {
    return { valid: false, step: null };
  }

  const periodSeconds = options?.periodSeconds ?? 30;
  const windowSteps = options?.windowSteps ?? 1;
  const nowMs = options?.nowMs ?? Date.now();
  const currentStep = Math.floor(nowMs / 1000 / periodSeconds);
  const cleanBuf = Buffer.from(cleanCode, 'utf8');

  for (let delta = -windowSteps; delta <= windowSteps; delta += 1) {
    const candidateStep = currentStep + delta;
    if (
      options?.lastUsedStep !== undefined &&
      options.lastUsedStep !== null &&
      candidateStep <= options.lastUsedStep
    ) {
      continue;
    }
    const expected = generateTotpAtStep(secretBase32, candidateStep);
    const expectedBuf = Buffer.from(expected, 'utf8');
    if (
      expectedBuf.length === cleanBuf.length &&
      crypto.timingSafeEqual(expectedBuf, cleanBuf)
    ) {
      return { valid: true, step: candidateStep };
    }
  }

  return { valid: false, step: null };
}

export function buildOtpAuthUri(params: {
  secret: string;
  email: string;
  issuer?: string;
}): string {
  const issuer = params.issuer ?? 'Konexio Africa';
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(params.email)}`;
  const search = new URLSearchParams({
    secret: params.secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${search.toString()}`;
}

export async function generateQrDataUrl(otpAuthUri: string): Promise<string> {
  return QRCode.toDataURL(otpAuthUri, {
    width: 240,
    margin: 2,
    color: {
      dark: '#151845',
      light: '#FFFFFF',
    },
  });
}

function deriveEncryptionKey(secretSeed: string): Buffer {
  return crypto.createHash('sha256').update(secretSeed).digest();
}

export function encryptTotpSecret(plainSecret: string, secretSeed: string): string {
  const key = deriveEncryptionKey(secretSeed);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainSecret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
}

export function decryptTotpSecret(encryptedPayload: string, secretSeed: string): string {
  const parts = encryptedPayload.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted TOTP payload');
  }
  const [ivB64, tagB64, dataB64] = parts;
  const key = deriveEncryptionKey(secretSeed);
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivB64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

export function hashRecoveryCode(code: string, secretSeed: string): string {
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return crypto.createHmac('sha256', secretSeed).update(normalized).digest('hex');
}
