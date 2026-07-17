create index if not exists site_visits_user_created_at_idx
on public.site_visits ((user_id::text), created_at desc);

create index if not exists user_achievements_user_unlocked_at_period_idx
on public.user_achievements ((user_id::text), unlocked_at desc);

create index if not exists user_route_completions_user_completed_at_idx
on public.user_route_completions (user_id, completed_at desc);

drop function if exists public.get_my_exploration_stats(text);

create or replace function public.get_my_exploration_stats(
  target_period text default 'week',
  requested_timezone text default 'UTC'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  target_user_id uuid := auth.uid();
  stats_timezone text := public.normalize_activity_timezone(requested_timezone);
  current_local_date date;
  period_starts_at timestamptz;
  sites_visited integer := 0;
  routes_started integer := 0;
  routes_completed integer := 0;
  achievements_unlocked integer := 0;
  active_days integer := 0;
  free_places_visited integer := 0;
  categories_explored integer := 0;
  regions_explored integer := 0;
  communes_explored integer := 0;
  current_active_day_streak integer := 0;
  longest_active_day_streak integer := 0;
  current_streak_run integer := 0;
  active_date_values date[] := '{}'::date[];
  active_date date;
  previous_active_date date;
  streak_cursor date;
  category_distribution jsonb := '[]'::jsonb;
  top_category jsonb;
  top_region jsonb;
  best_day date;
  most_active_weekday integer;
  preferred_time_of_day text;
  average_places_per_active_day numeric := 0;
  free_places_ratio numeric := 0;
  route_completion_rate numeric := 0;
  published_places_visited integer := 0;
  published_places_total integer := 0;
  place_completion_rate numeric := 0;
  published_achievements_unlocked integer := 0;
  published_achievements_total integer := 0;
  achievement_completion_rate numeric := 0;
begin
  if target_user_id is null then
    raise exception 'Authentication required';
  end if;

  if target_period not in ('day', 'week', 'month', 'all') then
    raise exception 'Unsupported exploration stats period';
  end if;

  current_local_date := (now() at time zone stats_timezone)::date;
  period_starts_at := case target_period
    when 'day' then now() - interval '1 day'
    when 'week' then now() - interval '7 days'
    when 'month' then now() - interval '30 days'
    else null
  end;

  select count(*)::integer
  into sites_visited
  from public.site_visits sv
  where sv.user_id::text = target_user_id::text
    and (period_starts_at is null or sv.created_at >= period_starts_at);

  select count(distinct hs.route_id::text)::integer
  into routes_started
  from public.site_visits sv
  join public.heritage_sites hs on hs.id = sv.site_id
  where sv.user_id::text = target_user_id::text
    and (period_starts_at is null or sv.created_at >= period_starts_at)
    and nullif(btrim(hs.route_id::text), '') is not null;

  select count(*)::integer
  into routes_completed
  from public.user_route_completions urc
  where urc.user_id = target_user_id
    and (period_starts_at is null or urc.completed_at >= period_starts_at);

  select count(*)::integer
  into achievements_unlocked
  from public.user_achievements ua
  where ua.user_id::text = target_user_id::text
    and (period_starts_at is null or ua.unlocked_at >= period_starts_at);

  select coalesce(array_agg(activity_date order by activity_date), '{}'::date[])
  into active_date_values
  from (
    select sv.activity_local_date as activity_date
    from public.site_visits sv
    where sv.user_id::text = target_user_id::text
      and (period_starts_at is null or sv.created_at >= period_starts_at)
    union
    select ua.activity_local_date
    from public.user_achievements ua
    where ua.user_id::text = target_user_id::text
      and (period_starts_at is null or ua.unlocked_at >= period_starts_at)
    union
    select urc.activity_local_date
    from public.user_route_completions urc
    where urc.user_id = target_user_id
      and (period_starts_at is null or urc.completed_at >= period_starts_at)
  ) activity_dates
  where activity_date is not null;

  active_days := coalesce(cardinality(active_date_values), 0);

  foreach active_date in array active_date_values loop
    if previous_active_date is null or active_date = previous_active_date + 1 then
      current_streak_run := current_streak_run + 1;
    else
      current_streak_run := 1;
    end if;

    longest_active_day_streak := greatest(longest_active_day_streak, current_streak_run);
    previous_active_date := active_date;
  end loop;

  streak_cursor := current_local_date;
  if array_position(active_date_values, streak_cursor) is null then
    streak_cursor := streak_cursor - 1;
  end if;

  while array_position(active_date_values, streak_cursor) is not null loop
    current_active_day_streak := current_active_day_streak + 1;
    streak_cursor := streak_cursor - 1;
  end loop;

  select count(*)::integer
  into free_places_visited
  from public.site_visits sv
  join public.heritage_sites hs on hs.id = sv.site_id
  where sv.user_id::text = target_user_id::text
    and (period_starts_at is null or sv.created_at >= period_starts_at)
    and coalesce(hs.is_free, false);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'category', category_value,
        'count', category_visits
      )
      order by category_visits desc, category_value::text
    ),
    '[]'::jsonb
  )
  into category_distribution
  from (
    select
      to_jsonb(hs.type) as category_value,
      count(*)::integer as category_visits
    from public.site_visits sv
    join public.heritage_sites hs on hs.id = sv.site_id
    where sv.user_id::text = target_user_id::text
      and (period_starts_at is null or sv.created_at >= period_starts_at)
      and hs.type is not null
    group by hs.type
  ) categories;

  categories_explored := jsonb_array_length(category_distribution);
  if categories_explored > 0 then
    top_category := category_distribution->0->'category';
  end if;

  select
    count(distinct hs.region)::integer,
    count(distinct hs.comuna)::integer
  into regions_explored, communes_explored
  from public.site_visits sv
  join public.heritage_sites hs on hs.id = sv.site_id
  where sv.user_id::text = target_user_id::text
    and (period_starts_at is null or sv.created_at >= period_starts_at);

  select to_jsonb(hs.region)
  into top_region
  from public.site_visits sv
  join public.heritage_sites hs on hs.id = sv.site_id
  where sv.user_id::text = target_user_id::text
    and (period_starts_at is null or sv.created_at >= period_starts_at)
    and hs.region is not null
  group by hs.region
  order by count(*) desc, hs.region::text
  limit 1;

  select sv.activity_local_date
  into best_day
  from public.site_visits sv
  where sv.user_id::text = target_user_id::text
    and (period_starts_at is null or sv.created_at >= period_starts_at)
  group by sv.activity_local_date
  order by count(*) desc, sv.activity_local_date desc
  limit 1;

  select extract(isodow from sv.activity_local_date)::integer
  into most_active_weekday
  from public.site_visits sv
  where sv.user_id::text = target_user_id::text
    and (period_starts_at is null or sv.created_at >= period_starts_at)
  group by extract(isodow from sv.activity_local_date)
  order by count(*) desc, extract(isodow from sv.activity_local_date)
  limit 1;

  select time_bucket
  into preferred_time_of_day
  from (
    select case
      when extract(hour from sv.created_at at time zone stats_timezone) between 5 and 11 then 'morning'
      when extract(hour from sv.created_at at time zone stats_timezone) between 12 and 17 then 'afternoon'
      when extract(hour from sv.created_at at time zone stats_timezone) between 18 and 22 then 'evening'
      else 'night'
    end as time_bucket
    from public.site_visits sv
    where sv.user_id::text = target_user_id::text
      and (period_starts_at is null or sv.created_at >= period_starts_at)
  ) visit_times
  group by time_bucket
  order by count(*) desc, time_bucket
  limit 1;

  if active_days > 0 then
    average_places_per_active_day := round(sites_visited::numeric / active_days, 1);
  end if;

  if sites_visited > 0 then
    free_places_ratio := round(free_places_visited::numeric * 100 / sites_visited, 1);
  end if;

  if routes_started > 0 then
    route_completion_rate := round(routes_completed::numeric * 100 / routes_started, 1);
  end if;

  select count(*)::integer
  into published_places_total
  from public.heritage_sites hs
  where coalesce(hs.is_published, true);

  select count(distinct sv.site_id)::integer
  into published_places_visited
  from public.site_visits sv
  join public.heritage_sites hs on hs.id = sv.site_id
  where sv.user_id::text = target_user_id::text
    and coalesce(hs.is_published, true);

  if published_places_total > 0 then
    place_completion_rate := round(
      published_places_visited::numeric * 100 / published_places_total,
      1
    );
  end if;

  select count(*)::integer
  into published_achievements_total
  from public.achievements achievement
  where coalesce(achievement.is_published, true);

  select count(distinct ua.achievement_id)::integer
  into published_achievements_unlocked
  from public.user_achievements ua
  join public.achievements achievement on achievement.id = ua.achievement_id
  where ua.user_id::text = target_user_id::text
    and coalesce(achievement.is_published, true);

  if published_achievements_total > 0 then
    achievement_completion_rate := round(
      published_achievements_unlocked::numeric * 100 / published_achievements_total,
      1
    );
  end if;

  return jsonb_build_object(
    'period', target_period,
    'startsAt', period_starts_at,
    'generatedAt', now(),
    'sitesVisited', sites_visited,
    'routesStarted', routes_started,
    'routesCompleted', routes_completed,
    'routeCompletionRate', route_completion_rate,
    'achievementsUnlocked', achievements_unlocked,
    'activeDays', active_days,
    'currentActiveDayStreak', current_active_day_streak,
    'longestActiveDayStreak', longest_active_day_streak,
    'averagePlacesPerActiveDay', average_places_per_active_day,
    'freePlacesVisited', free_places_visited,
    'freePlacesRatio', free_places_ratio,
    'categoriesExplored', categories_explored,
    'regionsExplored', regions_explored,
    'communesExplored', communes_explored,
    'categoryDistribution', category_distribution,
    'topCategory', top_category,
    'topRegion', top_region,
    'bestDay', best_day,
    'mostActiveWeekday', most_active_weekday,
    'preferredTimeOfDay', preferred_time_of_day,
    'publishedPlacesVisited', published_places_visited,
    'publishedPlacesTotal', published_places_total,
    'placeCompletionRate', place_completion_rate,
    'publishedAchievementsUnlocked', published_achievements_unlocked,
    'publishedAchievementsTotal', published_achievements_total,
    'achievementCompletionRate', achievement_completion_rate
  );
end;
$$;
