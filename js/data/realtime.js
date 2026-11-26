/**
 * realtime.js — підписка Supabase Realtime на зміни таблиць.
 *
 * Після INSERT/UPDATE/DELETE з боку іншого користувача
 * schedulePartialRefresh підтягує лише зачеплені дані (debounce 600 мс).
 * Якщо відкрита модалка редагування — лише сповіщення, без тихого перезапису форми.
 */

/** Таймери debounce окремо для кожної таблиці. */
const partialTimers = {};

/**
 * Планує часткове оновлення після події Realtime.
 * @param {"ports"|"port_facilities"|"inspections"|"vessels_annual_stats"} table
 */
function schedulePartialRefresh(table) {
  clearTimeout(partialTimers[table]);
  partialTimers[table] = setTimeout(async () => {
    if (!sb) return;

    // Не перезаписуємо state під час відкритої форми — користувач може втратити введене
    if (document.querySelector(".modal.show")) {
      notify("База оновилася іншим користувачем. Натисніть «Оновити» після завершення редагування");
      return;
    }

    try {
      if (table === "ports") {
        const [pRes, fRes] = await Promise.all([
          sb.from("ports").select("*").order("sort_order").order("id"),
          sb.from("v_port_facilities_analytics").select("*").order("port_id").order("code")
        ]);
        if (!pRes.error) state.ports = pRes.data;
        if (!fRes.error) state.facilities = fRes.data;
        populateFilters();
        renderDashboard();
        renderFacilities();
      } else if (table === "port_facilities") {
        const fRes = await sb.from("v_port_facilities_analytics").select("*").order("port_id").order("code");
        if (!fRes.error) state.facilities = fRes.data;
        populateFilters();
        renderDashboard();
        renderFacilities();
      } else if (table === "inspections") {
        const [iRes, fRes] = await Promise.all([
          sb.from("inspections")
            .select("*, port_facilities(name, ports(port_name))")
            .order("inspection_year", { ascending: false })
            .order("id", { ascending: false }),
          sb.from("v_port_facilities_analytics").select("*").order("port_id").order("code")
        ]);
        if (!iRes.error) state.inspections = iRes.data;
        if (!fRes.error) state.facilities = fRes.data;
        populateFilters();
        renderDashboard();
        renderFacilities();
        renderInspections();
        renderCalendar();
      } else if (table === "vessels_annual_stats") {
        const vRes = await sb.from("vessels_annual_stats")
          .select("*")
          .order("year", { ascending: false })
          .order("metric_order");
        if (!vRes.error) state.vessels = vRes.data;
        populateFilters();
        renderVessels();
      }
      idbCache.set("app_state", { ...state, savedAt: Date.now() });
      updateSyncLabels();
    } catch (_) { /* мережеві збої Realtime не показуємо як критичні */ }
  }, 600);
}

/**
 * Створює (або пересоздає) канал Realtime на 4 основні таблиці.
 * Викликається після успішного initClient.
 */
function setupRealtime() {
  if (!sb) return;
  if (realtimeChannel) {
    sb.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  realtimeChannel = sb.channel("db-sync-partial")
    .on("postgres_changes", { event: "*", schema: "public", table: "port_facilities" },
      () => schedulePartialRefresh("port_facilities"))
    .on("postgres_changes", { event: "*", schema: "public", table: "inspections" },
      () => schedulePartialRefresh("inspections"))
    .on("postgres_changes", { event: "*", schema: "public", table: "ports" },
      () => schedulePartialRefresh("ports"))
    .on("postgres_changes", { event: "*", schema: "public", table: "vessels_annual_stats" },
      () => schedulePartialRefresh("vessels_annual_stats"))
    .subscribe();
}
