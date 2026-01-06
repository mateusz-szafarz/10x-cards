-- ============================================================================
-- Script: Disable Row Level Security (Development Only)
-- ============================================================================
-- Purpose: Temporarily disables RLS enforcement on all tables for local
--          development and testing. Policies remain intact and can be
--          re-enabled at any time.
--
-- Usage:   psql -h localhost -p 54322 -U postgres -d postgres -f disable-rls.sql
--          or run directly in Supabase Studio SQL Editor
--
-- WARNING: Never run this script on production database!
-- ============================================================================

alter table flashcards disable row level security;
alter table generation_sessions disable row level security;
alter table generation_error_logs disable row level security;

-- Verification: Show current RLS status for all tables
select
    schemaname,
    tablename,
    rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
order by tablename;
