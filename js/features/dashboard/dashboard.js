/* Вкладка «Аналітика»: KPI, горизонт дедлайнів, центр ризиків, оперативний контроль */

function setDashText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/**
 * Встановлює «DashHtml».
 */
function setDashHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

/**
 * Перемикає стан «ExecutiveMode».
 */
function toggleExecutiveMode(skipSave = false) {
  const on = Boolean(document.getElementById("chkExecutiveMode")?.checked);
  const execPanel = document.getElementById("executivePanel");
  const stdWrap = document.getElementById("standardDashboardWrap");

  if (execPanel) execPanel.classList.toggle("d-none", !on);
  if (stdWrap) stdWrap.classList.toggle("d-none", on);
  if (!skipSave && typeof saveDashPrefs === "function") saveDashPrefs();

  if (on) {
    if (execPanel && typeof animateEl === "function") {
      animateEl(execPanel, { opacity: [0, 1], transform: ["translateY(8px)", "translateY(0)"] }, { duration: 220 });
    }
    renderExecutiveExtras();
    if (typeof renderExecutiveCharts === "function") renderExecutiveCharts();
  } else if (typeof chartsDirty !== "undefined" && chartsDirty && typeof renderCharts === "function") {
    renderCharts();
  }
}

/**
 * Відображає «ExecutiveExtras» у відповідній вкладці/блоці.
 */
