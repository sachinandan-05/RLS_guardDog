-- Create a function to safely create a profile with RLS bypass
CREATE OR REPLACE FUNCTION public.create_profile(
  p_user_id uuid,
  p_email text,
  p_name text,
  p_role text
) 
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  -- Insert or update the profile
  INSERT INTO public.profiles (
    id, 
    email, 
    name, 
    role, 
    created_at, 
    updated_at
  ) VALUES (
    p_user_id, 
    p_email, 
    p_name, 
    p_role::text,
    NOW(), 
    NOW()
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW()
  RETURNING to_json(profiles.*) INTO v_result;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_profile(uuid, text, text, text) TO authenticated;
