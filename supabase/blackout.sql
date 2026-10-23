-- Blackout dashboard helper. Run once in Supabase → SQL Editor.
-- Gives the Data tab its signup counts and database size. Only the
-- service role (used server-side by /api/data) may call it.

create or replace function public.blackout_stats(days int default 7, tz_offset_minutes int default 0)
returns json
language sql
security definer
set search_path = public, auth
as $$
  -- Day boundaries in the phone's time zone (tz_offset_minutes is JS getTimezoneOffset()).
  with bounds as (
    select i,
      date_trunc('day', now() - make_interval(mins => tz_offset_minutes))
        - make_interval(days => days - 1 - i)
        + make_interval(mins => tz_offset_minutes) as day_start
    from generate_series(0, days - 1) as i
  )
  select json_build_object(
    'db_size_bytes', pg_database_size(current_database()),
    'signups_total', (select count(*) from auth.users),
    'signups_daily', (
      select json_agg(n order by i) from (
        select b.i, (
          select count(*) from auth.users u
          where u.created_at >= b.day_start and u.created_at < b.day_start + interval '1 day'
        ) as n
        from bounds b
      ) t
    )
  );
$$;

revoke all on function public.blackout_stats(int, int) from public, anon, authenticated;
grant execute on function public.blackout_stats(int, int) to service_role;
