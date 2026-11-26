/* Графіки панелі «Аналітика» та «Режиму керівництва» (3D-пігулки + перемикач типів на Chart.js) */

const _dashCharts = {};
const PILL = { radius: 8, thickness: 22, thicknessRisk: 24 };

function destroyDashChart(key) {
  if (_dashCharts[key]) {
    try { _dashCharts[key].destroy(); } catch (_) {}
    delete _dashCharts[key];
  }
}

function shadeHexColor(hex, percent) {
  const clean = String(hex || "#3b82f6").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(clean)) return hex;
  const num = parseInt(clean, 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

function make3DGradient(ctx, area, hex, horiz = true) {
  if (!ctx || !area) return hex;
  const grad = horiz
    ? ctx.createLinearGradient(0, area.top, 0, area.bottom)
    : ctx.createLinearGradient(area.left, 0, area.right, 0);
  grad.addColorStop(0, shadeHexColor(hex, 14));
  grad.addColorStop(0.5, hex);
  grad.addColorStop(1, shadeHexColor(hex, -10));
  return grad;
}

function toBubblePoints(values, maxVal, axis = "x") {
  const norm = Math.max(maxVal, 1);
  return values.map((v, i) => {
    const val = Number(v || 0);
    const r = val > 0 ? Math.max(7, Math.min(24, Math.round(6 + (val / norm) * 18))) : 0;
    return axis === "x"
      ? { x: val, y: i, r, _raw: val }
      : { x: i, y: val, r, _raw: val };
  });
}

const execRiskPillLabelsPlugin = {
  id: "execRiskPillLabels",
  afterDatasetsDraw(chart) {
    const { ctx, data } = chart;
    const ds = data?.datasets?.[0];
    const meta = chart.getDatasetMeta(0);
    if (!ds || !meta || meta.hidden) return;
    ctx.save();
    ctx.font = "700 11px system-ui, -apple-system, sans-serif";
    ctx.textBaseline = "middle";
    meta.data.forEach((bar, idx) => {
      const val = Number(ds.data[idx] || 0);
      if (!bar) return;
      const w = Math.abs(bar.x - bar.base);
      const total = ds.data.reduce((s, n) => s + Number(n || 0), 0) || 1;
      const label = `${val} ПЗ (${Math.round((val / total) * 100)}%)`;
      if (w >= 78) {
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText(label, (bar.base + bar.x) / 2, bar.y);
      } else {
        ctx.fillStyle = "#334155";
        ctx.textAlign = "left";
        ctx.fillText(label, bar.x + 6, bar.y);
      }
    });
    ctx.restore();
  }
};

/**
 * Перемальовує основні графіки вкладки «Аналітика».
 */
function renderCharts() {
  if (typeof Chart === "undefined" || typeof state === "undefined") return;
  chartsDirty = false;

  if (window.PSMChartSwitcher?.mountChartSwitchers) {
    window.PSMChartSwitcher.mountChartSwitchers();
  }

  const f = Array.isArray(state.facilities) ? state.facilities : [];
  const activeOp = f.filter(x => x && x.is_active_operational);
  const animDur = typeof prefersReducedMotion === "function" && prefersReducedMotion() ? 0 : 420;

  // 1. Стан портових засобів по зонах
  const portsCanvas = document.getElementById("portsChart");
  if (portsCanvas) {
    destroyDashChart("ports");
    const onlyActive = Boolean(document.getElementById("chkOnlyActivePorts")?.checked);
    const portsToShow = onlyActive
      ? state.ports.filter(p => ["Працює", "ВВШ"].includes(p.operational_status))
      : state.ports;
    const portNames = portsToShow.map(p => p.port_name);

    const cats = [
      { name: "Чинний", color: "#10b981" },
      { name: "В процесі отримання Акта", color: "#3b82f6" },
      { name: "Критично (< 60 дн.)", color: "#f59e0b" },
      { name: "Потребує уваги / Без док.", color: "#6366f1", match: x => ["Потребує уваги", "Документи відсутні"].includes(x.auto_badge) },
      { name: "Прострочено", color: "#ef4444" },
      { name: "Призупинено / Виключено", color: "#94a3b8", match: x => ["Порт закрито", "Роботу зупинено", "Виключено з переліку"].includes(x.auto_badge) }
    ];

    const variant = window.PSMChartSwitcher
      ? window.PSMChartSwitcher.getSavedChartType("ports", "bar", ["bar", "bubble", "line"])
      : "bar";

    const datasets = cats.map(c => {
      const vals = portNames.map(pn => f.filter(x => x.port_name === pn && (c.match ? c.match(x) : x.auto_badge === c.name)).length);
      if (variant === "line") {
        return {
          label: c.name,
          data: vals,
          borderColor: c.color,
          backgroundColor: `${c.color}22`,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: ctx => (ctx.raw > 0 ? 4 : 1.5)
        };
      }
      if (variant === "bubble") {
        const maxV = Math.max(...vals, 1);
        return {
          label: c.name,
          data: toBubblePoints(vals, maxV, "x"),
          backgroundColor: `${c.color}bf`,
          borderColor: shadeHexColor(c.color, -18),
          borderWidth: 1.2
        };
      }
      return {
        label: c.name,
        backgroundColor: c.color,
        borderRadius: 6,
        borderSkipped: false,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.7)",
        data: vals
      };
    });

    _dashCharts.ports = new Chart(portsCanvas, {
      type: variant === "bubble" ? "bubble" : variant === "line" ? "line" : "bar",
      data: { labels: portNames, datasets },
      plugins: variant === "bar" && typeof ChartDataLabels !== "undefined" ? [ChartDataLabels] : [],
      options: {
        indexAxis: variant === "bar" ? "y" : "x",
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: animDur },
        onHover: (evt, elems) => { evt.native.target.style.cursor = elems.length ? "pointer" : "default"; },
        onClick: (evt, elems) => {
          if (!elems.length || typeof jumpToFacilities !== "function") return;
          const idx = variant === "bubble" ? Math.round(elems[0].element?.$context?.parsed?.y ?? 0) : elems[0].index;
          const pName = portNames[idx];
          const cat = cats[elems[0].datasetIndex];
          if (!pName || !cat) return;
          if (!cat.match) jumpToFacilities({ port: pName, badge: cat.name });
          else {
            const matchedCodes = new Set(f.filter(x => x.port_name === pName && cat.match(x)).map(x => x.code));
            jumpToFacilities({ port: pName, custom: { label: `${pName} · ${cat.name} (${matchedCodes.size} ПЗ)`, codes: matchedCodes } });
          }
        },
        scales: variant === "bar"
          ? {
              x: { stacked: true, beginAtZero: true, grid: { color: "#eef2f6" }, ticks: { stepSize: 1, precision: 0, color: "#64748b", font: { size: 11 } } },
              y: { stacked: true, grid: { display: false }, ticks: { color: "#1e293b", font: { size: 11.5, weight: "600" } } }
            }
          : variant === "bubble"
            ? {
                x: { beginAtZero: true, grid: { color: "#eef2f6" }, ticks: { precision: 0, color: "#64748b", font: { size: 11 } } },
                y: { min: -0.5, max: Math.max(portNames.length - 0.5, 0.5), grid: { color: "#eef2f6" }, ticks: { stepSize: 1, color: "#1e293b", font: { size: 11 }, callback: v => portNames[Math.round(v)] || "" } }
              }
            : {
                x: { grid: { display: false }, ticks: { color: "#1e293b", font: { size: 10.5 } } },
                y: { beginAtZero: true, grid: { color: "#eef2f6" }, ticks: { stepSize: 1, precision: 0, color: "#64748b", font: { size: 11 } } }
              },
        plugins: {
          legend: { position: "bottom", labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 10, boxHeight: 10, padding: 12, color: "#0f2744", font: { size: 11.5, weight: "600" } } },
          datalabels: {
            color: "#fff",
            font: { weight: "bold", size: 10 },
            formatter: v => (v > 0 ? v : "")
          }
        }
      }
    });
    portsChart = _dashCharts.ports;
  }

  // 2. Документальна готовність діючих ПЗ
  const readyCanvas = document.getElementById("readinessChart");
  if (readyCanvas) {
    destroyDashChart("readiness");
    const nAct = activeOp.length || 1;
    const pct = arr => Math.round((arr.length / nAct) * 100);
    const readinessChecks = [
      { label: "Чинна ООПЗ", altLabel: "Без чинної ООПЗ (діючі)", fn: x => x.days_to_oopz_expiry !== null && x.days_to_oopz_expiry >= 0 },
      { label: "Чинний ПОПЗ", altLabel: "Без чинного ПОПЗ (діючі)", fn: x => x.days_to_popz_expiry !== null && x.days_to_popz_expiry >= 0 },
      { label: "Чинний Акт", altLabel: "Без чинного Акта (діючі)", fn: x => x.act_status === "Чинний" && (x.days_to_act_expiry === null || x.days_to_act_expiry >= 0) },
      { label: "Відповідність ГІСІС", altLabel: "Із розбіжностями ГІСІС (діючі)", fn: x => !x.has_gisis_date_mismatch }
    ];
    const rCounts = readinessChecks.map(c => activeOp.filter(c.fn).length);
    const rValues = readinessChecks.map((_, i) => Math.round((rCounts[i] / nAct) * 100));
    const rColors = ["#0ea5e9", "#3b82f6", "#10b981", "#6366f1"];

    const variant = window.PSMChartSwitcher
      ? window.PSMChartSwitcher.getSavedChartType("readiness", "bar", ["bar", "bubble", "line"])
      : "bar";

    _dashCharts.readiness = new Chart(readyCanvas, {
      type: variant === "bubble" ? "bubble" : variant === "line" ? "line" : "bar",
      data: {
        labels: readinessChecks.map(c => c.label),
        datasets: [{
          label: "Готовність (%)",
          data: variant === "bubble" ? toBubblePoints(rValues, 100, "x") : rValues,
          backgroundColor: variant === "line" ? "rgba(14, 165, 233, 0.16)" : variant === "bubble" ? rColors.map(c => `${c}bf`) : rColors,
          borderColor: variant === "line" ? "#0ea5e9" : rColors.map(c => shadeHexColor(c, -15)),
          fill: variant === "line",
          tension: 0.3,
          borderRadius: variant === "bar" ? 12 : 0,
          borderSkipped: false,
          barPercentage: 0.62,
          categoryPercentage: 0.78
        }]
      },
      plugins: variant === "bar" && typeof ChartDataLabels !== "undefined" ? [ChartDataLabels] : [],
      options: {
        indexAxis: variant === "bar" ? "y" : "x",
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: animDur },
        layout: { padding: { right: 44, top: 6, bottom: 4 } },
        onHover: (evt, elems) => { evt.native.target.style.cursor = elems.length ? "pointer" : "default"; },
        onClick: (evt, elems) => {
          if (!elems.length || typeof jumpToFacilities !== "function") return;
          const idx = variant === "bubble" ? Math.round(elems[0].element?.$context?.parsed?.y ?? 0) : elems[0].index;
          const chk = readinessChecks[idx];
          if (!chk) return;
          const okCodes = new Set(activeOp.filter(chk.fn).map(x => x.code));
          const badCodes = new Set(activeOp.filter(x => !chk.fn(x)).map(x => x.code));
          jumpToFacilities({
            custom: {
              label: `Готовність — ${chk.label} (${okCodes.size} з ${activeOp.length} діючих ПЗ)`,
              codes: okCodes,
              altLabel: `Готовність — ${chk.altLabel} (${badCodes.size} з ${activeOp.length} діючих ПЗ)`,
              altCodes: badCodes
            }
          });
        },
        scales: variant === "bar"
          ? {
              x: { min: 0, max: 100, grid: { color: "#eef2f6" }, ticks: { stepSize: 20, color: "#64748b", callback: v => v + "%" } },
              y: { grid: { display: false }, ticks: { color: "#1f2937", font: { size: 12.5, weight: "600" }, padding: 6 } }
            }
          : variant === "bubble"
            ? {
                x: { min: 0, max: 110, grid: { color: "#eef2f6" }, ticks: { callback: v => v + "%" } },
                y: { min: -0.5, max: 3.5, grid: { color: "#eef2f6" }, ticks: { stepSize: 1, color: "#1f2937", font: { size: 12 }, callback: v => readinessChecks[Math.round(v)]?.label || "" } }
              }
            : {
                x: { grid: { display: false }, ticks: { color: "#1f2937", font: { size: 11.5 } } },
                y: { min: 0, max: 100, grid: { color: "#eef2f6" }, ticks: { callback: v => v + "%" } }
              },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const idx = variant === "bubble" ? Math.round(ctx.parsed.y) : ctx.dataIndex;
                return ` ${rCounts[idx]} ПЗ (${rValues[idx]}% від ${activeOp.length})`;
              }
            }
          },
          datalabels: {
            anchor: "center",
            align: "center",
            color: "#fff",
            font: { weight: "bold", size: 12 },
            formatter: (v, ctx) => `${rCounts[ctx.dataIndex]} ПЗ (${v}%)`
          }
        }
      }
    });
    readinessChart = _dashCharts.readiness;
  }

  // 3. Календар планових дедлайнів
  const dlCanvas = document.getElementById("deadlinesChart");
  if (dlCanvas) {
    destroyDashChart("deadlines");
    const mode = document.getElementById("calHorizonMode")?.value || "BY_YEAR";
    const today = typeof todayLocal === "function" ? todayLocal() : new Date().toISOString().slice(0, 10);
    const buckets = new Map();
    const ensureBucket = (key, label) => {
      if (!buckets.has(key)) buckets.set(key, { key, label, act: [], oopz: [], popz: [] });
      return buckets.get(key);
    };

    if (mode === "NEXT12") {
      const now = new Date();
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        ensureBucket(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, d.toLocaleDateString("uk-UA", { month: "short", year: "2-digit" }));
      }
    }
    for (const x of activeOp) {
      const pushDoc = (dt, type) => {
        if (!dt || dt < today) return;
        if (mode === "BY_YEAR") {
          const yr = dt.slice(0, 4);
          ensureBucket(yr, `${yr} р.`)[type].push(x.code);
        } else {
          const ym = dt.slice(0, 7);
          if (mode === "NEXT12" && !buckets.has(ym)) return;
          const [yy, mm] = ym.split("-").map(Number);
          ensureBucket(ym, new Date(yy, mm - 1, 1).toLocaleDateString("uk-UA", { month: "short", year: "2-digit" }))[type].push(x.code);
        }
      };
      pushDoc(x.act_expiry_date, "act");
      pushDoc(x.oopz_expiry_date, "oopz");
      pushDoc(x.popz_expiry_date, "popz");
    }

    let bucketArr = [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
    if (mode !== "NEXT12") bucketArr = bucketArr.filter(b => b.act.length + b.oopz.length + b.popz.length > 0);
    if (!bucketArr.length) bucketArr = [{ key: "NONE", label: "Планових дедлайнів немає", act: [], oopz: [], popz: [] }];

    const savedType = window.PSMChartSwitcher
      ? window.PSMChartSwitcher.getSavedChartType("deadlines", mode === "NEXT12" ? "line" : "bar", ["bar", "line", "area", "bubble"])
      : "bar";
    const isLine = savedType === "line" || savedType === "area";
    const isBubble = savedType === "bubble";

    const dlDatasets = isLine
      ? [
          { label: "Акт", data: bucketArr.map(b => b.act.length), borderColor: "#10b981", backgroundColor: "rgba(16, 185, 129, 0.16)", fill: savedType === "area", tension: 0.35, borderWidth: 2.5, pointRadius: ctx => (ctx.raw > 0 ? 5 : 2) },
          { label: "ООПЗ", data: bucketArr.map(b => b.oopz.length), borderColor: "#0ea5e9", backgroundColor: "rgba(14, 165, 233, 0.16)", fill: savedType === "area", tension: 0.35, borderWidth: 2.5, pointRadius: ctx => (ctx.raw > 0 ? 5 : 2) },
          { label: "ПОПЗ", data: bucketArr.map(b => b.popz.length), borderColor: "#f59e0b", backgroundColor: "rgba(245, 158, 11, 0.16)", fill: savedType === "area", tension: 0.35, borderWidth: 2.5, pointRadius: ctx => (ctx.raw > 0 ? 5 : 2) }
        ]
      : isBubble
        ? [
            { label: "Акт", data: toBubblePoints(bucketArr.map(b => b.act.length), 15, "y"), backgroundColor: "rgba(16, 185, 129, 0.75)", borderColor: "#059669" },
            { label: "ООПЗ", data: toBubblePoints(bucketArr.map(b => b.oopz.length), 15, "y"), backgroundColor: "rgba(14, 165, 233, 0.75)", borderColor: "#0284c7" },
            { label: "ПОПЗ", data: toBubblePoints(bucketArr.map(b => b.popz.length), 15, "y"), backgroundColor: "rgba(245, 158, 11, 0.75)", borderColor: "#d97706" }
          ]
        : [
            { label: "Акт", data: bucketArr.map(b => b.act.length), backgroundColor: "#10b981", borderRadius: 6, borderSkipped: false, borderWidth: 1, borderColor: "rgba(255,255,255,0.7)" },
            { label: "ООПЗ", data: bucketArr.map(b => b.oopz.length), backgroundColor: "#0ea5e9", borderRadius: 6, borderSkipped: false, borderWidth: 1, borderColor: "rgba(255,255,255,0.7)" },
            { label: "ПОПЗ", data: bucketArr.map(b => b.popz.length), backgroundColor: "#f59e0b", borderRadius: 6, borderSkipped: false, borderWidth: 1, borderColor: "rgba(255,255,255,0.7)" }
          ];

    _dashCharts.deadlines = new Chart(dlCanvas, {
      type: isLine ? "line" : isBubble ? "bubble" : "bar",
      data: { labels: bucketArr.map(b => b.label), datasets: dlDatasets },
      plugins: !isBubble && typeof ChartDataLabels !== "undefined" ? [ChartDataLabels] : [],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: animDur },
        onHover: (evt, elems) => { evt.native.target.style.cursor = elems.length ? "pointer" : "default"; },
        onClick: (evt, elems) => {
          if (!elems.length || typeof jumpToFacilities !== "function") return;
          const el = elems[0];
          const b = bucketArr[el.index];
          if (!b || b.key === "NONE") return;
          const docMap = [{ name: "Акт", list: b.act }, { name: "ООПЗ", list: b.oopz }, { name: "ПОПЗ", list: b.popz }];
          const picked = docMap[el.datasetIndex];
          const codes = new Set(picked?.list || []);
          if (!codes.size) return;
          jumpToFacilities({ sort: "URGENCY", custom: { label: `Дедлайн: ${b.label} — ${picked.name} (${codes.size} ПЗ)`, codes } });
        },
        scales: isBubble
          ? {
              x: { min: -0.5, max: Math.max(bucketArr.length - 0.5, 0.5), grid: { display: false }, ticks: { stepSize: 1, callback: v => bucketArr[Math.round(v)]?.label || "" } },
              y: { beginAtZero: true, grid: { color: "#eef2f6" }, ticks: { precision: 0 } }
            }
          : {
              x: { stacked: !isLine, grid: { display: false }, ticks: { autoSkip: false, color: "#1f2937", font: { size: 11, weight: "600" } } },
              y: { stacked: !isLine, beginAtZero: true, grid: { color: "#eef2f6" }, ticks: { precision: 0, color: "#64748b", font: { size: 11 } } }
            },
        plugins: {
          legend: { position: "bottom", labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 10, boxHeight: 10, padding: 12, color: "#0f2744", font: { size: 11.5, weight: "600" } } },
          datalabels: isLine
            ? { align: "top", offset: 3, color: "#0f2744", font: { weight: "bold", size: 10.5 }, formatter: v => (v > 0 ? v : "") }
            : { color: "#fff", font: { weight: "bold", size: 11 }, formatter: v => (v > 0 ? v : "") }
        }
      }
    });
    deadlinesChart = _dashCharts.deadlines;
  }
}

