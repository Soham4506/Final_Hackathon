import { LedgerEvent, LedgerEventType, CivicIssue } from '../types';

export class EventLogService {
  public static readonly STORAGE_KEY = 'civicpulse_event_ledger_v1';
  public static readonly SIDE_EFFECTS_KEY = 'civicpulse_executed_side_effects';

  /**
   * Appends an audit-worthy event to the independent ledger.
   * Guaranteed to only APPEND to its own isolated storage key.
   */
  public static appendEvent<T = any>(
    type: LedgerEventType,
    entityId: string,
    payload: T,
    idempotencyKey: string,
    actorName: string = 'System Engine',
    actorRole: string = 'admin',
    isInFlight: boolean = false
  ): LedgerEvent<T> {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(this.STORAGE_KEY) : null;
    let existingEvents: LedgerEvent[] = [];

    if (raw) {
      try {
        existingEvents = JSON.parse(raw);
        if (!Array.isArray(existingEvents)) {
          existingEvents = [];
        }
      } catch {
        console.warn('⚠️ Event ledger had partial corruption; appending to recovered head.');
        existingEvents = this.recoverReadableEvents(raw);
      }
    }

    // Idempotency check: prevent duplicate application
    const existing = existingEvents.find((e) => e.idempotencyKey === idempotencyKey);
    if (existing) {
      return existing as LedgerEvent<T>;
    }

    const event: LedgerEvent<T> = {
      eventId: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      entityId,
      payload,
      timestamp: new Date().toISOString(),
      idempotencyKey,
      sequenceNumber: existingEvents.length + 1,
      actorName,
      actorRole,
      isInFlight,
    };

    existingEvents.push(event);

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingEvents));
    } catch (err) {
      console.error('CRITICAL: Failed to write to independent event ledger:', err);
    }

    return event;
  }

  /**
   * Retrieves all logged events from the independent ledger.
   * Detects and surfaces any corrupted or truncated entries.
   */
  public static getAllEvents(): { events: LedgerEvent[]; corruptedCount: number } {
    if (typeof window === 'undefined') return { events: [], corruptedCount: 0 };
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return { events: [], corruptedCount: 0 };

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return { events: parsed, corruptedCount: 0 };
      }
      return { events: [], corruptedCount: 1 };
    } catch {
      // Stream parse or recover readable items if truncated mid-record
      const recovered = this.recoverReadableEvents(raw);
      const estimatedLost = Math.max(1, Math.round((raw.length - JSON.stringify(recovered).length) / 150));
      return { events: recovered, corruptedCount: estimatedLost };
    }
  }

  /**
   * Helper to recover valid JSON objects from a truncated/corrupted JSON array string.
   */
  public static recoverReadableEvents(raw: string): LedgerEvent[] {
    const recovered: LedgerEvent[] = [];
    // Match individual JSON objects in the array
    const objectRegex = /\{"eventId":"evt-[^}]+\}/g;
    let match: RegExpExecArray | null;

    while ((match = objectRegex.exec(raw)) !== null) {
      try {
        const obj = JSON.parse(match[0]);
        if (obj && obj.eventId && obj.type) {
          recovered.push(obj);
        }
      } catch {
        // Individual object unreadable
      }
    }

    return recovered;
  }

  /**
   * Marks a side-effect (e.g. cellular SMS dispatch) as executed.
   */
  public static recordSideEffect(idempotencyKey: string): void {
    if (typeof window === 'undefined' || !idempotencyKey) return;
    try {
      const raw = localStorage.getItem(this.SIDE_EFFECTS_KEY);
      const set: string[] = raw ? JSON.parse(raw) : [];
      if (!set.includes(idempotencyKey)) {
        set.push(idempotencyKey);
        localStorage.setItem(this.SIDE_EFFECTS_KEY, JSON.stringify(set));
      }
    } catch {
      // ignore
    }
  }

  /**
   * Checks if an operation with this idempotency key already executed its side effects.
   */
  public static isSideEffectExecuted(idempotencyKey: string): boolean {
    if (typeof window === 'undefined' || !idempotencyKey) return false;
    try {
      const raw = localStorage.getItem(this.SIDE_EFFECTS_KEY);
      if (!raw) return false;
      const set: string[] = JSON.parse(raw);
      return Array.isArray(set) && set.includes(idempotencyKey);
    } catch {
      return false;
    }
  }

  /**
   * Chaos trigger helper: Truncates the last N entries of the event ledger to simulate partial write loss.
   */
  public static truncateTail(count: number = 2): { droppedCount: number; remainingCount: number } {
    if (typeof window === 'undefined') return { droppedCount: 0, remainingCount: 0 };
    const { events } = this.getAllEvents();
    if (events.length === 0) return { droppedCount: 0, remainingCount: 0 };

    const keepCount = Math.max(0, events.length - count);
    const keptEvents = events.slice(0, keepCount);

    // Write truncated array with trailing malformed syntax to simulate mid-write crash
    const serializedKept = JSON.stringify(keptEvents);
    const corruptedTail = serializedKept.slice(0, -1) + ',{"eventId":"evt-TRUNCATED_CRASH_CORRUPT"';
    localStorage.setItem(this.STORAGE_KEY, corruptedTail);

    return {
      droppedCount: events.length - keepCount,
      remainingCount: keptEvents.length,
    };
  }

  /**
   * Seeds historical events for initial operational seed issues if ledger is empty on first boot.
   */
  public static seedInitialLedgerIfEmpty(initialIssues: CivicIssue[]): void {
    if (typeof window === 'undefined') return;
    const existing = localStorage.getItem(this.STORAGE_KEY);
    if (existing && existing.length > 20) return;

    initialIssues.forEach((issue, idx) => {
      this.appendEvent(
        'ISSUE_CREATED',
        issue.id,
        issue,
        `seed-create-${issue.id}`,
        'KMC Seed Loader',
        'admin'
      );

      if (issue.fieldVerificationStatus === 'verified') {
        this.appendEvent(
          'FIELD_VERIFIED',
          issue.id,
          {
            fieldVerifiedBy: issue.fieldVerifiedBy,
            fieldVerifiedAt: issue.fieldVerifiedAt,
            notes: issue.fieldVerificationNotes,
          },
          `seed-verify-${issue.id}`,
          issue.fieldVerifiedBy || 'Ward Officer',
          'officer'
        );
      }
    });
  }
}
