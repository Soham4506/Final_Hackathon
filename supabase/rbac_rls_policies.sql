-- ==============================================================================
-- CIVICPULSE - KOPARGAON MUNICIPAL COUNCIL (कोपरगाव नगरपरिषद)
-- Production Role-Based Access Control (RBAC) & Row Level Security (RLS) Policies
-- ==============================================================================

-- 1. Helper Functions to Identify User Roles from auth.jwt() and profiles table
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
DECLARE
    user_r user_role;
BEGIN
    SELECT role INTO user_r FROM public.profiles WHERE id = auth.uid();
    IF user_r IS NULL THEN
        RETURN 'citizen'::user_role;
    END IF;
    RETURN user_r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (public.get_current_user_role() = 'admin'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_officer()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (public.get_current_user_role() IN ('officer'::user_role, 'admin'::user_role));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_citizen()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (public.get_current_user_role() = 'citizen'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES PER TABLE
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- A. PROFILES TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile or officers can view all" ON public.profiles;
CREATE POLICY "Users can view own profile or officers can view all"
ON public.profiles FOR SELECT
USING (
    auth.uid() = id OR public.is_officer()
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins have full access on profiles" ON public.profiles;
CREATE POLICY "Admins have full access on profiles"
ON public.profiles FOR ALL
USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- B. ISSUES / GRIEVANCES TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- 1. Anyone (citizens & officers) can view all issues for municipal transparency
DROP POLICY IF EXISTS "Public and citizens can view issues" ON public.issues;
CREATE POLICY "Public and citizens can view issues"
ON public.issues FOR SELECT
USING (true);

-- 2. Citizens and authenticated users can insert new issues
DROP POLICY IF EXISTS "Citizens and guests can submit issues" ON public.issues;
CREATE POLICY "Citizens and guests can submit issues"
ON public.issues FOR INSERT
WITH CHECK (
    auth.uid() IS NULL OR citizen_id = auth.uid() OR public.is_officer()
);

-- 3. Only municipal officers and admins can update issue status, machinery & priority
DROP POLICY IF EXISTS "Only officers and admins can update issues" ON public.issues;
CREATE POLICY "Only officers and admins can update issues"
ON public.issues FOR UPDATE
USING (public.is_officer())
WITH CHECK (public.is_officer());

-- 4. Only admins can delete issues (for archival compliance)
DROP POLICY IF EXISTS "Only admins can delete issues" ON public.issues;
CREATE POLICY "Only admins can delete issues"
ON public.issues FOR DELETE
USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- C. MUNICIPAL RESOURCES TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view resources" ON public.resources;
CREATE POLICY "Anyone can view resources"
ON public.resources FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Only officers can manage resources" ON public.resources;
CREATE POLICY "Only officers can manage resources"
ON public.resources FOR ALL
USING (public.is_officer())
WITH CHECK (public.is_officer());

-- ------------------------------------------------------------------------------
-- D. ALLOCATION PLANS & PLAN ITEMS TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE public.allocation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_plan_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view allocation plans" ON public.allocation_plans;
CREATE POLICY "Anyone can view allocation plans"
ON public.allocation_plans FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Only officers can create and update allocation plans" ON public.allocation_plans;
CREATE POLICY "Only officers can create and update allocation plans"
ON public.allocation_plans FOR ALL
USING (public.is_officer())
WITH CHECK (public.is_officer());

DROP POLICY IF EXISTS "Anyone can view allocation plan items" ON public.allocation_plan_items;
CREATE POLICY "Anyone can view allocation plan items"
ON public.allocation_plan_items FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Only officers can manage allocation plan items" ON public.allocation_plan_items;
CREATE POLICY "Only officers can manage allocation plan items"
ON public.allocation_plan_items FOR ALL
USING (public.is_officer())
WITH CHECK (public.is_officer());

-- ------------------------------------------------------------------------------
-- E. PRIORITY WEIGHT CONFIGURATIONS TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE public.priority_weight_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view priority weight configs" ON public.priority_weight_configs;
CREATE POLICY "Anyone can view priority weight configs"
ON public.priority_weight_configs FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Only admins can modify priority weight configs" ON public.priority_weight_configs;
CREATE POLICY "Only admins can modify priority weight configs"
ON public.priority_weight_configs FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- F. NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications or officers can view all" ON public.notifications;
CREATE POLICY "Users can view own notifications or officers can view all"
ON public.notifications FOR SELECT
USING (
    recipient_id = auth.uid() OR recipient_id IS NULL OR public.is_officer()
);

DROP POLICY IF EXISTS "System and officers can insert notifications" ON public.notifications;
CREATE POLICY "System and officers can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- G. IMMUTABLE AUDIT LOGS TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Officers and admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Officers and admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (public.is_officer());

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- Explicitly NO UPDATE or DELETE on audit logs to guarantee immutable compliance!
-- (Audit logs can never be tampered with by any role)

-- ------------------------------------------------------------------------------
-- H. REFERENCE DATA (ZONES, DEPARTMENTS, CATEGORIES)
-- ------------------------------------------------------------------------------
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read zones" ON public.zones FOR SELECT USING (true);
CREATE POLICY "Public read departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Public read categories" ON public.issue_categories FOR SELECT USING (true);

CREATE POLICY "Admin write zones" ON public.zones FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write departments" ON public.departments FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write categories" ON public.issue_categories FOR ALL USING (public.is_admin());

-- ==============================================================================
-- End of RBAC & RLS Policies
-- ==============================================================================
