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

## 🌾 5. Circular Wastewater-to-Agriculture Reuse Workflow

CivicPulse introduces a closed-loop municipal circular water economy system:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. MUNICIPAL WASTE INTAKE                       │
│   • Solid-liquid waste separation across Wards 1 to 8                  │
│   • Real-time volume monitoring (MLD / KLD) & Coarse Grit Screening    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    2. WASTEWATER INFLOW DIAGNOSTICS                    │
│   • Raw sewage inflow profiling: Baseline BOD, COD, Turbidity, TSS     │
│   • Automated routing to Central STP or Decentralized MBBR Reactors    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      3. MULTI-STAGE STP TREATMENT                      │
│   • Stage 1: Coarse & Fine Grit Screening                              │
│   • Stage 2: Moving Bed Biofilm Reactor (MBBR) Biological Aeration     │
│   • Stage 3: Dual Media Sand & Activated Carbon Filtration             │
│   • Stage 4: UV Disinfection & Beneficial N-P-K Nutrient Retention    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               4. QUALITY CHECK & CPCB LAB CERTIFICATION                │
│   • Central Pollution Control Board (CPCB) & FAO Agronomic Validation   │
│   • Grade A: Unrestricted Edible Crops, Onions & Orchards (BOD < 10)   │
│   • Grade B: Sugarcane, Cotton & Commercial Cash Crops (BOD < 30)      │
│   • Grade C: Agroforestry & Municipal Greenbelts (BOD < 50)            │
│   • Safety Trigger: Toxic metals/pH violations routed to Re-treatment  │
│   • Official Printable Lab Certificate with QR Verification Hash       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   5. AGRICULTURAL REUSE PLAN & DISPATCH                │
│   • Matches daily treated batch capacity with registered farmer demand │
│   • Multi-modal distribution: Gravity Canal, Underground Pipe, Tanker  │
│   • Generates Official Municipal Dispatch Work Orders for Farmers      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 6. AGRICULTURE & CIRCULAR ECONOMY IMPACT               │
│   • Direct irrigation delivery to Sugarcane, Onion & Pomegranate farms │
│   • Natural N-P-K fertilizer retention saving ~₹4.6 Lakhs in Urea/DAP  │
│   • Conserves millions of liters of fresh groundwater & Godavari river │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 6. Local Setup Instructions

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

## ⏱️ 7. Three-Minute Judge Demo Script

| Step | Time | What to Click & Observe | Key Talking Point |
| :---: | :---: | :--- | :--- |
| **1** | `0:00 - 0:25` | **Dashboard**: Observe KPIs, Top Competing Issues queue, and Circular Agri Water counter. Click `मराठी / English` toggle in header. | *"CivicPulse replaces FIFO complaint logs with deterministic decision support and adds a circular water economy for Kopargaon."* |
| **2** | `0:25 - 0:55` | **Civic Issues Queue**: Click ticket `KMC-2026-00101` (*Water Contamination near Civil Hospital*). Click **"Score Breakdown"** and use the **Pairwise Comparison Tool** against `KMC-2026-00107` (*Streetlight Outage*). | *"The score is calculated deterministically with full mathematical explainability. Explains why water contamination ranks +47 points above streetlights."* |
| **3** | `0:55 - 1:25` | **Priority Engine & Plan**: Select *Water Supply & Sanitation* department. Switch between **Strategy A (Max Risk)** and **Strategy B (Max Pop)**. Click **Run Allocation Engine**. Observe **Approved Works** and **Deferred Backlog**. | *"Solves multi-constraint knapsack allocation under limited budgets, crew shifts, and machinery. Pass 2 backfills remaining slack with smaller works."* |
| **4** | `1:25 - 2:15` | **Circular Water Hub (`/wastewater-reuse`)**: Step through the 6 stages: Municipal Waste ➔ Wastewater ➔ STP Treatment ➔ Quality Check ➔ Reuse Plan ➔ Agriculture. Test the **Quality Check Sandbox** (click *Grade A* or *Failure Trigger*), click **"Run Quality Check & Generate Certificate"** to view the printable certificate with QR code, then click **"Generate Reuse Plan"** and view the **Water Dispatch Order**. | *"Closed-loop circular economy: Municipal sewage is treated, certified against CPCB standards, and allocated to sugarcane and onion farmers, saving synthetic fertilizer and protecting the Godavari River."* |
| **5** | `2:15 - 2:45` | **GIS Map & Citizen Portal**: Open **Civic GIS Map** to see STP plants and Agricultural Command Zones. Switch to **Citizen Portal** and test **"Book Farmer Water Quota"** or submit a voice complaint. | *"Holistic civic platform with GIS intelligence, farmer water quotas, and immutable audit logs."* |

---

## 📜 License & Compliance
Built for Kopargaon Municipal Council under Hackathon Open Municipal Guidelines.
All rights reserved © 2026.
