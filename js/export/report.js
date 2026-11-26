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
function downloadWordHtml(filename, title, subtitle, headers, rows, opts = {}) {
  const { landscape = false, colWidths = [] } = opts;

  const escCell = v => String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, "<br>");

  const colGroupHtml = colWidths.length
    ? `<colgroup>${colWidths.map(w => `<col style="width:${w};">`).join("")}</colgroup>`
    : "";

  const thHtml = headers
    .map((h, i) => `<th${colWidths[i] ? ` style="width:${colWidths[i]};"` : ""}>${escCell(h)}</th>`)
    .join("");

  const trHtml = rows
    .map(r => `<tr>${r.map(c => `<td>${escCell(c)}</td>`).join("")}</tr>`)
    .join("");

  // A4: 297mm x 210mm (альбомна) або 210mm x 297mm (книжкова)
  // Поля: верхнє 25мм, праве 10мм, нижнє 10мм, ліве 10мм
  const pageSizeCss = landscape ? "297mm 210mm" : "210mm 297mm";
  const orientationCss = landscape ? "landscape" : "portrait";

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40"
      lang="uk">
<head>
<meta charset="utf-8">
<title>${escCell(title)}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page Section1 {
    size: ${pageSizeCss};
    mso-page-orientation: ${orientationCss};
    margin: 25mm 10mm 10mm 10mm;
    mso-header-margin: 10mm;
    mso-footer-margin: 5mm;
    mso-title-page: yes;
    mso-footer: f1;
    mso-first-footer: ff1;
  }
  div.Section1 {
    page: Section1;
  }
  body {
    font-family: "Times New Roman", serif;
    font-size: 10.5pt;
    color: #000;
    margin: 0;
    padding: 0;
  }
  h2 {
    font-size: 13pt;
    text-align: center;
    margin: 0 0 4px 0;
  }
  .meta {
    font-size: 9.5pt;
    text-align: center;
    margin-bottom: 10px;
    color: #333;
  }
  table.data-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin-top: 6px;
  }
  table.data-table th,
  table.data-table td {
    border: 1px solid #000;
    padding: 4px 5px;
    vertical-align: top;
    word-wrap: break-word;
    overflow-wrap: break-word;
    font-size: 9.5pt;
  }
  table.data-table th {
    font-weight: bold;
    text-align: center;
    background: #f2f2f2;
  }
  table.data-table thead {
    display: table-header-group;
  }
  table.data-table tr {
    page-break-inside: avoid;
  }
  .note-box {
    margin-top: 14px;
    border-top: 1px dashed #666;
    padding-top: 8px;
    font-size: 10pt;
  }
  p.MsoFooter, p.MsoFirstFooter {
    margin: 0;
    text-align: center;
    font-family: "Times New Roman", serif;
    font-size: 9.5pt;
  }
  table.hf-table {
    width: 0;
    height: 0;
    visibility: hidden;
    mso-element: footer;
  }
</style>
</head>
<body>
<div class="Section1">
  <h2>${escCell(title)}</h2>
  <div class="meta">${escCell(subtitle)}</div>
  <table class="data-table">
    ${colGroupHtml}
    <thead><tr>${thHtml}</tr></thead>
    <tbody>${trHtml}</tbody>
  </table>
  <div class="note-box">
    <b>Рішення / доручення / заходи:</b> __________________________________________________________________________
  </div>
</div>

<!-- Колонтитули Word: 1-ша сторінка порожня, з 2-ї сторінки — номер по центру внизу -->
<div style="mso-element:footer" id="ff1">
  <p class="MsoFirstFooter"></p>
</div>
<div style="mso-element:footer" id="f1">
  <p class="MsoFooter">
    <span style="mso-field-code:' PAGE '"></span>
  </p>
