-- Drop the old insert policy first
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create a more permissive insert policy for profiles
CREATE POLICY "Users can insert their own profile"
ON public.profiles 
FOR INSERT
WITH CHECK (
  -- Allow insert during signup (when user matches)
  auth.uid() = id
  OR 
  -- Allow insert from authenticated endpoint
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.uid() IS NOT NULL 
    AND id = auth.uid()
  )
);