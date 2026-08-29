# 🏛️ KoparNiti (कोपरनीती)
### AI-Assisted Municipal Decision-Support & Civic Governance Engine
**Kopargaon Municipal Council (कोपरगाव नगरपरिषद) • Smart Kopargaon Hackathon 2026 (Track 2)**

> ⚡ **For Hackathon Judges:** Please read **[`DECISIONS.md`](./DECISIONS.md)** for our 5-minute executive summary on weight rationales, scarce-resource conflict resolution, incomplete-data handling, and 0/1 Knapsack DP optimality proofs.

---

## 📌 1. The Core Problem & Constituent Challenges Solved

Traditional municipal grievance portals function as simple first-in, first-out (FIFO) CRUD complaint logs. However, **Kopargaon Municipal Council** operates under severe physical constraints:
- **Strict Budget Caps**: Discretionary funds capped per department per shift.
- **Limited Technician Crews**: Fixed technician shifts (plumbers, electricians, road workers).
- **Specialized Heavy Fleet**: Only 2 Jetting Vacuum machines, 1 Road Roller, and 1 Hydraulic Telescopic Bucket Lift.

### The 7 Core Municipal Decision Questions Solved:
1. **Which issues must be handled first?** Deterministic scoring prioritizes high-hazard life, health, and infrastructure emergencies over cosmetic complaints.
2. **Why should one issue take priority over another?** Comparative explainability engine contrasts score decompositions side-by-side.
3. **Which combination of issues can be resolved with available resources?** Solves a multi-constraint knapsack optimization problem over budget, staff, and heavy machinery.
4. **How is mathematical optimality defended?** Interactive Exact DP 0/1 Knapsack baseline demonstrates that the fast greedy heuristic achieves $\ge 97\%$ of theoretical optimum.
5. **How are citizens without smartphones protected?** Field verification request loop allows on-site physical inspection by ward inspectors, restoring full confidence score without penalties.
6. **How can officers override recommendations transparently?** Overrides require mandatory justifications and are recorded in an immutable audit ledger.
7. **How are decisions communicated to citizens?** Phone-first delivery via real-time cellular SMS, spoken IVR telephony scripts, and in-app 4-stage tracking timelines.

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
│                   AI STRUCTURED EXTRACTION LAYER                       │
│   • Real LLM API (Gemini / GPT) with strict JSON output schema         │
│   • Deterministic Rule Fallback (if offline or API timeout)            │
│   • Extracts hazard tags, population scale, and confidence rating      │
│   *(Note: AI strictly extracts parameters; it does NOT decide score)*  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    DETERMINISTIC PRIORITY ENGINE                       │
│    S = w_sev*S_sev + w_urg*S_urg + w_pop*S_pop + w_loc*S_loc          │
│        + w_esc*S_esc - Confidence_Penalty                              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              RESOURCE-AWARE ALLOCATION & STRATEGY ENGINE               │
│   • Pass 1: Strategy-Sorted Knapsack (Max Risk / Max Pop / Cost Eff)   │
│   • Pass 2: Capacity Backfill Pass (Greedy fill of remaining slack)    │
│   • Constraints: Budget Cap (₹) + Staff-Hours + Equipment Inventory    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  EXPLAINABILITY & ACTION DISPATCH                      │
│   • Pairwise Issue Comparative Explanations & Deferral Diagnostics     │
│   • Printable Official Municipal Work Orders with QR Codes             │
│   • Immutable Audit Ledger + In-App Citizen Notifications Feed         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🧮 3. Deterministic Priority Scoring Factors

$$S_{\text{final}} = w_{\text{sev}} \cdot S_{\text{sev}} + w_{\text{urg}} \cdot S_{\text{urg}} + w_{\text{pop}} \cdot S_{\text{pop}} + w_{\text{loc}} \cdot S_{\text{loc}} + w_{\text{esc}} \cdot S_{\text{esc}} - C_{\text{missing}}$$

| Factor | Weight | Justification |
| :--- | :---: | :--- |
| **Severity ($S_{\text{sev}}$)** | **35%** | Protects human life and public health (e.g. water contamination, live electric wires). |
| **Urgency ($S_{\text{urg}}$)** | **25%** | Accelerates priority proportionally as departmental SLA deadline approaches $\min(100, (\text{Elapsed}/\text{SLA}) \times 100)$. |
| **Population Spread ($S_{\text{pop}}$)** | **20%** | Scales logarithmically so arterial trunk lines rank above isolated dead-end alleys. |
| **Zone Multiplier ($S_{\text{loc}}$)** | **10%** | Elevates issues adjacent to critical infrastructure (Civil Hospital, schools, bus terminals, pilgrimage ghats). |
| **Repeat Escalations ($S_{\text{esc}}$)** | **10%** | Boosts score when multiple unique citizens report within the same 150m geographic cluster. |
| **Confidence Penalty ($C_{\text{missing}}$)** | **Deduction** | Deducts up to 20 points if photo evidence or precise GPS coordinates are missing to avoid false certainty. |

