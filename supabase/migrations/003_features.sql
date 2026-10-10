alter table expenses add column if not exists split_type text not null default 'equal';
alter table expense_splits add column if not exists split_value numeric null;

create table if not exists settlements (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms (id) on delete cascade,
  from_member uuid not null references members (id) on delete cascade,
  to_member uuid not null references members (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  status text not null default 'paid' check (status in ('paid', 'confirmed')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists idx_settlements_room_id on settlements (room_id);
alter table settlements enable row level security;
do $$ begin
  create policy "anon_select_settlements" on settlements for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "anon_insert_settlements" on settlements for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "anon_update_settlements" on settlements for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "anon_delete_settlements" on settlements for delete using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table settlements;
exception when duplicate_object then null; end $$;
