-- This migration ensures the classroom_students table and its dependencies are properly set up

-- 1. Create the classroom table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.classroom (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Add any missing columns to the classroom table
DO $$
BEGIN
    -- Add created_by if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'classroom' 
                  AND column_name = 'created_by') THEN
        ALTER TABLE public.classroom ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        -- Set a default value for existing rows
        UPDATE public.classroom SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;
        -- Add the NOT NULL constraint
        ALTER TABLE public.classroom ALTER COLUMN created_by SET NOT NULL;
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

-- 3. Create or replace the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the classroom_students table
CREATE TABLE IF NOT EXISTS public.classroom_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID REFERENCES public.classroom(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(classroom_id, user_id)
);

-- 5. Create necessary indexes
CREATE INDEX IF NOT EXISTS idx_classroom_created_by ON public.classroom(created_by);
CREATE INDEX IF NOT EXISTS idx_classroom_students_classroom_id ON public.classroom_students(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_students_user_id ON public.classroom_students(user_id);

-- 6. Enable RLS on tables
ALTER TABLE public.classroom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing policies if they exist
DO $$
BEGIN
    DROP POLICY IF EXISTS "Teachers can view all classrooms" ON public.classroom;
    DROP POLICY IF EXISTS "Teachers can insert their own classrooms" ON public.classroom;
    DROP POLICY IF EXISTS "Teachers can update their own classrooms" ON public.classroom;
    DROP POLICY IF EXISTS "Teachers can view students in their classrooms" ON public.classroom_students;
    DROP POLICY IF EXISTS "Teachers can add students to their classrooms" ON public.classroom_students;
    DROP POLICY IF EXISTS "Teachers can remove students from their classrooms" ON public.classroom_students;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping policies: %', SQLERRM;
END $$;

-- 8. Create RLS policies for classroom
DO $$
BEGIN
    -- Teachers can view all classrooms
    CREATE POLICY "Teachers can view all classrooms" 
    ON public.classroom FOR SELECT 
    USING (auth.uid() = created_by);
    
    -- Teachers can insert their own classrooms
    CREATE POLICY "Teachers can insert their own classrooms" 
    ON public.classroom FOR INSERT 
    WITH CHECK (auth.uid() = created_by);
    
    -- Teachers can update their own classrooms
    CREATE POLICY "Teachers can update their own classrooms" 
    ON public.classroom FOR UPDATE 
    USING (auth.uid() = created_by);
    
    -- Teachers can view students in their classrooms
    CREATE POLICY "Teachers can view students in their classrooms" 
    ON public.classroom_students FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM public.classroom 
        WHERE id = classroom_students.classroom_id 
        AND created_by = auth.uid()
      )
    );
    
    -- Teachers can add students to their classrooms
    CREATE POLICY "Teachers can add students to their classrooms" 
    ON public.classroom_students FOR INSERT 
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.classroom 
        WHERE id = classroom_students.classroom_id 
        AND created_by = auth.uid()
      )
    );
    
    -- Teachers can remove students from their classrooms
    CREATE POLICY "Teachers can remove students from their classrooms" 
    ON public.classroom_students FOR DELETE 
    USING (
      EXISTS (
        SELECT 1 FROM public.classroom 
        WHERE id = classroom_students.classroom_id 
        AND created_by = auth.uid()
      )
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating policies: %', SQLERRM;
END $$;

-- 9. Create or replace the trigger for updated_at
DO $$
BEGIN
    DROP TRIGGER IF EXISTS update_classroom_updated_at ON public.classroom;
    
    CREATE TRIGGER update_classroom_updated_at
    BEFORE UPDATE ON public.classroom
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating trigger: %', SQLERRM;
END $$;

-- 10. Grant necessary permissions
GRANT ALL ON public.classroom TO anon, authenticated, service_role;
GRANT ALL ON public.classroom_students TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 11. Force RLS on tables
ALTER TABLE public.classroom FORCE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_students FORCE ROW LEVEL SECURITY;
