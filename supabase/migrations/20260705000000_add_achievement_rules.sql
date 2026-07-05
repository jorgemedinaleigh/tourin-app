alter table public.achievements
add column if not exists rule_type text not null default 'manual',
add column if not exists rule_config jsonb not null default '{}'::jsonb;

update public.achievements
set
  rule_type = coalesce(nullif(trim(rule_type), ''), 'manual'),
  rule_config = coalesce(rule_config, '{}'::jsonb)
where rule_type is null
  or trim(rule_type) = ''
  or rule_config is null;

create index if not exists achievements_rule_type_idx
on public.achievements (rule_type);

create unique index if not exists user_achievements_user_id_achievement_id_uidx
on public.user_achievements (user_id, achievement_id);

alter table public.user_achievements enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_achievements'
      and policyname = 'Users can read own achievements'
  ) then
    create policy "Users can read own achievements"
    on public.user_achievements
    for select
    using (auth.uid()::text = user_id::text);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_achievements'
      and policyname = 'Users can insert own achievements'
  ) then
    create policy "Users can insert own achievements"
    on public.user_achievements
    for insert
    with check (auth.uid()::text = user_id::text);
  end if;
end
$$;
