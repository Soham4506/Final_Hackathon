-- ==============================================================================
-- KOPARNITI (CIVICPULSE) - SUPER ADMIN PROMOTION / CREATION SCRIPT
-- Kopargaon Municipal Council (कोपरगाव नगरपरिषद)
-- Run this in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 1. Promote an existing user by email to Super Admin (Chief Officer)
UPDATE public.profiles
SET 
  role = 'admin',
  designation = 'Chief Officer / Super Admin',
  employee_id = 'KMC-ADMIN-01',
  status = 'active',
  is_verified = true
WHERE email = 'admin@kopargaon.gov.in';

-- 2. Update user metadata in auth.users
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  coalesce(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'admin@kopargaon.gov.in';

-- 3. Verify the promoted admin record
SELECT id, full_name, email, role, designation, employee_id, status 
FROM public.profiles 
WHERE role = 'admin';
