-- This migration ensures the classroom_students table exists and has the correct permissions

-- 1. Create the classroom_students table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.classroom_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(classroom_id, user_id)
);

-- 2. Add foreign key constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'classroom_students' 
        AND constraint_name = 'classroom_students_classroom_id_fkey'
    ) THEN
        ALTER TABLE public.classroom_students 
        ADD CONSTRAINT classroom_students_classroom_id_fkey 
        FOREIGN KEY (classroom_id) 
        REFERENCES public.classroom(id) 
        ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'classroom_students' 
        AND constraint_name = 'classroom_students_user_id_fkey'
    ) THEN
        ALTER TABLE public.classroom_students 
        ADD CONSTRAINT classroom_students_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Create necessary indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_classroom_students_classroom_id'
    ) THEN
        CREATE INDEX idx_classroom_students_classroom_id ON public.classroom_students(classroom_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_classroom_students_user_id'
    ) THEN
        CREATE INDEX idx_classroom_students_user_id ON public.classroom_students(user_id);
    END IF;
END $$;

-- 4. Enable RLS on the table if not already enabled
ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;

-- 5. Create or replace RLS policies
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Teachers can view students in their classrooms" ON public.classroom_students;
    DROP POLICY IF EXISTS "Teachers can add students to their classrooms" ON public.classroom_students;
    DROP POLICY IF EXISTS "Teachers can remove students from their classrooms" ON public.classroom_students;
    
    -- Create new policies
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

-- 6. Grant necessary permissions
GRANT ALL ON public.classroom_students TO anon, authenticated, service_role;

-- 7. Force RLS on the table
ALTER TABLE public.classroom_students FORCE ROW LEVEL SECURITY;