</div>
</body>
</html>`;

  const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
  downloadBlob(blob, filename);
}

function exportOperatorsWord() {
  const map = new Map();
  (state.facilities || []).forEach(x => {
    const name = (x.head_popz || "").trim();
    const contact = (x.head_gisis_status || "").trim();
    if (!name && !contact) return;

    const key = `${name}|${contact}`.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        operator: name || "—",
        contacts: contact || "—",
        officers: new Set(),
        codes: [],
        ports: new Set()
      });
    }
    const row = map.get(key);
    if (x.officers_popz && x.officers_popz.trim()) row.officers.add(x.officers_popz.trim());
    if (x.code) row.codes.push(x.code.trim());
    if (x.port_name) row.ports.add(x.port_name.trim());
  });

  const rows = [...map.values()]
    .sort((a, b) => a.operator.localeCompare(b.operator, "uk"))
    .map((r, idx) => [
      idx + 1,
      r.operator,
      r.contacts,
      [...r.officers].join("; ") || "—",
      [...r.ports].join(", ") || "—",
      r.codes.join(", ") || "—",
      r.codes.length
    ]);

  downloadWordHtml(
    `operators_PZ_${todayLocal()}.doc`,
    "ПЕРЕЛІК ОПЕРАТОРІВ ПОРТОВИХ ЗАСОБІВ ТА КОНТАКТІВ",
    `Сформовано: ${new Date().toLocaleString("uk-UA")} | Усього операторів: ${rows.length}`,
    ["№", "Оператор ПЗ", "Контакти", "Офіцери охорони", "Порт / Зона", "Коди ПЗ", "К-сть ПЗ"],
    rows
  );
}

function exportShipownersWord() {
  const map = new Map();
  (state.conventionVessels || []).forEach(v => {
    const raw = (v.shipowner_contacts || "").trim();
    if (!raw) return;

    const key = raw.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        contacts: raw,
        vessels: [],
        csos: new Set(),
        ssos: new Set()
      });
    }
    const row = map.get(key);
    if (v.name) row.vessels.push(v.name.trim());
    if (v.company_cso && v.company_cso.trim()) row.csos.add(v.company_cso.trim());
    if (v.ship_sso && v.ship_sso.trim()) row.ssos.add(v.ship_sso.trim());
  });

  const rows = [...map.values()]
    .sort((a, b) => a.contacts.localeCompare(b.contacts, "uk"))
    .map((r, idx) => [
      idx + 1,
      r.contacts,
      r.vessels.join(", ") || "—",
      [...r.csos].join("; ") || "—",
      [...r.ssos].join("; ") || "—",
      r.vessels.length
    ]);

  downloadWordHtml(
    `shipowners_${todayLocal()}.doc`,
    "ПЕРЕЛІК СУДНОВЛАСНИКІВ КОНВЕНЦІЙНИХ СУДЕН ТА КОНТАКТІВ",
    `Сформовано: ${new Date().toLocaleString("uk-UA")} | Усього судновласників: ${rows.length}`,
    ["№", "Судновласник / Контакти", "Судна", "Офіцер охорони компанії", "Особа, відповідальна за охорону на судні", "К-сть суден"],
    rows
  );
}

function exportConventionVesselsWord() {
  const rowsSrc = typeof getFilteredConventionVessels === "function"
    ? getFilteredConventionVessels()
    : (state.conventionVessels || []);

  const rows = rowsSrc.map((v, idx) => [
    idx + 1,
    v.name || "—",
    v.cert_expiry || "—",
    v.assessment_expiry || "—",
    v.plan_expiry || "—",
    v.shipowner_contacts || "—",
    v.company_cso || "—",
    v.ship_sso || "—",
    v.conclusion || "—"
  ]);

  downloadWordHtml(
    `convention_vessels_${todayLocal()}.doc`,
    "ПЕРЕЛІК КОНВЕНЦІЙНИХ СУДЕН (ГЛ. XI-2 SOLAS / КОДЕКС ОСПЗ)",
    `Сформовано: ${new Date().toLocaleString("uk-UA")} | Суден у переліку: ${rows.length}`,
    [
      "№",
      "Судно / назва",
      "Міжнародне / тимчасове свідоцтво до",
      "Оцінка охорони до",
      "План охорони до",
      "Судновласник / Контакти",
      "Офіцер охорони компанії",
      "Особа, відповідальна за охорону на судні",
      "Висновок"
    ],
    rows,
    {
      landscape: true,
      colWidths: ["4%", "13%", "10%", "9%", "9%", "19%", "12%", "12%", "12%"]
    }
  );
}
