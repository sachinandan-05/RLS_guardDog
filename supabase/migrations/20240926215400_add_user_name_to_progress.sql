-- Add user_name column to progress table
ALTER TABLE public.progress 
ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Create or replace the function to update user_name when a progress record is inserted or updated
CREATE OR REPLACE FUNCTION public.update_progress_user_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user_name from profiles table
  SELECT name INTO NEW.user_name 
  FROM public.profiles 
  WHERE id = NEW.user_id
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to set user_name on insert/update
DROP TRIGGER IF EXISTS on_progress_created_updated ON public.progress;
CREATE TRIGGER on_progress_created_updated
  BEFORE INSERT OR UPDATE OF user_id ON public.progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_progress_user_name();

-- Update existing records with user names from profiles
UPDATE public.progress p
SET user_name = (SELECT name FROM public.profiles WHERE id = p.user_id LIMIT 1)
WHERE user_name IS NULL;
