alter table public.profiles
add column if not exists subdivision_code text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_subdivision_code_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_subdivision_code_format
    check (subdivision_code is null or subdivision_code ~ '^[A-Z]{2}-[A-Z0-9]{1,3}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_subdivision_matches_country'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_subdivision_matches_country
    check (
      subdivision_code is null
      or (
        country_code is not null
        and split_part(subdivision_code, '-', 1) = country_code
      )
    );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_chile_subdivision_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_chile_subdivision_valid
    check (
      country_code is distinct from 'CL'
      or subdivision_code is null
      or subdivision_code in (
        'CL-AI', 'CL-AN', 'CL-AP', 'CL-AR',
        'CL-AT', 'CL-BI', 'CL-CO', 'CL-LI',
        'CL-LL', 'CL-LR', 'CL-MA', 'CL-ML',
        'CL-NB', 'CL-RM', 'CL-TA', 'CL-VS'
      )
    );
  end if;
end $$;

create or replace function public.handle_new_auth_user_registration()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  is_tourin_registration boolean := coalesce(metadata->>'registration_source', '') = 'tourin_app'
    or metadata ? 'country_code'
    or metadata ? 'subdivision_code'
    or metadata ? 'date_of_birth';
  display_name text := nullif(btrim(coalesce(
    metadata->>'display_name',
    metadata->>'name',
    split_part(new.email, '@', 1)
  )), '');
  locale text := coalesce(nullif(btrim(metadata #>> '{prefs,locale}'), ''), 'es');
  country_code text := nullif(upper(btrim(metadata->>'country_code')), '');
  subdivision_code text := nullif(upper(btrim(metadata->>'subdivision_code')), '');
  date_of_birth_text text := nullif(btrim(metadata->>'date_of_birth'), '');
  date_of_birth date;
  required_terms_version text := '2026-06-23';
  required_privacy_version text := '2026-06-23';
  legal_terms_accepted boolean := lower(coalesce(metadata->>'legal_terms_accepted', 'false')) in ('true', 't', '1', 'yes');
  legal_terms_version text := nullif(btrim(metadata->>'legal_terms_version'), '');
  legal_privacy_accepted boolean := lower(coalesce(metadata->>'legal_privacy_accepted', 'false')) in ('true', 't', '1', 'yes');
  legal_privacy_version text := nullif(btrim(metadata->>'legal_privacy_version'), '');
  legal_accepted_at timestamptz := now();
begin
  if locale not in ('es', 'en', 'pt') then
    locale := 'es';
  end if;

  if country_code is not null and country_code !~ '^[A-Z]{2}$' then
    raise exception 'Invalid registration country_code';
  end if;

  if is_tourin_registration and country_code is null then
    raise exception 'Missing registration country_code';
  end if;

  if subdivision_code is not null then
    if subdivision_code !~ '^[A-Z]{2}-[A-Z0-9]{1,3}$' then
      raise exception 'Invalid registration subdivision_code';
    end if;

    if country_code is null or split_part(subdivision_code, '-', 1) <> country_code then
      raise exception 'Registration subdivision_code does not match country_code';
    end if;
  end if;

  if is_tourin_registration and country_code = 'CL' then
    if subdivision_code is null then
      raise exception 'Missing registration subdivision_code for Chile';
    end if;

    if subdivision_code not in (
      'CL-AI', 'CL-AN', 'CL-AP', 'CL-AR',
      'CL-AT', 'CL-BI', 'CL-CO', 'CL-LI',
      'CL-LL', 'CL-LR', 'CL-MA', 'CL-ML',
      'CL-NB', 'CL-RM', 'CL-TA', 'CL-VS'
    ) then
      raise exception 'Invalid registration subdivision_code for Chile';
    end if;
  end if;

  if is_tourin_registration then
    if date_of_birth_text is null then
      raise exception 'Missing registration date_of_birth';
    end if;

    if date_of_birth_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      raise exception 'Invalid registration date_of_birth format';
    end if;

    begin
      date_of_birth := date_of_birth_text::date;
    exception
      when others then
        raise exception 'Invalid registration date_of_birth';
    end;

    if date_of_birth > current_date then
      raise exception 'Invalid future registration date_of_birth';
    end if;

    if not legal_terms_accepted or legal_terms_version <> required_terms_version then
      raise exception 'Missing current terms consent';
    end if;

    if not legal_privacy_accepted or legal_privacy_version <> required_privacy_version then
      raise exception 'Missing current privacy consent';
    end if;
  end if;

  insert into public.profiles (
    id,
    display_name,
    locale,
    avatar_path,
    country_code,
    subdivision_code,
    terms_accepted_at,
    terms_accepted_version,
    privacy_accepted_at,
    privacy_accepted_version
  )
  values (
    new.id,
    coalesce(display_name, ''),
    locale,
    null,
    country_code,
    subdivision_code,
    case when is_tourin_registration then legal_accepted_at else null end,
    case when is_tourin_registration then legal_terms_version else null end,
    case when is_tourin_registration then legal_accepted_at else null end,
    case when is_tourin_registration then legal_privacy_version else null end
  )
  on conflict (id) do update
  set
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    locale = coalesce(excluded.locale, public.profiles.locale, 'es'),
    country_code = coalesce(excluded.country_code, public.profiles.country_code),
    subdivision_code = coalesce(excluded.subdivision_code, public.profiles.subdivision_code),
    terms_accepted_at = coalesce(excluded.terms_accepted_at, public.profiles.terms_accepted_at),
    terms_accepted_version = coalesce(excluded.terms_accepted_version, public.profiles.terms_accepted_version),
    privacy_accepted_at = coalesce(excluded.privacy_accepted_at, public.profiles.privacy_accepted_at),
    privacy_accepted_version = coalesce(excluded.privacy_accepted_version, public.profiles.privacy_accepted_version),
    updated_at = now();

  if is_tourin_registration then
    insert into public.user_private_details (
      user_id,
      date_of_birth
    )
    values (
      new.id,
      date_of_birth
    )
    on conflict (user_id) do update
    set
      date_of_birth = excluded.date_of_birth,
      updated_at = now();
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user_registration() from public, anon, authenticated;

create or replace function public.cleanup_registration_metadata()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update auth.users
  set raw_user_meta_data = jsonb_strip_nulls(jsonb_build_object(
    'name', raw_user_meta_data->'name',
    'display_name', raw_user_meta_data->'display_name',
    'prefs', raw_user_meta_data->'prefs'
  ))
  where id = auth.uid()
    and coalesce(raw_user_meta_data, '{}'::jsonb) ?| array[
      'country_code',
      'subdivision_code',
      'date_of_birth',
      'registration_source',
      'legal_terms_accepted',
      'legal_terms_version',
      'legal_privacy_accepted',
      'legal_privacy_version'
    ];
end;
$$;

revoke all on function public.cleanup_registration_metadata() from public, anon;
grant execute on function public.cleanup_registration_metadata() to authenticated;
