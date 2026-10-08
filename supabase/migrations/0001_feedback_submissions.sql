create table if not exists public.feedback_submissions (
  id uuid primary key,
  name text not null,
  email text,
  rating integer not null check (rating between 1 and 5),
  message text not null,
  source text not null default 'laphto-mall',
  created_at timestamptz not null default now()
);

create index if not exists feedback_submissions_created_at_idx
  on public.feedback_submissions (created_at desc);

alter table public.feedback_submissions enable row level security;

create or replace function public.feedback_summary()
returns table (total bigint, average_rating numeric)
language sql
stable
security definer
set search_path = public
as $$
  select count(*) as total, round(avg(rating), 2) as average_rating
  from public.feedback_submissions;
$$;

revoke execute on function public.feedback_summary() from anon, authenticated;
