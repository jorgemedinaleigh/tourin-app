alter table public.profiles
add column if not exists country_code text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_country_code_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_country_code_format
    check (country_code is null or country_code ~ '^[A-Z]{2}$');
  end if;
end $$;

create table if not exists public.user_private_details (
  user_id uuid primary key references auth.users(id) on delete cascade,
  date_of_birth date not null check (date_of_birth <= current_date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_private_details enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_private_details'
      and policyname = 'Users can read own private details'
  ) then
    create policy "Users can read own private details"
    on public.user_private_details
    for select
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_private_details'
      and policyname = 'Users can insert own private details'
  ) then
    create policy "Users can insert own private details"
    on public.user_private_details
    for insert
    to authenticated
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_private_details'
      and policyname = 'Users can update own private details'
  ) then
    create policy "Users can update own private details"
    on public.user_private_details
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;
