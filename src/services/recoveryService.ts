/**
 * ===========================================================================
 * KoparNiti (कोपरनीती) - Autonomous Disaster Recovery & Replay Engine
 *
 * Implements P0 Tasks 3, 4, 5, 6, 8:
 *  - Tamper-evident SHA-256 hash chain verification
 *  - Pure ledger replay from independent physical boundary
 *  - Explicit in-flight transaction resolution semantics
 *  - Rebuilt operational state restoring primary store
 *  - Audit logging of recovery milestones
 * ===========================================================================
 */

import {
  CivicIssue,
  RecoveryLedgerEvent,
  RecoveryReport,
  Zone,
  Department,
  IssueCategory,
  PriorityWeightConfig,
  InFlightOperation,
  LedgerVerificationResult,
} from '../types';
import { RecoveryLedgerService } from './recoveryLedgerService';
import { PrimaryStoreService } from './primaryStoreService';
import { PriorityEngine } from './priorityEngine';

export class RecoveryService {
  /**
   * Executes a full deterministic state reconstruction exclusively from the
   * independent append-only recovery event ledger.
   */
  public static async executeRecovery(
    triggerSource: 'automatic_detection' | 'manual_simulation' | 'boot_integrity_check',
    categories: IssueCategory[] = [],
    zones: Zone[] = [],
    weightConfig?: PriorityWeightConfig
  ): Promise<{ report: RecoveryReport; recoveredIssues: CivicIssue[]; verification: LedgerVerificationResult }> {
    console.log(`🔄 [RecoveryService] Initiating state reconstruction (Trigger: ${triggerSource})...`);

    // 1. Audit event: RECOVERY_STARTED
    await RecoveryLedgerService.appendEvent('RECOVERY_STARTED', 'system_recovery', {
      triggerSource,
      timestamp: new Date().toISOString(),
    }, { actorId: 'recovery_orchestrator' });

    // 2. Read all events from independent physical boundary
    const events = await RecoveryLedgerService.getAllEvents();

    // 3. Cryptographic Verification of Tamper-Evident Hash Chain
    const verification = RecoveryLedgerService.verifyRecoveryLedger(events);
    console.log(`🔐 [RecoveryService] Hash Chain Verification: ${verification.valid ? 'VALID' : 'FAILED'} (${verification.reason})`);

    // Audit event: LEDGER_VERIFIED
    await RecoveryLedgerService.appendEvent('LEDGER_VERIFIED', 'system_recovery', {
      valid: verification.valid,
      checkedEvents: verification.checkedEvents,
      reason: verification.reason,
    }, { actorId: 'recovery_orchestrator' });

    const issueMap = new Map<string, CivicIssue>();
    const inFlightMap = new Map<string, InFlightOperation>();
    const unrecoverableList: { ticketNumber?: string; eventId: string; reason: string; lastKnownDetails?: string }[] = [];
    let successfulReplays = 0;

    // Filter out internal recovery meta-events for data replay
    const dataEvents = events.filter((e) =>
      !['RECOVERY_STARTED', 'LEDGER_VERIFIED', 'PRIMARY_STORE_REBUILD_STARTED', 'RECORD_RECONSTRUCTED', 'RECORD_MARKED_UNCERTAIN', 'RECOVERY_COMPLETED'].includes(e.eventType)
    );

    // 4. Sequential Deterministic Replay
    for (const evt of dataEvents) {
      if (!evt || !evt.eventType || !evt.issueId) {
        unrecoverableList.push({
          eventId: evt?.eventId || 'unknown',
          reason: 'Corrupted event header / missing issue ID',
        });
        continue;
      }

      try {
        switch (evt.eventType) {
          case 'ISSUE_CREATED': {
            const rawPayload = evt.payload;
            if (!rawPayload || !rawPayload.ticketNumber) {
              unrecoverableList.push({
                ticketNumber: rawPayload?.ticketNumber || 'Unknown',
                eventId: evt.eventId,
                reason: 'Malformed payload on ISSUE_CREATED event',
              });
              break;
            }
            const issue: CivicIssue = {
              ...rawPayload,
              recoveryStatus: 'recovered',
              recoveryNote: 'Successfully reconstructed from independent append-only recovery ledger.',
              lastKnownAuditTimestamp: evt.occurredAt,
            };
            issueMap.set(evt.issueId, issue);
            successfulReplays++;
            break;
          }

          case 'STATUS_CHANGED': {
            const existing = issueMap.get(evt.issueId);
            if (existing && evt.payload?.newStatus) {
              existing.status = evt.payload.newStatus;
              existing.lastKnownAuditTimestamp = evt.occurredAt;
              if (evt.payload.notes) {
                existing.fieldVerificationNotes = evt.payload.notes;
              }
              successfulReplays++;
            }
            break;
          }

          case 'FIELD_VERIFIED': {
            const existing = issueMap.get(evt.issueId);
            if (existing) {
              existing.fieldVerificationStatus = 'verified';
              existing.fieldVerifiedBy = evt.payload?.fieldVerifiedBy || evt.actorId || 'Field Inspector';
              existing.fieldVerifiedAt = evt.payload?.fieldVerifiedAt || evt.occurredAt;
              existing.confidenceScore = 1.0;
              existing.lastKnownAuditTimestamp = evt.occurredAt;
              successfulReplays++;
            }
            break;
          }

          case 'OFFICER_OVERRIDE': {
            const existing = issueMap.get(evt.issueId);
            if (existing && evt.payload?.overrideScore !== undefined) {
              existing.priorityScore = {
                id: `score-${evt.issueId}`,
                issueId: evt.issueId,
                configId: 'custom-override',
                finalScore: evt.payload.overrideScore,
                breakdown: existing.priorityScore?.breakdown || {
                  rawSeverity: 50,
                  weightedSeverity: 17.5,
                  rawUrgency: 50,
                  weightedUrgency: 12.5,
                  rawPopulation: 50,
                  weightedPopulation: 10,
                  rawLocationMultiplier: 1.0,
                  weightedLocation: 5,
                  rawEscalationScore: 50,
                  weightedEscalation: 5,
                  confidenceScore: 1.0,
                  confidencePenaltyDeduction: 0,
                  finalScore: evt.payload.overrideScore,
                },
                explanationSummary: `Officer Override by ${evt.actorId}: ${evt.payload.reason || 'Manual Priority Adjustment'}`,
                calculatedAt: evt.occurredAt,
              };
              existing.lastKnownAuditTimestamp = evt.occurredAt;
              successfulReplays++;
            }
            break;
          }

          // In-Flight Transaction Semantics (P0 Task 5)
          case 'DISPATCH_STARTED': {
            const opId = evt.operationId || evt.payload?.operationId || `OP-${evt.sequenceNo}`;
            inFlightMap.set(opId, {
              operationId: opId,
              issueId: evt.issueId,
              operationType: 'DISPATCH_CREW',
              status: 'IN_FLIGHT',
              startedAt: evt.occurredAt,
              actorId: evt.actorId,
              payload: evt.payload,
              ackReceived: false,
            });
            successfulReplays++;
            break;
          }

          case 'DISPATCH_ACKNOWLEDGED': {
            const opId = evt.operationId || evt.payload?.operationId;
            if (opId && inFlightMap.has(opId)) {
              const op = inFlightMap.get(opId)!;
              op.status = 'CONFIRMED_COMPLETED';
              op.ackReceived = true;
            }
            successfulReplays++;
            break;
          }

          case 'NOTIFICATION_SENT':
          case 'ALLOCATION_DECIDED':
          case 'PRIORITY_COMPUTED':
          case 'ISSUE_UPDATED': {
            const existing = issueMap.get(evt.issueId);
            if (existing) {
              existing.lastKnownAuditTimestamp = evt.occurredAt;
            }
            successfulReplays++;
            break;
          }

          default:
            successfulReplays++;
            break;
        }
      } catch (err: any) {
        unrecoverableList.push({
          eventId: evt.eventId,
          reason: `Replay exception on ${evt.eventType}: ${err.message}`,
        });
      }
    }

    // 5. In-Flight Transaction Classification (P0 Task 5)
    // Rule: DISPATCH_STARTED without DISPATCH_ACKNOWLEDGED -> RECOVERED_BUT_UNCERTAIN
    const unconfirmedInFlightList: { ticketNumber: string; issueId: string; operation: string; timestamp: string }[] = [];
    
    for (const [opId, inFlightOp] of Array.from(inFlightMap.entries())) {
      if (!inFlightOp.ackReceived) {
        const issue = issueMap.get(inFlightOp.issueId);
        if (issue) {
          issue.recoveryStatus = 'unconfirmed_in_flight';
          inFlightOp.status = 'RECOVERED_BUT_UNCERTAIN';
          inFlightOp.uncertainReason = `Operation ${inFlightOp.operationId} (DISPATCH_CREW) was started, but physical field acknowledgement was missing when primary storage failed.`;
          issue.inFlightOperation = inFlightOp;
          issue.recoveryNote = `⚠️ In-Flight Uncertainty: ${inFlightOp.uncertainReason}`;

          unconfirmedInFlightList.push({
            ticketNumber: issue.ticketNumber,
            issueId: issue.id,
            operation: `${inFlightOp.operationId} - ${inFlightOp.payload?.assignedEquipment || 'Crew Dispatch'}`,
            timestamp: inFlightOp.startedAt,
          });

          // Audit event: RECORD_MARKED_UNCERTAIN
          await RecoveryLedgerService.appendEvent('RECORD_MARKED_UNCERTAIN', issue.id, {
            operationId: inFlightOp.operationId,
            reason: inFlightOp.uncertainReason,
          }, { actorId: 'recovery_orchestrator' });
        }
      }
    }

    // 6. Re-score recovered issues with verified weight configuration
    const recoveredIssues = Array.from(issueMap.values()).map((issue) => {
      if (categories.length > 0 && zones.length > 0 && weightConfig) {
        const cat = categories.find((c) => c.id === issue.categoryId) || categories[0];
        const zone = zones.find((z) => z.id === issue.zoneId) || zones[0];
        const score = PriorityEngine.calculateScore(issue, cat, zone, weightConfig);
        return {
          ...issue,
          priorityScore: issue.priorityScore || score,
        };
      }
      return issue;
    });

    // 7. Audit event: PRIMARY_STORE_REBUILD_STARTED & RECORD_RECONSTRUCTED
    await RecoveryLedgerService.appendEvent('PRIMARY_STORE_REBUILD_STARTED', 'system_recovery', {
      reconstructedCount: recoveredIssues.length,
      uncertainCount: unconfirmedInFlightList.length,
    }, { actorId: 'recovery_orchestrator' });

    // 8. Restore Clean State into PrimaryStoreService (P0 Task 6)
    PrimaryStoreService.restorePrimaryStore(recoveredIssues);

    const fullyRecoveredCount = recoveredIssues.filter((i) => i.recoveryStatus === 'recovered' || !i.recoveryStatus).length;

    // 9. Audit event: RECOVERY_COMPLETED
    await RecoveryLedgerService.appendEvent('RECOVERY_COMPLETED', 'system_recovery', {
      fullyRecoveredCount,
      uncertainCount: unconfirmedInFlightList.length,
      unrecoverableCount: unrecoverableList.length,
      ledgerIntegrity: verification.valid ? 'VALID' : 'COMPROMISED',
    }, { actorId: 'recovery_orchestrator' });

    const report: RecoveryReport = {
      recoveryTimestamp: new Date().toISOString(),
      triggerSource,
      totalEventsProcessed: events.length,
      successfulEventsReplayed: successfulReplays,
      corruptedEventsCount: unrecoverableList.length,
      unrecoverableTickets: unrecoverableList,
      unconfirmedInFlightTickets: unconfirmedInFlightList,
      fullyRecoveredCount,
      recoveredIssuesCount: recoveredIssues.length,
      uncertainCount: unconfirmedInFlightList.length,
      unrecoverableCount: unrecoverableList.length,
      hashVerification: verification,
      details: [
        `Reconstructed ${recoveredIssues.length} issues from independent append-only ledger (${successfulReplays} events replayed).`,
        `Cryptographic Hash Chain: ${verification.valid ? 'VALID (100% SHA-256 integrity verified)' : `FAILED: ${verification.reason}`}`,
        unconfirmedInFlightList.length > 0
          ? `${unconfirmedInFlightList.length} operation(s) flagged unconfirmed (in-flight dispatch without acknowledgement).`
          : 'Zero in-flight operation interruptions.',
        unrecoverableList.length > 0
          ? `${unrecoverableList.length} uncommitted log records could not be recovered.`
          : 'All ledger events cleanly verified & replayed.',
      ],
      acknowledgedByOfficer: false,
    };

    return { report, recoveredIssues, verification };
  }
}
