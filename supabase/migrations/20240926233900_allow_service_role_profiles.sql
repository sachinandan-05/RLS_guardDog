-- Allow service role to manage profiles (bypass RLS)
CREATE POLICY "Allow service role full access to profiles"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to update their own profile
CREATE POLICY "Allow users to update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Ensure the profiles table has the correct columns
ALTER TABLE public.profiles 
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN name SET NOT NULL;
