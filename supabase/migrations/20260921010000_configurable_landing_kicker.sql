alter table public.app_settings
  add column if not exists landing_kicker text not null
  default 'เครื่องมือนิเทศและประเมินการอ่าน';
