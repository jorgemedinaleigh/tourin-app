alter table public.site_visits
add column if not exists points_awarded integer not null default 0,
add column if not exists activity_timezone text not null default 'UTC',
add column if not exists activity_local_date date;

update public.site_visits sv
set points_awarded = coalesce(hs.score::numeric, 0)::integer
from public.heritage_sites hs
where hs.id = sv.site_id
  and sv.points_awarded = 0;

update public.site_visits
set activity_local_date = (coalesce(created_at, now()) at time zone 'UTC')::date
where activity_local_date is null;

alter table public.site_visits
alter column activity_local_date set not null;

create index if not exists site_visits_user_activity_date_idx
on public.site_visits (user_id, activity_local_date desc);

alter table public.user_achievements
add column if not exists activity_timezone text not null default 'UTC',
add column if not exists activity_local_date date;

update public.user_achievements
set activity_local_date = (coalesce(unlocked_at, now()) at time zone 'UTC')::date
where activity_local_date is null;

alter table public.user_achievements
alter column activity_local_date set not null;

create index if not exists user_achievements_user_unlocked_at_idx
on public.user_achievements (user_id, unlocked_at desc);

create index if not exists user_achievements_user_activity_date_idx
on public.user_achievements (user_id, activity_local_date desc);

create or replace function public.normalize_activity_timezone(requested_timezone text)
returns text
language sql
stable
set search_path = public, pg_catalog
as $$
  select coalesce(
    (
      select name
      from pg_timezone_names
      where name = nullif(btrim(requested_timezone), '')
      limit 1
    ),
    'UTC'
  );
$$;

create or replace function public.prepare_site_visit_recap_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  site_score integer := 0;
begin
  new.activity_timezone := public.normalize_activity_timezone(new.activity_timezone);
  new.activity_local_date := (
    coalesce(new.created_at, now()) at time zone new.activity_timezone
  )::date;

  select coalesce(hs.score::numeric, 0)::integer
  into site_score
  from public.heritage_sites hs
  where hs.id = new.site_id;

  new.points_awarded := coalesce(site_score, 0);
  return new;
end;
$$;

drop trigger if exists prepare_site_visit_recap_fields on public.site_visits;

create trigger prepare_site_visit_recap_fields
before insert or update of site_id, created_at, activity_timezone
on public.site_visits
for each row execute function public.prepare_site_visit_recap_fields();

create or replace function public.prepare_user_achievement_recap_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  new.activity_timezone := public.normalize_activity_timezone(new.activity_timezone);
  new.activity_local_date := (
    coalesce(new.unlocked_at, now()) at time zone new.activity_timezone
  )::date;
  return new;
end;
$$;

drop trigger if exists prepare_user_achievement_recap_fields on public.user_achievements;

create trigger prepare_user_achievement_recap_fields
before insert or update of unlocked_at, activity_timezone
on public.user_achievements
for each row execute function public.prepare_user_achievement_recap_fields();

create table if not exists public.user_route_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_id text not null,
  completed_at timestamptz not null default now(),
  activity_timezone text not null default 'UTC',
  activity_local_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, route_id)
);

create index if not exists user_route_completions_user_activity_date_idx
on public.user_route_completions (user_id, activity_local_date desc);

alter table public.user_route_completions enable row level security;

create policy "Users can read own route completions"
on public.user_route_completions
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.record_route_completion_after_visit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  target_route_id text;
  route_site_count integer := 0;
  visited_route_site_count integer := 0;
