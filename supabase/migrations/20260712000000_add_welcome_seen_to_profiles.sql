alter table public.profiles
add column if not exists welcome_seen_at timestamptz;

-- Profiles that predate this feature belong to users who have already passed
-- through the welcome screen. New profiles keep the column null until the user
-- completes it for the first time.
update public.profiles
set welcome_seen_at = now()
where welcome_seen_at is null;
