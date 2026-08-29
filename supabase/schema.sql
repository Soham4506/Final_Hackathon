-- ==============================================================================
-- CIVICPULSE - KOPARGAON MUNICIPAL COUNCIL
-- Comprehensive PostgreSQL Schema for Supabase
-- Core Decision Support & Resource-Aware Prioritization System
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. ENUMS & DOMAINS
-- ------------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('citizen', 'officer', 'admin');

CREATE TYPE issue_status AS ENUM (
    'submitted',
    'triaged',
    'prioritized',
    'scheduled',
    'in_progress',
    'resolved',
    'rejected',
    'escalated'
);

CREATE TYPE urgency_level AS ENUM ('critical', 'high', 'medium', 'low');

CREATE TYPE resource_type AS ENUM (
    'staff_crew',
    'jetting_machine',
    'tipper_truck',
    'road_roller',
    'hydraulic_bucket_truck',
    'water_tanker',
    'fogging_machine',
    'budget_funds'
);

CREATE TYPE plan_status AS ENUM ('draft', 'recommended', 'approved', 'executed', 'archived');

CREATE TYPE plan_item_status AS ENUM ('approved', 'deferred', 'overridden', 'emergency_injected');

CREATE TYPE notification_channel AS ENUM ('app', 'sms', 'email');

-- ------------------------------------------------------------------------------
-- 2. CORE TABLES
-- ------------------------------------------------------------------------------

-- ZONES (Wards & Geographic Sectors of Kopargaon)
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,             -- e.g. 'WARD-01', 'WARD-04'
    name VARCHAR(100) NOT NULL,                    -- e.g. 'Godavari North Sector', 'Shivaji Nagar'
    ward_number INT NOT NULL,
    population_density VARCHAR(20) DEFAULT 'medium', -- 'very_high', 'high', 'medium', 'low'
    risk_factor NUMERIC(3,2) DEFAULT 1.00,        -- Multiplier for critical infrastructure (1.0 - 1.5)
    boundary_geojson JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEPARTMENTS (Municipal Council Divisions)
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,             -- e.g. 'WSS', 'PWD', 'SWM', 'ELEC', 'PHD'
    name VARCHAR(100) NOT NULL,                    -- e.g. 'Water Supply & Sanitation'
    head_officer_name VARCHAR(100),
    contact_email VARCHAR(100),
    daily_budget_limit NUMERIC(12,2) DEFAULT 50000.00, -- INR ₹ per day
    default_sla_hours INT DEFAULT 48,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER PROFILES (Citizen, Officer, Admin)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'citizen',
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    ward_id UUID REFERENCES zones(id),
    department_id UUID REFERENCES departments(id), -- For officers
    employee_id VARCHAR(50),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ISSUE CATEGORIES
CREATE TABLE IF NOT EXISTS issue_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,             -- e.g. 'WATER_CONTAMINATION', 'MAIN_ROAD_POTHOLE'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_severity_score NUMERIC(5,2) NOT NULL,    -- 0 - 100
    default_sla_hours INT NOT NULL DEFAULT 48,
    estimated_cost_base NUMERIC(10,2) DEFAULT 2000.00,
    estimated_hours_base NUMERIC(5,2) DEFAULT 4.0,
    default_staff_required INT DEFAULT 2,
    default_equipment_required resource_type,
    is_active BOOLEAN DEFAULT TRUE
);

