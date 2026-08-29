import { CivicIssue } from '../types';

export interface IntegrityCheckResult {
  isValid: boolean;
  isCorrupted: boolean;
  isMissing: boolean;
  errorReason?: string;
  expectedChecksum?: string;
  actualChecksum?: string;
  issueCount?: number;
  rawByteSize?: number;
}

export class IntegrityCheckService {
  public static readonly CHECKSUM_KEY = 'civicpulse_issues_checksum';
  public static readonly PRIMARY_STORE_KEY = 'civicpulse_issues';

  /**
   * Computes a deterministic checksum for an array of civic issues.
   */
  public static computeChecksum(issues: CivicIssue[]): string {
    if (!Array.isArray(issues)) return 'invalid-array';
    
    // Hash of count, ticket numbers, statuses, and field verification flags
    const fingerprints = issues
      .map((i) => `${i.id}:${i.ticketNumber}:${i.status}:${i.fieldVerificationStatus || 'none'}:${i.escalationCount}`)
      .sort()
      .join('|');

    let hash = 0;
    for (let idx = 0; idx < fingerprints.length; idx++) {
      const char = fingerprints.charCodeAt(idx);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }

    return `chk-${issues.length}-${Math.abs(hash).toString(16)}`;
  }

  /**
   * Writes the expected checksum right after a valid snapshot write.
   */
  public static recordChecksum(issues: CivicIssue[]): void {
    if (typeof window === 'undefined') return;
    try {
      const checksum = this.computeChecksum(issues);
      localStorage.setItem(this.CHECKSUM_KEY, checksum);
    } catch (err) {
      console.warn('Failed to record storage checksum:', err);
    }
  }

  /**
   * Verifies the integrity of the primary localStorage issues store.
   * Checks JSON validity, structural completeness, and checksum equality.
   */
  public static verifyStorageIntegrity(): IntegrityCheckResult {
    if (typeof window === 'undefined') {
      return { isValid: true, isCorrupted: false, isMissing: false };
    }

    const raw = localStorage.getItem(this.PRIMARY_STORE_KEY);
    const expectedChecksum = localStorage.getItem(this.CHECKSUM_KEY) || undefined;

    // 1. Missing Store Check
    if (raw === null) {
      return {
        isValid: false,
        isCorrupted: false,
        isMissing: true,
        errorReason: 'Primary data store key "civicpulse_issues" is completely missing (Wipeout detected).',
        expectedChecksum,
      };
    }

    // 2. Syntax & Corruption Check
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (syntaxErr: any) {
      return {
        isValid: false,
        isCorrupted: true,
        isMissing: false,
        errorReason: `Data store JSON is corrupted / unparseable: ${syntaxErr.message || 'SyntaxError'}`,
        expectedChecksum,
        rawByteSize: raw.length,
      };
    }

    // 3. Array Schema & Structural Check
    if (!Array.isArray(parsed)) {
      return {
        isValid: false,
        isCorrupted: true,
        isMissing: false,
        errorReason: 'Data store contains non-array corrupted type.',
        expectedChecksum,
        rawByteSize: raw.length,
      };
    }

    // 4. Record Integrity Check
    const hasCorruptRecord = parsed.some((item) => !item || typeof item !== 'object' || !item.id || !item.ticketNumber);
    if (hasCorruptRecord) {
      return {
        isValid: false,
        isCorrupted: true,
        isMissing: false,
        errorReason: 'One or more issue records contain malformed or missing primary keys.',
        expectedChecksum,
        issueCount: parsed.length,
        rawByteSize: raw.length,
      };
    }

    // 5. Checksum Equality Check (if checksum was recorded)
    const actualChecksum = this.computeChecksum(parsed as CivicIssue[]);
    if (expectedChecksum && expectedChecksum !== actualChecksum) {
      return {
        isValid: false,
        isCorrupted: true,
        isMissing: false,
        errorReason: `Checksum mismatch detected! Expected ${expectedChecksum}, but computed ${actualChecksum}.`,
        expectedChecksum,
        actualChecksum,
        issueCount: parsed.length,
        rawByteSize: raw.length,
      };
    }

    return {
      isValid: true,
      isCorrupted: false,
      isMissing: false,
      expectedChecksum,
      actualChecksum,
      issueCount: parsed.length,
      rawByteSize: raw.length,
    };
  }
}
