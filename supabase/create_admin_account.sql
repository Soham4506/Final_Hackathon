-- ==============================================================================
-- KOPARNITI (CIVICPULSE) - SUPER ADMIN PROMOTION SCRIPT
-- Kopargaon Municipal Council (कोपरगाव नगरपरिषद)
-- Run this in Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Ensure email column exists on profiles table (optional convenience)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. Promote user to Admin by email via auth.users subquery
UPDATE public.profiles
SET 
  role = 'admin'::public.user_role,
  employee_id = 'KMC-ADMIN-01',
  is_verified = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'harshalsnerkar0946@gmail.com'
);

-- 3. Update auth metadata in auth.users so JWT / session has admin role
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  coalesce(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'harshalsnerkar0946@gmail.com';

-- 4. Verify the updated profile
SELECT p.id, p.full_name, p.role, p.employee_id, u.email 
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'harshalsnerkar0946@gmail.com';
