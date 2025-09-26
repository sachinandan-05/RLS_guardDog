-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create progress table
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

-- Create classroom table
CREATE TABLE IF NOT EXISTS public.classroom (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on classroom
ALTER TABLE public.classroom ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is a teacher
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'teacher'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policies for profiles
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Recreate the policies
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

-- RLS Policies for progress
-- Drop existing policies first
DROP POLICY IF EXISTS "Students can view their own progress" ON public.progress;
DROP POLICY IF EXISTS "Teachers can view all progress" ON public.progress;
DROP POLICY IF EXISTS "Students can insert their own progress" ON public.progress;
DROP POLICY IF EXISTS "Teachers can insert progress for any student" ON public.progress;
DROP POLICY IF EXISTS "Students can update their own progress" ON public.progress;
DROP POLICY IF EXISTS "Teachers can update any progress" ON public.progress;

-- Students can view their own progress
CREATE POLICY "Students can view their own progress" 
ON public.progress FOR SELECT 
USING (auth.uid() = user_id);

-- Teachers can view all progress
CREATE POLICY "Teachers can view all progress" 
ON public.progress FOR SELECT 
USING (public.is_teacher());

-- Students can insert their own progress
CREATE POLICY "Students can insert their own progress" 
ON public.progress FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Teachers can insert progress for any student
CREATE POLICY "Teachers can insert progress for any student" 
ON public.progress FOR INSERT 
WITH CHECK (public.is_teacher());

-- Students can update their own progress
CREATE POLICY "Students can update their own progress" 
ON public.progress FOR UPDATE 
USING (auth.uid() = user_id);

-- Teachers can update any progress
CREATE POLICY "Teachers can update any progress" 
ON public.progress FOR UPDATE 
USING (public.is_teacher());

-- RLS Policies for classroom
-- Drop existing policies first
DROP POLICY IF EXISTS "Teachers can view all classroom data" ON public.classroom;
DROP POLICY IF EXISTS "Teachers can insert classroom data" ON public.classroom;
DROP POLICY IF EXISTS "Teachers can update classroom data" ON public.classroom;

-- Teachers can view all classroom data
CREATE POLICY "Teachers can view all classroom data" 
ON public.classroom FOR SELECT 
USING (public.is_teacher());

-- Teachers can insert classroom data
CREATE POLICY "Teachers can insert classroom data" 
ON public.classroom FOR INSERT 
WITH CHECK (public.is_teacher());

-- Teachers can update classroom data
CREATE POLICY "Teachers can update classroom data" 
ON public.classroom FOR UPDATE 
USING (public.is_teacher());

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update the created_at column
CREATE OR REPLACE FUNCTION update_created_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers first
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_progress_updated_at ON public.progress;
DROP TRIGGER IF EXISTS update_classroom_updated_at ON public.classroom;

-- Create triggers to update updated_at columns
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progress_updated_at
BEFORE UPDATE ON public.progress
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classroom_updated_at
BEFORE UPDATE ON public.classroom
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();