-- PRIORITY WEIGHT CONFIGURATION (Deterministic Engine Tuning)
CREATE TABLE IF NOT EXISTS priority_weight_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_name VARCHAR(100) UNIQUE NOT NULL,
    weight_severity NUMERIC(4,3) DEFAULT 0.35,     -- 35%
    weight_urgency NUMERIC(4,3) DEFAULT 0.25,      -- 25% (time decay vs SLA)
    weight_population NUMERIC(4,3) DEFAULT 0.20,   -- 20% (affected residents)
    weight_location NUMERIC(4,3) DEFAULT 0.10,     -- 10% (zone risk factor)
    weight_escalation NUMERIC(4,3) DEFAULT 0.10,   -- 10% (repeat complaints)
    missing_data_penalty_max NUMERIC(5,2) DEFAULT 20.0, -- Confidence penalty
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CIVIC ISSUES (The Main Problem Records)
CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(30) UNIQUE NOT NULL,    -- e.g. 'KMC-2026-00104'
    citizen_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    category_id UUID NOT NULL REFERENCES issue_categories(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    zone_id UUID NOT NULL REFERENCES zones(id),
    
    title VARCHAR(200) NOT NULL,
    raw_description TEXT NOT NULL,
    location_address TEXT NOT NULL,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    photo_urls TEXT[] DEFAULT '{}',
    
    -- Structured attributes extracted via AI / Verified by system
    structured_data JSONB DEFAULT '{}'::jsonb,
    -- Structure: { "water_contamination_suspected": true, "near_hospital": true, "blockage_severity": "severe" }
    
    affected_population_estimate INT DEFAULT 50,  -- Number of citizens affected
    confidence_score NUMERIC(4,3) DEFAULT 1.000,  -- 0.000 to 1.000 (penalized if info missing)
    missing_attributes TEXT[] DEFAULT '{}',       -- e.g. ['precise_coordinates', 'photo_evidence']
    
    status issue_status DEFAULT 'submitted',
    urgency urgency_level DEFAULT 'medium',
    
    -- Resource Estimation
    estimated_cost NUMERIC(10,2) DEFAULT 0.00,
    estimated_hours NUMERIC(5,2) DEFAULT 0.0,
    required_staff_count INT DEFAULT 2,
    required_equipment resource_type,
    
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    sla_due_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    escalation_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DETERMINISTIC PRIORITY SCORES
CREATE TABLE IF NOT EXISTS priority_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID UNIQUE NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    config_id UUID REFERENCES priority_weight_configs(id),
    
    severity_component NUMERIC(6,2) NOT NULL,    -- (0-100) * weight
    urgency_component NUMERIC(6,2) NOT NULL,     -- (0-100) * weight
    population_component NUMERIC(6,2) NOT NULL,  -- (0-100) * weight
    location_component NUMERIC(6,2) NOT NULL,    -- (0-100) * weight
    escalation_component NUMERIC(6,2) NOT NULL,  -- (0-100) * weight
    confidence_penalty NUMERIC(6,2) NOT NULL,    -- Deducted score
    
    final_score NUMERIC(6,2) NOT NULL,           -- Final deterministic priority score (0-100)
    priority_rank INT,                           -- Relative queue rank
    
    explanation_summary TEXT NOT NULL,           -- Natural language breakdown of priority
    score_breakdown_json JSONB NOT NULL,         -- Detailed sub-component calculations
    
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MUNICIPAL RESOURCES (Inventory of Department Capacity)
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    resource_type resource_type NOT NULL,
    identifier_code VARCHAR(50) NOT NULL,        -- e.g. 'JETTING-TRUCK-01', 'ROAD-ROLLER-KMC-2'
    name VARCHAR(100) NOT NULL,
    capacity_description VARCHAR(200),
    is_operational BOOLEAN DEFAULT TRUE,
    daily_cost_rate NUMERIC(10,2) DEFAULT 0.00,
    current_status VARCHAR(50) DEFAULT 'available', -- 'available', 'allocated', 'maintenance'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ALLOCATION PLANS (Daily / Shift Optimization Batches)
CREATE TABLE IF NOT EXISTS allocation_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_code VARCHAR(50) UNIQUE NOT NULL,        -- e.g. 'PLAN-2026-08-29-SHIFT-1'
    department_id UUID NOT NULL REFERENCES departments(id),
    target_date DATE NOT NULL,
    shift_number INT DEFAULT 1,
    status plan_status DEFAULT 'recommended',
    
    total_budget_cap NUMERIC(12,2) NOT NULL,
    total_staff_available INT NOT NULL,
    budget_utilized NUMERIC(12,2) DEFAULT 0.00,
    staff_hours_utilized NUMERIC(8,2) DEFAULT 0.0,
    
    total_issues_evaluated INT DEFAULT 0,
    issues_approved_count INT DEFAULT 0,
    issues_deferred_count INT DEFAULT 0,
    
    generated_by UUID REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ALLOCATION PLAN ITEMS (Specific Issues within a Plan Batch)
CREATE TABLE IF NOT EXISTS allocation_plan_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES allocation_plans(id) ON DELETE CASCADE,
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    allocated_resource_id UUID REFERENCES resources(id),
    
    item_status plan_item_status NOT NULL DEFAULT 'approved',
    priority_at_allocation NUMERIC(6,2) NOT NULL,
    allocated_staff_count INT DEFAULT 2,
    allocated_hours NUMERIC(5,2) DEFAULT 4.0,
    allocated_cost NUMERIC(10,2) DEFAULT 2500.00,
    
    deferral_reason TEXT,                        -- e.g. 'Exceeds remaining daily budget by ₹8,000'
    bottleneck_resource resource_type,           -- The constrained resource that prevented scheduling
    scheduled_order INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRIORITY DECISIONS & OFFICER OVERRIDES
CREATE TABLE IF NOT EXISTS priority_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    officer_id UUID NOT NULL REFERENCES profiles(id),
    plan_id UUID REFERENCES allocation_plans(id),
    
    action_type VARCHAR(50) NOT NULL,            -- 'accepted_recommendation', 'priority_override', 'resource_reassigned', 'status_changed'
    previous_score NUMERIC(6,2),
    overridden_score NUMERIC(6,2),
    override_reason TEXT,                        -- Mandatory justification for audit
    officer_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS (Citizen & Officer Broadcasts)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    channel notification_channel DEFAULT 'app',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT LOGS (Immutable Municipal Audit Ledger)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_role user_role,
    action VARCHAR(100) NOT NULL,                -- e.g. 'PRIORITY_OVERRIDE', 'PLAN_APPROVED', 'ISSUE_CREATED'
    entity_type VARCHAR(50) NOT NULL,            -- 'issue', 'plan', 'resource', 'weight_config'
    entity_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. INDEXES FOR PERFORMANCE
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_dept ON issues(department_id);
CREATE INDEX IF NOT EXISTS idx_issues_zone ON issues(zone_id);
CREATE INDEX IF NOT EXISTS idx_priority_scores_final ON priority_scores(final_score DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_weight_configs ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, user can update own profile
CREATE POLICY "Profiles readable by authenticated users" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Issues: Citizens view all non-confidential or own issues; Officers/Admins view all
CREATE POLICY "Issues viewable by all authenticated users" ON issues
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Citizens can insert issues" ON issues
    FOR INSERT WITH CHECK (auth.uid() = citizen_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Officers and Admins can update issues" ON issues
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('officer', 'admin')
        )
    );

-- Notifications: Only recipient can view
CREATE POLICY "Users view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Users update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = recipient_id);

-- Audit Logs: Read-only for Officers and Admins
CREATE POLICY "Audit logs readable by staff" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('officer', 'admin')
        )
    );

