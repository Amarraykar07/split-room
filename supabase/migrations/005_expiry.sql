-- Room inactivity expiry. Existing rooms receive the free two-day policy.
alter table rooms
  add column if not exists expiry_days integer not null default 2,
  add column if not exists last_active_at timestamptz not null default now();

update rooms
set expiry_days = 2
where expiry_days is null;

update rooms
set last_active_at = now()
where last_active_at is null;

alter table rooms
  drop constraint if exists rooms_expiry_days_check;
alter table rooms
  add constraint rooms_expiry_days_check check (expiry_days between 1 and 365);

alter table rooms
  add column if not exists expires_at timestamptz generated always as
    (last_active_at + expiry_days * interval '1 day') stored;

create or replace function touch_room_activity()
returns trigger
language plpgsql
security invoker
as $$
begin
  if tg_table_name = 'expense_splits' then
    update rooms
    set last_active_at = now()
    where id = (
      select room_id
      from expenses
      where id = coalesce(new.expense_id, old.expense_id)
    );
  else
    update rooms set last_active_at = now() where id = coalesce(new.room_id, old.room_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists members_touch_room_activity on members;
create trigger members_touch_room_activity
after insert or update or delete on members
for each row execute function touch_room_activity();

drop trigger if exists expenses_touch_room_activity on expenses;
create trigger expenses_touch_room_activity
after insert or update or delete on expenses
for each row execute function touch_room_activity();

drop trigger if exists expense_splits_touch_room_activity on expense_splits;
create trigger expense_splits_touch_room_activity
after insert or update or delete on expense_splits
for each row execute function touch_room_activity();

do $$
begin
  if to_regclass('public.settlements') is not null then
    execute 'drop trigger if exists settlements_touch_room_activity on settlements';
    execute 'create trigger settlements_touch_room_activity after insert or update or delete on settlements for each row execute function touch_room_activity()';
  end if;
end;
$$;

create or replace function delete_expired_rooms()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from rooms where expires_at < now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Optional: enable pg_cron in Supabase Dashboard > Database > Extensions, then this
-- migration schedules hourly cleanup. Manual fallback: select delete_expired_rooms();
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'split-room-expiry-hourly';
    perform cron.schedule('split-room-expiry-hourly', '0 * * * *', 'select delete_expired_rooms();');
  end if;
exception when undefined_table or undefined_function then
  null;
end;
$$;
