-- Fix RLS policies for profiles table

-- 1. Drop old policies if they exist
DROP POLICY IF EXISTS "Teachers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- 2. Safe SELECT policy for teachers and users
CREATE POLICY "Teachers can view all profiles"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id OR public.is_teacher()
);

-- 3. Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- 4. Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
