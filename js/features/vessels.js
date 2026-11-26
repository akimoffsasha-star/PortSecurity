/**
 * vessels.js — конвенційні судна, перевірки ОСПЗ, legacy річна статистика.
 */

/** Підказка, якщо таблиця відсутня в Supabase (міграція не виконана). */
function missingTableHint(error, table) {
  const m = String(error?.message || "");
  if (error?.code === "PGRST205" || error?.code === "42P01" || /schema cache|does not exist|Not Found/i.test(m)) {
    return `Таблиці ${table} немає в базі. Виконайте sql/00_run_all_vessels.sql у Supabase → SQL Editor і повторіть.`;
  }
  return null;
}

function daysTo(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(String(iso))) return null;
  const d = new Date(String(iso).slice(0, 10) + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}

function vesselMinDays(v) {
  const nums = [daysTo(v.cert_expiry), daysTo(v.assessment_expiry), daysTo(v.plan_expiry)]
    .filter(n => n !== null);
  return nums.length ? Math.min(...nums) : null;
}

function getFilteredConventionVessels() {
  const q = (document.getElementById("cvSearch")?.value || "").trim().toLowerCase();
  const quick = document.getElementById("cvQuick")?.value || "NONE";
  return (state.conventionVessels || []).filter(v => {
    if (quick === "ACTIVE" && v.is_active === false) return false;
    const m = vesselMinDays(v);
    if (quick === "OVERDUE" && !(m !== null && m < 0)) return false;
    if (quick === "SOON60" && !(m !== null && m >= 0 && m <= 60)) return false;
    if (q) {
      const hay = `${v.name || ""} ${v.shipowner_contacts || ""} ${v.company_cso || ""} ${v.ship_sso || ""} ${v.conclusion || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderConventionVessels() {
  const rows = getFilteredConventionVessels();
  const lbl = document.getElementById("cvCountLabel");
  if (lbl) lbl.textContent = rows.length;
  if (!document.getElementById("convVesselsBody")) return;
  mountVirtual({
    wrap: "convVesselsWrap", body: "convVesselsBody", colspan: 9, estimate: 44,
    emptyHtml: '<tr><td colspan="9" class="text-center text-muted py-3">Немає записів. Додайте судно або виконайте SQL-міграцію convention_vessels у Supabase.</td></tr>',
    rowHtml: rows.map(v => {
      const m = vesselMinDays(v);
      const cls = m !== null && m < 0 ? "row-bad" : m !== null && m <= 60 ? "row-warn" : "";
      return `<tr class="${cls}">
        <td class="no-print"><button class="btn btn-sm btn-outline-primary py-0 px-2" data-action="edit-conv-vessel" data-id="${v.id}"><i class="bi bi-pencil"></i></button></td>
        <td><b>${esc(v.name)}</b></td>
        <td>${formatDateCell(v.cert_expiry, daysTo(v.cert_expiry))}</td>
        <td>${formatDateCell(v.assessment_expiry, daysTo(v.assessment_expiry))}</td>
        <td>${formatDateCell(v.plan_expiry, daysTo(v.plan_expiry))}</td>
        <td class="small">${esc(v.shipowner_contacts || "—")}</td>
        <td class="small">${esc(v.company_cso || "—")}</td>
        <td class="small">${esc(v.ship_sso || "—")}</td>
        <td class="small">${esc(v.conclusion || "")}</td>
      </tr>`;
    })
  });
}

function openConventionVesselModal(id) {
  isNewConventionVessel = id == null;
  const m = document.getElementById("convVesselModal");
  if (!m) return uiAlert("Модалку судна не знайдено.");
  const x = id == null ? {} : (state.conventionVessels || []).find(v => String(v.id) === String(id)) || {};
  document.getElementById("cvId").value = x.id || "";
  document.getElementById("cvName").value = x.name || "";
  document.getElementById("cvCert").value = x.cert_expiry || "";
  document.getElementById("cvAssess").value = x.assessment_expiry || "";
  document.getElementById("cvPlan").value = x.plan_expiry || "";
  document.getElementById("cvOwner").value = x.shipowner_contacts || "";
  document.getElementById("cvCso").value = x.company_cso || "";
  document.getElementById("cvSso").value = x.ship_sso || "";
  document.getElementById("cvConclusion").value = x.conclusion || "";
  document.getElementById("cvActive").checked = x.is_active !== false;
  document.getElementById("btnDeleteConvVessel")?.classList.toggle("d-none", isNewConventionVessel);
  document.getElementById("convVesselModalTitle").textContent = isNewConventionVessel ? "Нове конвенційне судно" : ("Судно: " + (x.name || ""));
  bootstrap.Modal.getOrCreateInstance(m).show();
}

async function saveConventionVessel() {
  if (!sb) return;
  const id = document.getElementById("cvId").value;
  const payload = {
    name: nullIfEmpty(document.getElementById("cvName").value),
    cert_expiry: nullIfEmpty(document.getElementById("cvCert").value),
    assessment_expiry: nullIfEmpty(document.getElementById("cvAssess").value),
    plan_expiry: nullIfEmpty(document.getElementById("cvPlan").value),
    shipowner_contacts: nullIfEmpty(document.getElementById("cvOwner").value),
    company_cso: nullIfEmpty(document.getElementById("cvCso").value),
    ship_sso: nullIfEmpty(document.getElementById("cvSso").value),
    conclusion: nullIfEmpty(document.getElementById("cvConclusion").value),
    is_active: document.getElementById("cvActive").checked,
    updated_at: new Date().toISOString()
  };
  if (!payload.name) return uiAlert("Вкажіть назву судна");
  setLoading(true, "Збереження…");
  let error;
  if (isNewConventionVessel || !id) ({ error } = await sb.from("convention_vessels").insert(payload));
  else ({ error } = await sb.from("convention_vessels").update(payload).eq("id", id));
  setLoading(false);
  if (error) return notify(missingTableHint(error, "convention_vessels") || ("Помилка: " + error.message), true);
  bootstrap.Modal.getInstance(document.getElementById("convVesselModal"))?.hide();
  notify("Збережено");
  loadAll(true);
}

function renderVesselInspections() {
  const q = (document.getElementById("viSearch")?.value || "").trim().toLowerCase();
  const yr = document.getElementById("viYearFlt")?.value || "ALL";
  const st = document.getElementById("viStatFlt")?.value || "ALL";
  let rows = state.vesselInspections || [];
  const years = [...new Set(rows.map(r => (r.inspection_date || "").slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  const sel = document.getElementById("viYearFlt");
  if (sel) {
    const cur = sel.value;
    sel.innerHTML = '<option value="ALL">Усі роки</option>' + years.map(y => `<option value="${y}">${y}</option>`).join("");
    if (cur) setSelectSafe("viYearFlt", cur, "ALL");
  }
  rows = rows.filter(r => {
    if (yr !== "ALL" && !(r.inspection_date || "").startsWith(yr)) return false;
    if (st !== "ALL" && (r.status || "Проведено") !== st) return false;
    if (q) {
      const hay = `${r.vessel_name || ""} ${r.inspection_type || ""} ${r.flag || ""} ${r.comments || ""} ${r.findings || ""} ${r.result || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const lbl = document.getElementById("viCountLabel");
  if (lbl) lbl.textContent = rows.length;
  if (!document.getElementById("vesselInspBody")) return;

  const statusBadge = (s) => {
    const v = s || "Проведено";
    const cls = v === "Проведено" ? "bg-success" : v === "Заплановано" ? "bg-primary" : "bg-secondary";
    return `<span class="badge ${cls}">${esc(v)}</span>`;
  };
  const resultBadge = (r) => {
    if (!r) return "—";
    const map = {
      "Без зауважень": "text-success",
      "Зауваження": "text-warning-emphasis",
      "Критичні невідповідності": "text-danger",
      "Рекомендації": "text-info"
    };
    return `<span class="${map[r] || ""}">${esc(r)}</span>`;
  };

  mountVirtual({
    wrap: "vesselInspWrap", body: "vesselInspBody", colspan: 10, estimate: 48,
    emptyHtml: '<tr><td colspan="10" class="text-center text-muted py-3">Немає перевірок суден. Додайте процедуру контролю ОСПЗ.</td></tr>',
    rowHtml: rows.map(r => {
      const notes = [r.findings, r.corrective_actions].filter(Boolean).join(" · ");
      return `<tr>
      <td class="no-print"><button class="btn btn-sm btn-outline-primary py-0 px-2" data-action="edit-vessel-insp" data-id="${r.id}"><i class="bi bi-pencil"></i></button></td>
      <td><b>${esc(r.vessel_name)}</b></td>
      <td class="small">${esc(r.cert_issued || "—")}</td>
      <td>${esc(r.flag || "Україна")}</td>
      <td>${esc(r.inspection_date || "")}</td>
      <td class="small">${esc(r.inspection_type || "—")}</td>
      <td>${statusBadge(r.status)}</td>
      <td class="small">${resultBadge(r.result)}</td>
      <td class="small text-muted">${esc(notes || "")}</td>
      <td class="small">${esc(r.comments || "")}</td>
    </tr>`;
    })
  });
}

function openVesselInspectionModal(id) {
  const m = document.getElementById("vesselInspModal");
  if (!m) return uiAlert("Модалку перевірки судна не знайдено.");
  const x = id == null ? {} : (state.vesselInspections || []).find(r => String(r.id) === String(id)) || {};
  document.getElementById("viId").value = x.id || "";
  document.getElementById("btnDeleteVesselInsp")?.classList.toggle("d-none", !x.id);
  document.getElementById("viVesselName").value = x.vessel_name || "";
  document.getElementById("viCertIssued").value = x.cert_issued || "";
  document.getElementById("viFlag").value = x.flag || "Україна";
  document.getElementById("viDate").value = x.inspection_date || todayLocal();
  const typeEl = document.getElementById("viType");
  if (typeEl) {
    const t = x.inspection_type || "";
    if (t && ![...typeEl.options].some(o => o.value === t)) {
      const opt = document.createElement("option");
      opt.value = t; opt.textContent = t;
      typeEl.appendChild(opt);
    }
    typeEl.value = t;
  }
  const st = document.getElementById("viStatus");
  if (st) st.value = x.status || (id == null ? "Проведено" : "Проведено");
  const res = document.getElementById("viResult");
  if (res) res.value = x.result || "";
  const find = document.getElementById("viFindings");
  if (find) find.value = x.findings || "";
  const corr = document.getElementById("viCorrective");
  if (corr) corr.value = x.corrective_actions || "";
  document.getElementById("viComments").value = x.comments || "";
  const title = document.getElementById("vesselInspModalTitle");
  if (title) title.textContent = id == null ? "Нова процедура перевірки судна" : ("Перевірка: " + (x.vessel_name || ""));
  const dl = document.getElementById("viVesselList");
  if (dl) dl.innerHTML = (state.conventionVessels || []).map(v => `<option value="${esc(v.name)}"></option>`).join("");
  bootstrap.Modal.getOrCreateInstance(m).show();
}

async function saveVesselInspection() {
  if (!sb) return;
  const id = document.getElementById("viId").value;
  const payload = {
    vessel_name: nullIfEmpty(document.getElementById("viVesselName").value),
    cert_issued: nullIfEmpty(document.getElementById("viCertIssued").value),
    flag: nullIfEmpty(document.getElementById("viFlag").value) || "Україна",
    inspection_date: nullIfEmpty(document.getElementById("viDate").value),
    inspection_type: nullIfEmpty(document.getElementById("viType")?.value),
    status: nullIfEmpty(document.getElementById("viStatus")?.value) || "Проведено",
    result: nullIfEmpty(document.getElementById("viResult")?.value),
    findings: nullIfEmpty(document.getElementById("viFindings")?.value),
    corrective_actions: nullIfEmpty(document.getElementById("viCorrective")?.value),
    comments: nullIfEmpty(document.getElementById("viComments").value)
  };
  if (!payload.vessel_name || !payload.inspection_date) return uiAlert("Вкажіть судно та дату перевірки");
  setLoading(true, "Збереження…");
  let error;
  if (!id) ({ error } = await sb.from("vessel_inspections").insert(payload));
  else ({ error } = await sb.from("vessel_inspections").update(payload).eq("id", id));
  setLoading(false);
  if (error) {
    // сумісність: якщо нові колонки ще не додані — повтор без них
    if (/column|schema|does not exist/i.test(error.message || "")) {
      const basic = {
        vessel_name: payload.vessel_name,
        cert_issued: payload.cert_issued,
        flag: payload.flag,
        inspection_date: payload.inspection_date,
        inspection_type: payload.inspection_type,
        comments: [payload.findings, payload.corrective_actions, payload.comments].filter(Boolean).join(" | ") || null
      };
      const r2 = !id
        ? await sb.from("vessel_inspections").insert(basic)
        : await sb.from("vessel_inspections").update(basic).eq("id", id);
      if (r2.error) return notify(missingTableHint(r2.error, "vessel_inspections") || ("Помилка: " + r2.error.message), true);
      notify("Збережено (базові поля). Виконайте SQL 03_vessel_inspection_detail.sql для повних процедур.");
    } else {
      return notify(missingTableHint(error, "vessel_inspections") || ("Помилка: " + error.message), true);
    }
  } else {
    notify("Збережено");
  }
  bootstrap.Modal.getInstance(document.getElementById("vesselInspModal"))?.hide();
  loadAll(true);
}

function renderVessels() {
  const yrEl = document.getElementById("vesYearFlt");
  if (!yrEl) return;
  const yr = yrEl.value;
  const rows = (state.vessels || []).filter(v => yr === "ALL" || String(v.year) === yr);
  if (!document.getElementById("vesselsBody")) return;
  mountVirtual({
    wrap: "vesselsWrap", body: "vesselsBody", colspan: 7, estimate: 40,
    emptyHtml: '<tr><td colspan="7" class="text-center text-muted py-3">Немає даних річної статистики</td></tr>',
    rowHtml: rows.map(v => `<tr>
      <td class="no-print"><button class="btn btn-sm btn-outline-primary py-0 px-2" onclick="openVesselModal(${v.id})"><i class="bi bi-pencil"></i></button></td>
      <td>${esc(v.year)}</td><td>${esc(v.regime)}</td><td>${esc(v.metric_name)}</td>
      <td>${v.metric_value ?? "—"}</td><td class="small">${esc(v.metric_text || "")}</td>
      <td class="small text-muted">${esc(v.notes || "")}</td>
    </tr>`)
  });
}

function openVesselModal(id) {
  const x = (state.vessels || []).find(v => v.id === id);
  if (!x) return;
  document.getElementById("vesId").value = x.id;
  document.getElementById("vesYear").value = x.year;
  document.getElementById("vesRegime").value = x.regime || "";
  document.getElementById("vesMetric").value = x.metric_name || "";
  document.getElementById("vesValue").value = x.metric_value ?? "";
  document.getElementById("vesText").value = x.metric_text || "";
  document.getElementById("vesNotes").value = x.notes || "";
  bootstrap.Modal.getOrCreateInstance(document.getElementById("vesselModal")).show();
}

async function saveVesselStat() {
  const id = document.getElementById("vesId").value;
  const payload = {
    metric_value: nullIfEmpty(document.getElementById("vesValue").value),
    metric_text: nullIfEmpty(document.getElementById("vesText").value),
    notes: nullIfEmpty(document.getElementById("vesNotes").value)
  };
  setLoading(true, "Збереження…");
  const { error } = await sb.from("vessels_annual_stats").update(payload).eq("id", id);
  setLoading(false);
  if (error) return notify("Помилка: " + error.message, true);
  bootstrap.Modal.getInstance(document.getElementById("vesselModal")).hide();
  notify("Оновлено");
  loadAll(true);
}

async function openNewYearVesselsModal() {
  const yrStr = await uiPrompt("Введіть рік для створення нової звітної таблиці по суднах:", "2026", "Новий звітний рік");
  if (!yrStr) return;
  const yr = parseInt(yrStr, 10);
  if (!yr || yr < 2020 || yr > 2050) return uiAlert("Некоректний рік", "Помилка");
  if ((state.vessels || []).some(v => v.year === yr)) return uiAlert(`Дані за ${yr} рік уже існують`, "Увага");
  const years = (state.vessels || []).map(v => v.year);
  const baseYear = years.length ? Math.max(...years) : 0;
  const template = (state.vessels || []).filter(v => v.year === baseYear).map(v => ({
    year: yr, letter_ref: null, regime: v.regime, metric_order: v.metric_order,
    metric_name: v.metric_name, metric_value: null, metric_text: null, notes: null
  }));
  if (!template.length) return uiAlert("Немає базового шаблону для копіювання");
  setLoading(true, "Створення…");
  const { error } = await sb.from("vessels_annual_stats").insert(template);
  setLoading(false);
  if (error) return notify("Помилка: " + error.message, true);
  notify(`Створено форму за ${yr}`);
  loadAll(true);
}


function openConvVesselsFiltered(quick) {
  bootstrap.Tab.getOrCreateInstance(document.querySelector('[data-bs-target="#tabVessels"]')).show();
  // підвкладка конвенційних суден
  const btn = document.querySelector('[data-bs-target="#paneConvVessels"]');
  if (btn) bootstrap.Tab.getOrCreateInstance(btn).show();
  const sel = document.getElementById("cvQuick");
  if (sel) { sel.value = quick || "NONE"; }
  if (typeof renderConventionVessels === "function") renderConventionVessels();
}

function openVesselInspectionsTab() {
  bootstrap.Tab.getOrCreateInstance(document.querySelector('[data-bs-target="#tabVessels"]')).show();
  const btn = document.querySelector('[data-bs-target="#paneVesselInsp"]');
  if (btn) bootstrap.Tab.getOrCreateInstance(btn).show();
  if (typeof renderVesselInspections === "function") renderVesselInspections();
}


/** Видаляє конвенційне судно після підтвердження (запис потрапляє в журнал змін). */
async function deleteConventionVessel() {
  const id = document.getElementById("cvId").value;
  const name = document.getElementById("cvName").value;
  if (!id || !(await uiConfirm(`Видалити судно «${name}»? Дію неможливо скасувати.`, "Видалення судна", "btn-danger", "Видалити"))) return;
  setLoading(true, "Видалення…");
  const { error } = await sb.from("convention_vessels").delete().eq("id", id);
  setLoading(false);
  if (error) return notify("Помилка: " + error.message, true);
  bootstrap.Modal.getInstance(document.getElementById("convVesselModal"))?.hide();
  notify("Видалено");
  loadAll(true);
}

/** Видаляє запис перевірки судна після підтвердження. */
async function deleteVesselInspection() {
  const id = document.getElementById("viId").value;
  if (!id || !(await uiConfirm("Видалити цей запис про перевірку судна?", "Видалення перевірки", "btn-danger", "Видалити"))) return;
  setLoading(true, "Видалення…");
  const { error } = await sb.from("vessel_inspections").delete().eq("id", id);
  setLoading(false);
  if (error) return notify("Помилка: " + error.message, true);
  bootstrap.Modal.getInstance(document.getElementById("vesselInspModal"))?.hide();
  notify("Видалено");
  loadAll(true);
}
