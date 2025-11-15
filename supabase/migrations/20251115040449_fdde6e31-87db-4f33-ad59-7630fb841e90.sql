-- Add email column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN email TEXT;

-- Update the trigger function to store email
CREATE OR REPLACE FUNCTION public.handle_new_student()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only create profile if user has student metadata
  IF new.raw_user_meta_data ? 'student_id' THEN
    -- Insert student profile with email
    INSERT INTO public.profiles (id, name, student_id, course, email)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'student_id',
      new.raw_user_meta_data->>'course',
      new.email
    );
    
    -- Assign student role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'student');
  END IF;
  
  RETURN new;
END;
$function$;