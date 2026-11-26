-- Деталізація процедур перевірки суден (ОСПЗ)
-- Виконати в SQL Editor Supabase один раз (після 02_convention_vessels.sql).

alter table public.vessel_inspections
  add column if not exists status text default 'Проведено',
  add column if not exists result text,
  add column if not exists findings text,
  add column if not exists corrective_actions text;

comment on column public.vessel_inspections.status is 'Статус процедури: Проведено / Заплановано / Скасовано';
comment on column public.vessel_inspections.result is 'Результат: Без зауважень / Зауваження / Критичні невідповідності / Рекомендації';
comment on column public.vessel_inspections.findings is 'Виявлені зауваження за процедурою';
comment on column public.vessel_inspections.corrective_actions is 'Коригувальні заходи та доручення';
