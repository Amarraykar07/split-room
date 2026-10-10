-- =============================================================================
-- Split Room — Supabase Database Schema
-- =============================================================================
-- ⚠️  MVP-LEVEL SECURITY NOTE:
--     Access is controlled by the unguessable 8-character room code.
--     All tables allow anon read/write. This is intentional for a no-login
--     MVP. For production hardening, add auth or sign-in per room owner.
-- =============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- ROOMS
-- ---------------------------------------------------------------------------
create table if not exists rooms (
  id         uuid primary key default uuid_generate_v4(),
  code       text unique not null,
  name       text not null default 'My Room',
  created_at timestamptz not null default now()
);

create index if not exists idx_rooms_code on rooms (code);

-- ---------------------------------------------------------------------------
-- MEMBERS
-- ---------------------------------------------------------------------------
create table if not exists members (
  id         uuid primary key default uuid_generate_v4(),
  room_id    uuid not null references rooms (id) on delete cascade,
  name       text not null,
  upi_id     text,
  created_at timestamptz not null default now()
);

create index if not exists idx_members_room_id on members (room_id);

-- ---------------------------------------------------------------------------
-- EXPENSES
-- ---------------------------------------------------------------------------
create table if not exists expenses (
  id          uuid primary key default uuid_generate_v4(),
  room_id     uuid not null references rooms (id) on delete cascade,
  description text not null,
  amount      numeric(12, 2) not null check (amount > 0),
  paid_by     uuid not null references members (id) on delete restrict,
  created_at  timestamptz not null default now()
);

create index if not exists idx_expenses_room_id on expenses (room_id);

-- ---------------------------------------------------------------------------
-- EXPENSE SPLITS
-- ---------------------------------------------------------------------------
create table if not exists expense_splits (
  id         uuid primary key default uuid_generate_v4(),
  expense_id uuid not null references expenses (id) on delete cascade,
  member_id  uuid not null references members (id) on delete cascade,
  share      numeric(12, 2) not null check (share >= 0),
  created_at timestamptz not null default now(),
  unique (expense_id, member_id)
);

create index if not exists idx_expense_splits_expense_id on expense_splits (expense_id);
create index if not exists idx_expense_splits_member_id  on expense_splits (member_id);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
-- ⚠️  MVP SECURITY: Allow full anon access. The room code is the secret.
--     In production you may want to add owner-based auth.

alter table rooms          enable row level security;
alter table members        enable row level security;
alter table expenses       enable row level security;
alter table expense_splits enable row level security;

-- Rooms: public anon access (room code guards access in app logic)
create policy "anon_select_rooms"  on rooms          for select using (true);
create policy "anon_insert_rooms"  on rooms          for insert with check (true);
create policy "anon_update_rooms"  on rooms          for update using (true);
create policy "anon_delete_rooms"  on rooms          for delete using (true);

-- Members
create policy "anon_select_members"  on members      for select using (true);
create policy "anon_insert_members"  on members      for insert with check (true);
create policy "anon_update_members"  on members      for update using (true);
create policy "anon_delete_members"  on members      for delete using (true);

-- Expenses
create policy "anon_select_expenses"  on expenses    for select using (true);
create policy "anon_insert_expenses"  on expenses    for insert with check (true);
create policy "anon_update_expenses"  on expenses    for update using (true);
create policy "anon_delete_expenses"  on expenses    for delete using (true);

-- Expense splits
create policy "anon_select_splits"  on expense_splits for select using (true);
create policy "anon_insert_splits"  on expense_splits for insert with check (true);
create policy "anon_update_splits"  on expense_splits for update using (true);
create policy "anon_delete_splits"  on expense_splits for delete using (true);

-- ---------------------------------------------------------------------------
-- REALTIME
-- ---------------------------------------------------------------------------
-- Enable Realtime publication for live updates
-- Run these in Supabase SQL editor OR via the Realtime dashboard:

alter publication supabase_realtime add table members;
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table expense_splits;
