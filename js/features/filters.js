/* Збереження фільтрів у сесії, заповнення списків, переходи між вкладками */

function saveDashPrefs() {
  sessionStorage.setItem("dashPrefs", JSON.stringify({
    onlyActive: document.getElementById("chkOnlyActivePorts").checked,
    hideStopped: document.getElementById("chkHideStoppedAlerts").checked,
    calMode: document.getElementById("calHorizonMode").value,
    execMode: document.getElementById("chkExecutiveMode").checked
  }));
}
/**
 * Відновлює налаштування аналітики з sessionStorage.
 */
function restoreDashPrefs() {
  try {
    const d = JSON.parse(sessionStorage.getItem("dashPrefs") || "null");
    if (!d) return;
    if (typeof d.onlyActive === "boolean") document.getElementById("chkOnlyActivePorts").checked = d.onlyActive;
    if (typeof d.hideStopped === "boolean") document.getElementById("chkHideStoppedAlerts").checked = d.hideStopped;
    if (d.calMode) setSelectSafe("calHorizonMode", d.calMode, "BY_YEAR");
    if (typeof d.execMode === "boolean") { document.getElementById("chkExecutiveMode").checked = d.execMode; toggleExecutiveMode(true); }
  } catch (_) {}
}
/**
 * Зберігає фільтри реєстру ПЗ у sessionStorage.
 */
function saveFilters() {
  sessionStorage.setItem("facFilters", JSON.stringify({
    search: document.getElementById("fltSearch").value, port: document.getElementById("fltPort").value,
    badge: document.getElementById("fltBadge").value, quick: document.getElementById("fltQuick").value,
    sort: document.getElementById("fltSort").value
  }));
}
/**
 * Відновлює фільтри реєстру ПЗ.
 */
function restoreFilters() {
  try {
    const d = JSON.parse(sessionStorage.getItem("facFilters") || "null");
    if (!d) return;
    if (d.search !== undefined) document.getElementById("fltSearch").value = d.search;
    if (d.port !== undefined) setSelectSafe("fltPort", d.port, "ALL");
    if (d.badge !== undefined) setSelectSafe("fltBadge", d.badge, "ALL");
    if (d.quick !== undefined) setSelectSafe("fltQuick", d.quick, "NONE");
    if (d.sort !== undefined) setSelectSafe("fltSort", d.sort, "DEFAULT");
  } catch (_) {}
}
/**
 * Зберігає фільтри перевірок.
 */
function saveInspFilters() {
  sessionStorage.setItem("inspFilters", JSON.stringify({ q: document.getElementById("inspSearch").value, yr: document.getElementById("inspYearFlt").value, st: document.getElementById("inspStatFlt").value }));
}
/**
 * Відновлює фільтри перевірок.
 */
function restoreInspFilters() {
  try {
    const d = JSON.parse(sessionStorage.getItem("inspFilters") || "null");
    if (!d) return;
    if (d.q !== undefined) document.getElementById("inspSearch").value = d.q;
    if (d.yr !== undefined) setSelectSafe("inspYearFlt", d.yr, "ALL");
    if (d.st !== undefined) setSelectSafe("inspStatFlt", d.st, "ALL");
  } catch (_) {}
}
/**
 * Зберігає дані «VesselsPrefs».
 */
function saveVesselsPrefs() { sessionStorage.setItem("vesYearFlt", document.getElementById("vesYearFlt").value); }
/**
 * Відновлює фільтр року на вкладці «Судна».
 */
function restoreVesselsPrefs() { const v = sessionStorage.getItem("vesYearFlt"); if (v) setSelectSafe("vesYearFlt", v, "ALL"); }
/**
 * Зберігає стан календаря перевірок.
 */
function saveCalPrefs() { sessionStorage.setItem("calPrefs", JSON.stringify({ y: calYear, m: calMonth, st: document.getElementById("calStatusFlt").value, vi: document.getElementById("calShowVesselInsp")?.checked !== false, vd: document.getElementById("calShowVesselDocs")?.checked !== false })); }
/**
 * Відновлює стан календаря перевірок.
 */
function restoreCalPrefs() {
  try {
    const d = JSON.parse(sessionStorage.getItem("calPrefs") || "null");
    if (!d) return;
    if (typeof d.y === "number") calYear = d.y;
    if (typeof d.m === "number") calMonth = d.m;
    if (d.st) setSelectSafe("calStatusFlt", d.st, "ALL");
    const vi = document.getElementById("calShowVesselInsp"); if (vi && typeof d.vi === "boolean") vi.checked = d.vi;
    const vd = document.getElementById("calShowVesselDocs"); if (vd && typeof d.vd === "boolean") vd.checked = d.vd;
  } catch (_) {}
}