begin
  select hs.route_id::text
  into target_route_id
  from public.heritage_sites hs
  where hs.id = new.site_id
    and coalesce(hs.is_published, true)
    and hs.route_id is not null;

  if target_route_id is null or btrim(target_route_id) = '' then
    return new;
  end if;

  select count(*)
  into route_site_count
  from public.heritage_sites hs
  where hs.route_id::text = target_route_id
    and coalesce(hs.is_published, true);

  select count(distinct sv.site_id)
  into visited_route_site_count
  from public.site_visits sv
  join public.heritage_sites hs on hs.id = sv.site_id
  where sv.user_id::text = new.user_id::text
    and hs.route_id::text = target_route_id
    and coalesce(hs.is_published, true);

  if route_site_count > 0 and visited_route_site_count >= route_site_count then
    insert into public.user_route_completions (
      user_id,
      route_id,
      completed_at,
      activity_timezone,
      activity_local_date
    )
    values (
      new.user_id::text::uuid,
      target_route_id,
      coalesce(new.created_at, now()),
      public.normalize_activity_timezone(new.activity_timezone),
      new.activity_local_date
    )
    on conflict (user_id, route_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists record_route_completion_after_visit on public.site_visits;

create trigger record_route_completion_after_visit
after insert on public.site_visits
for each row execute function public.record_route_completion_after_visit();

insert into public.user_route_completions (
  user_id,
  route_id,
  completed_at,
  activity_timezone,
  activity_local_date
)
select
  completed.user_id,
  completed.route_id,
  completed.completed_at,
  'UTC',
  (completed.completed_at at time zone 'UTC')::date
from (
  select
    sv.user_id::text::uuid as user_id,
    hs.route_id::text as route_id,
    max(sv.created_at) as completed_at,
    count(distinct sv.site_id) as visited_site_count
  from public.site_visits sv
  join public.heritage_sites hs on hs.id = sv.site_id
  where hs.route_id is not null
    and coalesce(hs.is_published, true)
  group by sv.user_id::text::uuid, hs.route_id::text
) completed
where completed.visited_site_count >= (
  select count(*)
  from public.heritage_sites route_site
  where route_site.route_id::text = completed.route_id
    and coalesce(route_site.is_published, true)
)
on conflict (user_id, route_id) do nothing;

create table if not exists public.user_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_type text not null check (period_type in ('active_day', 'weekly')),
  starts_on date not null,
  ends_on date not null,
  timezone text not null default 'UTC',
  status text not null default 'draft' check (status in ('draft', 'final')),
  payload jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  viewed_at timestamptz,
  shared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_type, starts_on)
);

create index if not exists user_summaries_user_period_idx
on public.user_summaries (user_id, starts_on desc);

alter table public.user_summaries enable row level security;

create policy "Users can read own summaries"
on public.user_summaries
for select
to authenticated
using (auth.uid() = user_id);

create table if not exists public.summary_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_day_enabled boolean not null default true,
  weekly_enabled boolean not null default true,
  active_day_time time not null default '09:00',
  weekly_time time not null default '10:00',
  timezone text not null default 'UTC',
  share_location boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.summary_notification_preferences enable row level security;

create policy "Users can read own summary preferences"
on public.summary_notification_preferences
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own summary preferences"
on public.summary_notification_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own summary preferences"
on public.summary_notification_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.sync_summary_timezone_after_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  update public.summary_notification_preferences
  set
    timezone = public.normalize_activity_timezone(new.activity_timezone),
    updated_at = now()
  where user_id::text = new.user_id::text;

  return new;
end;
$$;

drop trigger if exists sync_summary_timezone_after_site_visit on public.site_visits;
create trigger sync_summary_timezone_after_site_visit
after insert or update of activity_timezone on public.site_visits
for each row execute function public.sync_summary_timezone_after_activity();

drop trigger if exists sync_summary_timezone_after_achievement on public.user_achievements;
create trigger sync_summary_timezone_after_achievement
after insert or update of activity_timezone on public.user_achievements
for each row execute function public.sync_summary_timezone_after_activity();

