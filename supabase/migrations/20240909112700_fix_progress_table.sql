-- Drop existing policies and triggers if they exist
DROP POLICY IF EXISTS "Students can view their own progress" ON public.progress;
DROP POLICY IF EXISTS "Students can insert their own progress" ON public.progress;
DROP POLICY IF EXISTS "Students can update their own progress" ON public.progress;
DROP POLICY IF EXISTS "Teachers can view all progress" ON public.progress;
DROP POLICY IF EXISTS "Teachers can insert progress for any student" ON public.progress;
DROP POLICY IF EXISTS "Teachers can update any progress" ON public.progress;

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_progress_updated_at ON public.progress;

-- Recreate the progress table if it doesn't exist
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
-- Students can view their own progress
CREATE POLICY "Students can view their own progress" 
ON public.progress FOR SELECT 
USING (auth.uid() = user_id);

-- Students can insert their own progress
CREATE POLICY "Students can insert their own progress" 
ON public.progress FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Students can update their own progress
CREATE POLICY "Students can update their own progress" 
ON public.progress FOR UPDATE 
USING (auth.uid() = user_id);

-- Teachers can view all progress
CREATE POLICY "Teachers can view all progress" 
ON public.progress FOR SELECT 
USING (public.is_teacher());

-- Teachers can insert progress for any student
CREATE POLICY "Teachers can insert progress for any student" 
ON public.progress FOR INSERT 
WITH CHECK (public.is_teacher());

-- Teachers can update any progress
CREATE POLICY "Teachers can update any progress" 
ON public.progress FOR UPDATE 
USING (public.is_teacher());

-- Recreate the trigger for updated_at
CREATE TRIGGER update_progress_updated_at
BEFORE UPDATE ON public.progress
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add a policy to allow the service role to bypass RLS (for admin operations)
ALTER TABLE public.progress FORCE ROW LEVEL SECURITY;
CREATE POLICY "Service role can access all progress" 
ON public.progress 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);
