-- Fix profile creation during signup

-- 1. Drop the old insert policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- 2. Create a new insert policy that allows profile creation during signup
CREATE POLICY "Allow profile creation during signup"
ON public.profiles 
FOR INSERT 
WITH CHECK (
  -- Allow if the user is authenticated and the ID matches
  (auth.uid() = id)
  OR
  -- Or if the request is made with the service role key (bypasses RLS)
  (auth.role() = 'service_role')
);

-- 3. Ensure the profiles table has RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
