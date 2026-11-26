/* Картка ПЗ: редагування, перевірки, історія змін */

function updateFacilityHints() {
  const hints = [], today = todayLocal();
  const actStatus = document.getElementById("fActStatus").value, actDt = document.getElementById("fActDt").value;
  const popzDt = document.getElementById("fPopzDt").value, gisisDt = document.getElementById("fGisisDt").value;
  if (actStatus === "Чинний" && !actDt) hints.push("Статус Акту «Чинний», але дата не вказана.");
  else if (actStatus === "Чинний" && actDt && actDt < today) hints.push(`Дата «Акт до» (${actDt}) вже минула.`);
  if (popzDt && gisisDt && popzDt !== gisisDt) hints.push(`Розбіжність: ПОПЗ (${popzDt}) ≠ ГІСІС (${gisisDt}).`);
  const box = document.getElementById("fValidationHints");
  if (hints.length) { box.innerHTML = hints.map(h => `<div><i class="bi bi-exclamation-circle me-1"></i>${esc(h)}</div>`).join(""); box.classList.remove("d-none"); }
  else { box.innerHTML = ""; box.classList.add("d-none"); }
}

/**
 * З картки ПЗ — до списку його перевірок.
 */
function jumpToCurrentFacilityInspections() { const code = document.getElementById("fCode").value.trim(); bootstrap.Modal.getInstance(document.getElementById("facilityModal")).hide(); openFacilityInspections(code); }
/**
 * З картки ПЗ — нова перевірка з підставленим кодом.
 */
function addInspectionForCurrentFacility() { const code = document.getElementById("fCode").value.trim(); bootstrap.Modal.getInstance(document.getElementById("facilityModal")).hide(); openInspectionModal(null, code); }

/**
 * Завантажує «FacilityTimeline».
 */
async function loadFacilityTimeline(code) {
  const box = document.getElementById("fTimelineBox"), list = document.getElementById("fTimelineList");
  if (!code || !sb) { box.classList.add("d-none"); return; }
  box.classList.remove("d-none"); list.textContent = "Завантаження історії…";
  try {
    const { data, error } = await sb.from("audit_log").select("*").eq("record_id", code).order("changed_at", { ascending: false }).limit(12);
    if (error) throw error;
    if (!data || !data.length) { list.textContent = "Записів історії змін для цього ПЗ ще немає."; return; }
    list.innerHTML = data.map(a => {
      const dt = new Date(a.changed_at).toLocaleString("uk-UA");
      const actLabel = a.action === "INSERT" ? "створено" : a.action === "DELETE" ? "видалено" : "оновлено";
      const diffKeys = [];
      if (a.old_data && a.new_data) {
        for (const k of Object.keys(a.new_data)) { if (!["updated_at", "updated_by"].includes(k) && JSON.stringify(a.old_data[k]) !== JSON.stringify(a.new_data[k])) diffKeys.push(k); }
      }
      return `<div class="timeline-item"><b>${esc(dt)}</b> · <span class="text-primary">${esc(actLabel)}</span>${a.changed_by ? " (" + esc(a.changed_by) + ")" : ""}${diffKeys.length ? ` — <span class="text-dark">${esc(diffKeys.join(", "))}</span>` : ""}</div>`;
    }).join("");
  } catch (_) { list.textContent = "Історія змін недоступна."; }
}

/**
 * Відкриває картку створення/редагування ПЗ.
 */
