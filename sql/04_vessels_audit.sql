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
notify pgrst, 'reload schema';