/**
 * Заповнює списки портів/станів/років у фільтрах.
 */
function populateFilters() {
  const fltPort = document.getElementById("fltPort"), curP = fltPort.value;
  fltPort.innerHTML = '<option value="ALL">Усі зони</option>' + state.ports.map(p => `<option value="${esc(p.port_name)}">${esc(p.section_roman)}. ${esc(p.port_name)}</option>`).join("");
  if (curP) setSelectSafe("fltPort", curP, "ALL");

  const badges = [...new Set(state.facilities.map(f => f.auto_badge))], fltB = document.getElementById("fltBadge"), curB = fltB.value;
  fltB.innerHTML = '<option value="ALL">Усі стани</option>' + badges.map(b => `<option>${esc(b)}</option>`).join("");
  if (curB) setSelectSafe("fltBadge", curB, "ALL");

  const years = [...new Set(state.inspections.map(i => i.inspection_year).filter(Boolean))].sort((a, b) => b - a);
  const iy = document.getElementById("inspYearFlt"), curIY = iy.value;
  iy.innerHTML = '<option value="ALL">Усі роки</option>' + years.map(y => `<option>${y}</option>`).join("");
  if (curIY) setSelectSafe("inspYearFlt", curIY, "ALL");

  const vYears = [...new Set(state.vessels.map(v => v.year))].sort((a, b) => b - a);
  const vy = document.getElementById("vesYearFlt"), curVY = vy.value;
  vy.innerHTML = '<option value="ALL">Усі роки</option>' + vYears.map(y => `<option>${y}</option>`).join("");
  if (curVY) setSelectSafe("vesYearFlt", curVY, "ALL");
}

/**
 * Функція «jumpToFacilities» — частина логіки модуля.
 */
function jumpToFacilities({ port = "ALL", badge = "ALL", quick = "NONE", search = "", sort = "DEFAULT", custom = null } = {}) {
  customFacFilter = custom;
  document.getElementById("fltSearch").value = search;
  setSelectSafe("fltPort", port, "ALL");
  setSelectSafe("fltBadge", badge, "ALL");
  setSelectSafe("fltQuick", quick, "NONE");
  setSelectSafe("fltSort", sort, "DEFAULT");
  renderFacilities();
  bootstrap.Tab.getOrCreateInstance(document.querySelector('[data-bs-target="#tabFacilities"]')).show();
}
/**
 * Очищає «CustomFilter».
 */
function clearCustomFilter() { customFacFilter = null; renderFacilities(); }
/**
 * Функція «flipCustomFilter» — частина логіки модуля.
 */
function flipCustomFilter() {
  if (!customFacFilter || !customFacFilter.altCodes) return;
  customFacFilter = { label: customFacFilter.altLabel, codes: customFacFilter.altCodes, altLabel: customFacFilter.label, altCodes: customFacFilter.codes };
  renderFacilities();
}
/**
 * Перехід до перевірок конкретного ПЗ.
 */
function openFacilityInspections(code) {
  document.getElementById("inspSearch").value = code;
  document.getElementById("inspYearFlt").value = "ALL";
  document.getElementById("inspStatFlt").value = "ALL";
  saveInspFilters(); renderInspections();
  bootstrap.Tab.getOrCreateInstance(document.querySelector('[data-bs-target="#tabInspections"]')).show();
}
function jumpToInspections({ year = "ALL", status = "ALL", search = "" } = {}) {
  const qEl = document.getElementById("inspSearch");
  if (qEl) qEl.value = search;
  setSelectSafe("inspYearFlt", String(year), "ALL");
  setSelectSafe("inspStatFlt", status, "ALL");
  saveInspFilters();
  renderInspections();
  bootstrap.Tab.getOrCreateInstance(document.querySelector('[data-bs-target="#tabInspections"]')).show();
}

function jumpToRiskyFacilities() {
  const activeOp = (Array.isArray(state?.facilities) ? state.facilities : []).filter(x => x && x.is_active_operational);
  const codes = new Set(activeOp.filter(x => calcRiskInfo(x).score > 0).map(x => x.code));
  jumpToFacilities({
    sort: "RISK",
    custom: { label: `Діючі ПЗ із ризиком > 0 (${codes.size} ПЗ)`, codes }
  });
}