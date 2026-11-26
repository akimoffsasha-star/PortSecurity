/* Календар перевірок: FullCalendar, бічна панель, швидкі фільтри, резервна сітка */

function addOneDayIso(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}


/** Кольори подій суден у календарі. */
const CAL_VESSEL_COLORS = {
  "Проведено": { bg: "#dcfce7", text: "#166534", border: "#16a34a" },
  "Заплановано": { bg: "#dbeafe", text: "#1e40af", border: "#2563eb" },
  "Скасовано": { bg: "#f1f5f9", text: "#475569", border: "#64748b" },
  docOk: { bg: "#ede9fe", text: "#5b21b6", border: "#7c3aed" },
  docSoon: { bg: "#fef3c7", text: "#92400e", border: "#d97706" },
  docBad: { bg: "#fee2e2", text: "#991b1b", border: "#dc2626" }
};

/**
 * Події суден для календаря: перевірки (vessel_inspections) та строки документів
 * конвенційних суден (свідоцтво / оцінка / план охорони).
 * Керуються чекбоксами «Перевірки суден» і «Терміни документів».
 * @returns {Array<{kind:string,id:any,date:string,title:string,color:object,badge:string,sub:string}>}
 */
function getCalVesselItems() {
  const showInsp = document.getElementById("calShowVesselInsp")?.checked !== false;
  const showDocs = document.getElementById("calShowVesselDocs")?.checked !== false;
  const stFlt = document.getElementById("calStatusFlt")?.value || "ALL";
  const items = [];
  if (showInsp) {
    (state.vesselInspections || []).forEach(r => {
      if (!r.inspection_date) return;
      const st = r.status || "Проведено";
      if (stFlt !== "ALL" && st !== stFlt) return;
      items.push({
        kind: "vinsp", id: r.id, date: String(r.inspection_date).slice(0, 10),
        title: `⚓ ${r.vessel_name}${r.inspection_type ? " — " + r.inspection_type : ""}`,
        color: CAL_VESSEL_COLORS[st] || CAL_VESSEL_COLORS["Скасовано"],
        badge: st, sub: [r.result, r.flag].filter(Boolean).join(" · ")
      });
    });
  }
  // Строки документів — це не «перевірки», тому за фільтра статусу не показуються
  if (showDocs && stFlt === "ALL") {
    (state.conventionVessels || []).forEach(v => {
      if (v.is_active === false) return;
      [["cert_expiry", "свідоцтво"], ["assessment_expiry", "оцінка охорони"], ["plan_expiry", "план охорони"]].forEach(([k, label]) => {
        if (!v[k]) return;
        const d = daysTo(v[k]);
        const color = d !== null && d < 0 ? CAL_VESSEL_COLORS.docBad : d !== null && d <= 60 ? CAL_VESSEL_COLORS.docSoon : CAL_VESSEL_COLORS.docOk;
        items.push({
          kind: "vdoc", id: v.id, date: String(v[k]).slice(0, 10),
          title: `⚓ ${v.name}: ${label} до`, color,
          badge: d !== null && d < 0 ? "Прострочено" : "Строк", sub: v.company_cso || v.shipowner_contacts || ""
        });
      });
    });
  }
  return items;
}

/**
 * Малює місяць/тиждень/список перевірок.
 */
