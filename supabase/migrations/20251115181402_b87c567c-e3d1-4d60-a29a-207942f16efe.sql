-- Update handle_new_student to always populate name from auth user
CREATE OR REPLACE FUNCTION public.handle_new_student()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create profile if user has student metadata or if it's a student signup
  IF new.raw_user_meta_data ? 'name' OR new.raw_user_meta_data ? 'is_student' THEN
    -- Insert student profile with email and name from auth
    INSERT INTO public.profiles (id, name, student_id, course, email)
    VALUES (
      new.id,
      -- Always use the name from metadata, fallback to email prefix
      COALESCE(
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
      ),
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