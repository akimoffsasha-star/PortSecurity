/* Вкладка «Перевірки» та картка перевірки */

function renderInspections() {
  const q = document.getElementById("inspSearch").value.trim().toLowerCase(), yr = document.getElementById("inspYearFlt").value, st = document.getElementById("inspStatFlt").value;
  const rows = state.inspections.filter(i => {
    if (yr !== "ALL" && String(i.inspection_year) !== yr) return false;
    if (st !== "ALL" && i.status !== st) return false;
    if (q) { const hay = `${i.facility_code} ${i.port_facilities?.name || ""} ${i.port_facilities?.ports?.port_name || ""} ${i.notes || ""} ${i.period_raw || ""}`.toLowerCase(); if (!hay.includes(q)) return false; }
    return true;
  });
  mountVirtual({
    wrap: "inspectionsWrap", body: "inspectionsBody", colspan: 10, estimate: 40,
    emptyHtml: '<tr><td colspan="10" class="text-center text-muted py-3">Записів немає</td></tr>',
    rowHtml: rows.map(i => `<tr><td class="no-print"><button class="btn btn-sm btn-outline-primary py-0 px-2" onclick="openInspectionModal(${i.id})"><i class="bi bi-pencil"></i></button></td><td><b>${esc(i.facility_code)}</b></td><td class="small">${esc(i.port_facilities?.ports?.port_name)}</td><td>${esc(i.port_facilities?.name)}</td><td>${esc(i.inspection_year)}</td><td>${esc(i.period_raw)}</td><td>${esc(i.date_start)}</td><td>${esc(i.date_end)}</td><td><span class="badge ${i.status === "Проведено" ? "bg-success" : i.status === "Заплановано" ? "bg-primary" : "bg-secondary"}">${esc(i.status)}</span></td><td class="small">${esc(i.notes)}</td></tr>`)
  });
}
const renderInspectionsDebounced = debounce(renderInspections, 220);

/**
 * Відкриває форму створення/редагування перевірки.
 */
function openInspectionModal(id, preselectedCode = null, preselectedDate = null) {
  document.getElementById("iCode").innerHTML = state.facilities.map(f => `<option value="${esc(f.code)}">${esc(f.code)} — ${esc(f.name)}</option>`).join("");
  const item = id ? state.inspections.find(x => x.id === id) : null;
  document.getElementById("iId").value = item ? item.id : "";
  document.getElementById("inspModalTitle").textContent = item ? `Перевірка #${item.id}` : "Нова перевірка";
  document.getElementById("btnDeleteInsp").classList.toggle("d-none", !item);
  document.getElementById("iCode").value = item ? item.facility_code : (preselectedCode || state.facilities[0]?.code || "");
  document.getElementById("iYear").value = item?.inspection_year || (preselectedDate ? parseInt(preselectedDate.slice(0, 4), 10) : new Date().getFullYear());
  document.getElementById("iStart").value = item?.date_start || preselectedDate || "";
  document.getElementById("iEnd").value = item?.date_end || preselectedDate || "";
  document.getElementById("iStatus").value = item?.status || (preselectedDate && preselectedDate > todayLocal() ? "Заплановано" : "Проведено");
  document.getElementById("iNotes").value = item?.notes || "";
  bootstrap.Modal.getOrCreateInstance(document.getElementById("inspModal")).show();
}

/**
 * Зберігає перевірку в БД.
 */
async function saveInspection() {
  const id = document.getElementById("iId").value, ds = nullIfEmpty(document.getElementById("iStart").value), de = nullIfEmpty(document.getElementById("iEnd").value);
  const payload = { facility_code: document.getElementById("iCode").value, inspection_year: parseInt(document.getElementById("iYear").value, 10) || null, date_start: ds, date_end: de, period_raw: ds && de ? (ds === de ? ds : `${ds} — ${de}`) : (ds || null), status: document.getElementById("iStatus").value, notes: nullIfEmpty(document.getElementById("iNotes").value) };
  setLoading(true, "Збереження…");
  const { error } = id ? await sb.from("inspections").update(payload).eq("id", parseInt(id, 10)) : await sb.from("inspections").insert(payload);
  setLoading(false);
  if (error) return notify("Помилка: " + error.message, true);
  bootstrap.Modal.getInstance(document.getElementById("inspModal")).hide(); notify("Збережено"); loadAll(true);
}

/**
 * Видаляє перевірку після підтвердження.
 */
async function deleteInspection() {
  const id = document.getElementById("iId").value;
  if (!id || !(await uiConfirm("Видалити цей запис про перевірку?", "Видалення перевірки", "btn-danger", "Видалити"))) return;
  setLoading(true, "Видалення…"); const { error } = await sb.from("inspections").delete().eq("id", parseInt(id, 10)); setLoading(false);
  if (error) return notify("Помилка: " + error.message, true);
  bootstrap.Modal.getInstance(document.getElementById("inspModal")).hide(); notify("Видалено"); loadAll(true);
}