create or replace function public.generate_user_summary(
  target_user_id uuid,
  target_period_type text,
  target_starts_on date,
  requested_timezone text default 'UTC'
)
returns public.user_summaries
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  summary_timezone text := public.normalize_activity_timezone(requested_timezone);
  target_ends_on date;
  previous_starts_on date;
  previous_ends_on date;
  current_local_date date;
  sites_stamped integer := 0;
  points_earned integer := 0;
  active_days integer := 0;
  achievements_unlocked integer := 0;
  routes_completed integer := 0;
  previous_sites_stamped integer := 0;
  free_places_visited integer := 0;
  personal_best_places integer := 0;
  active_week_streak integer := 0;
  streak_week date;
  top_category text;
  top_region text;
  best_day date;
  explorer_title_key text := 'explorer';
  site_ids jsonb := '[]'::jsonb;
  featured_site_ids jsonb := '[]'::jsonb;
  achievement_ids jsonb := '[]'::jsonb;
  route_ids jsonb := '[]'::jsonb;
  next_status text;
  next_payload jsonb;
  summary_row public.user_summaries%rowtype;
begin
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  if target_period_type not in ('active_day', 'weekly') then
    raise exception 'Unsupported summary period type';
  end if;

  if target_starts_on is null then
    raise exception 'target_starts_on is required';
  end if;

  target_ends_on := target_starts_on + case when target_period_type = 'weekly' then 7 else 1 end;
  previous_starts_on := target_starts_on - (target_ends_on - target_starts_on);
  previous_ends_on := target_starts_on;
  current_local_date := (now() at time zone summary_timezone)::date;

  select
    count(*)::integer,
    coalesce(sum(sv.points_awarded), 0)::integer
  into sites_stamped, points_earned
  from public.site_visits sv
  where sv.user_id::text = target_user_id::text
    and sv.activity_local_date >= target_starts_on
    and sv.activity_local_date < target_ends_on;

  select count(*)::integer
  into achievements_unlocked
  from public.user_achievements ua
  where ua.user_id::text = target_user_id::text
    and ua.activity_local_date >= target_starts_on
    and ua.activity_local_date < target_ends_on;

  select count(*)::integer
  into routes_completed
  from public.user_route_completions urc
  where urc.user_id = target_user_id
    and urc.activity_local_date >= target_starts_on
    and urc.activity_local_date < target_ends_on;

  select count(distinct activity_date)::integer
  into active_days
  from (
    select sv.activity_local_date as activity_date
    from public.site_visits sv
    where sv.user_id::text = target_user_id::text
      and sv.activity_local_date >= target_starts_on
      and sv.activity_local_date < target_ends_on
    union
    select ua.activity_local_date
    from public.user_achievements ua
    where ua.user_id::text = target_user_id::text
      and ua.activity_local_date >= target_starts_on
      and ua.activity_local_date < target_ends_on
    union
    select urc.activity_local_date
    from public.user_route_completions urc
    where urc.user_id = target_user_id
      and urc.activity_local_date >= target_starts_on
      and urc.activity_local_date < target_ends_on
  ) qualifying_activity;

  if sites_stamped + achievements_unlocked + routes_completed = 0 then
    return null;
  end if;

  select count(*)::integer
  into previous_sites_stamped
  from public.site_visits sv
  where sv.user_id::text = target_user_id::text
    and sv.activity_local_date >= previous_starts_on
    and sv.activity_local_date < previous_ends_on;

  select count(*)::integer
  into free_places_visited
  from public.site_visits sv
  join public.heritage_sites hs on hs.id = sv.site_id
  where sv.user_id::text = target_user_id::text
    and sv.activity_local_date >= target_starts_on
    and sv.activity_local_date < target_ends_on
    and coalesce(hs.is_free, false);

  if target_period_type = 'active_day' then
    select coalesce(max(day_total), 0)::integer
    into personal_best_places
    from (
      select count(*) as day_total
      from public.site_visits sv
      where sv.user_id::text = target_user_id::text
      group by sv.activity_local_date
    ) daily_totals;
  else
    select coalesce(max(week_total), 0)::integer
    into personal_best_places
    from (
      select count(*) as week_total
      from public.site_visits sv
      where sv.user_id::text = target_user_id::text
      group by (
        sv.activity_local_date - (extract(isodow from sv.activity_local_date)::integer - 1)
      )
    ) weekly_totals;

    streak_week := target_starts_on;
    loop
      exit when not (
        exists (
          select 1
          from public.site_visits sv
          where sv.user_id::text = target_user_id::text
            and sv.activity_local_date >= streak_week
            and sv.activity_local_date < streak_week + 7
        )
        or exists (
          select 1
          from public.user_achievements ua
          where ua.user_id::text = target_user_id::text
            and ua.activity_local_date >= streak_week
            and ua.activity_local_date < streak_week + 7
        )
        or exists (
          select 1
          from public.user_route_completions urc
          where urc.user_id = target_user_id
            and urc.activity_local_date >= streak_week
            and urc.activity_local_date < streak_week + 7
        )
      );

      active_week_streak := active_week_streak + 1;
      streak_week := streak_week - 7;
    end loop;
  end if;

  select coalesce(jsonb_agg(recent_visit.site_id), '[]'::jsonb)
  into site_ids
  from (
    select sv.site_id::text as site_id
    from public.site_visits sv
    where sv.user_id::text = target_user_id::text
      and sv.activity_local_date >= target_starts_on
      and sv.activity_local_date < target_ends_on
    order by sv.created_at desc
  ) recent_visit;

  select coalesce(jsonb_agg(featured_visit.site_id), '[]'::jsonb)
  into featured_site_ids
  from (
    select sv.site_id::text as site_id
    from public.site_visits sv
    where sv.user_id::text = target_user_id::text
      and sv.activity_local_date >= target_starts_on
      and sv.activity_local_date < target_ends_on
    order by sv.created_at desc
    limit 4
  ) featured_visit;

  select coalesce(jsonb_agg(recent_achievement.achievement_id), '[]'::jsonb)
  into achievement_ids
  from (
    select ua.achievement_id::text as achievement_id
    from public.user_achievements ua
    where ua.user_id::text = target_user_id::text
      and ua.activity_local_date >= target_starts_on
      and ua.activity_local_date < target_ends_on
    order by ua.unlocked_at desc
  ) recent_achievement;

  select coalesce(jsonb_agg(recent_route.route_id), '[]'::jsonb)
  into route_ids
  from (
    select urc.route_id
    from public.user_route_completions urc
    where urc.user_id = target_user_id
      and urc.activity_local_date >= target_starts_on
      and urc.activity_local_date < target_ends_on
    order by urc.completed_at desc
  ) recent_route;

  select hs.type::text
  into top_category
  from public.site_visits sv
  join public.heritage_sites hs on hs.id = sv.site_id
  where sv.user_id::text = target_user_id::text
    and sv.activity_local_date >= target_starts_on
    and sv.activity_local_date < target_ends_on
    and hs.type is not null
  group by hs.type::text
  order by count(*) desc, hs.type::text
  limit 1;

  select hs.region::text
  into top_region
  from public.site_visits sv
  join public.heritage_sites hs on hs.id = sv.site_id
  where sv.user_id::text = target_user_id::text
    and sv.activity_local_date >= target_starts_on
    and sv.activity_local_date < target_ends_on
    and hs.region is not null
  group by hs.region::text
  order by count(*) desc, hs.region::text
  limit 1;

  select sv.activity_local_date
  into best_day
  from public.site_visits sv
  where sv.user_id::text = target_user_id::text
    and sv.activity_local_date >= target_starts_on
    and sv.activity_local_date < target_ends_on
  group by sv.activity_local_date
  order by count(*) desc, sv.activity_local_date desc
  limit 1;

  explorer_title_key := case
    when routes_completed > 0 then 'route_finisher'
    when achievements_unlocked > 0 then 'achievement_hunter'
    when sites_stamped >= 5 then 'super_explorer'
    when active_days >= 2 then 'weekend_adventurer'
    else 'place_discoverer'
  end;

  next_status := case when target_ends_on <= current_local_date then 'final' else 'draft' end;
  next_payload := jsonb_build_object(
    'sitesStamped', sites_stamped,
    'pointsEarned', points_earned,
    'activeDays', active_days,
    'achievementsUnlocked', achievements_unlocked,
    'routesCompleted', routes_completed,
    'previousSitesStamped', previous_sites_stamped,
    'freePlacesVisited', free_places_visited,
    'personalBestPlaces', personal_best_places,
    'isPersonalBest', sites_stamped > 0 and sites_stamped >= personal_best_places,
    'activeWeekStreak', active_week_streak,
    'sitesDelta', sites_stamped - previous_sites_stamped,
    'siteIds', site_ids,
    'featuredSiteIds', featured_site_ids,
    'achievementIds', achievement_ids,
    'routeIds', route_ids,
    'topCategory', top_category,
    'topRegion', top_region,
    'bestDay', best_day,
    'explorerTitleKey', explorer_title_key
  );

  insert into public.user_summaries (
    user_id,
    period_type,
    starts_on,
    ends_on,
    timezone,
    status,
    payload,
    generated_at,
    updated_at
  )
  values (
    target_user_id,
    target_period_type,
    target_starts_on,
    target_ends_on,
    summary_timezone,
    next_status,
    next_payload,
    now(),
    now()
  )
  on conflict (user_id, period_type, starts_on) do update
  set
    ends_on = excluded.ends_on,
    timezone = excluded.timezone,
    status = excluded.status,
    payload = excluded.payload,
    generated_at = excluded.generated_at,
    updated_at = excluded.updated_at
  where public.user_summaries.status = 'draft'
    and (
      public.user_summaries.payload is distinct from excluded.payload
      or public.user_summaries.status is distinct from excluded.status
      or public.user_summaries.ends_on is distinct from excluded.ends_on
      or public.user_summaries.timezone is distinct from excluded.timezone
    )
  returning * into summary_row;

  if summary_row.id is null then
    select *
    into summary_row
    from public.user_summaries us
    where us.user_id = target_user_id
      and us.period_type = target_period_type
      and us.starts_on = target_starts_on;
  end if;

  return summary_row;
