import { CivicIssue, LedgerEvent, RecoveryReport, Zone, Department, IssueCategory, PriorityWeightConfig } from '../types';
import { EventLogService } from './eventLogService';
import { IntegrityCheckService } from './integrityCheckService';
import { PriorityEngine } from './priorityEngine';

export class RecoveryService {
  /**
   * Executes a full deterministic state reconstruction from the independent event ledger.
   */
  public static executeRecovery(
    triggerSource: 'automatic_detection' | 'manual_simulation' | 'boot_integrity_check',
    categories: IssueCategory[] = [],
    zones: Zone[] = [],
    weightConfig?: PriorityWeightConfig
  ): { report: RecoveryReport; recoveredIssues: CivicIssue[] } {
    console.log(`🔄 [RecoveryService] Initiating state reconstruction (Trigger: ${triggerSource})...`);

    const { events, corruptedCount } = EventLogService.getAllEvents();
    const issueMap = new Map<string, CivicIssue>();
    const inFlightOperations = new Map<string, { event: LedgerEvent; operation: string }>();
    const unrecoverableList: { ticketNumber?: string; eventId: string; reason: string; lastKnownDetails?: string }[] = [];
    let successfulReplays = 0;

    // Sort events by sequenceNumber / timestamp
    const sortedEvents = [...events].sort((a, b) => {
      if (a.sequenceNumber !== undefined && b.sequenceNumber !== undefined) {
        return a.sequenceNumber - b.sequenceNumber;
      }
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    // Replay event log sequentially
    for (const evt of sortedEvents) {
      if (!evt || !evt.type || !evt.entityId) {
        unrecoverableList.push({
          eventId: evt?.eventId || 'unknown',
          reason: 'Corrupted event header / missing entity ID',
        });
        continue;
      }

      try {
        switch (evt.type) {
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
              recoveryNote: 'Successfully reconstructed from independent event ledger.',
              lastKnownAuditTimestamp: evt.timestamp,
            };
            issueMap.set(evt.entityId, issue);
            successfulReplays++;
            break;
          }

          case 'STATUS_CHANGED': {
            const existing = issueMap.get(evt.entityId);
            if (existing && evt.payload?.newStatus) {
              existing.status = evt.payload.newStatus;
              existing.lastKnownAuditTimestamp = evt.timestamp;
              if (evt.payload.notes) {
                existing.fieldVerificationNotes = evt.payload.notes;
              }
              successfulReplays++;
            }
            break;
          }

          case 'FIELD_VERIFIED': {
            const existing = issueMap.get(evt.entityId);
            if (existing) {
              existing.fieldVerificationStatus = 'verified';
              existing.fieldVerifiedBy = evt.payload?.fieldVerifiedBy || evt.actorName || 'Field Inspector';
              existing.fieldVerifiedAt = evt.payload?.fieldVerifiedAt || evt.timestamp;
              existing.confidenceScore = 1.0;
              existing.lastKnownAuditTimestamp = evt.timestamp;
              successfulReplays++;
            }
            break;
          }

          case 'OFFICER_OVERRIDDEN': {
            const existing = issueMap.get(evt.entityId);
            if (existing && evt.payload?.overrideScore !== undefined) {
              existing.priorityScore = {
                id: `score-${evt.entityId}`,
                issueId: evt.entityId,
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
                explanationSummary: `Officer Override by ${evt.actorName}: ${evt.payload.reason || 'Manual Priority Adjustment'}`,
                calculatedAt: evt.timestamp,
              };
              existing.lastKnownAuditTimestamp = evt.timestamp;
              successfulReplays++;
            }
            break;
          }

          case 'IN_FLIGHT_OPERATION_STARTED': {
            inFlightOperations.set(evt.entityId, {
              event: evt,
              operation: evt.payload?.operationName || 'Resource Allocation & SMS Dispatch',
            });
            successfulReplays++;
            break;
          }

          case 'IN_FLIGHT_OPERATION_COMPLETED': {
            inFlightOperations.delete(evt.entityId);
            successfulReplays++;
            break;
          }

          case 'SMS_DISPATCHED':
          case 'ALLOCATION_APPROVED':
          case 'ALLOCATION_DEFERRED':
          case 'PRIORITY_RECALCULATED':
          case 'ISSUE_UPDATED': {
            const existing = issueMap.get(evt.entityId);
            if (existing) {
              existing.lastKnownAuditTimestamp = evt.timestamp;
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
          reason: `Replay exception: ${err.message}`,
        });
      }
    }

    // Handle any uncompleted in-flight operations (Interrupted mid-flight during blackout)
    const unconfirmedInFlightList: { ticketNumber: string; issueId: string; operation: string; timestamp: string }[] = [];
    inFlightOperations.forEach((inFlight, entityId) => {
      const issue = issueMap.get(entityId);
      if (issue) {
        issue.recoveryStatus = 'unconfirmed_in_flight';
        issue.recoveryNote = `⚠️ In-flight action (${inFlight.operation}) interrupted by data blackout. Requires officer re-verification.`;
        unconfirmedInFlightList.push({
          ticketNumber: issue.ticketNumber,
          issueId: issue.id,
          operation: inFlight.operation,
          timestamp: inFlight.event.timestamp,
        });
      }
    });

    // If corrupted entries were detected in the log tail, record them
    if (corruptedCount > 0) {
      for (let c = 0; c < corruptedCount; c++) {
        unrecoverableList.push({
          eventId: `corrupt-tail-idx-${c + 1}`,
          reason: 'Uncommitted write-ahead log buffer truncated mid-crash.',
          lastKnownDetails: 'Buffer loss at point of storage power interruption.',
        });
      }
    }

    // Re-score recovered issues with current formula weights
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

    // Count fully recovered clean records
    const fullyRecoveredCount = recoveredIssues.filter((i) => i.recoveryStatus === 'recovered' || !i.recoveryStatus).length;

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
      details: [
        `Reconstructed ${recoveredIssues.length} issues from independent append-only ledger (${successfulReplays} events replayed).`,
        unconfirmedInFlightList.length > 0
          ? `${unconfirmedInFlightList.length} operation(s) flagged unconfirmed (interrupted mid-flight during blackout).`
          : 'Zero in-flight operation interruptions.',
        unrecoverableList.length > 0
          ? `${unrecoverableList.length} uncommitted log records could not be recovered (honest write-buffer loss).`
          : 'All log events cleanly replayed.',
      ],
      acknowledgedByOfficer: false,
    };

    // Save restored clean snapshot and record fresh valid checksum
    try {
      localStorage.setItem(IntegrityCheckService.PRIMARY_STORE_KEY, JSON.stringify(recoveredIssues));
      IntegrityCheckService.recordChecksum(recoveredIssues);
    } catch (err) {
      console.error('Failed to write recovered issues to primary store:', err);
    }

    return { report, recoveredIssues };
  }
}
