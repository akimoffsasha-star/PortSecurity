/**
 * loader.js — завантаження даних із Supabase та оновлення UI.
 */

function updateSyncLabels(fromCacheAt = null) {
  const syncEl = document.getElementById("lastSyncBadge");
  if (syncEl) {
    syncEl.textContent = fromCacheAt
      ? "Кеш: " + new Date(fromCacheAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })
      : "Оновлено: " + new Date().toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  const prtEl = document.getElementById("printDateLabel");
  if (prtEl) prtEl.textContent = new Date().toLocaleString("uk-UA");
}

async function safeSelect(queryBuilder) {
  try {
    const res = await queryBuilder;
    if (res.error) {
      console.warn("safeSelect:", res.error.message || res.error);
      return [];
    }
    return res.data || [];
  } catch (e) {
    console.warn("safeSelect exception:", e);
    return [];
  }
}

function applyAllDataToUi() {
  const validCodes = new Set(state.facilities.map(f => f.code));
  selectedFacCodes = new Set([...selectedFacCodes].filter(c => validCodes.has(c)));
  populateFilters();
  restoreFilters();
  restoreInspFilters();
  restoreVesselsPrefs();
  restoreCalPrefs();
  renderDashboard();
  renderFacilities();
  renderInspections();
  renderCalendar();
  if (typeof renderConventionVessels === "function") renderConventionVessels();
  if (typeof renderVesselInspections === "function") renderVesselInspections();
  if (typeof renderVessels === "function") renderVessels();
}

async function loadAll(silent = false) {
  if (!sb) return;
  hideAlert();
  if (!silent) setLoading(true, "Завантаження даних…");

  const scrollIds = [
    "alertsWrap", "riskWrap", "facilitiesWrap", "inspectionsWrap",
    "vesselsWrap", "convVesselsWrap", "vesselInspWrap"
  ];
  const saved = scrollIds.map(id => {
    const el = document.getElementById(id);
    return { id, top: el ? el.scrollTop : 0, left: el ? el.scrollLeft : 0 };
  });
  const winY = window.scrollY;

  try {
    const [ports, facilities, inspections, vessels, conventionVessels, vesselInspections] = await Promise.all([
      safeSelect(sb.from("ports").select("*").order("sort_order").order("id")),
      safeSelect(sb.from("v_port_facilities_analytics").select("*").order("port_id").order("code")),
      safeSelect(sb.from("inspections").select("*, port_facilities(name, ports(port_name))").order("inspection_year", { ascending: false }).order("id", { ascending: false })),
      safeSelect(sb.from("vessels_annual_stats").select("*").order("year", { ascending: false }).order("metric_order")),
      safeSelect(sb.from("convention_vessels").select("*").order("name")),
      safeSelect(sb.from("vessel_inspections").select("*").order("inspection_date", { ascending: false }).order("id", { ascending: false }))
    ]);

    state.ports = ports;
    state.facilities = facilities;
    state.inspections = inspections;
    state.vessels = vessels;
    state.conventionVessels = conventionVessels;
    state.vesselInspections = vesselInspections;
    lastLoadTime = Date.now();
    idbCache.set("app_state", { ...state, savedAt: lastLoadTime });
    applyAllDataToUi();
    updateSyncLabels();

    requestAnimationFrame(() => {
      saved.forEach(s => {
        const el = document.getElementById(s.id);
        if (el) { el.scrollTop = s.top; el.scrollLeft = s.left; }
      });
      window.scrollTo(0, winY);
    });
  } catch (err) {
    showAlert("Помилка: " + (err.message || JSON.stringify(err)), "danger");
  } finally {
    if (!silent) setLoading(false);
  }
}
