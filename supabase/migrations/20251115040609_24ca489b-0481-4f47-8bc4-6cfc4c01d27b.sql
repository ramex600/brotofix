-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  related_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to notify admins of new complaints
CREATE OR REPLACE FUNCTION public.notify_admins_new_complaint()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  student_name TEXT;
BEGIN
  -- Get student name
  SELECT name INTO student_name
  FROM public.profiles
  WHERE id = NEW.student_id;

  -- Create notification for all admins
  FOR admin_record IN
    SELECT DISTINCT user_id
    FROM public.user_roles
    WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      admin_record.user_id,
      'New Complaint Submitted',
      student_name || ' submitted a new ' || NEW.category || ' complaint',
      'new_complaint',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Function to notify student of status updates
CREATE OR REPLACE FUNCTION public.notify_student_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify if status changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.student_id,
      'Complaint Status Updated',
      'Your ' || NEW.category || ' complaint status changed to: ' || NEW.status,
      'complaint_status_update',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Triggers
CREATE TRIGGER notify_admins_on_new_complaint
AFTER INSERT ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_new_complaint();

CREATE TRIGGER notify_student_on_status_update
AFTER UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.notify_student_status_update();