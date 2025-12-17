-- LockedIn Music - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the required tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Artists Table
CREATE TABLE IF NOT EXISTS artists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, user_id)
);

-- Albums Table
CREATE TABLE IF NOT EXISTS albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
    cover_url TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tracks Table
CREATE TABLE IF NOT EXISTS tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
    album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
    duration INTEGER, -- Duration in seconds
    file_url TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_artists_user_id ON artists(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_artist_id ON albums(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_user_id ON tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_tracks_album_id ON tracks(album_id);
CREATE INDEX IF NOT EXISTS idx_tracks_artist_id ON tracks(artist_id);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean setup)
DROP POLICY IF EXISTS "Users can view their own artists" ON artists;
DROP POLICY IF EXISTS "Users can insert their own artists" ON artists;
DROP POLICY IF EXISTS "Users can update their own artists" ON artists;
DROP POLICY IF EXISTS "Users can delete their own artists" ON artists;
DROP POLICY IF EXISTS "Users can view public artists" ON artists;

DROP POLICY IF EXISTS "Users can view their own albums" ON albums;
DROP POLICY IF EXISTS "Users can insert their own albums" ON albums;
DROP POLICY IF EXISTS "Users can update their own albums" ON albums;
DROP POLICY IF EXISTS "Users can delete their own albums" ON albums;
DROP POLICY IF EXISTS "Users can view public albums" ON albums;

DROP POLICY IF EXISTS "Users can view their own tracks" ON tracks;
DROP POLICY IF EXISTS "Users can insert their own tracks" ON tracks;
DROP POLICY IF EXISTS "Users can update their own tracks" ON tracks;
DROP POLICY IF EXISTS "Users can delete their own tracks" ON tracks;
DROP POLICY IF EXISTS "Users can view public tracks" ON tracks;

-- Artists Policies
CREATE POLICY "Users can view their own artists" ON artists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public artists" ON artists
    FOR SELECT USING (user_id IS NULL);

CREATE POLICY "Users can insert their own artists" ON artists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own artists" ON artists
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own artists" ON artists
    FOR DELETE USING (auth.uid() = user_id);

-- Albums Policies
CREATE POLICY "Users can view their own albums" ON albums
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public albums" ON albums
    FOR SELECT USING (user_id IS NULL);

CREATE POLICY "Users can insert their own albums" ON albums
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own albums" ON albums
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own albums" ON albums
    FOR DELETE USING (auth.uid() = user_id);

-- Tracks Policies
CREATE POLICY "Users can view their own tracks" ON tracks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public tracks" ON tracks
    FOR SELECT USING (user_id IS NULL);

CREATE POLICY "Users can insert their own tracks" ON tracks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracks" ON tracks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracks" ON tracks
    FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket policies (run these in Storage section)
-- Make sure you have a 'music' bucket created in Supabase Storage
-- Then add these policies:

-- Policy for authenticated users to upload to their own folder
-- INSERT policy: ((bucket_id = 'music'::text) AND (auth.role() = 'authenticated'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))

-- Policy for public read access
-- SELECT policy: (bucket_id = 'music'::text)

-- Alternative: If you want to update existing tables to add user_id column
-- ALTER TABLE artists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
-- ALTER TABLE albums ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
-- ALTER TABLE tracks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

