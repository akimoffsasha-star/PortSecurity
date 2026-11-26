-- Конвенційні судна (гл. XI-2 SOLAS / ОСПЗ) та перевірки суден
-- Виконати в SQL Editor Supabase один раз.

create table if not exists public.convention_vessels (
  id bigint generated always as identity primary key,
  name text not null,
  cert_expiry date,
  assessment_expiry date,
  plan_expiry date,
  shipowner_contacts text,
  company_cso text,
  ship_sso text,
  conclusion text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.vessel_inspections (
  id bigint generated always as identity primary key,
  vessel_name text not null,
  cert_issued text,
  flag text default 'Україна',
  inspection_date date not null,
  inspection_type text,
  comments text,
  created_at timestamptz default now()
);

alter table public.convention_vessels enable row level security;
alter table public.vessel_inspections enable row level security;

-- Політики для anon (як у решті проєкту — за потреби звузити)
do $$ begin
  create policy "cv_all" on public.convention_vessels for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "vi_all" on public.vessel_inspections for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

create index if not exists idx_cv_name on public.convention_vessels (name);
create index if not exists idx_vi_date on public.vessel_inspections (inspection_date desc);
