/* Масові операції над обраними ПЗ */

function toggleSelectFacility(code, checked) { if (checked) selectedFacCodes.add(code); else selectedFacCodes.delete(code); syncBulkUi(); }
/**
 * Вибирає/знімає всі видимі рядки реєстру.
 */
function toggleSelectAllFacilities(checked) {
  const rows = getFilteredFacilities();
  if (checked) rows.forEach(r => selectedFacCodes.add(r.code)); else rows.forEach(r => selectedFacCodes.delete(r.code));
  document.querySelectorAll(".fac-sel-chk").forEach(cb => { cb.checked = selectedFacCodes.has(cb.dataset.code); });
  syncBulkUi();
}
/**
 * Очищає «FacilitySelection».
 */
function clearFacilitySelection() { selectedFacCodes.clear(); document.querySelectorAll(".fac-sel-chk").forEach(cb => { cb.checked = false; }); syncBulkUi(); }
/**
 * Оновлює панель масових дій за кількістю вибраних.
 */
function syncBulkUi() {
  const count = selectedFacCodes.size, bar = document.getElementById("bulkActionsBar"), wasHidden = bar.classList.contains("d-none");
  document.getElementById("bulkCountLabel").textContent = count;
  bar.classList.toggle("d-none", count === 0);
  if (wasHidden && count > 0) animateEl(bar, { opacity: [0, 1], transform: ["translateY(-6px)", "translateY(0)"] }, { duration: 180 });
  const filtered = getFilteredFacilities(), hdrChk = document.getElementById("facSelectAll");
  if (hdrChk) hdrChk.checked = filtered.length > 0 && filtered.every(r => selectedFacCodes.has(r.code));
}

/**
 * Застосовує «BulkField».
 */
async function applyBulkField(field, selectId) {
  const val = document.getElementById(selectId).value; if (!val) return uiAlert("Оберіть нове значення у випадаючому списку");
  const codes = [...selectedFacCodes]; if (!codes.length) return;
  const label = field === "facility_status" ? "Стан ПЗ" : "Стан Акту";
  if (!(await uiConfirm(`Змінити «${label}» на «${val}» для ${codes.length} обраних ПЗ?`))) return;
  setLoading(true, `Масове оновлення (${codes.length})…`);
  const payload = { [field]: val, updated_at: new Date().toISOString(), updated_by: getOperator() };
  const { ok, fail } = await runBatched(codes, c => sb.from("port_facilities").update(payload).eq("code", c));
  setLoading(false); document.getElementById(selectId).value = "";
  if (fail) notify(`Оновлено ${ok}, помилок: ${fail}`, true); else notify(`Оновлено ${ok} ПЗ`);
  loadAll(true);
}

/**
 * Застосовує «BulkDate».
 */
async function applyBulkDate() {
  const field = document.getElementById("bulkDateField").value, val = nullIfEmpty(document.getElementById("bulkDateValue").value), codes = [...selectedFacCodes];
  if (!codes.length) return;
  const label = document.getElementById("bulkDateField").selectedOptions[0].textContent;
  const msg = val ? `Встановити дату «${label}» = ${val} для ${codes.length} обраних ПЗ?` : `Очистити дату «${label}» для ${codes.length} обраних ПЗ?`;
  if (!(await uiConfirm(msg))) return;
  setLoading(true, `Оновлення дат (${codes.length})…`);
  const payload = { [field]: val, updated_at: new Date().toISOString(), updated_by: getOperator() };
  const { ok, fail } = await runBatched(codes, c => sb.from("port_facilities").update(payload).eq("code", c));
  setLoading(false);
  if (fail) notify(`Оновлено ${ok}, помилок: ${fail}`, true); else notify(`Дату оновлено для ${ok} ПЗ`);
  loadAll(true);
}

/**
 * Застосовує «BulkDelete».
 */
async function applyBulkDelete() {
  const codes = [...selectedFacCodes]; if (!codes.length) return;
  const withInsp = codes.filter(c => state.inspections.some(i => i.facility_code === c));
  const deletable = codes.filter(c => !state.inspections.some(i => i.facility_code === c));
  if (!deletable.length) return uiAlert("Жодне з обраних ПЗ не можна видалити, оскільки по них є записи перевірок.", "Видалення неможливе");
  const extra = withInsp.length ? `\n\n(${withInsp.length} ПЗ із перевірками будуть пропущені.)` : "";
  if (!(await uiConfirm(`Видалити ${deletable.length} ПЗ без перевірок?${extra}`, "Масове видалення", "btn-danger", "Видалити"))) return;
  setLoading(true, "Видалення…"); const { ok, fail } = await runBatched(deletable, c => sb.from("port_facilities").delete().eq("code", c));
  setLoading(false); clearFacilitySelection();
  if (fail) notify(`Видалено ${ok}, помилок: ${fail}`, true); else notify(`Видалено ${ok} ПЗ`);
  loadAll(true);
}

/**
 * Функція «copySelectedCodes» — частина логіки модуля.
 */
async function copySelectedCodes() {
  const codes = [...selectedFacCodes]; if (!codes.length) return;
  const txt = codes.join(", ");
  try { await navigator.clipboard.writeText(txt); notify(`Скопійовано ${codes.length} кодів`); }
  catch (_) { await uiAlert(txt, "Коди обраних ПЗ"); }
}
/**
 * Експортує «SelectedExcel».
 */
async function exportSelectedExcel() {
  const rows = state.facilities.filter(x => selectedFacCodes.has(x.code));
  if (!rows.length) return notify("Немає обраних записів", true);
  await exportFacilitiesListToExcel(rows, "Обрані ПЗ", `Обрані_ПЗ_${todayLocal()}.xlsx`);
}
