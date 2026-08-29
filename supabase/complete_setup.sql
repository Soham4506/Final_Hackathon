-- ==============================================================================
-- CIVICPULSE - KOPARGAON MUNICIPAL COUNCIL (कोपरगाव नगरपरिषद)
-- Complete Database Setup Script for Supabase PostgreSQL
-- Run this in your Supabase SQL Editor to initialize all tables & seed data
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing types if recreating
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('citizen', 'officer', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE issue_status AS ENUM (
        'submitted', 'triaged', 'prioritized', 'scheduled', 
        'in_progress', 'resolved', 'rejected', 'escalated'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE urgency_level AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE resource_type AS ENUM (
        'staff_crew', 'jetting_machine', 'tipper_truck', 'road_roller',
        'hydraulic_bucket_truck', 'water_tanker', 'fogging_machine', 'budget_funds'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE plan_status AS ENUM ('draft', 'recommended', 'approved', 'executed', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE plan_item_status AS ENUM ('approved', 'deferred', 'overridden', 'emergency_injected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_channel AS ENUM ('app', 'sms', 'email');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create Tables

-- ZONES (Wards of Kopargaon)
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    ward_number INT NOT NULL,
    population_density VARCHAR(20) DEFAULT 'medium',
    risk_factor NUMERIC(3,2) DEFAULT 1.00,
    boundary_geojson JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    head_officer_name VARCHAR(100),
    contact_email VARCHAR(100),
    daily_budget_limit NUMERIC(12,2) DEFAULT 50000.00,
    default_sla_hours INT DEFAULT 48,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROFILES (Users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role NOT NULL DEFAULT 'citizen',
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    ward_id UUID REFERENCES zones(id),
    department_id UUID REFERENCES departments(id),
    employee_id VARCHAR(50),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ISSUE CATEGORIES
CREATE TABLE IF NOT EXISTS issue_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_severity_score NUMERIC(5,2) NOT NULL,
    default_sla_hours INT NOT NULL DEFAULT 48,
    estimated_cost_base NUMERIC(10,2) DEFAULT 2000.00,
    estimated_hours_base NUMERIC(5,2) DEFAULT 4.0,
    default_staff_required INT DEFAULT 2,
    default_equipment_required resource_type,
    is_active BOOLEAN DEFAULT TRUE
);

-- PRIORITY WEIGHT CONFIGS
CREATE TABLE IF NOT EXISTS priority_weight_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_name VARCHAR(100) UNIQUE NOT NULL,
    weight_severity NUMERIC(4,3) DEFAULT 0.35,
    weight_urgency NUMERIC(4,3) DEFAULT 0.25,
    weight_population NUMERIC(4,3) DEFAULT 0.20,
    weight_location NUMERIC(4,3) DEFAULT 0.10,
    weight_escalation NUMERIC(4,3) DEFAULT 0.10,
    missing_data_penalty_max NUMERIC(5,2) DEFAULT 20.0,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CIVIC ISSUES
CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(30) UNIQUE NOT NULL,
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
    structured_data JSONB DEFAULT '{}'::jsonb,
    affected_population_estimate INT DEFAULT 50,
    confidence_score NUMERIC(4,3) DEFAULT 1.000,
    missing_attributes TEXT[] DEFAULT '{}',
    status issue_status DEFAULT 'submitted',
    urgency urgency_level DEFAULT 'medium',
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

-- PRIORITY SCORES
CREATE TABLE IF NOT EXISTS priority_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID UNIQUE NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    config_id UUID REFERENCES priority_weight_configs(id),
    severity_component NUMERIC(6,2) NOT NULL,
    urgency_component NUMERIC(6,2) NOT NULL,
    population_component NUMERIC(6,2) NOT NULL,
    location_component NUMERIC(6,2) NOT NULL,
    escalation_component NUMERIC(6,2) NOT NULL,
    confidence_penalty NUMERIC(6,2) NOT NULL,
    final_score NUMERIC(6,2) NOT NULL,
    priority_rank INT,
    explanation_summary TEXT NOT NULL,
    score_breakdown_json JSONB NOT NULL,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RESOURCES
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    resource_type resource_type NOT NULL,
    identifier_code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    capacity_description VARCHAR(200),
    is_operational BOOLEAN DEFAULT TRUE,
    daily_cost_rate NUMERIC(10,2) DEFAULT 0.00,
    current_status VARCHAR(50) DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ALLOCATION PLANS
CREATE TABLE IF NOT EXISTS allocation_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_code VARCHAR(50) UNIQUE NOT NULL,
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

-- ALLOCATION PLAN ITEMS
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
    deferral_reason TEXT,
    bottleneck_resource resource_type,
    scheduled_order INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRIORITY DECISIONS
CREATE TABLE IF NOT EXISTS priority_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    officer_id UUID NOT NULL REFERENCES profiles(id),
    plan_id UUID REFERENCES allocation_plans(id),
    action_type VARCHAR(50) NOT NULL,
    previous_score NUMERIC(6,2),
    overridden_score NUMERIC(6,2),
    override_reason TEXT,
    officer_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
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

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_role user_role,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) & Policies
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
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_categories ENABLE ROW LEVEL SECURITY;

-- Public Access Policies for Demo & Direct API Interaction
DROP POLICY IF EXISTS "Allow public read zones" ON zones;
CREATE POLICY "Allow public read zones" ON zones FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read departments" ON departments;
CREATE POLICY "Allow public read departments" ON departments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read categories" ON issue_categories;
CREATE POLICY "Allow public read categories" ON issue_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read issues" ON issues;
CREATE POLICY "Allow public read issues" ON issues FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert issues" ON issues;
CREATE POLICY "Allow public insert issues" ON issues FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update issues" ON issues;
CREATE POLICY "Allow public update issues" ON issues FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public read priority_scores" ON priority_scores;
CREATE POLICY "Allow public read priority_scores" ON priority_scores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert priority_scores" ON priority_scores;
CREATE POLICY "Allow public insert priority_scores" ON priority_scores FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update priority_scores" ON priority_scores;
CREATE POLICY "Allow public update priority_scores" ON priority_scores FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public read resources" ON resources;
CREATE POLICY "Allow public read resources" ON resources FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update resources" ON resources;
CREATE POLICY "Allow public update resources" ON resources FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public read plans" ON allocation_plans;
CREATE POLICY "Allow public read plans" ON allocation_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert plans" ON allocation_plans;
CREATE POLICY "Allow public insert plans" ON allocation_plans FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read plan_items" ON allocation_plan_items;
CREATE POLICY "Allow public read plan_items" ON allocation_plan_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert plan_items" ON allocation_plan_items;
CREATE POLICY "Allow public insert plan_items" ON allocation_plan_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read decisions" ON priority_decisions;
CREATE POLICY "Allow public read decisions" ON priority_decisions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert decisions" ON priority_decisions;
CREATE POLICY "Allow public insert decisions" ON priority_decisions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read notifications" ON notifications;
CREATE POLICY "Allow public read notifications" ON notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert notifications" ON notifications;
CREATE POLICY "Allow public insert notifications" ON notifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read audit_logs" ON audit_logs;
CREATE POLICY "Allow public read audit_logs" ON audit_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert audit_logs" ON audit_logs;
CREATE POLICY "Allow public insert audit_logs" ON audit_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read weights" ON priority_weight_configs;
CREATE POLICY "Allow public read weights" ON priority_weight_configs FOR SELECT USING (true);

-- 5. Create Storage Bucket for Citizen Uploads (if storage schema exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('issue-attachments', 'issue-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access Attachments"
ON storage.objects FOR ALL
USING (bucket_id = 'issue-attachments')
WITH CHECK (bucket_id = 'issue-attachments');

-- 6. Seed Master Data for Kopargaon Municipal Council

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

INSERT INTO departments (id, code, name, head_officer_name, contact_email, daily_budget_limit, default_sla_hours) VALUES
('b0000000-0000-0000-0000-000000000001', 'WSS', 'Water Supply & Sanitation Department', 'Er. Rahul Deshmukh', 'water@kopargaon.gov.in', 65000.00, 24),
('b0000000-0000-0000-0000-000000000002', 'PWD', 'Public Works & Roads Department', 'Er. Sanjay Shinde', 'pwd@kopargaon.gov.in', 80000.00, 72),
('b0000000-0000-0000-0000-000000000003', 'SWM', 'Solid Waste Management & Hygiene', 'Dr. Priya Kulkarni', 'waste@kopargaon.gov.in', 45000.00, 24),
('b0000000-0000-0000-0000-000000000004', 'ELEC', 'Electrical & Street Lighting', 'Er. Mahesh Patil', 'electric@kopargaon.gov.in', 35000.00, 36),
('b0000000-0000-0000-0000-000000000005', 'PHD', 'Public Health & Vector Control', 'Dr. Sunita Jagtap', 'health@kopargaon.gov.in', 40000.00, 24)
ON CONFLICT (code) DO NOTHING;

INSERT INTO issue_categories (id, department_id, code, name, base_severity_score, default_sla_hours, estimated_cost_base, estimated_hours_base, default_staff_required, default_equipment_required) VALUES
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'DRINKING_WATER_CONTAMINATION', 'Drinking Water Pipeline Contamination', 95.0, 12, 12000.00, 6.0, 4, 'jetting_machine'),
('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'MAIN_SEWER_OVERFLOW', 'Major Underground Sewer Overflow', 88.0, 18, 9500.00, 5.0, 3, 'jetting_machine'),
('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'MAJOR_ROAD_CAVE_IN', 'Road Cave-in / Critical Pothole on Arterial Route', 85.0, 24, 18000.00, 8.0, 5, 'road_roller'),
('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 'LIVE_WIRE_EXPOSED', 'Exposed High-Voltage Wire near Public Walkway', 98.0, 6, 4500.00, 3.0, 3, 'hydraulic_bucket_truck'),
('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 'COMMUNITY_GARBAGE_DUMP', 'Open Garbage Dump / Biomedical Waste Accumulation', 72.0, 24, 6000.00, 4.0, 4, 'tipper_truck'),
('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000004', 'STREETLIGHT_CLUSTER_OUTAGE', 'Streetlight Cluster Failure in Residential Ward', 45.0, 48, 3000.00, 3.0, 2, 'hydraulic_bucket_truck'),
('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000005', 'MOSQUITO_BREEDING_STAGNATION', 'Stagnant Water Stench / Dengue Breeding Risk', 68.0, 36, 4000.00, 3.5, 2, 'fogging_machine')
ON CONFLICT (code) DO NOTHING;

INSERT INTO priority_weight_configs (id, config_name, weight_severity, weight_urgency, weight_population, weight_location, weight_escalation, missing_data_penalty_max, is_current) VALUES
('e0000000-0000-0000-0000-000000000001', 'KMC Standard Municipal Model v1.0', 0.35, 0.25, 0.20, 0.10, 0.10, 20.0, TRUE)
ON CONFLICT (config_name) DO NOTHING;

INSERT INTO resources (id, department_id, resource_type, identifier_code, name, capacity_description, is_operational, daily_cost_rate, current_status) VALUES
('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'jetting_machine', 'KMC-JET-01', 'High-Pressure Sewer Jetting Machine #1', '4000L Suction & Pressure Vacuum', TRUE, 4500.00, 'available'),
('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'jetting_machine', 'KMC-JET-02', 'Compact Sewer Jetting Machine #2', '2000L Narrow Alley Vacuum', TRUE, 3500.00, 'available'),
('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'road_roller', 'KMC-ROLLER-01', 'Vibratory Asphalt Road Roller #1', '10 Ton Static & Vibratory Weight', TRUE, 6000.00, 'available'),
('f0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', 'tipper_truck', 'KMC-TIPPER-01', 'Solid Waste Hydraulic Tipper #1', '6 Ton Capacity Refuse Collector', TRUE, 2500.00, 'available'),
('f0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000004', 'hydraulic_bucket_truck', 'KMC-BUCKET-01', 'Insulated Telescopic Bucket Lift #1', '14m Working Height with Insulated Basket', TRUE, 4000.00, 'available')
ON CONFLICT DO NOTHING;
