-- Production hardening: tighten RLS and Storage access
-- This migration intentionally only DROPs/CREATEs policies (no data changes).

-- ============================================================
-- 1) audit_log: prevent arbitrary inserts by any user
-- ============================================================

DROP POLICY IF EXISTS "System insert audit" ON public.audit_log;

-- Allow inserts only when the actor matches the current user.
-- Edge Functions using the service role bypass RLS and are unaffected.
CREATE POLICY "Authenticated insert own audit"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND performed_by = auth.uid()
);

-- ============================================================
-- 2) storage.objects: lock down client-photos SELECT to scoped viewers
-- ============================================================

-- Replace the overly broad policy that allowed any authenticated user to read all client photos.
DROP POLICY IF EXISTS "Authenticated view client photos" ON storage.objects;

-- Allow SELECT only if:
-- - admin/executive, OR
-- - the client themselves, OR
-- - the uploader, OR
-- - staff with loan scope (assigned LO / branch / region)
CREATE POLICY "Scoped view client photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (
    public.is_admin()
    OR public.is_executive()
    OR EXISTS (
      SELECT 1
      FROM public.client_photos cp
      WHERE cp.file_path = storage.objects.name
        AND (
          cp.client_user_id = auth.uid()
          OR cp.uploaded_by = auth.uid()
          OR (cp.loan_id IS NOT NULL AND public.is_loan_officer_for(cp.loan_id))
          OR (cp.loan_id IS NOT NULL AND public.is_branch_staff_for_loan(cp.loan_id))
          OR (cp.loan_id IS NOT NULL AND public.is_region_staff_for_loan(cp.loan_id))
        )
    )
  )
);

-- ============================================================
-- 3) storage.objects: restrict resume uploads to authenticated users only
-- ============================================================

DROP POLICY IF EXISTS "Anyone can upload resumes" ON storage.objects;

CREATE POLICY "Authenticated upload resumes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes'
);

-- Keep the existing resume read policy for admin/executive (created earlier):
-- "Admins can read resumes"

-- ============================================================
-- 4) job_applications: tighten INSERT shape (anti-abuse basics)
-- ============================================================

-- Preserve intent (any authenticated user can apply), but prevent setting privileged fields at creation.
DROP POLICY IF EXISTS "Anyone can apply" ON public.job_applications;

CREATE POLICY "Authenticated can apply (safe defaults)"
ON public.job_applications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND status = 'applied'
  AND reviewed_by IS NULL
  AND notes IS NULL
);

