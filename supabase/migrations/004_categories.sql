alter table expenses
  add column if not exists category text not null default 'other';

update expenses
set category = 'other'
where category is null;
