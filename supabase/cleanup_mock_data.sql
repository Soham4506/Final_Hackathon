-- ==============================================================================
-- CIVICPULSE - CLEANUP MOCK / DEMO DATA SCRIPT
-- Run this in your Supabase SQL Editor to wipe all demo issues, plans, and logs
-- (Leaves all Kopargaon master tables like Wards, Departments & Categories intact!)
-- ==============================================================================

-- 1. Wipe all operational records with CASCADE
TRUNCATE TABLE 
    priority_scores,
    allocation_plan_items,
    allocation_plans,
    priority_decisions,
    notifications,
    audit_logs,
    issues,
    profiles
CASCADE;

-- 2. Reset all municipal machinery / fleet vehicles to 'available' and operational
UPDATE resources 
SET 
    current_status = 'available',
    is_operational = TRUE;

-- 3. Confirmation Notice
DO $$
BEGIN
    RAISE NOTICE 'All mock issues, allocation plans, audit logs, and demo profiles have been successfully purged! Master wards, departments, categories, and machinery remain intact.';
END $$;
