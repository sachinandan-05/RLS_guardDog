-- Add user_name column to progress table
ALTER TABLE public.progress 
ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Create or replace the function to update user_name when a progress record is inserted or updated
CREATE OR REPLACE FUNCTION public.handle_new_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update user_name if it's not already set
  IF NEW.user_name IS NULL THEN
    SELECT name INTO NEW.user_name 
    FROM public.profiles 
    WHERE id = NEW.user_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to set user_name on insert/update
DROP TRIGGER IF EXISTS on_progress_created ON public.progress;
CREATE TRIGGER on_progress_created
  BEFORE INSERT OR UPDATE ON public.progress
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_progress();

-- Update existing records with user names from profiles
UPDATE public.progress p
SET user_name = (SELECT name FROM public.profiles WHERE id = p.user_id LIMIT 1)
WHERE user_name IS NULL;
