create table public.app_settings (
  id text primary key default 'default' check (id = 'default'),
  system_name text not null default 'อ่านคล่อง',
  affiliation text not null default 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 2',
  footer_text text not null default 'ระบบประเมินการอ่านแบบไม่ระบุตัวตน',
  welcome_headline text not null default 'เห็นพัฒนาการอ่าน จากทุกห้องเรียน',
  welcome_description text not null default 'ประเมินแบบไม่ใช้ข้อมูลส่วนตัว สรุปผลระดับโรงเรียน ศูนย์เครือข่าย และเขตพื้นที่ในที่เดียว',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

insert into public.app_settings (id) values ('default');

create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

alter table public.app_settings enable row level security;

create policy "app settings are public"
on public.app_settings for select
to anon, authenticated
using (true);

create policy "admins manage app settings"
on public.app_settings for all
to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

grant select on public.app_settings to anon, authenticated;
grant insert, update, delete on public.app_settings to authenticated;