/**
 * Перемальовує графіки режиму керівництва (KPI).
 */
function renderExecutiveCharts() {
  if (typeof Chart === "undefined" || typeof state === "undefined" || typeof calcRiskInfo !== "function") return;
  if (window.PSMChartSwitcher && typeof window.PSMChartSwitcher.mountChartSwitchers === "function") {
    window.PSMChartSwitcher.mountChartSwitchers();
  }

  const canvas = document.getElementById("execRiskDoughnut");
  if (canvas) {
    destroyDashChart("execRisk");

  const riskPredicates = [
      s => s === 0,
      s => s >= 1 && s <= 49,
      s => s >= 50 && s <= 74,
      s => s >= 75
    ];
    const jumpToRiskBucket = idx => {
      const pred = riskPredicates[idx];
      if (!pred || typeof jumpToFacilities !== "function") return;
      const codes = new Set(activeOp.filter(x => pred(calcRiskInfo(x).score)).map(x => x.code));
      jumpToFacilities({
        sort: "RISK",
        custom: { label: `Risk Score: ${labels[idx]} (${codes.size} ПЗ)`, codes }
      });
    };	  
	   
	const activeOp = (Array.isArray(state.facilities) ? state.facilities : []).filter(x => x && x.is_active_operational);
    const scores = activeOp.map(x => calcRiskInfo(x).score);

    const cNone = scores.filter(s => s === 0).length;
    const cMod = scores.filter(s => s >= 1 && s <= 49).length;
    const cHigh = scores.filter(s => s >= 50 && s <= 74).length;
    const cCrit = scores.filter(s => s >= 75).length;

    const totalLabel = document.getElementById("execRiskTotalLabel");
    if (totalLabel) totalLabel.textContent = `Усього: ${activeOp.length} ПЗ`;

    const counts = [cNone, cMod, cHigh, cCrit];
    const maxVal = Math.max(...counts, 1);
    const riskColors = ["#10b981", "#0ea5e9", "#f59e0b", "#ef4444"];
    const labels = [
      "Без ризику (0)",
      "Помірний (1–49)",
      "Високий (50–74)",
      "Критичний (75+)"
    ];

    const variant = window.PSMChartSwitcher
      ? window.PSMChartSwitcher.getSavedChartType("execRisk", "bar", ["bar", "doughnut", "bubble"])
      : "bar";
    const isDonut = variant === "doughnut";
    const isBubble = variant === "bubble";

    if (isBubble) {
      _dashCharts.execRisk = new Chart(canvas, {
        type: "bubble",
        data: {
          datasets: [{
            label: "Кількість ПЗ",
            data: toBubblePoints(counts, maxVal, "x"),
            backgroundColor: riskColors.map(c => `${c}bf`),
            borderColor: riskColors.map(c => shadeHexColor(c, -18)),
            borderWidth: 1.5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: (evt, elements) => {
            if (!elements.length) return;
			const idx = Math.round(elements[0].element?.$context?.parsed?.y ?? elements[0].index);
            jumpToRiskBucket(idx);
          },
          scales: {
            x: {
              beginAtZero: true,
              suggestedMax: Math.ceil(maxVal * 1.25),
              grid: { color: "#eef2f6" },
              ticks: { precision: 0, color: "#64748b", font: { size: 10.5, weight: "600" } }
            },
            y: {
              min: -0.5,
              max: 3.5,
              grid: { color: "#eef2f6" },
              ticks: {
                stepSize: 1,
                color: "#0f172a",
                font: { size: 11, weight: "700" },
                callback: v => labels[Math.round(v)] || ""
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const idx = Math.round(ctx.parsed.y);
                  const v = Number(ctx.raw?._raw ?? ctx.parsed.x ?? 0);
                  const pct = activeOp.length ? Math.round((v / activeOp.length) * 100) : 0;
                  return ` ${labels[idx]}: ${v} ПЗ (${pct}%)`;
                }
              }
            }
          }
        }
      });
    } else {
      _dashCharts.execRisk = new Chart(canvas, {
        type: isDonut ? "doughnut" : "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Кількість ПЗ",
              data: counts,
              backgroundColor: isDonut
                ? riskColors
                : ctx => make3DGradient(ctx.chart.ctx, ctx.chart.chartArea, riskColors[ctx.dataIndex] || "#3b82f6", true),
              borderColor: isDonut ? "#ffffff" : riskColors.map(c => shadeHexColor(c, -18)),
              borderWidth: isDonut ? 2 : 1,
              borderRadius: isDonut ? 0 : PILL.radius,
              borderSkipped: false,
              barThickness: isDonut ? undefined : PILL.thicknessRisk,
              hoverOffset: isDonut ? 6 : 0
            }
          ]
        },
        options: {
          indexAxis: isDonut ? "x" : "y",
          cutout: isDonut ? "64%" : undefined,
          responsive: true,
          maintainAspectRatio: false,
          onClick: (evt, elements) => {
            if (!elements.length) return;
            jumpToRiskBucket(elements[0].index);
          },
          scales: isDonut
            ? {}
            : {
                x: {
                  beginAtZero: true,
                  suggestedMax: Math.ceil(maxVal * 1.2),
                  grid: { color: "#eef2f6" },
                  ticks: { precision: 0, color: "#64748b", font: { size: 10.5, weight: "600" } }
                },
                y: {
                  grid: { display: false },
                  ticks: { color: "#0f172a", font: { size: 11.5, weight: "700" } }
                }
              },
          plugins: {
            legend: {
              display: isDonut,
              position: "right",
              labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 10, padding: 10, font: { size: 11, weight: "600" } }
            },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const v = Number(isDonut ? ctx.parsed : ctx.parsed.x || 0);
                  const pct = activeOp.length ? Math.round((v / activeOp.length) * 100) : 0;
                  return ` ${v} ПЗ (${pct}% від діючих)`;
                }
              }
            }
          }
        },
        plugins: isDonut ? [] : [execRiskPillLabelsPlugin]
      });
    }
  }

  renderExecHorizonCharts();
}

