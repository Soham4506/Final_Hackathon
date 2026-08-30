# 🏛️ KoparNiti (कोपरनीती)
### AI-Assisted Municipal Decision-Support & Civic Resilience Governance Engine
**Kopargaon Municipal Council (कोपरगाव नगरपरिषद) • Track 2 Open Innovation**

> ⚡ **For Hackathon Judges:** Please read **[`DECISIONS.md`](./DECISIONS.md)** for our complete technical defense guide on weight rationales, scarce-resource conflict resolution, independent disaster recovery, tamper-evident hash chains, and defensible knapsack optimization.

---

## 📌 1. The Core Municipal Problem & Challenges Solved

Traditional municipal grievance portals function as simple first-in, first-out (FIFO) CRUD complaint logs. However, **Kopargaon Municipal Council** operates under severe physical constraints:
- **Discretionary Budget Caps**: Strict budget allocations per department per shift.
- **Fixed Technician Shifts**: Limited crews (sanitation workers, electricians, road repair staff).
- **Scarce Heavy Machinery**: Only 1 operational Jetting Machine (`KMC-JET-01`), 1 Suction Tanker, and 1 Road Roller for Shift 1.

### The Competition Challenges Solved:

1. **Challenge 1 — "The Blackout" Resilience Architecture**:
   - Primary store undergoes a controlled, destructive failure mode during in-flight operations.
   - Deterministic state reconstruction occurs exclusively from a logically and physically separate **Append-Only Recovery Event Ledger** (`IndexedDB` + Supabase `recovery_event_ledger`).
   - Tamper-evident **SHA-256 hash chaining** with deterministic genesis hash verifies 100% ledger integrity, catching modified, deleted, or reordered blocks.
   - Explicit in-flight transaction semantics: in-flight operations without physical field acknowledgment (`OP-8841`) resolve to `RECOVERED_BUT_UNCERTAIN`, requiring human officer verification.
   - Operations resume immediately post-recovery without data loss or restarts.

2. **Challenge 2 — "The Bad Reading" Complete Claim Lifecycle & Trust Gating**:
   - Complete claim lifecycle (`UNVERIFIED` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `VERIFIED_TRUE` | `VERIFIED_FALSE` | `PARTIALLY_TRUE` | `INSUFFICIENT_EVIDENCE` | `SUPERSEDED`).
   - Pre-Allocation Integrity Gate decouples urgency score from decision eligibility (`ELIGIBLE`, `QUARANTINED`, `BLOCKED`). Quarantined submissions cannot steal scarce municipal machinery.
   - Authoritative **Verified Answers** provenance hub with cryptographic SHA-256 evidence hashes, versioning (`V1` $\rightarrow$ `V2`), and spoken IVR audio readouts.

3. **Counterfactual Decision Simulator & Actionable Explanations**:
   - Sandboxed what-if decision simulator comparing Current Plan vs Counterfactual Plan across budgets, crew headcount, fleet additions (+1 Jetting Machine), and MCDA policy weight adjustments.
   - Live **Decision Diff** showing newly executable work orders unblocked by specific resource additions.
   - Actionable counterfactual tags on all deferred items (*"What would change this decision?"*).

---

## 🏗️ 2. System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CITIZEN / FIELD INTAKE                        │
│   • Text Description  • Field Photos  • Map GPS Coordinates  • Voice   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             CHALLENGE 2: PRE-ALLOCATION INTEGRITY GATE                 │
│   • Text Similarity Clustering  • Perceptual Photo Hash (pHash)       │
│   • Multi-Signal Burst Detection  • Quarantining (pending review)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    DETERMINISTIC PRIORITY ENGINE                       │
│    S = w_sev*S_sev + w_urg*S_urg + w_pop*S_pop + w_loc*S_loc          │
│        + w_esc*S_esc - Confidence_Penalty  (Stamped: Policy V3)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              RESOURCE-AWARE ALLOCATION & STRATEGY ENGINE               │
│   • Pass 1: Priority-Sorted Multi-Constraint Allocation                │
│   • Pass 2: Capacity Backfill Pass (Greedy fill of remaining slack)    │
│   • Constraints: Budget Cap (₹) + Staff-Hours + Equipment Inventory    │
│   • Counterfactual Decision Simulator (What-If Resource Sandbox)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│           CHALLENGE 1: TAMPER-EVIDENT RECOVERY EVENT LEDGER            │
│   • Independent Boundary: IndexedDB + Supabase recovery_event_ledger  │
│   • SHA-256 Hash Chain: H_i = SHA256(Canonical(E_i) + H_i-1)           │
│   • Deterministic Replay Engine & In-Flight Uncertainty Semantics      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 3. Quickstart & Automated Test Suite

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Test Suites (11 Passing Unit & Integration Tests)
```bash
npm run test
```
*Executes all Vitest suites verifying:*
- *Blackout primary failure, hash chain tamper detection, and in-flight resolution (`OP-8841`).*
- *Bad Reading coordination risk detection, pre-allocation trust gating, and provenance.*
- *Counterfactual Decision Simulator and Decision Diff generation.*

### 3. Run Production Build
```bash
npm run build
```

### 4. Run Local Development Server
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## ⏱️ 4. Unified Judge Demo Click-by-Click Script

| Step | Mode | What to Click & Observe | Key Talking Point |
| :---: | :---: | :--- | :--- |
| **1** | **Decision Workbench** | View Water Supply plan. `KMC-2026-00101` is Approved with Jetting Machine; `KMC-2026-00102` is Deferred with bottleneck note: *"All Jetting Machine units (1/1) committed."* | *"Deterministic MCDA priority and two-pass multi-constraint knapsack allocation under scarce machinery."* |
| **2** | **Decision Simulator** | Switch to **Decision Simulator** tab. Add `+1 Jetting Machine`. Observe **Decision Diff**: `KMC-2026-00102` immediately shifts to **`NEWLY EXECUTABLE`** with green highlight. | *"Sandboxed what-if counterfactual simulation showing how resource additions unblock specific deferred work orders."* |
| **3** | **Trust Review Queue** | Click **"⚡ Simulate Coordinated Smear Attack"**. 4 duplicate reports targeting a local stall appear as **`QUARANTINED`**. Check Decision Workbench to show they are **strictly blocked from consuming municipal machinery**. | *"Pre-Allocation Integrity Gate prevents coordinated Sybil brigading from stealing scarce equipment."* |
| **4** | **Verified Answers** | Open **Verified Answers**. Inspect `CLM-2026-001` (Ward 4 Garbage Rumor) marked **`VERIFIED FALSE`** backed by `EVID-SWM-001` GPS log hash. Inspect version history (`V1` $\rightarrow$ `V2`). Click **"🔊 Listen via Spoken IVR"**. | *"Authoritative provenance engine with cryptographic evidence hashes, versioning, and spoken bilingual IVR broadcast."* |
| **5** | **Disaster Recovery** | Open **Disaster Recovery Console**. Click **"💥 TRIGGER PRIMARY STORE FAILURE"** $\rightarrow$ query reads fail. Click **"🔄 EXECUTE INDEPENDENT LEDGER RECOVERY"** $\rightarrow$ Replays 11 issues, identifies in-flight `OP-8841` as **`RECOVERED_BUT_UNCERTAIN`**. Click **"✓ Confirm & Re-Verify Action"**. | *"Autonomous disaster recovery with tamper-evident SHA-256 hash chain and transparent in-flight uncertainty semantics."* |

---

## 📜 License & Governance
Built for Kopargaon Municipal Council under Hackathon Open Municipal Guidelines.
All rights reserved © 2026.
