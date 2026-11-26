-- ОБ'ЄДНАНА МІГРАЦІЯ (02 + 03): виконати один раз у Supabase → SQL Editor → Run.
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

alter table public.vessel_inspections
  add column if not exists status text default 'Проведено',
  add column if not exists result text,
  add column if not exists findings text,
  add column if not exists corrective_actions text;

comment on column public.vessel_inspections.status is 'Статус процедури: Проведено / Заплановано / Скасовано';
comment on column public.vessel_inspections.result is 'Результат: Без зауважень / Зауваження / Критичні невідповідності / Рекомендації';
comment on column public.vessel_inspections.findings is 'Виявлені зауваження за процедурою';
comment on column public.vessel_inspections.corrective_actions is 'Коригувальні заходи та доручення';

-- Права ролям API (без них PostgREST повертає 401 permission denied)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete
  on public.convention_vessels, public.vessel_inspections
  to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Журнал змін (audit_log) для суден і перевірок суден.
-- Тип record_id/old_data/new_data не припускається: значення передаються літералами.
create or replace function public.trg_audit_vessels()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rec  record := case when tg_op = 'DELETE' then old else new end;
  who  text := coalesce(auth.jwt() ->> 'email', 'anon');
begin
  execute format(
    'insert into public.audit_log (table_name, record_id, action, changed_at, changed_by, old_data, new_data) values (%L,%L,%L,now(),%L,%L,%L)',
    tg_table_name, rec.id::text, tg_op, who,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old)::text end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new)::text end);
  return rec;
end $$;

drop trigger if exists audit_convention_vessels on public.convention_vessels;
create trigger audit_convention_vessels after insert or update or delete
  on public.convention_vessels for each row execute function public.trg_audit_vessels();

drop trigger if exists audit_vessel_inspections on public.vessel_inspections;
create trigger audit_vessel_inspections after insert or update or delete
  on public.vessel_inspections for each row execute function public.trg_audit_vessels();

-- Оновити кеш схеми PostgREST (усуває 404 'schema cache')
notify pgrst, 'reload schema';
