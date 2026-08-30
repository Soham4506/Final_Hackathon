import { describe, it, expect, beforeEach } from 'vitest';
import { PrimaryStoreService } from '../src/services/primaryStoreService';
import { RecoveryLedgerService, GENESIS_HASH } from '../src/services/recoveryLedgerService';
import { RecoveryService } from '../src/services/recoveryService';
import { AllocationEngine, ACTIVE_POLICY_VERSION, ACTIVE_ALLOCATION_ALGORITHM_VERSION } from '../src/services/allocationEngine';
import { PriorityEngine } from '../src/services/priorityEngine';
import { INITIAL_ISSUES, INITIAL_CATEGORIES, INITIAL_ZONES, INITIAL_WEIGHT_CONFIG, INITIAL_RESOURCES, INITIAL_DEPARTMENTS } from '../src/data/mockData';
import { RecoveryLedgerEvent } from '../src/types';

describe('P0 Blackout Resilience & Independent Recovery Ledger Test Suite', () => {
  beforeEach(async () => {
    // Reset baseline state before each test
    await RecoveryLedgerService.resetLedger();
    PrimaryStoreService.restorePrimaryStore(INITIAL_ISSUES);
  });

  // --------------------------------------------------------------------------
  // TEST 1: Real Primary Store Failure Mode (P0 Task 1)
  // --------------------------------------------------------------------------
  it('Primary store failure genuinely makes reads fail', () => {
    // 1. Initially healthy
    const initialHealth = PrimaryStoreService.checkHealth();
    expect(initialHealth.isHealthy).toBe(true);
    expect(initialHealth.totalRecords).toBeGreaterThan(0);

    // 2. Trigger destructive failure
    const failureResult = PrimaryStoreService.triggerDestructivePrimaryFailure();
    expect(failureResult.priorRecordCount).toBeGreaterThan(0);

    // 3. Subsequent reads must fail
    const readResult = PrimaryStoreService.readPrimaryIssues();
    expect(readResult.success).toBe(false);
    expect(readResult.error).toContain('CRITICAL');

    const healthAfter = PrimaryStoreService.checkHealth();
    expect(healthAfter.isHealthy).toBe(false);
  });

  // --------------------------------------------------------------------------
  // TEST 2: Tamper-Evident SHA-256 Hash Chain (P0 Task 3)
  // --------------------------------------------------------------------------
  it('Validates pristine hash chain and detects tampered payloads, deleted blocks, or reordered blocks', async () => {
    await RecoveryLedgerService.seedDemoLedger(INITIAL_ISSUES);
    const events = await RecoveryLedgerService.getAllEvents();
    expect(events.length).toBeGreaterThanOrEqual(11);

    // 1. Pristine ledger validation
    const pristineVerification = RecoveryLedgerService.verifyRecoveryLedger(events);
    expect(pristineVerification.valid).toBe(true);
    expect(pristineVerification.reason).toBe('OK');
    expect(pristineVerification.checkedEvents).toBe(events.length);

    // 2. Tampered Payload Detection
    const tamperedEvents: RecoveryLedgerEvent[] = JSON.parse(JSON.stringify(events));
    tamperedEvents[1].payload = { ...tamperedEvents[1].payload, alteredTitle: 'HACKED_TITLE' };
    const tamperVerification = RecoveryLedgerService.verifyRecoveryLedger(tamperedEvents);
    expect(tamperVerification.valid).toBe(false);
    expect(tamperVerification.reason).toBe('HASH_MISMATCH');
    expect(tamperVerification.firstBrokenSequence).toBe(2);

    // 3. Deleted Block / Sequence Gap Detection
    const deletedEvents = events.filter((_, idx) => idx !== 2); // remove event #3
    const gapVerification = RecoveryLedgerService.verifyRecoveryLedger(deletedEvents);
    expect(gapVerification.valid).toBe(false);
    expect(gapVerification.reason).toBe('SEQUENCE_GAP');

    // 4. Reordered Block Detection
    const reorderedEvents: RecoveryLedgerEvent[] = [
      events[0],
      events[2],
      events[1],
      ...events.slice(3),
    ];
    const reorderVerification = RecoveryLedgerService.verifyRecoveryLedger(reorderedEvents);
    expect(reorderVerification.valid).toBe(false);
  });

  // --------------------------------------------------------------------------
  // TEST 3: Deterministic Replay & In-Flight Semantics (P0 Task 4 & 5)
  // --------------------------------------------------------------------------
  it('Reconstructs state from independent ledger and marks in-flight op OP-8841 as RECOVERED_BUT_UNCERTAIN', async () => {
    // 1. Seed ledger with 11 base issues + 1 in-flight DISPATCH_STARTED on KMC-2026-00101
    await RecoveryLedgerService.seedDemoLedger(INITIAL_ISSUES);

    // 2. Trigger primary failure
    PrimaryStoreService.triggerDestructivePrimaryFailure();
    expect(PrimaryStoreService.checkHealth().isHealthy).toBe(false);

    // 3. Execute recovery from independent ledger
    const { report, recoveredIssues, verification } = await RecoveryService.executeRecovery(
      'manual_simulation',
      INITIAL_CATEGORIES,
      INITIAL_ZONES,
      INITIAL_WEIGHT_CONFIG
    );

    // 4. Verify report metrics
    expect(verification.valid).toBe(true);
    expect(report.recoveredIssuesCount).toBeGreaterThanOrEqual(11);
    expect(report.uncertainCount).toBe(1);
    expect(report.unconfirmedInFlightTickets.length).toBe(1);
    expect(report.unconfirmedInFlightTickets[0].ticketNumber).toBe('KMC-2026-00101');

    // 5. Verify target issue classification
    const targetIssue = recoveredIssues.find((i) => i.ticketNumber === 'KMC-2026-00101');
    expect(targetIssue).toBeDefined();
    expect(targetIssue?.recoveryStatus).toBe('unconfirmed_in_flight');
    expect(targetIssue?.inFlightOperation?.status).toBe('RECOVERED_BUT_UNCERTAIN');
    expect(targetIssue?.inFlightOperation?.operationId).toBe('OP-8841');

    // 6. Verify primary store is restored to HEALTHY status
    const healthPostRecovery = PrimaryStoreService.checkHealth();
    expect(healthPostRecovery.isHealthy).toBe(true);
    expect(healthPostRecovery.totalRecords).toBe(recoveredIssues.length);
  });

  // --------------------------------------------------------------------------
  // TEST 4: Human-in-the-Loop Officer Confirmation (P0 Task 6 & 8)
  // --------------------------------------------------------------------------
  it('Allows authorized officer to confirm uncertain operation and log authoritative acknowledgement', async () => {
    await RecoveryLedgerService.seedDemoLedger(INITIAL_ISSUES);
    PrimaryStoreService.triggerDestructivePrimaryFailure();

    const { recoveredIssues } = await RecoveryService.executeRecovery(
      'manual_simulation',
      INITIAL_CATEGORIES,
      INITIAL_ZONES,
      INITIAL_WEIGHT_CONFIG
    );

    const targetIssue = recoveredIssues.find((i) => i.ticketNumber === 'KMC-2026-00101')!;
    expect(targetIssue.recoveryStatus).toBe('unconfirmed_in_flight');

    // Officer confirms the operation
    await RecoveryLedgerService.appendEvent(
      'DISPATCH_ACKNOWLEDGED',
      targetIssue.id,
      { notes: 'Physical on-site inspection verified crew arrival' },
      { operationId: 'OP-8841', actorId: 'Er. Deshmukh (Chief Officer)', operationStatus: 'ACKNOWLEDGED' }
    );

    // Replay recovery again to verify complete resolution
    const secondRecovery = await RecoveryService.executeRecovery(
      'manual_simulation',
      INITIAL_CATEGORIES,
      INITIAL_ZONES,
      INITIAL_WEIGHT_CONFIG
    );

    const reTarget = secondRecovery.recoveredIssues.find((i) => i.ticketNumber === 'KMC-2026-00101')!;
    expect(secondRecovery.report.uncertainCount).toBe(0);
    expect(reTarget.recoveryStatus).toBe('recovered');
  });

  // --------------------------------------------------------------------------
  // TEST 5: Policy Versioning & Defensible Allocation Explanations (P0 Task 9, 10, 11)
  // --------------------------------------------------------------------------
  it('Generates allocation plan with policy versioning and reproducible bottleneck explanations', () => {
    const department = INITIAL_DEPARTMENTS[0]; // Water Supply & Sanitation
    const result = AllocationEngine.generatePlan({
      department,
      candidateIssues: INITIAL_ISSUES,
      resources: INITIAL_RESOURCES,
      budgetCap: 15000,
      availableStaff: 4,
      solverMode: 'greedy',
    });

    const plan = result.plan;
    expect(plan.solverMode).toBe('greedy');
    expect(plan.optimalityComparison).toBeDefined();

    // 1. Verify items have active policy version
    for (const item of plan.items) {
      expect(item.policyVersion).toBe(ACTIVE_POLICY_VERSION);
      expect(item.reproducibleExplanation).toBeDefined();
      expect(item.reproducibleExplanation?.policyVersion).toBe(ACTIVE_POLICY_VERSION);
      expect(item.reproducibleExplanation?.algorithmVersion).toBe(ACTIVE_ALLOCATION_ALGORITHM_VERSION);
    }

    // 2. Verify deferred items have explicit constraint bottlenecks
    const deferredItems = plan.items.filter((i) => i.itemStatus === 'deferred');
    expect(deferredItems.length).toBeGreaterThan(0);
    for (const defItem of deferredItems) {
      expect(defItem.reproducibleExplanation?.isDeferred).toBe(true);
      expect(['budget', 'staff', 'equipment', 'department_capacity']).toContain(
        defItem.reproducibleExplanation?.bottleneckConstraint
      );
      expect(defItem.reproducibleExplanation?.bottleneckReason).toBeDefined();
    }
  });
});
