-- Fix the notify_admins_new_complaint trigger to handle NULL student names and only notify approved admins
CREATE OR REPLACE FUNCTION public.notify_admins_new_complaint()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  admin_record RECORD;
  student_name TEXT;
BEGIN
  -- Get student name
  SELECT name INTO student_name
  FROM public.profiles
  WHERE id = NEW.student_id;

  -- Use a default if student name is not found
  IF student_name IS NULL THEN
    student_name := 'A student';
  END IF;

  -- Create notification for all approved admins only
  FOR admin_record IN
    SELECT DISTINCT user_id
    FROM public.user_roles
    WHERE role = 'admin' 
    AND approved = true
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
$function$;