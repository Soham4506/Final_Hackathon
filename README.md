# 🏛️ CivicPulse
### AI-Assisted Municipal Decision-Support & Priority Engine
**Kopargaon Municipal Council (कोपरगाव नगरपरिषद) • Smart Kopargaon Hackathon 2026 (Track 2)**

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
4. **How should remaining shift slack be utilized?** Second-pass capacity backfill greedily schedules smaller deferred works.
5. **How are duplicate citizen reports handled?** 150m radius / 72-hour geo-spatial clustering merges repeat complaints into a single cluster, boosting priority rather than duplicating work orders.
6. **How can officers override recommendations transparently?** Overrides require mandatory justifications and are recorded in an immutable audit ledger.
7. **How are decisions communicated to citizens?** Reassuring in-app notifications and live 4-stage tracking timelines.

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
| **1** | `0:00 - 0:25` | **Dashboard**: Observe KPIs, Top Competing Issues queue, and department budget gauges. Click the `मराठी / English` toggle in header. | *"CivicPulse replaces FIFO complaint logs with deterministic decision support tailored for Kopargaon Municipal Council."* |
| **2** | `0:25 - 0:50` | **Civic Issues Queue**: Click ticket `KMC-2026-00101` (*Water Contamination near Civil Hospital*). Click **"Score Breakdown"** and use the **Pairwise Comparison Tool** against `KMC-2026-00107` (*Streetlight Outage*). | *"The score is calculated deterministically with full mathematical explainability. The pairwise tool explains why water contamination ranks +47 points above streetlights."* |
| **3** | `0:50 - 1:20` | **Priority Engine & Plan**: Select *Water Supply & Sanitation* department. Switch between **Strategy A (Max Risk)** and **Strategy B (Max Pop)** to view the Trade-Off Matrix. Click **Run Allocation Engine**. Observe **Approved Works** (with Jetting Truck assigned) and **Deferred Backlog** (with machine bottleneck diagnostics and capacity backfill). | *"Solves multi-constraint knapsack allocation under limited budgets, crew shifts, and machinery. Pass 2 backfills remaining slack with smaller works."* |
| **4** | `1:20 - 1:40` | **Work Order & Override**: Click **"Official Work Order"** on the approved plan. Then test **Officer Override** on a ticket and show the timestamped event in **Settings → Audit Ledger**. | *"Officers can generate printable municipal work orders with QR codes. Any priority override is immutably logged for audit compliance."* |
| **5** | `1:40 - 2:00` | **Citizen Portal**: Switch role to **Citizen**. Click **"Voice Complaint"** or type: *"Yellow muddy water smelling of sewage near Civil Hospital"*. Select a sample photo to watch the confidence meter hit 100%. Submit the complaint. | *"AI extracts structured features without hallucinating scores. 150m duplicate clustering merges repeat complaints to prevent redundant work orders."* |

---

## 📜 License & Compliance
Built for Kopargaon Municipal Council under Hackathon Open Municipal Guidelines.
All rights reserved © 2026.
