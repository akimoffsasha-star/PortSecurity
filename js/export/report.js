/* Email- та PDF-звіти */

function sendAlertsEmail() {
  const rows = getUrgentFacilities(), subject = encodeURIComponent(`Моніторинг охорони ПЗ — оперативний звіт (${todayLocal()})`);
  const lines = rows.slice(0, 25).map(x => { const m = minDays(x), risk = calcRiskInfo(x).score; return `• ${x.code} (${x.port_name}): ${x.auto_badge}${m !== null ? `, мін. днів: ${m}` : ""}${x.has_gisis_date_mismatch ? ", розбіжність ГІСІС" : ""}, Risk=${risk}`; });
  const body = encodeURIComponent(`Оперативна інформація станом на ${new Date().toLocaleString("uk-UA")}:\nУсього ПЗ із зауваженнями/дедлайнами ≤90 дн.: ${rows.length}\n\n` + lines.join("\n") + (rows.length > 25 ? `\n... та ще ${rows.length - 25} ПЗ` : ""));
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

/**
 * Генерує PDF-довідку по діючих ПЗ.
 */
function exportPdfReport() {
  if (typeof pdfMake === "undefined") { notify("PDF-бібліотека недоступна офлайн — відкрито системний друк", false); window.print(); return; }
  const activeOp = state.facilities.filter(x => x.is_active_operational), rows = getFilteredFacilities();
  const body = [
    [{ text: "Код", style: "th" }, { text: "Порт", style: "th" }, { text: "Назва ПЗ", style: "th" }, { text: "Стан", style: "th" }, { text: "Акт до", style: "th" }, { text: "ООПЗ до", style: "th" }, { text: "ПОПЗ до", style: "th" }, { text: "Ризик", style: "th" }],
    ...rows.map(x => [x.code || "", x.port_name || "", x.name || "", x.auto_badge || "", x.act_expiry_date || x.act_status || "", x.oopz_expiry_date || "", x.popz_expiry_date || "", String(calcRiskInfo(x).score)])
  ];
  pdfMake.createPdf({
    pageSize: "A4", pageOrientation: "landscape", pageMargins: [20, 24, 20, 24],
    content: [
      { text: "ЗВЕДЕНИЙ ЗВІТ СТАНУ ОХОРОНИ ПОРТОВИХ ЗАСОБІВ (Наказ Мінрозвитку № 797)", style: "title" },
      { text: `Сформовано: ${new Date().toLocaleString("uk-UA")}   |   Діючих ПЗ: ${activeOp.length}   |   У таблиці: ${rows.length}`, style: "sub" },
      { table: { headerRows: 1, widths: [60, 80, "*", 75, 58, 55, 55, 34], body }, layout: "lightHorizontalLines" }
    ],
    styles: { title: { fontSize: 12, bold: true, color: "#162a3e", margin: [0, 0, 0, 3] }, sub: { fontSize: 8.5, color: "#475569", margin: [0, 0, 0, 8] }, th: { fontSize: 8, bold: true, fillColor: "#162a3e", color: "#ffffff" } },
    defaultStyle: { fontSize: 7.5 }
  }).download(`Звіт_Охорона_ПЗ_797_${todayLocal()}.pdf`);
}

/**
 * Перелік операторів ПЗ та контактів (Excel).
 * Бере унікальні пари «оператор / контакти» з діючих і всіх ПЗ.
 */
async function exportOperatorsContacts() {
  if (typeof ExcelJS === "undefined") return notify("ExcelJS не завантажено", true);
  const map = new Map();
  (state.facilities || []).forEach(x => {
    const name = (x.head_popz || "").trim();
    const contact = (x.head_gisis_status || "").trim();
    if (!name && !contact) return;
    const key = (name + "|" + contact).toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        operator: name || "—",
        contacts: contact || "—",
        facilities: [],
        ports: new Set()
      });
    }
    const row = map.get(key);
    row.facilities.push(x.code);
    if (x.port_name) row.ports.add(x.port_name);
  });
  const rows = [...map.values()].sort((a, b) => a.operator.localeCompare(b.operator, "uk"));
  const wb = new ExcelJS.Workbook();
  addStyledTableSheet(wb, {
    sheetName: "Оператори ПЗ",
    title: `ОПЕРАТОРИ ПОРТОВИХ ЗАСОБІВ ТА КОНТАКТИ — станом на ${new Date().toLocaleDateString("uk-UA")}`,
    headers: ["Оператор ПЗ", "Контакти", "К-сть ПЗ", "Коди ПЗ", "Зони"],
    widths: [36, 40, 10, 60, 40],
    centerCols: [3],
    rows: rows.map(r => [r.operator, r.contacts, r.facilities.length, r.facilities.join(", "), [...r.ports].join(", ")])
  });
  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `operators_PZ_${todayLocal()}.xlsx`);
  notify(`Експортовано операторів: ${rows.length}`);
}

