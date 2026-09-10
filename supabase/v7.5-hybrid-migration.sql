-- ETHAN AI v7.5 Hybrid entitlements hardening
-- Run once in Supabase SQL Editor.
alter table public.profiles alter column plan set default 'free';

-- Users may read their profile but must not be able to promote themselves.
drop policy if exists "profile_update_own" on public.profiles;
revoke update on table public.profiles from authenticated;

-- Usage is written by the server using the authenticated user's JWT.
-- Prevent clients from deleting or modifying usage history.
revoke update, delete on table public.usage_events from authenticated;

create index if not exists usage_events_user_event_created_idx
on public.usage_events(user_id,event_type,created_at desc);

create index if not exists profiles_plan_idx on public.profiles(plan);
