-- This is a comprehensive migration that sets up the entire database schema
-- It's designed to be idempotent and handle all edge cases

-- First, drop any existing triggers and functions that might cause issues
DROP TRIGGER IF EXISTS update_classroom_updated_at ON public.classroom;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Create or replace the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create classroom table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.classroom (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create classroom_students table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.classroom_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID REFERENCES public.classroom(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(classroom_id, user_id)
);

-- Add any missing columns to classroom table
DO $$
BEGIN
    -- Add created_by if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'classroom' 
                  AND column_name = 'created_by') THEN
        ALTER TABLE public.classroom ADD COLUMN created_by UUID;
        -- Set a default value for existing rows
        UPDATE public.classroom SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;
        -- Add the NOT NULL constraint
        ALTER TABLE public.classroom ALTER COLUMN created_by SET NOT NULL;
        -- Add the foreign key constraint
        ALTER TABLE public.classroom ADD CONSTRAINT classroom_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add created_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'classroom' 
                  AND column_name = 'created_at') THEN
        ALTER TABLE public.classroom ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
    END IF;
    
    -- Add updated_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'classroom' 
                  AND column_name = 'updated_at') THEN
        ALTER TABLE public.classroom ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
    END IF;
END $$;

-- Create or replace the trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_classroom_updated_at') THEN
        CREATE TRIGGER update_classroom_updated_at
        BEFORE UPDATE ON public.classroom
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_classroom_created_by ON public.classroom(created_by);
CREATE INDEX IF NOT EXISTS idx_classroom_students_classroom_id ON public.classroom_students(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_students_user_id ON public.classroom_students(user_id);

-- Enable RLS on tables
ALTER TABLE public.classroom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can view all classrooms" ON public.classroom;
DROP POLICY IF EXISTS "Teachers can insert their own classrooms" ON public.classroom;
DROP POLICY IF EXISTS "Teachers can update their own classrooms" ON public.classroom;
DROP POLICY IF EXISTS "Teachers can view students in their classrooms" ON public.classroom_students;
DROP POLICY IF EXISTS "Teachers can add students to their classrooms" ON public.classroom_students;
DROP POLICY IF EXISTS "Teachers can remove students from their classrooms" ON public.classroom_students;

-- RLS Policies for classroom
CREATE POLICY "Teachers can view all classrooms" 
ON public.classroom FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Teachers can insert their own classrooms" 
ON public.classroom FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Teachers can update their own classrooms" 
ON public.classroom FOR UPDATE 
USING (auth.uid() = created_by);

-- RLS Policies for classroom_students
CREATE POLICY "Teachers can view students in their classrooms" 
ON public.classroom_students FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.classroom 
    WHERE id = classroom_students.classroom_id 
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Teachers can add students to their classrooms" 
ON public.classroom_students FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.classroom 
    WHERE id = classroom_students.classroom_id 
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Teachers can remove students from their classrooms" 
ON public.classroom_students FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.classroom 
    WHERE id = classroom_students.classroom_id 
    AND created_by = auth.uid()
  )
);

-- Force RLS on tables
ALTER TABLE public.classroom FORCE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_students FORCE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON public.classroom TO anon, authenticated, service_role;
GRANT ALL ON public.classroom_students TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