end;
$$;

create or replace function public.get_or_create_my_summary(
  target_period_type text,
  target_starts_on date,
  requested_timezone text default 'UTC'
)
returns public.user_summaries
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return public.generate_user_summary(
    auth.uid(),
    target_period_type,
    target_starts_on,
    requested_timezone
  );
end;
$$;

create or replace function public.mark_my_summary_viewed(target_summary_id uuid)
returns public.user_summaries
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  summary_row public.user_summaries%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.user_summaries
  set viewed_at = now()
  where id = target_summary_id
    and user_id = auth.uid()
  returning * into summary_row;

  return summary_row;
end;
$$;

create or replace function public.mark_my_summary_shared(target_summary_id uuid)
returns public.user_summaries
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  summary_row public.user_summaries%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.user_summaries
  set shared_at = now()
  where id = target_summary_id
    and user_id = auth.uid()
  returning * into summary_row;

  return summary_row;
end;
$$;

revoke all on function public.normalize_activity_timezone(text) from public, anon, authenticated;
revoke all on function public.prepare_site_visit_recap_fields() from public, anon, authenticated;
revoke all on function public.prepare_user_achievement_recap_fields() from public, anon, authenticated;
revoke all on function public.record_route_completion_after_visit() from public, anon, authenticated;
revoke all on function public.sync_summary_timezone_after_activity() from public, anon, authenticated;
revoke all on function public.generate_user_summary(uuid, text, date, text) from public, anon, authenticated;
revoke all on function public.get_or_create_my_summary(text, date, text) from public, anon;
revoke all on function public.mark_my_summary_viewed(uuid) from public, anon;
revoke all on function public.mark_my_summary_shared(uuid) from public, anon;

grant execute on function public.get_or_create_my_summary(text, date, text) to authenticated;
grant execute on function public.mark_my_summary_viewed(uuid) to authenticated;
grant execute on function public.mark_my_summary_shared(uuid) to authenticated;
