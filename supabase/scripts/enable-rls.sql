-- ============================================================================
-- Script: Enable Row Level Security
-- ============================================================================
-- Purpose: Re-enables RLS enforcement on all tables. Use this to restore
--          security after development/testing session, or to verify that
--          your application works correctly with RLS enabled.
--
-- Usage:   psql -h localhost -p 54322 -U postgres -d postgres -f enable-rls.sql
--          or run directly in Supabase Studio SQL Editor
-- ============================================================================

alter table flashcards enable row level security;
alter table generation_sessions enable row level security;
alter table generation_error_logs enable row level security;

-- Verification: Show current RLS status for all tables
select
    schemaname,
    tablename,
    rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
order by tablename;
