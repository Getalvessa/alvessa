-- Add Founding Therapist Program fields to providers table
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS is_founding_therapist boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founding_joined_at timestamptz;
