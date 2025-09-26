-- Create classroom table
CREATE TABLE IF NOT EXISTS public.classroom (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create classroom_students join table
CREATE TABLE IF NOT EXISTS public.classroom_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID REFERENCES public.classroom(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(classroom_id, user_id)
);

-- Enable RLS on classroom
ALTER TABLE public.classroom ENABLE ROW LEVEL SECURITY;

-- Enable RLS on classroom_students
ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_classroom_created_by ON public.classroom(created_by);
CREATE INDEX IF NOT EXISTS idx_classroom_students_classroom_id ON public.classroom_students(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_students_user_id ON public.classroom_students(user_id);

-- RLS Policies for classroom
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

-- RLS Policies for classroom_students
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

-- Allow service role to bypass RLS for classroom tables
ALTER TABLE public.classroom FORCE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_students FORCE ROW LEVEL SECURITY;

-- Create trigger for updated_at on classroom
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_classroom_updated_at
BEFORE UPDATE ON public.classroom
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for teachers to see their classrooms with student counts
CREATE OR REPLACE VIEW public.teacher_classrooms AS
SELECT 
  c.id,
  c.name,
  c.description,
  c.created_by,
  c.created_at,
  c.updated_at,
  COUNT(cs.user_id) as student_count
FROM 
  public.classroom c
LEFT JOIN 
  public.classroom_students cs ON c.id = cs.classroom_id
GROUP BY 
  c.id, c.name, c.description, c.created_by, c.created_at, c.updated_at;

-- Grant permissions on the view
GRANT SELECT ON public.teacher_classrooms TO authenticated;
