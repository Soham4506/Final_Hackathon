# 🏛️ KoparNiti (कोपरनीती) — Municipal Decision Architecture & Resilience Guide
### Executive & Technical Defensibility Guide for Hackathon Judges & Municipal Leadership
**Kopargaon Municipal Council (कोपरगाव नगरपरिषद) • Track 2 Open Innovation**

---

## ⚖️ 1. What Determines Urgency and Why Those Weights?

KoparNiti computes priority using an explicit, deterministic Multi-Criteria Decision Analysis (MCDA) formula. **AI extracts structured facts; the mathematical formula decides priority.**

$$S_{\text{final}} = w_{\text{sev}} \cdot S_{\text{sev}} + w_{\text{urg}} \cdot S_{\text{urg}} + w_{\text{pop}} \cdot S_{\text{pop}} + w_{\text{loc}} \cdot S_{\text{loc}} + w_{\text{esc}} \cdot S_{\text{esc}} - C_{\text{penalty}}$$

| Factor | Weight | Mathematical Formulation | Governance Rationale |
| :--- | :---: | :--- | :--- |
| **Severity ($S_{\text{sev}}$)** | **35%** | Base category score (0–100) + structured risk tags (+10 for contamination/health hazard, +6 for hospital proximity). | **Public Safety First:** Direct risks to human life, contaminated drinking water, or live electrical hazards must take precedence over aesthetic complaints. |
| **Urgency ($S_{\text{urg}}$)** | **25%** | Time decay relative to SLA: $\min(100, \frac{\text{Elapsed Hours}}{\text{Department SLA Hours}} \times 100)$. | **Prevents Chronic Starvation:** Older unattended issues steadily gain points so low-severity requests are not trapped in an infinite backlog. |
| **Population ($S_{\text{pop}}$)** | **20%** | Logarithmic scaling: $\min(100, \frac{\log_{10}(\text{Affected Pop} + 1)}{\log_{10}(5000)} \times 100)$. | **Maximizes Public Benefit:** Ensures main arterial trunk line failures (~4,200 citizens) rank higher than dead-end residential alleys (~5 citizens). |
| **Location ($S_{\text{loc}}$)** | **10%** | Normalized Critical Ward Risk Factor ($1.0$ to $1.5 \rightarrow 0$ to $100$). | **Critical Corridors:** Prioritizes sensitive infrastructure zones (Civil Hospital, schools, ST bus stand, Godavari pilgrimage ghats). |
| **Escalations ($S_{\text{esc}}$)** | **10%** | Repeat reports inside 150m radius: $\min(100, \text{Escalations} \times 20)$. | **Citizen Friction Multiplier:** Multiple unique citizens reporting the same failure indicates severe community disruption. |

---

## 📜 2. Policy Versioning & Decision Reproducibility (P0 Upgrades)

To ensure full auditability and legal defensibility across administrative transitions:
1. **Policy Version Stamp**: Every priority calculation and allocation plan records the active policy identifier (`policyVersion: "KMC-2026-08-30-V3"`) and algorithm version (`algorithmVersion: "ALLOCATOR-V2.1-HEURISTIC"`).
2. **Explicit Parameter Snapshot**: Canonical weight vectors (`35/25/20/10/10`) and normalization bounds are stored alongside the decision payload.
3. **Reproducible Decision Explanations**:
   - **Selected Work Orders**: Contain exact cost breakdown, crew assignment, allocated machinery IDs, and consumption metrics (`Budget: ₹18,500 / ₹30,000`, `Staff: 4 / 8`, `Jetting Machine: 1 / 1`).
   - **Deferred Work Orders**: Contain explicit constraint bottleneck tags (`bottleneckConstraint: "equipment" | "budget" | "staff"`) and list competing selected ticket numbers occupying the scarce resource.

---

## 🚜 3. Resolving Conflicting Priorities for Scarce Resources

When multiple high-priority grievances exceed available municipal resources within a shift, KoparNiti executes a **Two-Pass Multi-Constraint Knapsack Heuristic**:

### Real Seed Data Conflict Scenario:
- **Issue A (`KMC-2026-00101`)**: *Water Contamination near Civil Hospital* (Priority Score: **94.2 / 100**, Cost: ₹18,500, Staff: 4, Requires: `jetting_machine`).
- **Issue B (`KMC-2026-00102`)**: *Severe Sewer Overflow at Subhash Chowk* (Priority Score: **78.5 / 100**, Cost: ₹12,000, Staff: 3, Requires: `jetting_machine`).
- **Constraint**: Kopargaon Municipal Council has only **1 operational Jetting Machine** (`KMC-JET-01`) available for Shift 1.

