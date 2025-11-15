-- Make student_id and course optional with defaults
ALTER TABLE public.profiles 
  ALTER COLUMN student_id SET DEFAULT 'STU-' || substr(gen_random_uuid()::text, 1, 8),
  ALTER COLUMN course SET DEFAULT 'General';

-- Update the handle_new_student trigger to use defaults if not provided
CREATE OR REPLACE FUNCTION public.handle_new_student()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create profile if user has student metadata or if it's a student signup
  IF new.raw_user_meta_data ? 'name' OR new.raw_user_meta_data ? 'is_student' THEN
    -- Insert student profile with email
    INSERT INTO public.profiles (id, name, student_id, course, email)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'name', 'Student'),
      COALESCE(new.raw_user_meta_data->>'student_id', 'STU-' || substr(gen_random_uuid()::text, 1, 8)),
      COALESCE(new.raw_user_meta_data->>'course', 'General'),
      new.email
    );
    
    -- Assign student role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'student');
  END IF;
  
  RETURN new;
END;
$function$;