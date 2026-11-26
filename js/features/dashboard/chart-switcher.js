/* Компонент перемикання типу графіка у стилі shadcn/ui Segmented Control */

const PSM_CHART_TYPE_STORAGE_KEY = "psm.dashboard.chartTypes.v2";

const PSM_CHART_TYPE_META = {
  bar: {
    label: "Bar",
    title: "Стовпчиковий графік",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="8" rx="1"/><rect x="12" y="6" width="3" height="12" rx="1"/><rect x="17" y="13" width="3" height="5" rx="1"/></svg>`,
  },
  line: {
    label: "Line",
    title: "Лінійний графік",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 5-7"/></svg>`,
  },
  area: {
    label: "Area",
    title: "Графік з областю",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 15l4-4 4 3 5-6v10H7z"/></svg>`,
  },
  doughnut: {
    label: "Donut",
    title: "Кільцева діаграма",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>`,
  },
  bubble: {
    label: "Bubble",
    title: "Кулькова діаграма",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="14" r="5"/><circle cx="16.5" cy="8.5" r="3.5"/><circle cx="17" cy="16.5" r="2"/></svg>`,
  },
};

/**
 * Функція «readChartTypePrefs» — частина логіки модуля.
 */
function readChartTypePrefs() {
  try {
    return JSON.parse(localStorage.getItem(PSM_CHART_TYPE_STORAGE_KEY) || "{}");
  } catch (_) {
    return {};
  }
}

/**
 * Зберігає дані «ChartTypePref».
 */
function saveChartTypePref(chartId, type) {
  try {
    const prefs = readChartTypePrefs();
    prefs[chartId] = type;
    localStorage.setItem(PSM_CHART_TYPE_STORAGE_KEY, JSON.stringify(prefs));
  } catch (_) {}
}

/**
 * Обчислює/повертає «SavedChartType».
 */
function getSavedChartType(chartId, fallbackType = "bar", allowedTypes = null) {
  const prefs = readChartTypePrefs();
  const saved = prefs[chartId];
  if (saved && (!Array.isArray(allowedTypes) || allowedTypes.includes(saved))) {
    return saved;
  }
  return fallbackType;
}

/**
 * Відображає «ChartTypeSwitcher» у відповідній вкладці/блоці.
 */
function renderChartTypeSwitcher({
  chartId,
  allowedTypes = ["bar", "line", "area", "bubble"],
  activeType,
  onChange,
}) {
  const current = activeType || getSavedChartType(chartId, allowedTypes[0], allowedTypes);
  const wrap = document.createElement("div");
  wrap.className = "psm-chart-switcher no-print";
  wrap.setAttribute("role", "group");
  wrap.setAttribute("aria-label", "Тип графіка");

  allowedTypes.forEach((type) => {
    const meta = PSM_CHART_TYPE_META[type] || { label: type, title: type, icon: "" };
    const isActive = type === current;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `psm-chart-switcher__btn${isActive ? " is-active" : ""}`;
    btn.dataset.chartType = type;
    btn.title = meta.title;
    btn.setAttribute("aria-pressed", String(isActive));
    btn.innerHTML = `${meta.icon}<span>${meta.label}</span>`;

    btn.addEventListener("click", () => {
      if (btn.classList.contains("is-active")) return;
      wrap.querySelectorAll(".psm-chart-switcher__btn").forEach((el) => {
        el.classList.remove("is-active");
        el.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
      if (chartId) saveChartTypePref(chartId, type);
      if (typeof onChange === "function") onChange(type);
    });

    wrap.appendChild(btn);
  });

  return wrap;
}

/**
 * Функція «mountChartSwitchers» — частина логіки модуля.
 */
function mountChartSwitchers() {
  const slots = [
    {
      selector: '[data-chart-switcher-for="ports"]',
      chartId: "ports",
      allowedTypes: ["bar", "bubble", "line"],
      defaultType: "bar",
      onChange: () => {
        if (typeof renderCharts === "function") renderCharts();
      },
    },
    {
      selector: '[data-chart-switcher-for="readiness"]',
      chartId: "readiness",
      allowedTypes: ["bar", "bubble", "line"],
      defaultType: "bar",
      onChange: () => {
        if (typeof renderCharts === "function") renderCharts();
      },
    },
    {
      selector: '[data-chart-switcher-for="execDocType"]',
      chartId: "execDocType",
      allowedTypes: ["bar", "doughnut", "bubble"],
      defaultType: "bar",
      onChange: () => {
        if (typeof renderExecHorizonCharts === "function") renderExecHorizonCharts();
      },
    },
	{
      selector: '[data-chart-switcher-for="deadlines"]',
      chartId: "deadlines",
      allowedTypes: ["bar", "line", "area", "bubble"],
      defaultType: "bar",
      onChange: () => {
        if (typeof renderCharts === "function") renderCharts();
      },
    },
    {
      selector: '[data-chart-switcher-for="execRisk"]',
      chartId: "execRisk",
      allowedTypes: ["bar", "doughnut", "bubble"],
      defaultType: "bar",
      onChange: () => {
        if (typeof renderExecutiveCharts === "function") renderExecutiveCharts();
      },
    },
  ];

  slots.forEach((cfg) => {
    const host = document.querySelector(cfg.selector);
    if (!host || host.dataset.mountedSwitcher === "1") return;
    host.dataset.mountedSwitcher = "1";
    const activeType = getSavedChartType(cfg.chartId, cfg.defaultType, cfg.allowedTypes);
    host.appendChild(
      renderChartTypeSwitcher({
        chartId: cfg.chartId,
        allowedTypes: cfg.allowedTypes,
        activeType,
        onChange: cfg.onChange,
      })
    );
  });
}

window.PSMChartSwitcher = {
  getSavedChartType,
  renderChartTypeSwitcher,
  mountChartSwitchers,
};