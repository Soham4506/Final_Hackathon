/**
 * ===========================================================================
 * KoparNiti (कोपरनीती) - Independent Append-Only Recovery Event Ledger
 *
 * Physical & Logical Separation:
 *  - Primary Store: Supabase primary tables / Local storage snapshot (`civicpulse_issues`)
 *  - Recovery Ledger: Dedicated IndexedDB (`KoparNiti_RecoveryLedger_DB`) and
 *    dedicated Supabase append-only table (`recovery_event_ledger`).
 *
 * Features:
 *  - Monotonic 1-indexed sequences
 *  - Tamper-evident SHA-256 hash chain with deterministic genesis value
 *  - Independent verification: detect modifications, deletions, reordering, duplicate sequences
 * ===========================================================================
 */

import { computeSHA256Sync } from './cryptoUtils';
import { RecoveryLedgerEvent, RecoveryLedgerEventType, LedgerVerificationResult } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
const DB_NAME = 'KoparNiti_RecoveryLedger_DB';
const DB_VERSION = 1;
const STORE_NAME = 'recovery_event_ledger';

export class RecoveryLedgerService {
  private static memoryLedger: RecoveryLedgerEvent[] = [];
  private static dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initializes or gets the independent IndexedDB instance.
   * Completely separate storage boundary from localStorage.
   */
  private static getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.reject(new Error('IndexedDB not available'));
    }
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'sequenceNo' });
          store.createIndex('eventId', 'eventId', { unique: true });
          store.createIndex('issueId', 'issueId', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Canonical deterministic string serialization for hashing
   */
  public static canonicalStringify(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map((item) => this.canonicalStringify(item)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const keyValPairs = keys.map((k) => `"${k}":${this.canonicalStringify(obj[k])}`);
    return '{' + keyValPairs.join(',') + '}';
  }

  /**
   * Computes the SHA-256 hash for an event chained to its previous hash.
   */
  public static computeEventHash(
    sequenceNo: number,
    eventId: string,
    issueId: string,
    operationId: string | undefined,
    eventType: RecoveryLedgerEventType,
    payload: any,
    occurredAt: string,
    actorId: string,
    operationStatus: string | undefined,
    schemaVersion: number,
    previousHash: string
  ): string {
    const canonicalPayload = this.canonicalStringify({
      sequenceNo,
      eventId,
      issueId,
      operationId: operationId || '',
      eventType,
      payload,
      occurredAt,
      actorId,
      operationStatus: operationStatus || '',
      schemaVersion,
    });

    return computeSHA256Sync(canonicalPayload + previousHash);
  }

  /**
   * Appends an event to the independent ledger.
   */
  public static async appendEvent<T = any>(
    eventType: RecoveryLedgerEventType,
    issueId: string,
    payload: T,
    options?: {
      operationId?: string;
      actorId?: string;
      operationStatus?: 'COMMITTED' | 'IN_FLIGHT' | 'ACKNOWLEDGED';
      occurredAt?: string;
    }
  ): Promise<RecoveryLedgerEvent<T>> {
    const events = await this.getAllEvents();
    const sequenceNo = events.length + 1;
    const previousHash = events.length === 0 ? GENESIS_HASH : events[events.length - 1].payloadHash;
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const occurredAt = options?.occurredAt || new Date().toISOString();
    const actorId = options?.actorId || 'system_engine';
    const operationStatus = options?.operationStatus || 'COMMITTED';
    const schemaVersion = 1;

    const payloadHash = this.computeEventHash(
      sequenceNo,
      eventId,
      issueId,
      options?.operationId,
      eventType,
      payload,
      occurredAt,
      actorId,
      operationStatus,
      schemaVersion,
      previousHash
    );

    const event: RecoveryLedgerEvent<T> = {
      id: eventId,
      eventId,
      sequenceNo,
      issueId,
      operationId: options?.operationId,
      eventType,
      payload,
      payloadHash,
      previousHash,
      occurredAt,
      actorId,
      operationStatus,
      schemaVersion,
    };

    // 1. Update in-memory cache
    this.memoryLedger.push(event);

    // 2. Persist to independent IndexedDB
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(event);
    } catch (idbErr) {
      console.warn('⚠️ [RecoveryLedgerService] IndexedDB write notice (fallback to memory):', idbErr);
    }

    // 3. Persist to server Supabase recovery_event_ledger table if live
    if (isSupabaseConfigured) {
      try {
        await supabase.from('recovery_event_ledger').insert({
          event_id: event.eventId,
          sequence_no: event.sequenceNo,
          issue_id: event.issueId,
          operation_id: event.operationId,
          event_type: event.eventType,
          payload: event.payload,
          payload_hash: event.payloadHash,
          previous_hash: event.previousHash,
          occurred_at: event.occurredAt,
          actor_id: event.actorId,
          operation_status: event.operationStatus,
          schema_version: event.schemaVersion,
        });
      } catch (sbErr) {
        // Non-blocking: ledger continues functioning even when backend is offline
        console.warn('⚠️ [RecoveryLedgerService] Supabase append note:', sbErr);
      }
    }

    return event;
  }

  /**
   * Retrieves all recovery events in strict sequence order.
   */
  public static async getAllEvents(): Promise<RecoveryLedgerEvent[]> {
    // Attempt to load from IndexedDB first
    try {
      const db = await this.getDB();
      return new Promise<RecoveryLedgerEvent[]>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const res = req.result as RecoveryLedgerEvent[];
          if (res && res.length > 0) {
            this.memoryLedger = res.sort((a, b) => a.sequenceNo - b.sequenceNo);
            resolve(this.memoryLedger);
          } else {
            resolve([...this.memoryLedger]);
          }
        };
        req.onerror = () => resolve([...this.memoryLedger]);
      });
    } catch {
      return [...this.memoryLedger];
    }
  }

  /**
   * Synchronous accessor for in-memory event buffer.
   */
  public static getMemoryEvents(): RecoveryLedgerEvent[] {
    return [...this.memoryLedger];
  }

  /**
   * Cryptographically verifies the tamper-evident hash chain across the recovery ledger.
   * Detects:
   *  - Payload alterations
   *  - Deleted events
   *  - Reordered events
   *  - Broken previous_hash linkages
   *  - Duplicate / gapped sequence numbers
   */
  public static verifyRecoveryLedger(eventsToVerify?: RecoveryLedgerEvent[]): LedgerVerificationResult {
    const events = eventsToVerify || this.memoryLedger;

    if (!events || events.length === 0) {
      return {
        valid: true,
        checkedEvents: 0,
        firstBrokenSequence: null,
        reason: 'OK',
        details: 'Ledger is empty with zero anomalies.',
      };
    }

    // Sort to inspect sequence continuity
    for (let i = 0; i < events.length; i++) {
      const current = events[i];
      const expectedSeq = i + 1;

      // 1. Check Sequence Monotonicity
      if (current.sequenceNo !== expectedSeq) {
        return {
          valid: false,
          checkedEvents: i,
          firstBrokenSequence: current.sequenceNo,
          reason: 'SEQUENCE_GAP',
          brokenEventId: current.eventId,
          details: `Expected sequence #${expectedSeq}, but found #${current.sequenceNo}. Event deletion or insertion detected.`,
        };
      }

      // 2. Check Previous Hash Linkage
      const expectedPrevHash = i === 0 ? GENESIS_HASH : events[i - 1].payloadHash;
      if (current.previousHash !== expectedPrevHash) {
        return {
          valid: false,
          checkedEvents: i,
          firstBrokenSequence: current.sequenceNo,
          reason: 'BROKEN_LINKAGE',
          brokenEventId: current.eventId,
          details: `Event #${current.sequenceNo} previousHash mismatch. Expected ${expectedPrevHash.substring(0, 12)}..., found ${current.previousHash.substring(0, 12)}...`,
        };
      }

      // 3. Recompute SHA-256 and Verify Payload Hash
      const recomputedHash = this.computeEventHash(
        current.sequenceNo,
        current.eventId,
        current.issueId,
        current.operationId,
        current.eventType,
        current.payload,
        current.occurredAt,
        current.actorId,
        current.operationStatus,
        current.schemaVersion || 1,
        current.previousHash
      );

      if (current.payloadHash !== recomputedHash) {
        return {
          valid: false,
          checkedEvents: i,
          firstBrokenSequence: current.sequenceNo,
          reason: 'HASH_MISMATCH',
          brokenEventId: current.eventId,
          details: `Cryptographic SHA-256 mismatch on event #${current.sequenceNo}. Payload has been altered or tampered with.`,
        };
      }
    }

    return {
      valid: true,
      checkedEvents: events.length,
      firstBrokenSequence: null,
      reason: 'OK',
      details: `All ${events.length} recovery events validated with 100% cryptographic integrity.`,
    };
  }

  /**
   * Clears and resets the independent ledger (demo reset only).
   */
  public static async resetLedger(): Promise<void> {
    this.memoryLedger = [];
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
    } catch (e) {
      console.warn('Reset IndexedDB note:', e);
    }
  }

  /**
   * Seeds deterministic base events for the 11 baseline demo issues and 1 in-flight operation.
   */
  public static async seedDemoLedger(baseIssues: any[]): Promise<RecoveryLedgerEvent[]> {
    await this.resetLedger();

    // 1. Issue Created events for baseline issues
    for (const issue of baseIssues) {
      await this.appendEvent('ISSUE_CREATED', issue.id, { ...issue }, {
        actorId: 'kmc_citizen_intake',
        occurredAt: issue.reportedAt,
      });

      // Status event
      if (issue.status && issue.status !== 'submitted') {
        await this.appendEvent('STATUS_CHANGED', issue.id, {
          newStatus: issue.status,
          previousStatus: 'submitted',
          notes: 'Standard triage progression',
        }, {
          actorId: 'kmc_triage_officer',
          occurredAt: issue.reportedAt,
        });
      }

      // Field verification event
      if (issue.fieldVerificationStatus === 'verified') {
        await this.appendEvent('FIELD_VERIFIED', issue.id, {
          fieldVerifiedBy: issue.fieldVerifiedBy || 'KMC Ward Inspector',
          fieldVerifiedAt: issue.fieldVerifiedAt || issue.reportedAt,
          confidenceScore: 1.0,
        }, {
          actorId: 'kmc_field_inspector_1',
          occurredAt: issue.fieldVerifiedAt || issue.reportedAt,
        });
      }
    }

    // 2. In-Flight Operation (Critical for Challenge 1):
    // Issue KMC-2026-00101 (Water Contamination & Overflow near Civil Hospital)
    // Had a DISPATCH_STARTED event initiated, but NO DISPATCH_ACKNOWLEDGED event before failure!
    const targetIssue = baseIssues.find((i) => i.ticketNumber === 'KMC-2026-00101') || baseIssues[0];
    if (targetIssue) {
      await this.appendEvent('DISPATCH_STARTED', targetIssue.id, {
        operationId: 'OP-8841',
        issueId: targetIssue.id,
        ticketNumber: targetIssue.ticketNumber,
        assignedCrew: 'Sanitation Rapid Response Unit 1 (3 Staff)',
        assignedEquipment: 'KMC-JET-01 (Jetting Machine)',
        estimatedCost: 6500,
        dispatchNote: 'Immediate emergency dispatch ordered to clear Civil Hospital backflow.',
      }, {
        operationId: 'OP-8841',
        actorId: 'kmc_chief_officer',
        operationStatus: 'IN_FLIGHT',
        occurredAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      });
    }

    return this.memoryLedger;
  }
}