/**
 * Перелік судновласників та контактів із реєстру конвенційних суден.
 */
async function exportShipownersContacts() {
  if (typeof ExcelJS === "undefined") return notify("ExcelJS не завантажено", true);
  const map = new Map();
  (state.conventionVessels || []).forEach(v => {
    const raw = (v.shipowner_contacts || "").trim();
    if (!raw) return;
    const key = raw.toLowerCase();
    if (!map.has(key)) map.set(key, { contacts: raw, vessels: [] });
    map.get(key).vessels.push(v.name);
  });
  const rows = [...map.values()].sort((a, b) => a.contacts.localeCompare(b.contacts, "uk"));
  const wb = new ExcelJS.Workbook();
  addStyledTableSheet(wb, {
    sheetName: "Судновласники",
    title: `СУДНОВЛАСНИКИ ТА КОНТАКТИ — станом на ${new Date().toLocaleDateString("uk-UA")}`,
    headers: ["Судновласник / контакти", "К-сть суден", "Судна", "Офіцер охорони компанії (приклади)"],
    widths: [50, 12, 60, 40],
    centerCols: [2],
    rows: rows.map(r => {
      const cso = (state.conventionVessels || [])
        .filter(v => r.vessels.includes(v.name) && v.company_cso)
        .map(v => v.company_cso);
      return [r.contacts, r.vessels.length, r.vessels.join(", "), [...new Set(cso)].join("; ")];
    })
  });
  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `shipowners_${todayLocal()}.xlsx`);
  notify(`Експортовано судновласників: ${rows.length}`);
}


/**
 * Експорт списку конвенційних суден з урахуванням поточних пошуку та швидкого фільтра.
 */
async function exportConventionVesselsList() {
  if (typeof ExcelJS === "undefined") return notify("ExcelJS не завантажено", true);
  const rows = getFilteredConventionVessels();
  if (!rows.length) return notify("Немає суден для експорту за поточним фільтром");
  const q = (document.getElementById("cvSearch")?.value || "").trim();
  const sel = document.getElementById("cvQuick");
  const quickLbl = sel && sel.value !== "NONE" ? sel.options[sel.selectedIndex].text : "";
  const filters = [quickLbl, q ? `пошук: «${q}»` : ""].filter(Boolean).join("; ");
  const wb = new ExcelJS.Workbook();
  addStyledTableSheet(wb, {
    sheetName: "Конвенційні судна",
    title: `ПЕРЕЛІК КОНВЕНЦІЙНИХ СУДЕН — станом на ${new Date().toLocaleDateString("uk-UA")}${filters ? " (" + filters + ")" : ""}`,
    headers: [
      "№", "Судно / назва", "Міжнародне / тимчасове свідоцтво до", "Оцінка охорони до", "План охорони до",
      "Судновласник / контакти", "Офіцер охорони компанії (CSO)", "Особа, відповідальна за охорону на судні (SSO)",
      "Статус", "Висновок"
    ],
    widths: [5, 28, 18, 14, 14, 32, 24, 26, 12, 34],
    dateCols: [3, 4, 5],
    centerCols: [1, 9],
    rows: rows.map((v, i) => [
      i + 1, v.name || "",
      toExcelDate(v.cert_expiry), toExcelDate(v.assessment_expiry), toExcelDate(v.plan_expiry),
      v.shipowner_contacts || "", v.company_cso || "", v.ship_sso || "",
      v.is_active === false ? "Неактивне" : "Активне", v.conclusion || ""
    ])
  });
  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `convention_vessels_${todayLocal()}.xlsx`);
  notify(`Експортовано суден: ${rows.length}`);
}
