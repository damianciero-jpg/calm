-- Run this in Supabase Studio → SQL Editor
-- Adds game_mode column to children table for Kids/Teen mode routing

ALTER TABLE children
  ADD COLUMN IF NOT EXISTS game_mode text NOT NULL DEFAULT 'kids';

ALTER TABLE children
  DROP CONSTRAINT IF EXISTS children_game_mode_check;

ALTER TABLE children
  ADD CONSTRAINT children_game_mode_check
  CHECK (game_mode IN ('kids', 'teen'));
