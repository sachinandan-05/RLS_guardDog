-- ========================================
-- 1. Setup profiles table and policies
-- ========================================

-- Drop existing policies and triggers if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- RLS Policies for profiles
-- Users can view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 2. Setup progress table and policies
-- ========================================

-- Drop existing policies and triggers if they exist
DROP POLICY IF EXISTS "Users can view their own progress" ON public.progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.progress;
DROP TRIGGER IF EXISTS update_progress_updated_at ON public.progress;

-- Create progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  percentage INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on progress
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON public.progress(user_id);

-- RLS Policies for progress
-- Users can view their own progress
CREATE POLICY "Users can view their own progress" 
ON public.progress FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert their own progress" 
ON public.progress FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update their own progress" 
ON public.progress FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_progress_updated_at
BEFORE UPDATE ON public.progress
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 3. Add service role policies for admin access
-- ========================================

-- Allow service role to bypass RLS for profiles
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Drop service role policy if exists
DROP POLICY IF EXISTS "Service role can access all profiles" ON public.profiles;

CREATE POLICY "Service role can access all profiles" 
ON public.profiles 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Allow service role to bypass RLS for progress
ALTER TABLE public.progress FORCE ROW LEVEL SECURITY;

-- Drop service role policy if exists
DROP POLICY IF EXISTS "Service role can access all progress" ON public.progress;

CREATE POLICY "Service role can access all progress" 
ON public.progress 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- ========================================
-- 4. Create helper function for user role check
-- ========================================

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'teacher'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ========================================
-- 5. Create trigger for new user profile creation
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
