-- Quick Fix for RLS Policies
-- Run this in your Supabase SQL Editor

-- First, make sure user_id columns exist
ALTER TABLE artists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS (if not already enabled)
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies first
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('artists', 'albums', 'tracks')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Create simple, permissive policies for authenticated users

-- ARTISTS: Allow authenticated users full access to their own data
CREATE POLICY "artists_select" ON artists FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "artists_insert" ON artists FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "artists_update" ON artists FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "artists_delete" ON artists FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- ALBUMS: Allow authenticated users full access to their own data
CREATE POLICY "albums_select" ON albums FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "albums_insert" ON albums FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "albums_update" ON albums FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "albums_delete" ON albums FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- TRACKS: Allow authenticated users full access to their own data
CREATE POLICY "tracks_select" ON tracks FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "tracks_insert" ON tracks FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "tracks_update" ON tracks FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "tracks_delete" ON tracks FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT ALL ON artists TO authenticated;
GRANT ALL ON albums TO authenticated;
GRANT ALL ON tracks TO authenticated;

