-- First, just add the new enum values
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ceo';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gm';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'regional_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'branch_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'loan_officer';