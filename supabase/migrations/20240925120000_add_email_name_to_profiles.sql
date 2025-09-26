-- Add email and name columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN email TEXT,
ADD COLUMN name TEXT;
