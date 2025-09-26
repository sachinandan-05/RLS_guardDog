-- Create or replace the create_or_update_profile function
CREATE OR REPLACE FUNCTION public.create_or_update_profile(
  p_user_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_profile_exists BOOLEAN;
BEGIN
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_profile_exists;
  
  IF v_profile_exists THEN
    -- Update existing profile
    UPDATE public.profiles
    SET 
      email = p_email,
      name = p_name,
      role = p_role,
      updated_at = NOW()
    WHERE id = p_user_id
    RETURNING to_jsonb(public.profiles.*) INTO v_result;
  ELSE
    -- Insert new profile
    INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
    VALUES (
      p_user_id, 
      p_email, 
      p_name, 
      p_role, 
      NOW(), 
      NOW()
    )
    RETURNING to_jsonb(public.profiles.*) INTO v_result;
  END IF;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'detail', SQLSTATE,
    'context', 'Failed to create or update profile'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_or_update_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Create a policy to allow users to update their own profiles
CREATE POLICY "Allow users to update their own profiles"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Ensure the profiles table has the correct columns and constraints
DO $$
BEGIN
  -- Add email column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
  
  -- Add name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'name') THEN
    ALTER TABLE public.profiles ADD COLUMN name TEXT;
  END IF;
  
  -- Add role column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'student';
  END IF;
  
  -- Add created_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'created_at') THEN
    ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  -- Make email and name required if they're not already
  ALTER TABLE public.profiles 
    ALTER COLUMN email SET NOT NULL,
    ALTER COLUMN name SET NOT NULL,
    ALTER COLUMN role SET NOT NULL;
    
  -- Add a trigger to update the updated_at column
  CREATE OR REPLACE FUNCTION update_modified_column() 
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW; 
  END;
  $$ LANGUAGE plpgsql;
  
  DROP TRIGGER IF EXISTS update_profiles_modtime ON public.profiles;
  CREATE TRIGGER update_profiles_modtime
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating profiles table: %', SQLERRM;
END $$;