### Deterministic Resolution:
1. **Pass 1 (Priority-Ordered Allocation)**: `KMC-2026-00101` receives `KMC-JET-01` and is **Approved for Immediate Dispatch**.
2. **Deterministic Deferral**: `KMC-2026-00102` is deferred with an explicit, explainable bottleneck tag:
   > *"Deferred: All Jetting Machine units (1/1) are committed to higher-priority work order KMC-2026-00101."*
3. **Pass 2 (Capacity Backfill)**: The remaining shift budget and unassigned technicians are greedily backfilled with smaller deferred items (e.g. `KMC-2026-00107` Streetlight Junction Repair), ensuring 100% crew utilization without idle payroll.

---

## 🎯 4. Technical Note on Optimality & Diagnostic Baseline (P0 Task 9)

> **Accurate Algorithmic Characterization:**
> - The production allocator uses a **deterministic multi-constraint greedy knapsack heuristic** (simultaneously managing budget ceilings, crew staffing availability, specialized machinery pools, and department boundaries).
> - For supported bounded scenarios ($N \le 40$), the system provides a **single-dimensional exact 0/1 knapsack Dynamic Programming (DP) baseline** (budget vs. priority value).
> - **Defensibility Boundary**: The DP comparison is diagnostic and does not claim global optimality outside the modeled single-dimensional subset. In real-world multi-constraint environments with heterogeneous machinery, the two-pass heuristic provides rapid, deterministic, and transparent shift schedules in $< 2\text{ms}$.

---

## 💥 5. Challenge 1: "The Blackout" Resilience Architecture & Recovery Ledger

When the primary civic data store experiences catastrophic physical disk corruption or power loss mid-flight, KoparNiti provides a **fully deterministic, cryptographically verifiable disaster recovery engine**:

### 🛠️ Architecture & Separation Boundary:
1. **Physical & Logical Separation**:
   - **Primary Store**: Main operational store (`civicpulse_primary_issues`) that experiences destructive blackout during failure.
   - **Recovery Ledger**: Independent persistent boundary (Dedicated IndexedDB `KoparNiti_RecoveryLedger_DB` + server-side append-only Supabase table `recovery_event_ledger`).
2. **Tamper-Evident SHA-256 Hash Chain**:
   - Every event block $i$ computes:
     $$H_i = \text{SHA-256}(\text{CanonicalEvent}_i + H_{i-1})$$
   - Deterministic Genesis Hash: `0000000000000000000000000000000000000000000000000000000000000000`
   - Detects any payload modification (`HASH_MISMATCH`), sequence gaps/deletions (`SEQUENCE_GAP`), or reordering.
3. **Explicit In-Flight Transaction Semantics**:
   - `DISPATCH_STARTED` with `DISPATCH_ACKNOWLEDGED` $\rightarrow$ `CONFIRMED_COMPLETED`
   - `DISPATCH_STARTED` without field acknowledgment before failure $\rightarrow$ **`RECOVERED_BUT_UNCERTAIN`** (Operation `OP-8841` on `KMC-2026-00101`).
   - `ISSUE_CREATED` without conflicts $\rightarrow$ `RECOVERED`

---

## 🛡️ 6. Challenge 2: "The Bad Reading" Complete Claim Lifecycle & Trust Gating (P1 Upgrades)

### ⚖️ The Complete Misinformation & Claim Lifecycle (P1 Tasks 1 & 2):
Unlike simple grievance systems, KoparNiti models both **misinformation claims** and **coordinated malicious complaints** through explicit, decoupled state machines:

```text
Civic Claim Lifecycle:
CLAIM_SUBMITTED ──► SCREENING ──► RISK_ASSESSED ──► UNVERIFIED ──► UNDER_REVIEW 
  ──► VERIFIED_TRUE | VERIFIED_FALSE | PARTIALLY_TRUE | INSUFFICIENT_EVIDENCE | SUPERSEDED

Coordinated Issue Lifecycle:
ISSUE_SUBMITTED ──► COORDINATION_RISK_DETECTED ──► QUARANTINED ──► HUMAN_REVIEW ──► CLEARED | FABRICATED
```

### 🔒 Pre-Allocation Integrity Gate (P1 Tasks 7, 8, 17):
- **Decoupled Urgency vs. Trust**: An adversarial report may claim 5,000 affected people and a critical hazard (Priority Score: **98.5 / 100**), but its `decisionEligibility` is **`QUARANTINED`**.
- **Pre-Allocation Filtering**: The Knapsack Allocation Engine strictly evaluates issues with `decisionEligibility === 'ELIGIBLE' | 'ELIGIBLE_WITH_REVIEW'`. Quarantined items **cannot consume scarce municipal machinery or budget**.
- **False-Positive Safety**: Detected risk $\neq$ Proven fraud. Quarantined reports are held safely until an officer enters an explicit reason to either clear or reject them.