/**
 * Відображає графіки горизонту 90 днів у режимі керівництва.
 */
function renderExecHorizonCharts() {
  if (typeof Chart === "undefined" || typeof state === "undefined") return;

  const activeOp = (Array.isArray(state.facilities) ? state.facilities : []).filter(x => x && x.is_active_operational);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 91 }, (_, i) => i);
  const daily = days.map(() => ({ act: 0, oopz: 0, popz: 0 }));
  const overdue = { act: 0, oopz: 0, popz: 0 };

  const dayDiff = dStr => {
    if (!dStr) return null;
    const d = new Date(dStr);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return Math.round((d - today) / 86400000);
  };

  activeOp.forEach(x => {
    const items = [
      ["act", x.act_expiry_date, x.days_to_act_expiry],
      ["oopz", x.oopz_expiry_date, x.days_to_oopz_expiry],
      ["popz", x.popz_expiry_date, x.days_to_popz_expiry]
    ];
    items.forEach(([field, dStr, daysLeft]) => {
      const diff = (daysLeft !== null && daysLeft !== undefined) ? daysLeft : dayDiff(dStr);
      if (diff === null || diff === undefined) return;
      if (diff < 0) overdue[field] += 1;
      else if (diff <= 90) daily[diff][field] += 1;
    });
  });

  let cAct = 0, cOopz = 0, cPopz = 0;
  const cumAct = [], cumOopz = [], cumPopz = [], cumTotal = [];
  daily.forEach(d => {
    cAct += d.act; cOopz += d.oopz; cPopz += d.popz;
    cumAct.push(cAct); cumOopz.push(cOopz); cumPopz.push(cPopz);
    cumTotal.push(cAct + cOopz + cPopz);
  });

  const cumCanvas = document.getElementById("execCumulativeChart");
  if (cumCanvas) {
    destroyDashChart("execCum");
    _dashCharts.execCum = new Chart(cumCanvas, {
      type: "line",
      data: {
        labels: days.map(String),
        datasets: [
          { label: "Усього", data: cumTotal, borderColor: "#0f172a", backgroundColor: "rgba(15, 23, 42, 0.08)", fill: true, tension: 0.15, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2.5, order: 0 },
          { label: "Акт", data: cumAct, borderColor: "#10b981", backgroundColor: "transparent", tension: 0.15, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2, order: 1 },
          { label: "ООПЗ", data: cumOopz, borderColor: "#0ea5e9", backgroundColor: "transparent", tension: 0.15, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2, order: 2 },
          { label: "ПОПЗ", data: cumPopz, borderColor: "#f59e0b", backgroundColor: "transparent", tension: 0.15, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2, order: 3 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        onClick: (evt, elements) => {
          if (!elements.length || typeof jumpToFacilities !== "function") return;
          const day = elements[0].index;
          if (day <= 30) jumpToFacilities({ quick: "SOON30", sort: "URGENCY" });
          else if (day <= 60) jumpToFacilities({ quick: "SOON60", sort: "URGENCY" });
          else jumpToFacilities({ quick: "SOON90", sort: "URGENCY" });
        },
        plugins: {
          legend: { position: "bottom", labels: { usePointStyle: true, pointStyle: "line", boxWidth: 14, padding: 14, font: { size: 11.5, weight: "600" } } },
          tooltip: {
            callbacks: {
              title: items => { const d = items[0]?.dataIndex ?? 0; return d === 0 ? "Сьогодні" : `Горизонт: ${d} дн.`; },
              label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}`,
              afterBody: items => {
                const d = items[0]?.dataIndex ?? 0;
                return ["", d <= 30 ? "→ Реєстр: ≤30 днів" : d <= 60 ? "→ Реєстр: ≤60 днів" : "→ Реєстр: ≤90 днів"];
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#64748b", font: { size: 10.5, weight: "600" }, maxRotation: 0, autoSkip: false, callback: (val, idx) => (idx === 0 || idx === 30 || idx === 60 || idx === 90) ? `${idx}д` : "" },
            title: { display: true, text: "Дні від сьогодні  ·  клік по точці → Реєстр", color: "#94a3b8", font: { size: 11 } }
          },
          y: { beginAtZero: true, grid: { color: "#eef2f6" }, ticks: { precision: 0, color: "#64748b", font: { size: 11, weight: "600" } }, title: { display: true, text: "Накопичено документів", color: "#94a3b8", font: { size: 11 } } }
        }
      }
    });
  }

const typeCanvas = document.getElementById("execDocTypeChart");
  if (typeCanvas) {
    destroyDashChart("execDocType");
    if (window.PSMChartSwitcher?.mountChartSwitchers) {
      window.PSMChartSwitcher.mountChartSwitchers();
    }

    const h30 = { act: 0, oopz: 0, popz: 0 }, h60 = { act: 0, oopz: 0, popz: 0 }, h90 = { act: 0, oopz: 0, popz: 0 };
    daily.forEach((d, i) => {
      const t = i <= 30 ? h30 : i <= 60 ? h60 : h90;
      t.act += d.act; t.oopz += d.oopz; t.popz += d.popz;
    });

    const rowMeta = [
      { label: "Прострочено", matchDay: d => d < 0, act: overdue.act, oopz: overdue.oopz, popz: overdue.popz },
      { label: "≤ 30 днів", matchDay: d => d >= 0 && d <= 30, act: h30.act, oopz: h30.oopz, popz: h30.popz },
      { label: "31–60 днів", matchDay: d => d > 30 && d <= 60, act: h60.act, oopz: h60.oopz, popz: h60.popz },
      { label: "61–90 днів", matchDay: d => d > 60 && d <= 90, act: h90.act, oopz: h90.oopz, popz: h90.popz }
    ];

    const docFields = [
      { key: "act", name: "Акт", dateKey: "act_expiry_date", daysKey: "days_to_act_expiry", color: "#10b981" },
      { key: "oopz", name: "ООПЗ", dateKey: "oopz_expiry_date", daysKey: "days_to_oopz_expiry", color: "#0ea5e9" },
      { key: "popz", name: "ПОПЗ", dateKey: "popz_expiry_date", daysKey: "days_to_popz_expiry", color: "#f59e0b" }
    ];

    const jumpByBucketAndDoc = (rowIdx, dsIdx = null) => {
      const row = rowMeta[rowIdx];
      if (!row || typeof jumpToFacilities !== "function") return;
      const doc = dsIdx !== null ? docFields[dsIdx] : null;
      const codes = new Set();
      activeOp.forEach(x => {
        const targets = doc ? [doc] : docFields;
        const ok = targets.some(df => {
          const left = x[df.daysKey] !== null && x[df.daysKey] !== undefined ? x[df.daysKey] : dayDiff(x[df.dateKey]);
          return left !== null && left !== undefined && row.matchDay(left);
        });
        if (ok) codes.add(x.code);
      });
      jumpToFacilities({
        sort: "URGENCY",
        custom: { label: `${row.label}${doc ? " · " + doc.name : ""} (${codes.size} ПЗ)`, codes }
      });
    };

    const variant = window.PSMChartSwitcher
      ? window.PSMChartSwitcher.getSavedChartType("execDocType", "bar", ["bar", "doughnut", "bubble"])
      : "bar";

    if (variant === "doughnut") {
      const totals = rowMeta.map(r => r.act + r.oopz + r.popz);
      const donutColors = ["#ef4444", "#f59e0b", "#0ea5e9", "#6366f1"];
      _dashCharts.execDocType = new Chart(typeCanvas, {
        type: "doughnut",
        data: {
          labels: rowMeta.map(r => r.label),
          datasets: [{ data: totals, backgroundColor: donutColors, borderColor: "#fff", borderWidth: 2, hoverOffset: 6 }]
        },
        options: {
          cutout: "62%",
          responsive: true,
          maintainAspectRatio: false,
          onClick: (evt, elements) => {
            if (!elements.length) return;
            jumpByBucketAndDoc(elements[0].index, null);
          },
          plugins: {
            legend: { position: "right", labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 10, padding: 12, font: { size: 11.5, weight: "600" } } },
            tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} док. (клік → Реєстр)` } }
          }
        }
      });
    } else if (variant === "bubble") {
      const maxVal = Math.max(...rowMeta.flatMap(r => [r.act, r.oopz, r.popz]), 1);
      _dashCharts.execDocType = new Chart(typeCanvas, {
        type: "bubble",
        data: {
          datasets: docFields.map(df => ({
            label: df.name,
            data: toBubblePoints(rowMeta.map(r => r[df.key]), maxVal, "x"),
            backgroundColor: `${df.color}bf`,
            borderColor: shadeHexColor(df.color, -18),
            borderWidth: 1.5
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: (evt, elements) => {
            if (!elements.length) return;
            const el = elements[0];
            const rowIdx = Math.round(el.element?.$context?.parsed?.y ?? el.index);
            jumpByBucketAndDoc(rowIdx, el.datasetIndex);
          },
          scales: {
            x: { beginAtZero: true, suggestedMax: Math.ceil(maxVal * 1.2), grid: { color: "#eef2f6" }, ticks: { precision: 0, color: "#64748b" } },
            y: { min: -0.5, max: 3.5, grid: { color: "#eef2f6" }, ticks: { stepSize: 1, color: "#0f172a", font: { size: 11.5, weight: "700" }, callback: v => rowMeta[Math.round(v)]?.label || "" } }
          },
          plugins: {
            legend: { position: "bottom", labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 10, padding: 14, font: { size: 11.5, weight: "600" } } },
            tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label} (${rowMeta[Math.round(ctx.parsed.y)]?.label}): ${ctx.raw?._raw ?? ctx.parsed.x} док.` } }
          }
        }
      });
    } else {
      _dashCharts.execDocType = new Chart(typeCanvas, {
        type: "bar",
        data: {
          labels: rowMeta.map(r => r.label),
          datasets: docFields.map(df => ({
            label: df.name,
            data: rowMeta.map(r => r[df.key]),
            backgroundColor: ctx => make3DGradient(ctx.chart.ctx, ctx.chart.chartArea, df.color, true),
            borderColor: shadeHexColor(df.color, -18),
            borderWidth: 1,
            borderRadius: PILL.radius,
            borderSkipped: false,
            barThickness: 26
          }))
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          onClick: (evt, elements) => {
            if (!elements.length) return;
            jumpByBucketAndDoc(elements[0].index, elements[0].datasetIndex);
          },
          scales: {
            x: { stacked: true, beginAtZero: true, grid: { color: "#eef2f6" }, ticks: { precision: 0, color: "#64748b", font: { size: 10.5, weight: "600" } } },
            y: { stacked: true, grid: { display: false }, ticks: { color: "#0f172a", font: { size: 12, weight: "700" } } }
          },
          plugins: {
            legend: { position: "bottom", labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 10, padding: 14, font: { size: 11.5, weight: "600" } } },
            tooltip: {
              callbacks: {
                footer: items => [`Разом: ${items.reduce((s, it) => s + Number(it.parsed.x || 0), 0)}`, "Клік по сегменту → точний фільтр у Реєстрі"]
              }
            }
          }
        }
      });
    }
  }
}