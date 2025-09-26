-- ========================================
-- Enhanced RLS Policies for Progress and Classroom Tables
-- ========================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own progress" ON public.progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.progress;

-- Drop teacher-specific policies if they exist
DROP POLICY IF EXISTS "Teachers can view all progress" ON public.progress;
DROP POLICY IF EXISTS "Teachers can insert progress for any student" ON public.progress;
DROP POLICY IF EXISTS "Teachers can update any progress" ON public.progress;

-- ========================================
-- Progress Table Policies
-- ========================================

-- Students can view their own progress
CREATE POLICY "Students can view their own progress" 
ON public.progress 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND 
  auth.uid() = user_id
);

-- Teachers can view all progress
CREATE POLICY "Teachers can view all progress" 
ON public.progress 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- Students can insert their own progress
CREATE POLICY "Students can insert their own progress" 
ON public.progress 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND 
  auth.uid() = user_id
);

-- Teachers can insert progress for any student
CREATE POLICY "Teachers can insert progress for any student" 
ON public.progress 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- Students can update their own progress
CREATE POLICY "Students can update their own progress" 
ON public.progress 
FOR UPDATE 
USING (
  auth.role() = 'authenticated' AND 
  auth.uid() = user_id
);

-- Teachers can update any progress
CREATE POLICY "Teachers can update any progress" 
ON public.progress 
FOR UPDATE 
USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- ========================================
-- Classroom Table Policies
-- ========================================

-- Teachers can view all classrooms
CREATE POLICY "Teachers can view all classrooms" 
ON public.classroom 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- Students can view their own classrooms
CREATE POLICY "Students can view their classrooms" 
ON public.classroom 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.classroom_students cs
    WHERE cs.classroom_id = classroom.id AND cs.user_id = auth.uid()
  )
);

-- Teachers can insert classrooms
CREATE POLICY "Teachers can insert classrooms" 
ON public.classroom 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- Teachers can update classrooms
CREATE POLICY "Teachers can update classrooms" 
ON public.classroom 
FOR UPDATE 
USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- ========================================
-- Classroom_Students Table Policies
-- ========================================

-- Teachers can view all classroom-student relationships
CREATE POLICY "Teachers can view all classroom students" 
ON public.classroom_students 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- Students can view their own classroom assignments
CREATE POLICY "Students can view their own classroom assignments" 
ON public.classroom_students 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND
  user_id = auth.uid()
);

-- Teachers can manage classroom-student relationships
CREATE POLICY "Teachers can manage classroom students" 
ON public.classroom_students 
FOR ALL 
USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'teacher'
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- ========================================
-- Create a function to check if a user is a teacher
-- ========================================
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'teacher'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;