function renderExecutiveExtras() {
  const f = Array.isArray(state?.facilities) ? state.facilities : [];
  const activeOp = f.filter(x => x.is_active_operational);
  const stoppedOrClosed = f.length - activeOp.length;
  const validOrProc = activeOp.filter(x => ["Чинний", "В процесі отримання Акта"].includes(x.auto_badge)).length;
  const gisisActive = activeOp.filter(x => x.has_gisis_date_mismatch).length;
  const soon90 = activeOp.filter(x => typeof isSoonActive === "function" && isSoonActive(x, 90)).length;
  const curYear = new Date().getFullYear();
  const inspPlanned = (Array.isArray(state?.inspections) ? state.inspections : [])
    .filter(i => i.inspection_year === curYear && i.status === "Заплановано").length;
  const riskScores = typeof calcRiskInfo === "function" ? activeOp.map(x => calcRiskInfo(x).score) : [];
  const maxRisk = riskScores.length ? Math.max(...riskScores) : 0;
  const withRisk = riskScores.filter(s => s > 0).length;

  setDashText("execTotalSub", `закрито/зупинено: ${stoppedOrClosed}`);
  setDashText("execActiveSub", `готовність: ${activeOp.length ? Math.round(validOrProc / activeOp.length * 100) : 0}%`);
  setDashText("execOverdueSub", `розбіжності ГІСІС: ${gisisActive}`);
  setDashText("execCriticalSub", `до 90 днів: ${soon90} ПЗ`);
  setDashText("execInspSub", `заплановано: ${inspPlanned}`);
  setDashText("execRiskSub", `макс.: ${maxRisk} · з ризиком: ${withRisk}`);

  // 1. Прогрес-бари готовності
  const nAct = activeOp.length || 1;
  const bars = [
    { lbl: "Чинна ООПЗ", pct: Math.round(activeOp.filter(x => x.days_to_oopz_expiry !== null && x.days_to_oopz_expiry >= 0).length / nAct * 100), color: "#0ea5e9" },
    { lbl: "Чинний ПОПЗ", pct: Math.round(activeOp.filter(x => x.days_to_popz_expiry !== null && x.days_to_popz_expiry >= 0).length / nAct * 100), color: "#2563eb" },
    { lbl: "Чинний Акт", pct: Math.round(activeOp.filter(x => x.act_status === "Чинний" && (x.days_to_act_expiry === null || x.days_to_act_expiry >= 0)).length / nAct * 100), color: "#10b981" },
    { lbl: "Відповідність ГІСІС", pct: Math.round(activeOp.filter(x => !x.has_gisis_date_mismatch).length / nAct * 100), color: "#6366f1" }
  ];
  setDashHtml("execReadinessBars", bars.map(b => `
    <div class="mb-2">
      <div class="d-flex justify-content-between small mb-1">
        <span class="fw-semibold">${esc(b.lbl)}</span>
        <span class="tabular-nums text-muted">${b.pct}%</span>
      </div>
      <div class="progress position-relative" style="height: 22px; border-radius: 8px; background: #eef2f6;">
        <div class="progress-bar d-flex align-items-center justify-content-center" style="width:${Math.max(b.pct, 0)}%; background:${b.color}; border-radius: 8px; font-size: 11.5px; font-weight: 700; color: #fff; text-shadow: 0 1px 2px rgba(15,23,42,.25);">
          ${b.pct >= 18 ? b.pct + "%" : ""}
        </div>
        ${b.pct < 18 && b.pct > 0 ? `<span class="position-absolute top-50 translate-middle-y tabular-nums fw-bold" style="left: calc(${b.pct}% + 6px); font-size: 11.5px; color: #1e293b;">${b.pct}%</span>` : ""}
      </div>
    </div>`).join(""));

  // Планування / статистичний аналіз (горизонт 90 днів)
  /* Блок «Планування документів» (горизонт 90 днів) у режимі керівництва */
  (function fillPlanning() {
    const events = [];
    activeOp.forEach(x => {
      const items = [
        ["Акт", x.days_to_act_expiry],
        ["ООПЗ", x.days_to_oopz_expiry],
        ["ПОПЗ", x.days_to_popz_expiry]
      ];
      items.forEach(([doc, d]) => {
        if (d === null || d === undefined) return;
        events.push({ code: x.code, port: x.port_name || "—", portId: x.port_id, doc, days: d });
      });
    });

    const overdueEv = events.filter(e => e.days < 0);
    const e30 = events.filter(e => e.days >= 0 && e.days <= 30);
    const e60 = events.filter(e => e.days > 30 && e.days <= 60);
    const e90 = events.filter(e => e.days > 60 && e.days <= 90);
    const watch = [...overdueEv, ...e30, ...e60, ...e90];
    const totalWatch = watch.length || 1;

    const pct = (n) => Math.round((n / totalWatch) * 1000) / 10;
    const setW = (id, n) => {
      const el = document.getElementById(id);
      if (el) el.style.width = (watch.length ? pct(n) : 0) + "%";
    };
    setW("planSegOver", overdueEv.length);
    setW("planSeg30", e30.length);
    setW("planSeg60", e60.length);
    setW("planSeg90", e90.length);

    setDashText("planOverCnt", overdueEv.length);
    setDashText("plan30Cnt", e30.length);
    setDashText("plan60Cnt", e60.length);
    setDashText("plan90Cnt", e90.length);
    setDashText("planWatchTotal", watch.length ? `${watch.length} док. під наглядом` : "Немає подій у горизонті");

    const facSet = new Set(watch.map(e => e.code));
    const facN = facSet.size;
    const share = activeOp.length ? Math.round((facN / activeOp.length) * 100) : 0;
    setDashText("planFacAffected", facN);
    setDashText("planFacShare", activeOp.length ? `${share}%` : "—");

    const watchFacDays = typeof minDays === "function"
      ? activeOp
          .map(x => minDays(x))
          .filter(v => v !== null && v !== undefined && v <= 90)
          .sort((a, b) => a - b)
      : [];
    let median = "—";
    if (watchFacDays.length) {
      const mid = Math.floor(watchFacDays.length / 2);
      const mVal = watchFacDays.length % 2
        ? watchFacDays[mid]
        : Math.round((watchFacDays[mid - 1] + watchFacDays[mid]) / 2);
      median = mVal < 0 ? `${mVal}` : String(mVal);
    }
    setDashText("planMedianDays", median);

    const byPort = new Map();
    watch.forEach(e => {
      const k = e.port || "—";
      if (!byPort.has(k)) byPort.set(k, { port: k, n: 0, overdue: 0 });
      const row = byPort.get(k);
      row.n += 1;
      if (e.days < 0) row.overdue += 1;
    });
    const topPorts = Array.from(byPort.values()).sort((a, b) => b.n - a.n || b.overdue - a.overdue).slice(0, 4);
    const maxN = topPorts[0]?.n || 1;
    const concEl = document.getElementById("planConcentration");
    if (concEl) {
      if (!topPorts.length) {
        concEl.innerHTML = '<div class="text-muted small py-2">У горизонті 90 днів подій немає</div>';
      } else {
        concEl.innerHTML = topPorts.map((p, i) => {
          const w = Math.max(8, Math.round((p.n / maxN) * 100));
          return `<div class="d-flex align-items-center gap-2" style="cursor:pointer;" data-plan-port="${esc(p.port)}" title="Відкрити ПЗ зони">
            <span class="small text-muted tabular-nums" style="width:14px;">${i + 1}.</span>
            <div class="flex-grow-1" style="min-width:0;">
              <div class="d-flex justify-content-between small mb-0">
                <span class="fw-semibold text-truncate">${esc(p.port)}</span>
                <span class="tabular-nums text-muted ms-2">${p.n}${p.overdue ? ` · <span class="text-danger">${p.overdue} простр.</span>` : ""}</span>
              </div>
              <div class="progress" style="height:8px;border-radius:8px;background:#eef2f6;">
                <div class="progress-bar" style="width:${w}%;background:${p.overdue ? "#ef4444" : "#3b82f6"};border-radius:8px;"></div>
              </div>
            </div>
          </div>`;
        }).join("");
      }
    }

    if (topPorts.length >= 2) {
      const shareTop = Math.round((topPorts[0].n / totalWatch) * 100);
      setDashText("planConcHint", `Найбільший внесок: «${topPorts[0].port}» — ${shareTop}% подій горизонту. Фокус ресурсів сюди дає найбільший ефект.`);
    } else {
      setDashText("planConcHint", "");
    }

    const bindSeg = (elId, quick) => {
      const el = document.getElementById(elId);
      if (!el) return;
      const wrap = el.closest("span") || el.parentElement;
      if (!wrap || wrap.dataset.bound) return;
      wrap.dataset.bound = "1";
      wrap.style.cursor = "pointer";
      wrap.title = "Відкрити в Реєстрі";
      wrap.addEventListener("click", () => {
        if (typeof jumpToFacilities === "function") jumpToFacilities({ quick, sort: "URGENCY" });
      });
    };
    bindSeg("planOverCnt", "OVERDUE_ACTIVE");
    bindSeg("plan30Cnt", "SOON30");
    bindSeg("plan60Cnt", "SOON60");
    bindSeg("plan90Cnt", "SOON90");

    const bar = document.getElementById("planHorizonBar");
    if (bar && !bar.dataset.boundClick) {
      bar.dataset.boundClick = "1";
      bar.style.cursor = "pointer";
      const map = [
        ["planSegOver", "OVERDUE_ACTIVE"],
        ["planSeg30", "SOON30"],
        ["planSeg60", "SOON60"],
        ["planSeg90", "SOON90"]
      ];
      map.forEach(([id, quick]) => {
        const seg = document.getElementById(id);
        if (seg) {
          seg.style.cursor = "pointer";
          seg.addEventListener("click", e => {
            e.stopPropagation();
            if (typeof jumpToFacilities === "function") jumpToFacilities({ quick, sort: "URGENCY" });
          });
        }
      });
    }

    const queue = [];
    const overdueFac = typeof isOverdueActive === "function" ? activeOp.filter(isOverdueActive).length : 0;
    if (overdueFac > 0) {
      queue.push({ n: overdueFac, text: "Закрити прострочення", detail: `${overdueFac} діючих ПЗ`, tone: "danger" });
    }
    if (e30.length > 0) {
      queue.push({ n: e30.length, text: "Продовжити документи ≤30 дн.", detail: `${e30.length} док.`, tone: "warning" });
    }
    if (e60.length > 0) {
      queue.push({ n: e60.length, text: "Запланувати продовження 31–60 дн.", detail: `${e60.length} док.`, tone: "secondary" });
    }
    if (e90.length > 0 && queue.length < 3) {
      queue.push({ n: e90.length, text: "Контроль горизонту 61–90 дн.", detail: `${e90.length} док.`, tone: "info" });
    }
    if (!queue.length) {
      queue.push({ n: 0, text: "Підтримувати поточний контроль", detail: "критичних спливів немає", tone: "success" });
    }

    setDashHtml("planActionQueue", queue.map(q =>
      `<li class="mb-1"><span class="fw-semibold">${esc(q.text)}</span>
        <span class="badge bg-${q.tone === "danger" ? "danger" : q.tone === "warning" ? "warning text-dark" : q.tone === "success" ? "success-subtle text-success" : "light text-secondary border"} ms-1 tabular-nums">${esc(q.detail)}</span>
      </li>`
    ).join(""));

    if (overdueFac > 0) {
      setDashHtml("planManagementNote", `<i class="bi bi-shield-exclamation text-danger me-1"></i><b>Пріоритет №1</b> — усунення прострочень (${overdueFac} ПЗ). Доки backlog відкритий, планування майбутніх спливів має другорядний ефект.`);
    } else if (e30.length > 0) {
      setDashHtml("planManagementNote", `<i class="bi bi-clock-history text-warning me-1"></i>Немає прострочень. Найближчі <b>${e30.length}</b> документів ≤30 дн. — сформуйте тижневий план продовження.`);
    } else if (watch.length > 0) {
      setDashHtml("planManagementNote", `<i class="bi bi-check2-circle text-success me-1"></i>Операційний горизонт контрольований. Розподіліть ${watch.length} документів 31–90 дн. між відповідальними без авралу.`);
    } else {
      setDashHtml("planManagementNote", `<i class="bi bi-check2-circle text-success me-1"></i>У горизонті 90 днів критичних подій немає. Підтримуйте регулярний моніторинг.`);
    }

    const bind = (id, fn) => {
      const btn = document.getElementById(id);
      if (btn && !btn.dataset.bound) {
        btn.dataset.bound = "1";
        btn.addEventListener("click", fn);
      }
    };
    bind("planBtnOverdue", () => typeof jumpToFacilities === "function" && jumpToFacilities({ quick: "OVERDUE_ACTIVE" }));
    bind("planBtn30", () => typeof jumpToFacilities === "function" && jumpToFacilities({ quick: "SOON30", sort: "URGENCY" }));

    if (concEl && !concEl.dataset.bound) {
      concEl.dataset.bound = "1";
      concEl.addEventListener("click", e => {
        const row = e.target.closest("[data-plan-port]");
        if (!row || typeof jumpToFacilities !== "function") return;
        const portName = row.dataset.planPort;
        const codes = new Set(
          activeOp
            .filter(x => (x.port_name || "—") === portName && watch.some(w => w.code === x.code))
            .map(x => x.code)
        );
        jumpToFacilities({
          port: portName,
          sort: "URGENCY",
          custom: { label: `${portName} · горизонт ≤90 дн. / прострочені (${codes.size} ПЗ)`, codes }
        });
      });
    }
  })();

  // 2. Рейтинг портів / зон
  const ratingBody = document.getElementById("execPortRatingBody");
  if (ratingBody) {
    const opPorts = (Array.isArray(state?.ports) ? state.ports : []).filter(p => ["Працює", "ВВШ"].includes(p.operational_status));
    ratingBody.innerHTML = opPorts.map(p => {
      const pf = activeOp.filter(x => x.port_id === p.id);
      const cnt = pf.length;
      const okCnt = pf.filter(x => ["Чинний", "В процесі отримання Акта"].includes(x.auto_badge)).length;
      const pctOk = cnt ? Math.round(okCnt / cnt * 100) : 0;
      const overCnt = typeof isOverdueActive === "function" ? pf.filter(isOverdueActive).length : 0;
      const gisisCnt = pf.filter(x => x.has_gisis_date_mismatch).length;
      const avgR = cnt && typeof calcRiskInfo === "function"
        ? Math.round(pf.reduce((s, x) => s + calcRiskInfo(x).score, 0) / cnt)
        : 0;
      const barCol = pctOk >= 75 ? "bg-success" : pctOk >= 40 ? "bg-warning" : "bg-danger";
      return `<tr style="cursor:pointer;" data-exec-port="${esc(p.port_name)}">
        <td class="small fw-semibold">${esc(p.port_name)}</td>
        <td class="text-center tabular-nums"><b>${cnt}</b></td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="progress flex-grow-1" style="height:10px; border-radius:8px;"><div class="progress-bar ${barCol}" style="width:${pctOk}%; border-radius:8px;"></div></div>
            <span class="small tabular-nums fw-semibold" style="min-width:34px;">${pctOk}%</span>
          </div>
        </td>
        <td class="text-center">${overCnt ? `<span class="badge bg-danger">${overCnt}</span>` : '<span class="text-muted">0</span>'}</td>
        <td class="text-center">${gisisCnt ? `<span class="badge bg-warning text-dark">${gisisCnt}</span>` : '<span class="text-muted">0</span>'}</td>
        <td class="text-center"><span class="badge ${avgR >= 40 ? "bg-danger-subtle text-danger" : avgR > 0 ? "bg-warning-subtle text-warning-emphasis" : "bg-success-subtle text-success"}">${avgR}</span></td>
      </tr>`;
    }).join("") || '<tr><td colspan="6" class="text-center text-muted py-3">Даних немає</td></tr>';

    if (!ratingBody.dataset.boundClick) {
      ratingBody.dataset.boundClick = "1";
      ratingBody.addEventListener("click", e => {
        const tr = e.target.closest("tr[data-exec-port]");
        if (tr && typeof jumpToFacilities === "function") jumpToFacilities({ port: tr.dataset.execPort, quick: "ACTIVE_ONLY" });
      });
    }
  }

  // 3. Судна та найближчі перевірки
  const vesBox = document.getElementById("execVesselsSummary");
  if (vesBox) {
    const vessels = Array.isArray(state?.vessels) ? state.vessels : [];
    const inspections = Array.isArray(state?.inspections) ? state.inspections : [];
    const latestYear = vessels.length ? Math.max(...vessels.map(v => v.year)) : null;
    const vesRows = latestYear ? vessels.filter(v => v.year === latestYear).slice(0, 4) : [];
    const todayStr = typeof todayLocal === "function" ? todayLocal() : new Date().toISOString().slice(0, 10);
    const upcoming = inspections
      .filter(i => i.status === "Заплановано" && i.date_start && i.date_start >= todayStr)
      .sort((a, b) => a.date_start.localeCompare(b.date_start))
      .slice(0, 3);

    vesBox.innerHTML = `
      <div class="mb-2">
        <div class="fw-semibold text-muted mb-1">Показники суден (${latestYear || "—"} рік):</div>
        ${vesRows.length ? vesRows.map(v => `<div class="d-flex justify-content-between py-1 border-bottom"><span>${esc(v.metric_name)}</span><b class="tabular-nums ms-2">${esc(v.metric_value ?? v.metric_text ?? "—")}</b></div>`).join("") : '<div class="text-muted">Дані по суднах відсутні</div>'}
      </div>
      <div>
        <div class="fw-semibold text-muted mb-1">Найближчі заплановані перевірки:</div>
        ${upcoming.length ? upcoming.map(i => `<div class="d-flex justify-content-between py-1 border-bottom"><span><b>${esc(i.facility_code)}</b> · ${esc(i.port_facilities?.ports?.port_name || "")}</span><span class="text-primary tabular-nums">${esc(i.date_start)}</span></div>`).join("") : '<div class="text-muted">Запланованих перевірок немає</div>'}
      </div>`;
  }

  if (document.getElementById("chkExecutiveMode")?.checked && typeof renderExecutiveCharts === "function") {
    renderExecutiveCharts();
  }
}

