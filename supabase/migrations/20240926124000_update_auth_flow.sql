-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create or replace the function with proper error handling
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
  -- Get user data from auth.users
  user_role := NEW.raw_user_meta_data->>'role';
  user_name := NEW.raw_user_meta_data->>'name';
  user_email := NEW.email;
  
  -- Set defaults if not provided
  IF user_role IS NULL OR user_role NOT IN ('student', 'teacher') THEN
    user_role := 'student';
  END IF;
  
  IF user_name IS NULL OR user_name = '' THEN
    user_name := split_part(user_email, '@', 1);
  END IF;

  -- Insert or update the profile
  INSERT INTO public.profiles (
    id, 
    role, 
    email, 
    name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    user_role::text,
    user_email,
    user_name,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating user profile: %', SQLERRM;
  RETURN NEW; -- Still return NEW to allow the auth user creation to complete
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create RLS policies
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- More permissive insert policy for the trigger function
CREATE POLICY "Enable insert for authenticated users only"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Update the profiles table structure if needed
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
