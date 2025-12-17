-- Fix missing columns in your existing tables
-- Run this in Supabase SQL Editor

-- Add cover_url to albums if it doesn't exist
ALTER TABLE albums ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Add user_id columns if they don't exist
ALTER TABLE artists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Verify the columns exist now
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('artists', 'albums', 'tracks')
ORDER BY table_name, column_name;

