-- Phase 2: Multi-File Upload, Timeline, and Satisfaction Rating

-- 1. Update complaints table for multi-file support and satisfaction rating
ALTER TABLE public.complaints DROP COLUMN IF EXISTS file_path;
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS file_paths text[] DEFAULT '{}';
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS file_metadata jsonb[] DEFAULT '{}';
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS satisfaction_rating integer CHECK (satisfaction_rating BETWEEN 1 AND 5);
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS satisfaction_comment text;
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS rated_at timestamptz;

-- 2. Create complaint timeline table
CREATE TABLE IF NOT EXISTS public.complaint_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'submitted', 'viewed', 'status_changed', 'note_added', 'resolved', 'rated'
  actor_id uuid REFERENCES auth.users(id),
  actor_name text,
  actor_role text,
  old_value text,
  new_value text,
  comment text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on timeline
ALTER TABLE public.complaint_timeline ENABLE ROW LEVEL SECURITY;

-- Timeline policies
CREATE POLICY "Students can view their own complaint timeline"
  ON public.complaint_timeline FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints
      WHERE complaints.id = complaint_timeline.complaint_id
      AND complaints.student_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all timelines"
  ON public.complaint_timeline FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert timeline events"
  ON public.complaint_timeline FOR INSERT
  WITH CHECK (true); -- Allow system to create timeline entries

-- 3. Create trigger function to track complaint events
CREATE OR REPLACE FUNCTION public.track_complaint_timeline()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  actor_profile_name text;
  actor_profile_role text;
BEGIN
  -- Get actor details if available
  IF auth.uid() IS NOT NULL THEN
    SELECT name INTO actor_profile_name
    FROM public.profiles
    WHERE id = auth.uid();
    
    SELECT role INTO actor_profile_role
    FROM public.user_roles
    WHERE user_id = auth.uid()
    LIMIT 1;
  END IF;

  -- Handle INSERT (new complaint submitted)
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.complaint_timeline (
      complaint_id, 
      event_type, 
      actor_id, 
      actor_name, 
      actor_role
    )
    VALUES (
      NEW.id, 
      'submitted', 
      NEW.student_id, 
      actor_profile_name, 
      'student'
    );
    
  -- Handle UPDATE (status change, notes, rating)
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Status changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.complaint_timeline (
        complaint_id, 
        event_type, 
        actor_id, 
        actor_name, 
        actor_role, 
        old_value, 
        new_value
      )
      VALUES (
        NEW.id, 
        'status_changed', 
        auth.uid(), 
        actor_profile_name, 
        actor_profile_role, 
        OLD.status, 
        NEW.status
      );
    END IF;
    
    -- Admin notes added/updated
    IF OLD.admin_notes IS DISTINCT FROM NEW.admin_notes AND NEW.admin_notes IS NOT NULL THEN
      INSERT INTO public.complaint_timeline (
        complaint_id, 
        event_type, 
        actor_id, 
        actor_name, 
        actor_role, 
        comment
      )
      VALUES (
        NEW.id, 
        'note_added', 
        auth.uid(), 
        actor_profile_name, 
        actor_profile_role, 
        NEW.admin_notes
      );
    END IF;
    
    -- Satisfaction rating added
    IF OLD.satisfaction_rating IS DISTINCT FROM NEW.satisfaction_rating AND NEW.satisfaction_rating IS NOT NULL THEN
      INSERT INTO public.complaint_timeline (
        complaint_id, 
        event_type, 
        actor_id, 
        actor_name, 
        actor_role, 
        new_value, 
        comment
      )
      VALUES (
        NEW.id, 
        'rated', 
        NEW.student_id, 
        actor_profile_name, 
        'student', 
        NEW.satisfaction_rating::text, 
        NEW.satisfaction_comment
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to complaints table
DROP TRIGGER IF EXISTS track_complaint_changes ON public.complaints;
CREATE TRIGGER track_complaint_changes
  AFTER INSERT OR UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.track_complaint_timeline();

-- 4. Create admin satisfaction stats view
CREATE OR REPLACE VIEW public.admin_satisfaction_stats AS
SELECT 
  COUNT(*) FILTER (WHERE satisfaction_rating IS NOT NULL) as total_ratings,
  ROUND(AVG(satisfaction_rating)::numeric, 2) as avg_rating,
  COUNT(*) FILTER (WHERE satisfaction_rating >= 4) as positive_count,
  COUNT(*) FILTER (WHERE satisfaction_rating <= 2) as negative_count,
  COUNT(*) FILTER (WHERE satisfaction_rating = 5) as five_star_count,
  COUNT(*) FILTER (WHERE satisfaction_rating = 4) as four_star_count,
  COUNT(*) FILTER (WHERE satisfaction_rating = 3) as three_star_count,
  COUNT(*) FILTER (WHERE satisfaction_rating = 2) as two_star_count,
  COUNT(*) FILTER (WHERE satisfaction_rating = 1) as one_star_count
FROM public.complaints
WHERE satisfaction_rating IS NOT NULL;

-- Grant access to view
GRANT SELECT ON public.admin_satisfaction_stats TO authenticated;

-- Add comments
COMMENT ON COLUMN public.complaints.file_paths IS 'Array of file URLs in storage';
COMMENT ON COLUMN public.complaints.file_metadata IS 'Array of file metadata (name, size, type, uploaded_at)';
COMMENT ON COLUMN public.complaints.satisfaction_rating IS 'Student satisfaction rating (1-5 stars)';
COMMENT ON COLUMN public.complaints.satisfaction_comment IS 'Optional student feedback comment';
COMMENT ON TABLE public.complaint_timeline IS 'Tracks all events and changes for complaints';