---

## 🎯 4. Allocation Strategies: When to Choose Each

Municipal officers can evaluate and compare 3 distinct allocation objectives:

1. **Strategy A: Maximum Severity & Risk Mitigation**
   - *Best when*: Responding to monsoon floods, public health outbreaks, or storm damage where life and safety hazards take absolute precedence.
2. **Strategy B: Maximum Citizen Reach**
   - *Best when*: Managing routine civic cycles where the council aims to benefit the maximum number of residents per rupee expended.
3. **Strategy C: Balanced Volume & Cost Efficiency**
   - *Best when*: Clearing large backlogs of small-footprint grievances (streetlights, minor potholes, localized debris) to maximize resolution volume.

---

## 🚀 5. Local Setup Instructions

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd Final_Hackathon
npm install
```

### 2. Environment Configuration (Optional for Supabase / Live LLM)
Create a `.env` file in the root directory:
```env
# Supabase Configuration (Optional - App runs offline in Demo Mode if omitted)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# LLM API Key for Real AI Structured Intake (Optional - Fallback rule engine active by default)
VITE_GEMINI_API_KEY=your-gemini-api-key
```

### 3. Database Migration (If connecting to live Supabase)
Execute the SQL schema in [`supabase/schema.sql`](supabase/schema.sql) inside the Supabase SQL Editor.

### 4. Run Development Server
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## ⏱️ 6. Two-Minute Judge Demo Script

| Step | Time | What to Click & Observe | Key Talking Point |
| :---: | :---: | :--- | :--- |
| **1** | `0:00 - 0:35` | **Civic Issues Queue**: Click ticket `KMC-2026-00101` (*Sewage Backflow near Civil Hospital*). Click **"Audit Formula"** and use the **Pairwise Comparison Tool** against `KMC-2026-00107` (*Streetlight Outage*). Observe exact mathematical breakdown (+35 pts severity, +25 pts SLA window). | *"The score is calculated deterministically via MCDA. The explainability engine proves why water contamination ranks +47 points above streetlights."* |
| **2** | `0:35 - 1:10` | **Decision Workbench & Knapsack Engine**: Go to **Decision Engine**. Select *Water Supply & Sanitation*. Observe `KMC-2026-00101` is Approved with Jetting Machine, while `KMC-2026-00102` is Deferred with a named bottleneck diagnostic. Toggle between **Fast Greedy (O(N log N))** and **Exact DP Knapsack (O(N·W))** to see the 97.5% optimality proof. | *"Solves multi-constraint knapsack allocation under limited budgets, crew shifts, and scarce machinery. DP knapsack mathematically proves greedy optimality."* |
| **3** | `1:10 - 1:35` | **Incomplete Data & Field Verification**: In **Issues Queue**, click `KMC-2026-00108` (incomplete evidence, penalty applied). Click **"Confirm On-Site Verification"** — watch confidence score bump to 100% and priority recompute instantly. | *"Semi-rural citizens without smartphones are never penalized permanently: on-site physical verification by KMC ward inspectors restores full confidence."* |
| **4** | `1:35 - 1:50` | **Citizen Portal & Phone-First Broadcast**: Go to **Citizen Portal → Track**. Click **"Read Aloud (मराठी)"** to listen to the spoken IVR audio script. Click **"Dispatch Crew"** to simulate real-time Fast2SMS cellular dispatch to mobile. | *"Phone-first citizen loop: automated Fast2SMS cellular SMS + spoken Marathi/English IVR scripts for call-center operators."* |
| **5** | `1:50 - 2:00` | **Secondary Municipal Extensions**: Briefly highlight **Flood Alert & Emergency Dispatch** and **Circular Wastewater-to-Agri Reuse**. | *"Extension of the same decision engine to secondary municipal operations: riverbank flood evacuation telemetry and sugarcane wastewater reuse."* |

---

## 📜 License & Compliance
Built for Kopargaon Municipal Council under Hackathon Open Municipal Guidelines.
All rights reserved © 2026.