-- ------------------------------------------------------------------------------
-- 5. INITIAL SEED DATA FOR KOPARGAON MUNICIPAL COUNCIL
-- ------------------------------------------------------------------------------

-- Insert Zones of Kopargaon
INSERT INTO zones (id, code, name, ward_number, population_density, risk_factor) VALUES
('a0000000-0000-0000-0000-000000000001', 'WARD-01', 'Godavari Ghat & Temple Area', 1, 'high', 1.30),
('a0000000-0000-0000-0000-000000000002', 'WARD-02', 'Shivaji Nagar North', 2, 'medium', 1.00),
('a0000000-0000-0000-0000-000000000003', 'WARD-03', 'Subhash Chowk & Market Center', 3, 'very_high', 1.45),
('a0000000-0000-0000-0000-000000000004', 'WARD-04', 'Civil Hospital & Station Road', 4, 'very_high', 1.50),
('a0000000-0000-0000-0000-000000000005', 'WARD-05', 'Indira Nagar & School Zone', 5, 'high', 1.35),
('a0000000-0000-0000-0000-000000000006', 'WARD-06', 'Mahatma Phule Colony', 6, 'medium', 1.10),
('a0000000-0000-0000-0000-000000000007', 'WARD-07', 'Kopargaon Railway Colony', 7, 'medium', 1.15),
('a0000000-0000-0000-0000-000000000008', 'WARD-08', 'Gautam Nagar & Bus Stand Road', 8, 'high', 1.40)
ON CONFLICT (code) DO NOTHING;

