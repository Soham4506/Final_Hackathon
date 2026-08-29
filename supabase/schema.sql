-- ==============================================================================
-- CIVICPULSE - KOPARGAON MUNICIPAL COUNCIL (कोपरगाव नगरपरिषद)
-- Complete Database Schema for Supabase PostgreSQL
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('citizen', 'officer', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE issue_status AS ENUM (
        'submitted', 'triaged', 'prioritized', 'scheduled', 
        'in_progress', 'resolved', 'rejected', 'escalated'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE urgency_level AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE resource_type AS ENUM (
        'staff_crew', 'jetting_machine', 'tipper_truck', 'road_roller',
        'hydraulic_bucket_truck', 'water_tanker', 'fogging_machine', 'budget_funds'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE plan_status AS ENUM ('draft', 'recommended', 'approved', 'executed', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE plan_item_status AS ENUM ('approved', 'deferred', 'overridden', 'emergency_injected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE notification_channel AS ENUM ('app', 'sms', 'email');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. ZONES (Kopargaon Wards 1 to 8)
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

-- 2. DEPARTMENTS
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

-- 3. PROFILES
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
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3b. AUTO-CREATE PROFILE ON SIGNUP (Trigger on auth.users)
-- Ensures a profiles row always exists when a user registers via Supabase Auth.
-- Defaults role to 'citizen' (lowest privilege) — only admins can promote via UPDATE.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, role, full_name, phone, is_verified)
    VALUES (
        NEW.id,
        'citizen'::user_role,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        FALSE
    )
    ON CONFLICT (id) DO NOTHING;  -- Safety: skip if profile already exists
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger to avoid duplicates
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. ISSUE CATEGORIES
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

-- 5. PRIORITY WEIGHT CONFIGS
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

-- 6. ISSUES
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

-- 7. PRIORITY SCORES
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

-- 8. RESOURCES
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

-- 9. ALLOCATION PLANS
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

-- 10. ALLOCATION PLAN ITEMS
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

-- 11. PRIORITY DECISIONS
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

-- 12. NOTIFICATIONS
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

-- 13. AUDIT LOGS
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

-- Row Level Security (RLS)
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
