/**
 * ===========================================================================
 * KoparNiti (कोपरनीती) - Primary Civic Data Store Service
 *
 * This represents the primary operational data store of the municipality.
 *
 * Controlled Failure Mode (P0 Task 1):
 *  - Destructive demo action genuinely corrupts/destroys the primary storage
 *    within the demo namespace so that reads genuinely fail.
 *  - Recovery engine must reconstruct state exclusively from the physically
 *    independent RecoveryLedgerService.
 * ===========================================================================
 */

import { CivicIssue, AllocationPlan, AuditLog } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const PRIMARY_ISSUES_KEY = 'civicpulse_primary_issues_v2';
const PRIMARY_PLANS_KEY = 'civicpulse_primary_plans_v2';
const PRIMARY_HEALTH_KEY = 'civicpulse_primary_health_status';

export interface PrimaryStoreHealth {
  isHealthy: boolean;
  status: 'HEALTHY' | 'FAILED_UNAVAILABLE' | 'CORRUPTED';
  lastReadError?: string;
  totalRecords: number;
  lastCheckedAt: string;
}

export class PrimaryStoreService {
  private static memoryPrimaryIssues: CivicIssue[] | null = null;
  private static isCorruptedOverride = false;

  /**
   * Reads issues from the primary store.
   * Throws or returns error if primary store has experienced a blackout / corruption.
   */
  public static readPrimaryIssues(): { success: boolean; data?: CivicIssue[]; error?: string } {
    if (this.isCorruptedOverride) {
      return {
        success: false,
        error: 'CRITICAL: Primary database connection timed out / partition unreadable (HTTP 500 / ECONNREFUSED).',
      };
    }

    if (typeof window === 'undefined') {
      return { success: true, data: this.memoryPrimaryIssues || [] };
    }

    const healthStatus = localStorage.getItem(PRIMARY_HEALTH_KEY);
    if (healthStatus === 'CORRUPTED' || healthStatus === 'FAILED') {
      return {
        success: false,
        error: 'CRITICAL_BLACKOUT: Primary civic database segment is corrupted or unavailable.',
      };
    }

    const raw = localStorage.getItem(PRIMARY_ISSUES_KEY);
    if (raw === null) {
      if (this.memoryPrimaryIssues !== null) {
        return { success: true, data: this.memoryPrimaryIssues };
      }
      return { success: true, data: [] };
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return {
          success: false,
          error: 'DATA_CORRUPTION: Primary issues table returned invalid non-array structure.',
        };
      }
      this.memoryPrimaryIssues = parsed;
      return { success: true, data: parsed };
    } catch (err: any) {
      return {
        success: false,
        error: `PARSE_ERROR: Primary data block corrupted (${err.message}).`,
      };
    }
  }

  /**
   * Writes/Updates issues in the primary data store.
   */
  public static writePrimaryIssues(issues: CivicIssue[]): boolean {
    this.memoryPrimaryIssues = [...issues];
    this.isCorruptedOverride = false;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PRIMARY_ISSUES_KEY, JSON.stringify(issues));
        localStorage.setItem(PRIMARY_HEALTH_KEY, 'HEALTHY');
        return true;
      } catch (e) {
        console.error('Failed to write primary issues snapshot:', e);
        return false;
      }
    }
    return true;
  }

  /**
   * Inspects the health of the primary store.
   */
  public static checkHealth(): PrimaryStoreHealth {
    const result = this.readPrimaryIssues();
    if (!result.success) {
      return {
        isHealthy: false,
        status: 'FAILED_UNAVAILABLE',
        lastReadError: result.error,
        totalRecords: 0,
        lastCheckedAt: new Date().toISOString(),
      };
    }
    return {
      isHealthy: true,
      status: 'HEALTHY',
      totalRecords: result.data?.length || 0,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  /**
   * Controlled Destructive Failure Mode (P0 Task 1).
   * Genuinely destroys the primary dataset in the demo namespace so reads fail.
   */
  public static triggerDestructivePrimaryFailure(): { destroyedAt: string; priorRecordCount: number } {
    const priorCount = this.memoryPrimaryIssues?.length || 0;

    // 1. Wipe and corrupt memory cache
    this.memoryPrimaryIssues = null;
    this.isCorruptedOverride = true;

    // 2. Wipe / corrupt primary localStorage keys
    if (typeof window !== 'undefined') {
      // Overwrite with invalid binary-style corrupted text payload
      localStorage.setItem(
        PRIMARY_ISSUES_KEY,
        '<<CRITICAL_DISK_SECTOR_CORRUPTION_BLOCK_0xDEADBEEF::WIPED_PRIMARY_STORE>>'
      );
      localStorage.setItem(PRIMARY_HEALTH_KEY, 'FAILED');
      localStorage.removeItem('civicpulse_issues');
    }

    console.error('💥 [PrimaryStoreService] Controlled destructive blackout executed on primary store.');
    return {
      destroyedAt: new Date().toISOString(),
      priorRecordCount: priorCount,
    };
  }

  /**
   * Restores primary store with reconstructed records after successful ledger replay.
   */
  public static restorePrimaryStore(reconstructedIssues: CivicIssue[]): void {
    this.isCorruptedOverride = false;
    this.memoryPrimaryIssues = [...reconstructedIssues];

    if (typeof window !== 'undefined') {
      localStorage.setItem(PRIMARY_ISSUES_KEY, JSON.stringify(reconstructedIssues));
      localStorage.setItem('civicpulse_issues', JSON.stringify(reconstructedIssues));
      localStorage.setItem(PRIMARY_HEALTH_KEY, 'HEALTHY');
    }
    console.log(`✅ [PrimaryStoreService] Primary store restored with ${reconstructedIssues.length} records.`);
  }
}
