/**
 * app.js — точка входу застосунку.
 *
 * Порядок старту (DOMContentLoaded):
 *  1. Views.mount()           — вставка HTML вкладок і модалок
 *  2. bindNavbarEvents()      — кнопки шапки
 *  3. bindTabEvents()         — вкладки + друк
 *  4. bindActionDelegation()  — data-action у таблицях
 *  5. bindGlobalEvents()      — visibility + «/»
 *  6. initClient()            — Supabase, кеш, Realtime, loadAll
 */

/**
 * Ініціалізація клієнта Supabase, відновлення вкладки/автооновлення,
 * показ кешу (якщо є) і повне завантаження з мережі.
 */
async function initClient() {
  const savedTab = localStorage.getItem("activeTab");
  if (savedTab) {
    const tabBtn = document.querySelector(`#mainTabs [data-bs-target="${savedTab}"]`);
    if (tabBtn) bootstrap.Tab.getOrCreateInstance(tabBtn).show();
  }
  const savedRefresh = localStorage.getItem("autoRefreshMs") || "0";
  const refSel = document.getElementById("autoRefreshSelect");
  if (refSel) {
    setSelectSafe("autoRefreshSelect", savedRefresh, "0");
    changeAutoRefresh(refSel.value);
  }

  initColumnMenu();
  restoreDashPrefs();

  const u = localStorage.getItem("sb_url") || DEFAULT_URL;
  const k = getStoredKey();
  if (!k) {
    showAlert("Натисніть «Налаштування» і вставте Anon Key");
    openConfigModal();
    return;
  }
  sb = supabase.createClient(u, k);

  const op = localStorage.getItem("operator_name");
  const badge = document.getElementById("userBadge");
  if (op) {
    badge.textContent = op;
    badge.classList.remove("d-none");
  } else {
    badge.classList.add("d-none");
  }

  // Швидкий старт з IndexedDB, поки йде мережевий запит
  const cached = await idbCache.get("app_state");
  if (cached && Array.isArray(cached.facilities) && cached.facilities.length) {
    state.ports = cached.ports || [];
    state.facilities = cached.facilities || [];
    state.inspections = cached.inspections || [];
    state.vessels = cached.vessels || [];
    applyAllDataToUi();
    updateSyncLabels(cached.savedAt);
  }
  setupRealtime();
  loadAll(!!cached);
}

/**
 * Обробники кліків верхньої панелі (порти, журнал, налаштування, PDF, друк, оновити).
 */
function bindNavbarEvents() {
  document.querySelector(".navbar-custom")?.addEventListener("click", e => {
    const btn = e.target.closest("[data-nav-action]");
    if (!btn) return;
    const actions = {
      ports: () => openPortsModal(),
      audit: () => openAuditModal(),
      config: () => openConfigModal(),
      pdf: () => exportPdfReport(),
      print: () => window.print(),
      refresh: () => loadAll()
    };
    actions[btn.dataset.navAction]?.();
  });

  document.getElementById("autoRefreshSelect")?.addEventListener("change", e => {
    changeAutoRefresh(e.target.value);
  });
}

/**
 * Збереження активної вкладки, анімація появи, перемальовка графіків/календаря,
 * підготовка таблиць до друку.
 */
function bindTabEvents() {
  document.getElementById("mainTabs").addEventListener("shown.bs.tab", evt => {
    const target = evt.target.getAttribute("data-bs-target");
    if (target) {
      localStorage.setItem("activeTab", target);
      animateEl(document.querySelector(target), {
        opacity: [0, 1],
        transform: ["translateY(6px)", "translateY(0)"]
      }, { duration: 190 });
    }
    if (target === "#tabDashboard" && chartsDirty && !document.getElementById("chkExecutiveMode").checked) {
      renderCharts();
    }
    if (target === "#tabCalendar") renderCalendar();
    repaintAllVirtual();
  });

  window.addEventListener("beforeprint", () => {
    const printDate = document.getElementById("printDateLabel");
    if (printDate) printDate.textContent = new Date().toLocaleString("uk-UA");
    document.body.classList.add("is-printing");
    expandAllVirtualForPrint();
  });
  window.addEventListener("afterprint", () => {
    document.body.classList.remove("is-printing");
    repaintAllVirtual();
  });
}

/**
 * Єдиний делегат кліків по елементах з data-action
 * (редагування ПЗ, перевірки, чекбокси вибору тощо).
 */
function bindActionDelegation() {
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const { action, code, id, hideModal, status } = el.dataset;
    if (hideModal) bootstrap.Modal.getInstance(document.getElementById(hideModal))?.hide();
    switch (action) {
      case "edit-facility":
      case "view-facility":
        openFacilityModal(code);
        break;
      case "facility-inspections": openFacilityInspections(code); break;
      case "toggle-select": toggleSelectFacility(code, el.checked); break;
      case "edit-inspection": openInspectionModal(parseInt(id, 10)); break;
      case "edit-conv-vessel": openConventionVesselModal(id); break;
      case "cal-select-day": selectCalDay(el.dataset.date); break;
      case "edit-vessel-insp": openVesselInspectionModal(id); break;
      case "cal-filter-status":
        if (typeof toggleCalStatusPill === "function") toggleCalStatusPill(status);
        break;
    }
  });
}

/**
 * Фонове оновлення при поверненні на вкладку браузера;
 * гаряча клавіша «/» — фокус у пошук реєстру ПЗ.
 */
function bindGlobalEvents() {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && autoRefreshIntervalMs > 0 && sb && !document.querySelector(".modal.show")) {
      if (Date.now() - lastLoadTime >= autoRefreshIntervalMs) loadAll(true);
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (document.activeElement?.tagName || "").toUpperCase();
    if (["INPUT", "TEXTAREA", "SELECT"].includes(tag) || document.activeElement?.isContentEditable || document.querySelector(".modal.show")) return;
    e.preventDefault();
    const tabBtn = document.querySelector('#mainTabs [data-bs-target="#tabFacilities"]');
    if (tabBtn) bootstrap.Tab.getOrCreateInstance(tabBtn).show();
    setTimeout(() => {
      const inp = document.getElementById("fltSearch");
      if (inp) { inp.focus(); inp.select(); }
    }, 80);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  Views.mount();
  bindNavbarEvents();
  bindTabEvents();
  bindActionDelegation();
  bindGlobalEvents();
  initClient();
});
