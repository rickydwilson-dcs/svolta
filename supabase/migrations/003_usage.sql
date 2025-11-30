-- Create usage table for export tracking
create table public.usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  period_start date not null,
  exports_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, period_start)
);

-- Enable RLS
alter table public.usage enable row level security;

-- RLS Policy
create policy "Users can view own usage" on public.usage
  for select using (auth.uid() = user_id);

-- Function to increment export count
create or replace function increment_export_count(p_user_id uuid)
returns integer as $$
declare
  v_period_start date := date_trunc('month', current_date)::date;
  v_count integer;
begin
  insert into public.usage (user_id, period_start, exports_count)
  values (p_user_id, v_period_start, 1)
  on conflict (user_id, period_start)
  do update set
    exports_count = usage.exports_count + 1,
    updated_at = now()
  returning exports_count into v_count;
  return v_count;
end;
$$ language plpgsql security definer;