/**
 * Оновлює KPI, таблиці ризиків і графіки аналітики.
 */
function renderDashboard() {
  const f = Array.isArray(state?.facilities) ? state.facilities : [];
  const activeOp = f.filter(x => x.is_active_operational);
  const validCount = activeOp.filter(x => x.auto_badge === "Чинний").length;
  const procCount = activeOp.filter(x => x.auto_badge === "В процесі отримання Акта").length;
  const soonCount = activeOp.filter(x => x.auto_badge === "Критично (< 60 дн.)").length;
  const overdueActive = activeOp.filter(x => x.auto_badge === "Прострочено").length;
  const gisisActive = activeOp.filter(x => x.has_gisis_date_mismatch).length;
  const overdueInactive = f.filter(x => !x.is_active_operational && x.auto_badge === "Прострочено").length;
  const stoppedInActivePorts = f.filter(x => ["Працює", "ВВШ"].includes(x.port_status) && x.facility_status !== "Діючий").length;
  const inClosedPorts = f.filter(x => !["Працює", "ВВШ"].includes(x.port_status)).length;

  const anim = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (typeof animateKpiValue === "function") animateKpiValue(el, val);
    else el.textContent = String(val);
  };

  anim("kpiActive", activeOp.length);
  setDashText("kpiTotalSub", `(із ${f.length}; зупинено/викл.: ${stoppedInActivePorts}, непрац.: ${inClosedPorts})`);
  anim("kpiValid", validCount + procCount);
  setDashText("kpiValidSub", activeOp.length
    ? `(${Math.round((validCount + procCount) / activeOp.length * 100)}%: ${validCount} чинних, ${procCount} в процесі)` : "");
  anim("kpiSoon", soonCount);
  anim("kpiBad", activeOp.filter(x => x.auto_badge === "Прострочено" || x.has_gisis_date_mismatch).length);
  setDashText("kpiGisisSub", `(${overdueActive} простроч., ${gisisActive} ГІСІС; +${overdueInactive} у непрац.)`);

  const cntOver = typeof isOverdueActive === "function" ? activeOp.filter(isOverdueActive).length : 0;
  const cnt30 = typeof isSoonActive === "function" ? activeOp.filter(x => isSoonActive(x, 30)).length : 0;
  const cnt60 = typeof isSoonActive === "function" ? activeOp.filter(x => isSoonActive(x, 60)).length : 0;
  const cnt90 = typeof isSoonActive === "function" ? activeOp.filter(x => isSoonActive(x, 90)).length : 0;

  setDashHtml("horizonTiles", `
    <div class="border rounded bg-danger-subtle horizon-tile" onclick="jumpToFacilities({ quick: 'OVERDUE_ACTIVE', sort: 'URGENCY' })"><div class="small text-danger fw-semibold"><span class="status-dot status-dot--overdue"></span>Прострочено</div><div class="h4 fw-bold mb-0 mt-1 tabular-nums">${cntOver} ПЗ</div></div>
    <div class="border rounded bg-warning-subtle horizon-tile" onclick="jumpToFacilities({ quick: 'SOON30', sort: 'URGENCY' })"><div class="small text-warning-emphasis fw-semibold"><span class="status-dot status-dot--30"></span>≤ 30 днів</div><div class="h4 fw-bold mb-0 mt-1 tabular-nums">${cnt30} ПЗ</div></div>
    <div class="border rounded bg-warning bg-opacity-25 horizon-tile" onclick="jumpToFacilities({ quick: 'SOON60', sort: 'URGENCY' })"><div class="small text-dark fw-semibold"><span class="status-dot status-dot--60"></span>≤ 60 днів</div><div class="h4 fw-bold mb-0 mt-1 tabular-nums">${cnt60} ПЗ</div></div>
    <div class="border rounded bg-info-subtle horizon-tile" onclick="jumpToFacilities({ quick: 'SOON90', sort: 'URGENCY' })"><div class="small text-info-emphasis fw-semibold"><span class="status-dot status-dot--90"></span>≤ 90 днів</div><div class="h4 fw-bold mb-0 mt-1 tabular-nums">${cnt90} ПЗ</div></div>`);

  setDashHtml("forecastBox",
    `<i class="bi bi-graph-up-arrow text-primary me-1"></i><b>Прогноз по діючих ПЗ:</b> ` +
    `у найближчі 30 дн. спливає строк у <b>${cnt30}</b> ПЗ, до 60 дн. — у <b>${cnt60}</b> ПЗ, до 90 дн. — у <b>${cnt90}</b> ПЗ.`);

  const counts = {};
  f.forEach(x => {
    counts[x.auto_badge] = (counts[x.auto_badge] || 0) + 1;
  });
  setDashHtml("statusSummaryPills", Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<button type="button" class="badge bg-light text-dark border status-pill-btn" data-status="${esc(k)}" onclick="jumpToFacilities({ badge: this.dataset.status })">${esc(k)}: <b>${v}</b></button>`)
    .join(""));

  const riskItems = typeof calcRiskInfo === "function"
    ? activeOp.map(x => ({ ...x, risk: calcRiskInfo(x) }))
        .filter(x => x.risk.score > 0)
        .sort((a, b) => b.risk.score - a.risk.score || ((typeof minDays === "function" ? minDays(a) : null) ?? 9999) - ((typeof minDays === "function" ? minDays(b) : null) ?? 9999))
    : [];

  const avgRisk = activeOp.length && typeof calcRiskInfo === "function"
    ? Math.round(activeOp.reduce((s, x) => s + calcRiskInfo(x).score, 0) / activeOp.length)
    : 0;
  const curYear = new Date().getFullYear();
  const inspThisYear = (Array.isArray(state?.inspections) ? state.inspections : [])
    .filter(i => i.inspection_year === curYear && i.status === "Проведено").length;

  anim("execTotal", f.length);
  anim("execActive", activeOp.length);
  anim("execOverdue", overdueActive);
  anim("execCritical", soonCount);
  setDashText("execInspLabel", `Перевірок (${curYear})`);
  anim("execInspections", inspThisYear);
  anim("execAvgRisk", avgRisk);

  setDashHtml("execTopRisks", riskItems.slice(0, 5).map(r => `
    <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
      <div><b>${esc(r.code)}</b> · <span class="small text-muted">${esc(r.port_name)}</span> — <span class="small">${esc(r.name)}</span></div>
      <div class="d-flex align-items-center gap-2">
        <span class="small text-muted">${esc(r.risk.factors.join(", "))}</span>
        <span class="badge ${riskBadgeClass(r.risk.score)}">${r.risk.score} балів</span>
        <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" data-action="view-facility" data-code="${esc(r.code)}" title="Переглянути картку (тільки читання)"><i class="bi bi-eye"></i></button>
      </div>
    </div>`).join("") || '<div class="text-muted small">Ризикових ПЗ не виявлено</div>');

  renderExecutiveExtras();

  setDashText("riskCountBadge", `${riskItems.length} ПЗ`);
  if (document.getElementById("riskWrap") && document.getElementById("riskBody") && typeof mountVirtual === "function") {
    mountVirtual({
      wrap: "riskWrap", body: "riskBody", colspan: 7, estimate: 42,
      emptyHtml: '<tr><td colspan="7" class="text-center text-muted py-3">Діючих ПЗ із факторами ризику не знайдено</td></tr>',
      rowHtml: riskItems.map(r => {
        const lvl = typeof riskLevel === "function" ? riskLevel(r.risk.score) : "";
        const lvlCls = r.risk.score >= 75 ? "text-danger fw-semibold" : r.risk.score >= 50 ? "text-warning-emphasis fw-semibold" : "text-muted";
        return `<tr>
        <td><button class="btn btn-sm btn-outline-primary py-0 px-2" data-action="edit-facility" data-code="${esc(r.code)}"><i class="bi bi-pencil"></i></button></td>
        <td><b>${esc(r.code)}</b></td>
        <td class="small">${esc(r.port_name)}</td>
        <td class="small">${esc(r.name)}</td>
        <td class="${lvlCls}">${esc(lvl)}</td>
        <td><span class="badge ${riskBadgeClass(r.risk.score)}">${r.risk.score}</span></td>
        <td class="small text-danger">${esc((r.risk.factors || []).join(" · "))}</td>
      </tr>`;
      })
    });
  }

  const hideStopped = Boolean(document.getElementById("chkHideStoppedAlerts")?.checked);
  const alerts = f.filter(x => {
    if (x.port_status === "Закрито" || x.facility_status === "Виключено") return false;
    if (hideStopped && (x.port_status === "Не працює" || x.facility_status === "Призупинено")) return false;
    return true;
  }).map(x => {
    const m = typeof minDays === "function" ? minDays(x) : null;
    const reasons = []; let priority = 99;
    if (m !== null && m >= 0 && m <= 90) { reasons.push(`Закінчується через ${m} дн.`); priority = 1; }
    if (x.has_gisis_date_mismatch) { reasons.push("Розбіжність ГІСІС"); priority = Math.min(priority, 2); }
    if (m !== null && m < 0) { reasons.push("Прострочено"); priority = Math.min(priority, 3); }
    return { ...x, minD: m, priority, reasonText: reasons.join("; ") };
  }).filter(x => x.reasonText).sort((a, b) => a.priority - b.priority || (a.minD ?? 9999) - (b.minD ?? 9999));

  
  // KPI конвенційних суден
  const cv = Array.isArray(state.conventionVessels) ? state.conventionVessels : [];
  const cvActive = cv.filter(v => v.is_active !== false);
  const cvOver = cvActive.filter(v => {
    const m = typeof vesselMinDays === "function" ? vesselMinDays(v) : null;
    return m !== null && m < 0;
  }).length;
  const cvSoon = cvActive.filter(v => {
    const m = typeof vesselMinDays === "function" ? vesselMinDays(v) : null;
    return m !== null && m >= 0 && m <= 60;
  }).length;
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val); };
  setTxt("kpiConvVessels", cv.length);
  setTxt("kpiConvOverdue", cvOver);
  setTxt("kpiConvSoon", cvSoon);
  setTxt("kpiVesselInsp", (state.vesselInspections || []).length);

  if (typeof BASE_TITLE !== "undefined") {
    document.title = (alerts.length > 0 ? `(${alerts.length}) ` : "") + BASE_TITLE;
  }

  if (document.getElementById("alertsWrap") && document.getElementById("alertsBody") && typeof mountVirtual === "function") {
    mountVirtual({
      wrap: "alertsWrap", body: "alertsBody", colspan: 7, estimate: 40,
      emptyHtml: '<tr><td colspan="7" class="text-center text-muted py-3">Зауважень немає</td></tr>',
      rowHtml: alerts.map(a => `<tr>
        <td><button class="btn btn-sm btn-outline-primary py-0 px-2" data-action="edit-facility" data-code="${esc(a.code)}"><i class="bi bi-pencil"></i></button></td>
        <td><b>${esc(a.code)}</b></td><td>${esc(a.port_name)}</td><td class="small">${esc(a.name)}</td>
        <td>${badgeHtml(a.auto_badge)}</td><td><b>${a.minD ?? "—"}</b></td>
        <td class="text-danger small fw-semibold">${esc(a.reasonText)}</td>
      </tr>`)
    });
  }

  if (typeof animateDashboardCards === "function") animateDashboardCards();

  if (typeof chartsDirty !== "undefined") chartsDirty = true;
  if (document.getElementById("tabDashboard")?.classList.contains("active") && !document.getElementById("chkExecutiveMode")?.checked && typeof renderCharts === "function") {
    renderCharts();
  }

function renderVesselsAnalyticsBlock() {
  const vessels = state.conventionVessels || [];
  const inspections = state.vesselInspections || [];
  const activeVessels = vessels.filter(v => v.is_active !== false);

  let overdue = 0;
  let soon60 = 0;

  activeVessels.forEach(v => {
    const dates = [v.certificate_expiry, v.ssa_expiry, v.ssp_expiry]
      .filter(Boolean)
      .map(d => Math.ceil((new Date(d) - new Date()) / 86400000));
    if (!dates.length) return;
    const minD = Math.min(...dates);
    if (minD < 0) overdue += 1;
    else if (minD <= 60) soon60 += 1;
  });

  const doneInsp = inspections.filter(i => i.status === "Проведено").length;

  setDashText("dashVesTotal", vessels.length);
  setDashText("dashVesActive", activeVessels.length);
  setDashText("dashVesOverdue", overdue);
  setDashText("dashVesSoon60", soon60);
  setDashText("dashVesInspTotal", inspections.length);
  setDashText("dashVesInspDone", doneInsp);
}
  
}