-- Insert Departments
INSERT INTO departments (id, code, name, head_officer_name, contact_email, daily_budget_limit, default_sla_hours) VALUES
('d0000000-0000-0000-0000-000000000001', 'WSS', 'Water Supply & Sanitation Department', 'Er. Rahul Deshmukh', 'water@kopargaon.gov.in', 65000.00, 24),
('d0000000-0000-0000-0000-000000000002', 'PWD', 'Public Works & Roads Department', 'Er. Sanjay Shinde', 'pwd@kopargaon.gov.in', 80000.00, 72),
('d0000000-0000-0000-0000-000000000003', 'SWM', 'Solid Waste Management & Hygiene', 'Dr. Priya Kulkarni', 'waste@kopargaon.gov.in', 45000.00, 24),
('d0000000-0000-0000-0000-000000000004', 'ELEC', 'Electrical & Street Lighting', 'Er. Mahesh Patil', 'electric@kopargaon.gov.in', 35000.00, 36),
('d0000000-0000-0000-0000-000000000005', 'PHD', 'Public Health & Vector Control', 'Dr. Sunita Jagtap', 'health@kopargaon.gov.in', 40000.00, 24)
ON CONFLICT (code) DO NOTHING;

-- Insert Issue Categories
INSERT INTO issue_categories (id, department_id, code, name, base_severity_score, default_sla_hours, estimated_cost_base, estimated_hours_base, default_staff_required, default_equipment_required) VALUES
('c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'DRINKING_WATER_CONTAMINATION', 'Drinking Water Pipeline Contamination', 95.0, 12, 12000.00, 6.0, 4, 'jetting_machine'),
('c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'MAIN_SEWER_OVERFLOW', 'Major Underground Sewer Overflow', 88.0, 18, 9500.00, 5.0, 3, 'jetting_machine'),
('c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000002', 'MAJOR_ROAD_CAVE_IN', 'Road Cave-in / Critical Pothole on Arterial Route', 85.0, 24, 18000.00, 8.0, 5, 'road_roller'),
('c0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', 'LIVE_WIRE_EXPOSED', 'Exposed High-Voltage Wire near Public Walkway', 98.0, 6, 4500.00, 3.0, 3, 'hydraulic_bucket_truck'),
('c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000003', 'COMMUNITY_GARBAGE_DUMP', 'Open Garbage Dump / Biomedical Waste Accumulation', 72.0, 24, 6000.00, 4.0, 4, 'tipper_truck'),
('c0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000004', 'STREETLIGHT_CLUSTER_OUTAGE', 'Streetlight Cluster Failure in Residential Ward', 45.0, 48, 3000.00, 3.0, 2, 'hydraulic_bucket_truck'),
('c0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000005', 'MOSQUITO_BREEDING_STAGNATION', 'Stagnant Water Stench / Dengue Breeding Risk', 68.0, 36, 4000.00, 3.5, 2, 'fogging_machine')
ON CONFLICT (code) DO NOTHING;

-- Insert Priority Weight Config
INSERT INTO priority_weight_configs (id, config_name, weight_severity, weight_urgency, weight_population, weight_location, weight_escalation, missing_data_penalty_max, is_current) VALUES
('w0000000-0000-0000-0000-000000000001', 'KMC Standard Municipal Model v1.0', 0.35, 0.25, 0.20, 0.10, 0.10, 20.0, TRUE)
ON CONFLICT (config_name) DO NOTHING;

-- Insert Physical Resources
INSERT INTO resources (id, department_id, resource_type, identifier_code, name, capacity_description, is_operational, daily_cost_rate, current_status) VALUES
('r0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'jetting_machine', 'KMC-JET-01', 'High-Pressure Sewer Jetting Machine #1', '4000L Suction & Pressure Vacuum', TRUE, 4500.00, 'available'),
('r0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'jetting_machine', 'KMC-JET-02', 'Compact Sewer Jetting Machine #2', '2000L Narrow Alley Vacuum', TRUE, 3500.00, 'available'),
('r0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000002', 'road_roller', 'KMC-ROLLER-01', 'Vibratory Asphalt Road Roller #1', '10 Ton Static & Vibratory Weight', TRUE, 6000.00, 'available'),
('r0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000003', 'tipper_truck', 'KMC-TIPPER-01', 'Solid Waste Hydraulic Tipper #1', '6 Ton Capacity Refuse Collector', TRUE, 2500.00, 'available'),
('r0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000004', 'hydraulic_bucket_truck', 'KMC-BUCKET-01', 'Insulated Telescopic Bucket Lift #1', '14m Working Height with Insulated Basket', TRUE, 4000.00, 'available')
ON CONFLICT DO NOTHING;
