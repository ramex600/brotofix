-- Add approved field to user_roles table for admin approval
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;

-- Set existing admins as approved
UPDATE public.user_roles SET approved = true WHERE role = 'admin';

-- Create function to approve admin
CREATE OR REPLACE FUNCTION public.approve_admin(_admin_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow if caller is an approved admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND approved = true
  ) THEN
    RAISE EXCEPTION 'Only approved admins can approve other admins';
  END IF;

  -- Approve the admin
  UPDATE public.user_roles 
  SET approved = true 
  WHERE user_id = _admin_user_id 
  AND role = 'admin';
END;
$$;