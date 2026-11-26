/* Реєстр ПЗ: фільтрація та відображення таблиці */

function resetFacilityFilters() {
  customFacFilter = null;
  document.getElementById("fltSearch").value = ""; document.getElementById("fltPort").value = "ALL";
  document.getElementById("fltBadge").value = "ALL"; document.getElementById("fltQuick").value = "NONE";
  document.getElementById("fltSort").value = "DEFAULT"; sessionStorage.removeItem("facFilters");
  renderFacilities();
}

/**
 * Повертає відфільтрований і відсортований список ПЗ.
 */
function getFilteredFacilities() {
  const q = document.getElementById("fltSearch").value.trim().toLowerCase();
  const p = document.getElementById("fltPort").value, b = document.getElementById("fltBadge").value;
  const quick = document.getElementById("fltQuick").value, sortMode = document.getElementById("fltSort").value;

  let rows = state.facilities.filter(x => {
    if (customFacFilter && !customFacFilter.codes.has(x.code)) return false;
    if (p !== "ALL" && x.port_name !== p) return false;
    if (b !== "ALL" && x.auto_badge !== b) return false;
    if (quick === "OVERDUE_ACTIVE" && !isOverdueActive(x)) return false;
    else if (quick === "SOON30" && !isSoonActive(x, 30)) return false;
    else if (quick === "SOON60" && !isSoonActive(x, 60)) return false;
    else if (quick === "SOON90" && !isSoonActive(x, 90)) return false;
    else if (quick === "GISIS" && !x.has_gisis_date_mismatch) return false;
    else if (quick === "ACTIVE_ONLY" && !x.is_active_operational) return false;
    else if (quick === "VALID_OR_PROC" && !(x.is_active_operational && ["Чинний", "В процесі отримання Акта"].includes(x.auto_badge))) return false;
    else if (quick === "BAD_ACTIVE" && !(x.is_active_operational && (x.auto_badge === "Прострочено" || x.has_gisis_date_mismatch))) return false;
    if (q) {
      const hay = `${x.code} ${x.name} ${x.port_name} ${x.officers_popz || ""} ${x.officers_gisis_status || ""} ${x.head_popz || ""} ${x.comments || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (sortMode === "CODE") rows = [...rows].sort((a, b) => a.code.localeCompare(b.code));
  else if (sortMode === "URGENCY") rows = [...rows].sort((a, b) => (minDays(a) ?? 99999) - (minDays(b) ?? 99999));
  else if (sortMode === "RISK") rows = [...rows].sort((a, b) => calcRiskInfo(b).score - calcRiskInfo(a).score || a.code.localeCompare(b.code));
  return rows;
}

/**
 * Малює реєстр ПЗ (з віртуалізацією).
 */
function renderFacilities() {
  saveFilters();
  const banner = document.getElementById("customFilterBanner"), flipBtn = document.getElementById("btnFlipCustomFilter");
  if (customFacFilter) {
    document.getElementById("customFilterLabel").textContent = customFacFilter.label;
    if (customFacFilter.altCodes) { flipBtn.textContent = customFacFilter.altLabel; flipBtn.classList.remove("d-none"); }
    else flipBtn.classList.add("d-none");
    banner.classList.remove("d-none");
  } else banner.classList.add("d-none");

  const rows = getFilteredFacilities();
  document.getElementById("facCountLabel").textContent = rows.length;
  mountVirtual({
    wrap: "facilitiesWrap", body: "facilitiesBody", colspan: 14, estimate: 48,
    emptyHtml: '<tr><td colspan="14" class="text-center text-muted py-3">Нічого не знайдено</td></tr>',
    rowHtml: rows.map(x => {
      const cls = x.auto_badge === "Чинний" ? "row-ok" : x.auto_badge === "В процесі отримання Акта" ? "row-proc" : x.auto_badge === "Критично (< 60 дн.)" ? "row-warn" : x.auto_badge === "Прострочено" ? "row-bad" : ["Порт закрито", "Виключено з переліку", "Роботу зупинено"].includes(x.auto_badge) ? "row-gray" : "";
      const isChecked = selectedFacCodes.has(x.code) ? "checked" : "";
      return `<tr class="${cls}">
      <td class="no-print text-center"><input type="checkbox" class="fac-sel-chk" data-code="${esc(x.code)}" ${isChecked} data-action="toggle-select" /></td>
      <td class="no-print"><div class="d-flex gap-1"><button class="btn btn-sm btn-outline-primary py-0 px-2" title="Редагувати" data-action="edit-facility" data-code="${esc(x.code)}"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-secondary py-0 px-2" title="Перевірки" data-action="facility-inspections" data-code="${esc(x.code)}"><i class="bi bi-clipboard2-check"></i></button></div></td>
      <td><b>${esc(x.code)}</b></td><td class="small">${esc(x.port_name)}</td><td>${esc(x.name)}</td><td>${badgeHtml(x.auto_badge)}</td>
      <td>${x.act_expiry_date ? formatDateCell(x.act_expiry_date, x.days_to_act_expiry) : `<span class="small text-muted">${esc(x.act_status)}</span>`}</td>
      <td>${formatDateCell(x.oopz_expiry_date, x.days_to_oopz_expiry)}</td><td>${formatDateCell(x.popz_expiry_date, x.days_to_popz_expiry)}</td>
      <td class="small">${esc(x.officers_popz || "—")}</td>
      <td class="small">${esc(x.head_popz || "—")}${x.head_gisis_status && x.head_gisis_status !== "—" ? `<br><span class="text-muted">${esc(x.head_gisis_status)}</span>` : ""}</td>
      <td class="small">${esc(x.auto_conclusion)}</td><td class="small">${esc(x.last_inspection_text)}</td><td class="small text-muted">${esc(x.comments)}</td>
    </tr>`;
    })
  });
  syncBulkUi();
}
const renderFacilitiesDebounced = debounce(renderFacilities, 220);
