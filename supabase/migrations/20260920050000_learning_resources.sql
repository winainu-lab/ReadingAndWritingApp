create table public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'ใบความรู้',
  google_drive_url text not null,
  thumbnail_url text,
  is_locked boolean not null default false,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index learning_resources_public_idx
  on public.learning_resources (is_published, sort_order, created_at desc);

create trigger learning_resources_set_updated_at
before update on public.learning_resources
for each row execute function public.set_updated_at();

alter table public.learning_resources enable row level security;

create policy "admins manage learning resources"
on public.learning_resources for all to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create or replace function public.get_public_learning_resources()
returns table (
  id uuid,
  title text,
  description text,
  category text,
  public_url text,
  thumbnail_url text,
  is_locked boolean,
  sort_order integer,
  created_at timestamptz
)
language sql
stable
security definer set search_path = public
as $$
  select
    r.id,
    r.title,
    r.description,
    r.category,
    case when r.is_locked then null else r.google_drive_url end,
    r.thumbnail_url,
    r.is_locked,
    r.sort_order,
    r.created_at
  from public.learning_resources r
  where r.is_published
  order by r.sort_order, r.created_at desc;
$$;

grant select, insert, update, delete on public.learning_resources to authenticated;
grant execute on function public.get_public_learning_resources() to anon, authenticated;