---

## 📜 7. Official Answer Provenance & Immutable Versioning (P1 Tasks 3, 4, 5, 6)

Every official answer published in KoparNiti includes complete cryptographic provenance:
- **Authority**: Authorizing municipal department (e.g. `KMC Water Supply & Sanitation Department`).
- **Reviewer**: Named engineer/officer with credentials (e.g. `Er. S. B. Deshmukh, Executive Engineer`).
- **Supporting Evidence**: Array of `CivicEvidence` records (daily compactor GPS logs, certified water quality lab test reports, field excavation inspection logs) with **SHA-256 content hashes**.
- **Immutable Answer Versioning**: If facts evolve, Answer `V1` is never overwritten; it is marked `SUPERSEDED` and linked to Answer `V2` via `supersedesId`.
- **Citizen Communication**: Rendered as a clean authoritative card with bilingual Marathi & English text and spoken IVR audio playback.

---

## 🎛️ 8. Counterfactual Decision Simulator (P1 Tasks 11, 12, 13, 14, 15, 16)

The **Decision Simulator** is an isolated what-if sandbox that enables officers to model how resource variations or policy shifts alter work order execution:
- **Supported Variables**: Shift Budget Cap (₹), Staff Headcount, Fleet Additions (+1 or +2 Jetting Machines / Suction Tankers), and MCDA Policy Weight Sliders (Severity, Urgency, Population, Location, Escalation).
- **Granular Decision Diff**: Identifies `NEWLY_EXECUTABLE` work orders (e.g. `KMC-2026-00102` unblocked when a second jetting machine is added) and `NEWLY_DEFERRED` items with exact causal reasons.
- **Actionable Counterfactuals ("What would change the decision?")**: For every deferred ticket, calculates the exact minimum bottleneck addition (e.g. `+1 Jetting Machine unit`, `+₹3,500 departmental budget`, `On-site field verification`).
- **100% Sandbox Isolation**: Production policies, active dispatch plans, and audit ledgers remain completely untouched.

---

## 🎬 9. Unified Judge Demo Flow (2–3 Minutes)

| Step | Screen | What to Click & Observe | Key Talking Point |
| :---: | :---: | :--- | :--- |
| **1** | **Decision Workbench** | View Water Supply plan. `KMC-2026-00101` is Approved with Jetting Machine; `KMC-2026-00102` is Deferred with bottleneck note: *"All Jetting Machine units (1/1) committed."* | *"Deterministic MCDA priority and two-pass multi-constraint knapsack allocation under scarce machinery."* |
| **2** | **Decision Simulator** | Switch to **Decision Simulator** tab. Add `+1 Jetting Machine`. Observe **Decision Diff**: `KMC-2026-00102` immediately shifts to **`NEWLY EXECUTABLE`** with green highlight. | *"Sandboxed what-if counterfactual simulation showing how resource additions unblock specific deferred work orders."* |
| **3** | **Trust Review Queue** | Click **"⚡ Simulate Coordinated Smear Attack"**. 4 duplicate reports targeting a local stall appear as **`QUARANTINED`**. Check Decision Workbench to show they are **strictly blocked from consuming municipal machinery**. | *"Pre-Allocation Integrity Gate prevents coordinated Sybil brigading from stealing scarce equipment."* |
| **4** | **Verified Answers** | Open **Verified Answers**. Inspect `CLM-2026-001` (Ward 4 Garbage Rumor) marked **`VERIFIED FALSE`** backed by `EVID-SWM-001` GPS log hash. Inspect version history (`V1` $\rightarrow$ `V2`). Click **"🔊 Listen via Spoken IVR"**. | *"Authoritative provenance engine with cryptographic evidence hashes, versioning, and spoken bilingual IVR broadcast."* |
| **5** | **Disaster Recovery** | Open **Disaster Recovery Console**. Click **"💥 TRIGGER PRIMARY STORE FAILURE"** $\rightarrow$ query reads fail. Click **"🔄 EXECUTE INDEPENDENT LEDGER RECOVERY"** $\rightarrow$ Replays 11 issues, identifies in-flight `OP-8841` as **`RECOVERED_BUT_UNCERTAIN`**. Click **"✓ Confirm & Re-Verify Action"**. | *"Autonomous disaster recovery with tamper-evident SHA-256 hash chain and transparent in-flight uncertainty semantics."* |
