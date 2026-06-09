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
    or metadata ? 'date_of_birth';
  display_name text := nullif(btrim(coalesce(
    metadata->>'display_name',
    metadata->>'name',
    split_part(new.email, '@', 1)
  )), '');
  locale text := coalesce(nullif(btrim(metadata #>> '{prefs,locale}'), ''), 'es');
  country_code text := nullif(upper(btrim(metadata->>'country_code')), '');
  date_of_birth_text text := nullif(btrim(metadata->>'date_of_birth'), '');
  date_of_birth date;
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
  end if;

  insert into public.profiles (
    id,
    display_name,
    locale,
    avatar_path,
    country_code
  )
  values (
    new.id,
    coalesce(display_name, ''),
    locale,
    null,
    country_code
  )
  on conflict (id) do update
  set
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    locale = coalesce(excluded.locale, public.profiles.locale, 'es'),
    country_code = coalesce(excluded.country_code, public.profiles.country_code),
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

drop trigger if exists on_auth_user_created_registration_bootstrap on auth.users;

create trigger on_auth_user_created_registration_bootstrap
after insert on auth.users
for each row execute function public.handle_new_auth_user_registration();

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
      'date_of_birth',
      'registration_source'
    ];
end;
$$;

revoke all on function public.cleanup_registration_metadata() from public, anon;
grant execute on function public.cleanup_registration_metadata() to authenticated;
