-- Migration: allow up to 20 riddle slots per player (was limited to 5).
-- Run this ONLY if you already executed 0001_init.sql with the old constraint.
-- If starting fresh, 0001_init.sql already has the updated constraint.

ALTER TABLE public.stages DROP CONSTRAINT IF EXISTS stages_order_index_check;
ALTER TABLE public.stages ADD CONSTRAINT stages_order_index_check CHECK (order_index between 1 and 20);