function openFacilityModal(code) {
  isNewFacility = !code; let x = {};
  if (code) { const found = state.facilities.find(r => r.code === code); if (!found) { notify(`ПЗ з кодом «${code}» не знайдено`, true); return; } x = found; }
  const fPort = document.getElementById("fPort");
  fPort.innerHTML = state.ports.map(p => `<option value="${p.id}">${esc(p.port_name)}</option>`).join("");
  editingFacilityUpdatedAt = x?.updated_at || null;
  document.getElementById("facModalTitle").textContent = isNewFacility ? "Новий портовий засіб" : `Редагування: ${code}`;
  const codeEl = document.getElementById("fCode"); codeEl.value = x.code || ""; codeEl.readOnly = !isNewFacility;
  const hasInsp = code ? state.inspections.some(i => i.facility_code === code) : false;
  document.getElementById("btnDeleteFac").classList.toggle("d-none", isNewFacility || hasInsp);
  document.getElementById("fName").value = x.name || ""; if (x.port_id) fPort.value = x.port_id;
  document.getElementById("fStatus").value = x.facility_status || "Діючий"; document.getElementById("fActStatus").value = x.act_status || "Відсутній";
  document.getElementById("fActDt").value = x.act_expiry_date || ""; document.getElementById("fOopzDt").value = x.oopz_expiry_date || "";
  document.getElementById("fPopzDt").value = x.popz_expiry_date || ""; document.getElementById("fGisisDt").value = x.gisis_popz_expiry_date || "";
  document.getElementById("fOfficers").value = x.officers_popz || ""; document.getElementById("fOfficersGisis").value = x.officers_gisis_status || "";
  document.getElementById("fHead").value = x.head_popz || ""; document.getElementById("fHeadGisis").value = x.head_gisis_status || "";
  document.getElementById("fManualConc").value = x.manual_conclusion || ""; document.getElementById("fComments").value = x.comments || "";
  document.getElementById("fAuditMeta").textContent = (x.updated_at ? `Оновлено: ${new Date(x.updated_at).toLocaleString("uk-UA")}${x.updated_by ? " (" + x.updated_by + ")" : ""}` : "") + (hasInsp ? " · Видалення заблоковано (є перевірки)" : "");

  const inspBox = document.getElementById("fInspectionsBox");
  if (isNewFacility) { inspBox.classList.add("d-none"); document.getElementById("fTimelineBox").classList.add("d-none"); }
  else {
    inspBox.classList.remove("d-none");
    const rel = state.inspections.filter(i => i.facility_code === code).slice(0, 3);
    document.getElementById("fInspectionsList").innerHTML = rel.length ? rel.map(i => `<div class="d-flex justify-content-between align-items-center py-1 border-bottom"><span><b>${esc(i.inspection_year)}</b> (${esc(i.period_raw || i.date_start || "—")}) — <span class="badge ${i.status === "Проведено" ? "bg-success" : i.status === "Заплановано" ? "bg-primary" : "bg-secondary"}">${esc(i.status)}</span></span><button type="button" class="btn btn-sm btn-link py-0 px-1" data-action="edit-inspection" data-id="${i.id}" data-hide-modal="facilityModal"><i class="bi bi-pencil"></i></button></div>`).join("") : "Перевірок ще немає";
    loadFacilityTimeline(code);
  }
  updateFacilityHints();
  bootstrap.Modal.getOrCreateInstance(document.getElementById("facilityModal")).show();
}

/**
 * Зберігає ПЗ у БД з перевіркою concurrent update.
 */
async function saveFacility() {
  const payload = {
    code: document.getElementById("fCode").value.trim().toUpperCase(), name: document.getElementById("fName").value.trim(),
    port_id: parseInt(document.getElementById("fPort").value, 10), facility_status: document.getElementById("fStatus").value,
    act_status: document.getElementById("fActStatus").value, act_expiry_date: nullIfEmpty(document.getElementById("fActDt").value),
    oopz_expiry_date: nullIfEmpty(document.getElementById("fOopzDt").value), popz_expiry_date: nullIfEmpty(document.getElementById("fPopzDt").value),
    gisis_popz_expiry_date: nullIfEmpty(document.getElementById("fGisisDt").value), officers_popz: nullIfEmpty(document.getElementById("fOfficers").value),
    officers_gisis_status: nullIfEmpty(document.getElementById("fOfficersGisis").value), head_popz: nullIfEmpty(document.getElementById("fHead").value),
    head_gisis_status: nullIfEmpty(document.getElementById("fHeadGisis").value), manual_conclusion: nullIfEmpty(document.getElementById("fManualConc").value),
    comments: nullIfEmpty(document.getElementById("fComments").value), updated_at: new Date().toISOString(), updated_by: getOperator()
  };
  if (!payload.code || !payload.name) return uiAlert("Заповніть код і назву ПЗ", "Помилка");

  if (!isNewFacility) {
    try {
      const { data: fresh } = await sb.from("port_facilities").select("updated_at, updated_by").eq("code", payload.code).single();
      if (fresh?.updated_at && editingFacilityUpdatedAt && fresh.updated_at !== editingFacilityUpdatedAt) {
        const who = fresh.updated_by ? ` (${fresh.updated_by})` : "", when = new Date(fresh.updated_at).toLocaleString("uk-UA");
        if (!(await uiConfirm(`Запис ${payload.code} вже змінили${who} о ${when}.\n\nПерезаписати своїми даними?`, "Конфлікт одночасного редагування", "btn-warning", "Перезаписати"))) {
          bootstrap.Modal.getInstance(document.getElementById("facilityModal")).hide(); loadAll(); return;
        }
      }
    } catch (_) {}
  }

  setLoading(true, "Збереження…");
  const { error } = isNewFacility ? await sb.from("port_facilities").insert(payload) : await sb.from("port_facilities").update(payload).eq("code", payload.code);
  setLoading(false);
  if (error) return notify("Помилка: " + error.message, true);
  bootstrap.Modal.getInstance(document.getElementById("facilityModal")).hide();
  notify(`Збережено ${payload.code}`); loadAll(true);
}

/**
 * Видаляє ПЗ після підтвердження.
 */
async function deleteFacility() {
  const code = document.getElementById("fCode").value.trim();
  if (!(await uiConfirm(`Видалити чернетку ПЗ ${code}? Дію неможливо скасувати.`, "Видалення ПЗ", "btn-danger", "Видалити"))) return;
  setLoading(true, "Видалення…");
  const { error } = await sb.from("port_facilities").delete().eq("code", code);
  setLoading(false);
  if (error) return notify("Неможливо видалити: " + error.message, true);
  bootstrap.Modal.getInstance(document.getElementById("facilityModal")).hide();
  notify(`Видалено ${code}`); loadAll(true);
}
