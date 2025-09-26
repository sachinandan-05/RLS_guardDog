-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the function with role from user_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  user_role text;
  user_name text;
  user_email text;
BEGIN
  -- Get role and name from user_metadata or use defaults
  user_role := NEW.raw_user_meta_data->>'role';
  user_name := NEW.raw_user_meta_data->>'name';
  user_email := NEW.email;
  
  -- Set defaults if not provided
  IF user_role IS NULL OR user_role NOT IN ('student', 'teacher') THEN
    user_role := 'student';
  END IF;
  
  IF user_name IS NULL THEN
    user_name := split_part(user_email, '@', 1);
  END IF;

  -- Insert the new profile with the role and name
  INSERT INTO public.profiles (id, role, email, name)
  VALUES (
    NEW.id, 
    user_role,
    user_email,
    user_name
  )
  ON CONFLICT (id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO public;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;
GRANT ALL ON FUNCTION public.handle_new_user() TO postgres;