function renderCalendar() {
  const host = document.getElementById("fcCalendar");
  const fbWrap = document.getElementById("calFallbackWrap");
  const pane = document.getElementById("tabCalendar");
  if (!host || !pane || !pane.classList.contains("active")) return;

  syncCalStatusPills();

  const stFlt = document.getElementById("calStatusFlt")?.value || "ALL";
  const colorMap = {
    "Проведено": { bg: "#dcfce7", text: "#166534", border: "#16a34a" },
    "Заплановано": { bg: "#dbeafe", text: "#1e40af", border: "#2563eb" },
    "Перенесено": { bg: "#fef3c7", text: "#92400e", border: "#d97706" },
    "Не проводилась": { bg: "#f1f5f9", text: "#475569", border: "#64748b" }
  };

  const events = state.inspections
    .filter(ev => ev.date_start && (stFlt === "ALL" || ev.status === stFlt))
    .map(ev => {
      const c = colorMap[ev.status] || colorMap["Не проводилась"];
      const endInc = ev.date_end || ev.date_start;
      return {
        id: String(ev.id),
        title: `${ev.facility_code}${ev.port_facilities?.name ? " — " + ev.port_facilities.name : ""}`,
        start: ev.date_start,
        end: addOneDayIso(endInc),
        allDay: true,
        backgroundColor: c.bg,
        textColor: c.text,
        borderColor: c.border,
        extendedProps: { inspId: ev.id }
      };
    });

  getCalVesselItems().forEach((it, i) => {
    events.push({
      id: `${it.kind}-${it.id}-${i}`,
      title: it.title,
      start: it.date,
      allDay: true,
      backgroundColor: it.color.bg,
      textColor: it.color.text,
      borderColor: it.color.border,
      extendedProps: it.kind === "vinsp" ? { vesselInspId: it.id } : { convVesselId: it.id }
    });
  });

  if (typeof FullCalendar === "undefined") {
    host.classList.add("d-none");
    fbWrap.classList.remove("d-none");
    renderFallbackCalendar();
    renderCalSidePanel();
    return;
  }

  host.classList.remove("d-none");
  fbWrap.classList.add("d-none");

  if (!fcInstance) {
    fcInstance = new FullCalendar.Calendar(host, {
      locale: "uk",
      firstDay: 1,
      initialDate: new Date(calYear, calMonth, 1),
      initialView: "dayGridMonth",
      height: 550,
      dayMaxEvents: 3,
      moreLinkClick: "popover",
      moreLinkText: n => `+ ще ${n}`,
      noEventsText: "Подій у цьому періоді немає",
      headerToolbar: { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,listMonth" },
      buttonText: { today: "Сьогодні", month: "Місяць", week: "Тиждень", list: "Список" },
      events,
      dateClick: info => {
        calSelectedDate = info.dateStr;
        renderCalSidePanel();
        const curFlt = document.getElementById("calStatusFlt")?.value || "ALL";
        const hasAny = state.inspections.some(ev => {
          if (curFlt !== "ALL" && ev.status !== curFlt) return false;
          const ds = ev.date_start, de = ev.date_end || ds;
          return ds && info.dateStr >= ds && info.dateStr <= de;
        });
        const hasVessel = getCalVesselItems().some(it => it.date === info.dateStr);
        if (!hasAny && !hasVessel) openInspectionModal(null, null, info.dateStr);
      },
      eventClick: info => {
        const xp = info.event.extendedProps || {};
        if (xp.inspId) openInspectionModal(xp.inspId);
        else if (xp.vesselInspId) openVesselInspectionModal(xp.vesselInspId);
        else if (xp.convVesselId) openConventionVesselModal(xp.convVesselId);
      },
      datesSet: info => {
        const mid = new Date((info.start.getTime() + info.end.getTime()) / 2);
        calYear = mid.getFullYear();
        calMonth = mid.getMonth();
        calSelectedDate = null;
        if (typeof saveCalPrefs === "function") saveCalPrefs();
        renderCalSidePanel();
      }
    });
    fcInstance.render();
  } else {
    fcInstance.removeAllEvents();
    fcInstance.addEventSource(events);
    fcInstance.updateSize();
    renderCalSidePanel();
  }
}
function toggleCalStatusPill(status) {
  const sel = document.getElementById("calStatusFlt");
  if (!sel || !status) return;
  if (status === "ALL") sel.value = "ALL";
  else sel.value = (sel.value === status) ? "ALL" : status;
  if (typeof saveCalPrefs === "function") saveCalPrefs();
  renderCalendar();
}

function syncCalStatusPills() {
  const cur = document.getElementById("calStatusFlt")?.value || "ALL";
  document.querySelectorAll('[data-action="cal-filter-status"]').forEach(btn => {
    const st = btn.dataset.status;
    btn.classList.toggle("is-active", cur === st);
    btn.classList.toggle("is-dimmed", cur !== "ALL" && st !== "ALL" && cur !== st);
  });
}
function goToCalMonth(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return;
  const [yy, mm] = ym.split("-").map(Number);
  calYear = yy;
  calMonth = mm - 1;
  calSelectedDate = null;
  if (typeof saveCalPrefs === "function") saveCalPrefs();
  if (fcInstance) {
    fcInstance.gotoDate(`${ym}-01`);
  } else {
    renderFallbackCalendar();
    renderCalSidePanel();
  }
}

function renderCalSidePanel() {
  const titleEl = document.getElementById("calSideTitle");
  const subEl = document.getElementById("calSideSub");
  const listEl = document.getElementById("calSideList");
  const btnMonth = document.getElementById("btnCalShowMonth");
  if (!titleEl || !listEl) return;

  const stFlt = document.getElementById("calStatusFlt")?.value || "ALL";
  let items = [];
  let vitems = [];

  if (calSelectedDate) {
    const [yy, mm, dd] = calSelectedDate.split("-");
    titleEl.textContent = `Перевірки на ${dd}.${mm}.${yy}`;
    btnMonth?.classList.remove("d-none");
    items = state.inspections.filter(ev => {
      if (stFlt !== "ALL" && ev.status !== stFlt) return false;
      const ds = ev.date_start, de = ev.date_end || ds;
      return ds && calSelectedDate >= ds && calSelectedDate <= de;
    });
    vitems = getCalVesselItems().filter(it => it.date === calSelectedDate);
    subEl.textContent = `Знайдено: ${items.length + vitems.length} · Натисніть «Додати перевірку» для нової`;
  } else {
    const mStart = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-01`;
    const lastD = new Date(calYear, calMonth + 1, 0).getDate();
    const mEnd = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(lastD).padStart(2, "0")}`;
    const mLabel = new Date(calYear, calMonth, 1).toLocaleDateString("uk-UA", { month: "long", year: "numeric" });
    titleEl.textContent = `Перевірки: ${mLabel}`;
    btnMonth?.classList.add("d-none");
    items = state.inspections.filter(ev => {
      if (stFlt !== "ALL" && ev.status !== stFlt) return false;
      const ds = ev.date_start, de = ev.date_end || ds;
      return ds && de >= mStart && ds <= mEnd;
    }).sort((a, b) => (a.date_start || "").localeCompare(b.date_start || ""));
    vitems = getCalVesselItems().filter(it => it.date >= mStart && it.date <= mEnd).sort((a, b) => a.date.localeCompare(b.date));
    subEl.textContent = `Усього в місяці: ${items.length + vitems.length} · Клік по дню фільтрує список`;
  }

  const badgeCls = st => st === "Проведено" ? "bg-success" : st === "Заплановано" ? "bg-primary" : st === "Перенесено" ? "bg-warning text-dark" : "bg-secondary";

  const fmtD = iso => iso.split("-").reverse().join(".");
  const vesselHtml = vitems.map(it => `
      <div class="cal-side-item" style="border-left:3px solid ${it.color.border};">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <b>${esc(it.title)}</b>
            <span class="badge ms-1" style="background:${it.color.bg};color:${it.color.text};border:1px solid ${it.color.border};">${esc(it.badge)}</span>
          </div>
          <button type="button" class="btn btn-sm btn-outline-primary py-0 px-2" title="Відкрити" data-action="${it.kind === "vinsp" ? "edit-vessel-insp" : "edit-conv-vessel"}" data-id="${it.id}"><i class="bi bi-pencil"></i></button>
        </div>
        <div class="small text-muted mt-1"><i class="bi bi-calendar-event me-1"></i>${esc(fmtD(it.date))}${it.sub ? " · " + esc(it.sub) : ""}</div>
      </div>`).join("");

  if (items.length || vitems.length) {
    listEl.innerHTML = items.map(ev => `
      <div class="cal-side-item">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <b>${esc(ev.facility_code)}</b>
            <span class="badge ${badgeCls(ev.status)} ms-1">${esc(ev.status)}</span>
            <div class="small text-muted">${esc(ev.port_facilities?.ports?.port_name || "")}</div>
          </div>
          <button type="button" class="btn btn-sm btn-outline-primary py-0 px-2" title="Редагувати" data-action="edit-inspection" data-id="${ev.id}"><i class="bi bi-pencil"></i></button>
        </div>
        <div class="small mt-1">${esc(ev.port_facilities?.name || "")}</div>
        <div class="small text-muted mt-1"><i class="bi bi-calendar-range me-1"></i>${esc(ev.date_start)}${ev.date_end && ev.date_end !== ev.date_start ? " — " + esc(ev.date_end) : ""}${ev.notes ? " · " + esc(ev.notes) : ""}</div>
      </div>`).join("") + vesselHtml;
    return;
  }

  if (calSelectedDate) {
    listEl.innerHTML = `<div class="text-center text-muted small py-4">
      На цю дату перевірок не знайдено
      <div class="mt-2"><button type="button" class="btn btn-sm btn-outline-primary" onclick="openInspectionModal(null, null, calSelectedDate)"><i class="bi bi-plus-lg"></i> Додати на цю дату</button></div>
    </div>`;
    return;
  }

  const monthCounts = new Map();
  state.inspections.forEach(ev => {
    if (!ev.date_start || (stFlt !== "ALL" && ev.status !== stFlt)) return;
    const ym = ev.date_start.slice(0, 7);
    monthCounts.set(ym, (monthCounts.get(ym) || 0) + 1);
  });
  const chips = [...monthCounts.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 8)
    .map(([ym, cnt]) => {
      const [yy, mm] = ym.split("-").map(Number);
      const lbl = new Date(yy, mm - 1, 1).toLocaleDateString("uk-UA", { month: "short", year: "numeric" });
      return `<button type="button" class="btn btn-sm btn-outline-primary py-0 px-2" onclick='goToCalMonth("${esc(ym)}")'>${esc(lbl)} (${cnt})</button>`;
    }).join("");

  listEl.innerHTML = `<div class="text-center text-muted small py-4">
    Перевірок у цьому місяці не знайдено
    ${chips ? `<div class="mt-3"><div class="mb-2 fw-semibold">Місяці з перевірками:</div><div class="d-flex flex-wrap justify-content-center gap-1">${chips}</div></div>` : ""}
  </div>`;
}

/* ── Резервна сітка місяця (якщо FullCalendar не завантажився) ── */

/**
 * Малює місячну сітку 6×7 з перевірками ПЗ та подіями суден.
 */
function renderFallbackCalendar() {
  const body = document.getElementById("calGridBody");
  const titleEl = document.getElementById("calMonthTitle");
  if (!body) return;
  if (titleEl) {
    titleEl.textContent = new Date(calYear, calMonth, 1).toLocaleDateString("uk-UA", { month: "long", year: "numeric" });
  }
  const stFlt = document.getElementById("calStatusFlt")?.value || "ALL";
  const pad = n => String(n).padStart(2, "0");
  const toIso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayIso = toIso(new Date());
  const stCls = { "Проведено": "cal-ev-done", "Заплановано": "cal-ev-plan", "Перенесено": "cal-ev-move" };

  const insp = (state.inspections || []).filter(ev => ev.date_start && (stFlt === "ALL" || ev.status === stFlt));
  const vitems = getCalVesselItems();

  const offset = (new Date(calYear, calMonth, 1).getDay() + 6) % 7; // тиждень з понеділка
  const html = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(calYear, calMonth, 1 - offset + i);
    const ds = toIso(d);
    const evs = [];
    insp.forEach(ev => {
      const de = ev.date_end || ev.date_start;
      if (ds >= ev.date_start && ds <= de) {
        evs.push(`<button type="button" class="cal-ev cal-ev-sm border-0 ${stCls[ev.status] || "cal-ev-none"}" data-action="edit-inspection" data-id="${esc(ev.id)}" title="${esc(ev.facility_code)}">${esc(ev.facility_code)}</button>`);
      }
    });
    vitems.filter(it => it.date === ds).forEach(it => {
      evs.push(`<button type="button" class="cal-ev cal-ev-sm border-0" style="background:${it.color.bg};color:${it.color.text};border-left:3px solid ${it.color.border};" data-action="${it.kind === "vinsp" ? "edit-vessel-insp" : "edit-conv-vessel"}" data-id="${esc(it.id)}" title="${esc(it.title)}">${esc(it.title)}</button>`);
    });
    const shown = evs.slice(0, 3).join("");
    const more = evs.length > 3 ? `<div class="small text-muted">+ ще ${evs.length - 3}</div>` : "";
    const cls = ["cal-day", d.getMonth() !== calMonth ? "other-month" : "", ds === todayIso ? "is-today" : "", ds === calSelectedDate ? "is-selected" : ""].filter(Boolean).join(" ");
    html.push(`<div class="${cls}" data-action="cal-select-day" data-date="${ds}"><div class="cal-day-num"><span>${d.getDate()}</span></div>${shown}${more}</div>`);
  }
  body.innerHTML = html.join("");
}

/** Вибір дня в резервній сітці: показує список дня або створює нову перевірку. */
function selectCalDay(ds) {
  if (!ds) return;
  calSelectedDate = ds;
  renderFallbackCalendar();
  renderCalSidePanel();
  const hasInsp = (state.inspections || []).some(ev => ev.date_start && ds >= ev.date_start && ds <= (ev.date_end || ev.date_start));
  if (!hasInsp && !getCalVesselItems().some(it => it.date === ds)) openInspectionModal(null, null, ds);
}

/** Перемикає місяць у резервній сітці. */
function shiftCalendarMonth(delta) {
  const d = new Date(calYear, calMonth + delta, 1);
  calYear = d.getFullYear();
  calMonth = d.getMonth();
  calSelectedDate = null;
  if (typeof saveCalPrefs === "function") saveCalPrefs();
  renderFallbackCalendar();
  renderCalSidePanel();
}

/** Повертає резервну сітку на поточний місяць. */
function resetCalendarToday() {
  const t = new Date();
  calYear = t.getFullYear();
  calMonth = t.getMonth();
  calSelectedDate = null;
  if (typeof saveCalPrefs === "function") saveCalPrefs();
  renderFallbackCalendar();
  renderCalSidePanel();
}
