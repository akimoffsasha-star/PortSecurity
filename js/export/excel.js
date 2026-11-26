/* Експорт Excel — формат як у зведеному файлі від 12.11.2025 */

/**
 * Оцінює висоту рядка Excel за довжиною тексту в комірках.
 * @param {Array<[string, number]>} pairs — [текст, ширина_колонки]
 * @param {number} [minH=18]
 * @param {number} [lineH=13.5]
 */
function calcRowHeight(pairs, minH = 18, lineH = 13.5) {
  let maxLines = 1;
  for (const [val, w] of pairs) {
    if (!val || typeof val !== "string") continue;
    const effW = Math.max(8, w - 2);
    let lines = 0;
    for (const part of val.split(/\r?\n/)) lines += Math.max(1, Math.ceil(part.length / effW));
    if (lines > maxLines) maxLines = lines;
  }
  return Math.max(minH, Math.round(maxLines * lineH + 4));
}

/**
 * Друк А4, альбомна орієнтація, по ширині 1 сторінка (як у зведеному звіті).
 * @param {object} ws — аркуш ExcelJS
 * @param {string} [titleRows] — рядки шапки для повтору на кожній сторінці, напр. "1:2"
 */
function applyA4Landscape(ws, titleRows) {
  ws.pageSetup = {
    paperSize: 9, // A4
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 },
    ...(titleRows ? { printTitlesRow: titleRows } : {})
  };
  ws.headerFooter = { oddFooter: "&CСторінка &P з &N" };
}

/**
 * Єдине оформлення таблиці: заголовок, шапка, комірки з границями, Times New Roman,
 * А4 альбомна. Стиль узято зі зведеного звіту (Наказ № 797).
 * @param {object} wb — книга ExcelJS
 * @param {object} o
 * @param {string} o.sheetName
 * @param {string} o.title — заголовок над таблицею
 * @param {string[]} o.headers
 * @param {number[]} o.widths
 * @param {Array<Array>} o.rows
 * @param {number[]} [o.dateCols] — 1-based колонки з датами
 * @param {number[]} [o.centerCols] — 1-based колонки з вирівнюванням по центру
 */
function addStyledTableSheet(wb, { sheetName, title, headers, widths, rows, dateCols = [], centerCols = [] }) {
  const black = "FF000000";
  const thin = { style: "thin", color: { argb: black } };
  const medium = { style: "medium", color: { argb: black } };
  const thinBorder = { top: thin, left: thin, bottom: thin, right: thin };
  const fBase = { name: "Times New Roman", size: 10, color: { argb: black } };
  const fBold = { ...fBase, bold: true };
  const n = headers.length;
  const ws = wb.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 2 }] });
  ws.columns = widths.map(w => ({ width: w }));

  // Рядок 1 — заголовок
  ws.mergeCells(1, 1, 1, n);
  const t = ws.getCell(1, 1);
  t.value = title;
  t.font = { name: "Times New Roman", size: 12, bold: true, color: { argb: black } };
  t.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  ws.getRow(1).height = 24;
  for (let c = 1; c <= n; c++) ws.getCell(1, c).border = thinBorder;

  // Рядок 2 — шапка
  const hr = ws.getRow(2);
  headers.forEach((h, i) => {
    const cell = hr.getCell(i + 1);
    cell.value = h;
    cell.font = fBold;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { top: medium, left: thin, bottom: medium, right: thin };
  });
  hr.height = calcRowHeight(headers.map((h, i) => [h, widths[i]]), 30);

  // Дані
  rows.forEach(vals => {
    const r = ws.addRow(vals);
    r.height = calcRowHeight(vals.map((v, i) => [typeof v === "string" ? v : "", widths[i]]), 18);
    for (let c = 1; c <= n; c++) {
      const cell = r.getCell(c);
      cell.font = fBase;
      cell.border = thinBorder;
      const isDate = dateCols.includes(c) && cell.value instanceof Date;
      if (isDate) cell.numFmt = "dd.mm.yyyy";
      cell.alignment = {
        vertical: "middle",
        wrapText: true,
        horizontal: isDate || centerCols.includes(c) ? "center" : "left"
      };
    }
  });

  applyA4Landscape(ws, "1:2");
  return ws;
}

/**
 * Повний звіт Excel у форматі Наказу № 797 (аркуші «Портові засоби» та «Судна»).
 * Оформлення вирівняне під еталонний файл від 12.11.2025.
 */
async function exportExcel797() {
  setLoading(true, "Формування Excel…");
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Портові засоби", { views: [{ state: "frozen", ySplit: 4 }] });

    const black = "FF000000";
    const thin = { style: "thin", color: { argb: black } };
    const medium = { style: "medium", color: { argb: black } };
    const thinBorder = { top: thin, left: thin, bottom: thin, right: thin };
    const medBottom = { top: thin, left: thin, bottom: medium, right: thin };
    const medTop = { top: medium, left: thin, bottom: thin, right: thin };

    const fBase = { name: "Times New Roman", size: 10, color: { argb: black } };
    const fBold = { ...fBase, bold: true };
    const fSec = { name: "Times New Roman", size: 12, bold: true, color: { argb: black } };
    const fComment = { name: "Times New Roman", size: 9, color: { argb: black } };

    // Ширини як у файлі від 12.11.2025
    const colWidths = [13.4, 34.1, 10.6, 9.7, 9.6, 10.0, 24.1, 22.9, 15.9, 25.9, 26.6, 27.6, 29.4];

    ws.getRow(1).height = 15;
    ws.getRow(2).height = 15;
    ws.mergeCells("A1:L2");
    const title = ws.getCell("A1");
    title.value = "ЗВЕДЕНА ІНФОРМАЦІЯ СТАНУ ОХОРОНИ ПОРТОВИХ ЗАСОБІВ";
    title.font = { name: "Times New Roman", size: 12, bold: true, color: { argb: black } };
    title.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    ws.getCell("M1").value = "Відповідно до наказу";
    ws.getCell("M1").font = fBase;
    ws.getCell("M1").alignment = { horizontal: "center", vertical: "bottom" };

    ws.getCell("M2").value = "Мінрозвитку № 797 від 01.05.2025";
    ws.getCell("M2").font = fBase;
    ws.getCell("M2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } };
    ws.getCell("M2").alignment = { horizontal: "center", vertical: "middle" };
    for (let r = 1; r <= 2; r++) {
      for (let c = 1; c <= 13; c++) {
        const cell = ws.getCell(r, c);
        cell.border = thinBorder;
      }
    }

    ws.getRow(3).values = [
      "Код ПЗ", "Назва ПЗ", "Строк дії Акту", "Строк дії ООПЗ", "Строк дії ПОПЗ", "",
      "Офіцер з охорони", "", "Керівник ПЗ", "Реквізити", "ВИСНОВОК",
      "Дати перевірки ПЗ Адміністрацією судноплавства", "Коментарі та примітки"
    ];
    ws.getRow(4).values = ["", "", "", "", "ПОПЗ", "ГІСІС", "ПОПЗ", "ГІСІС", "ПОПЗ", "(чи потребують коригувань)", "", "", ""];
    ["A3:A4", "B3:B4", "C3:C4", "D3:D4", "E3:F3", "G3:H3", "K3:K4", "L3:L4", "M3:M4"].forEach(rng => ws.mergeCells(rng));
    ws.getRow(3).height = 38.25;
    ws.getRow(4).height = 15;

    for (let c = 1; c <= 13; c++) {
      const c3 = ws.getRow(3).getCell(c);
      c3.font = fBold;
      c3.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      c3.border = medTop;
      const c4 = ws.getRow(4).getCell(c);
      c4.font = fBold;
      c4.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      c4.border = medBottom;
    }

    let rIdx = 5;
    for (const p of state.ports) {
      ws.getRow(rIdx).height = 9.75;
      rIdx++;

      const secRow = ws.getRow(rIdx);
      secRow.getCell(1).value = p.section_title;
      ws.mergeCells(rIdx, 1, rIdx, 13);
      secRow.height = 24.75;
      for (let c = 1; c <= 13; c++) {
        const cell = secRow.getCell(c);
        cell.font = fSec;
        cell.alignment = {
          horizontal: p.operational_status === "ВВШ" ? "left" : "center",
          vertical: "middle",
          wrapText: true
        };
        cell.border = medTop;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCCCCCC" } };
      }
      rIdx++;

      if (p.operational_status !== "ВВШ") {
        const pRow = ws.getRow(rIdx);
        const isClosed = p.operational_status === "Закрито";
        const isNotWorking = p.operational_status === "Не працює";
        const noteParts = (p.notes || "").split(" | ");
        const portConcl = noteParts[0] || "";
        const portComment = noteParts.slice(1).join(" | ");

        pRow.getCell(1).value = p.port_name;
        ws.mergeCells(rIdx, 1, rIdx, 2);

        if (isClosed) {
          pRow.getCell(3).value = "ПОРТ ЗАКРИТО";
          ws.mergeCells(rIdx, 3, rIdx, 10);
        } else {
          pRow.getCell(3).value = " ---";
          pRow.getCell(4).value = p.port_oopz_expiry
            ? toExcelDate(p.port_oopz_expiry)
            : (p.port_oopz_year_only || "");
          if (p.port_oopz_expiry) pRow.getCell(4).numFmt = "dd.mm.yyyy";
          pRow.getCell(5).value = p.port_popz_status || "";
          pRow.getCell(11).value = portConcl;
          pRow.getCell(13).value = portComment;
        }

        pRow.height = calcRowHeight([[p.port_name, 46], [portConcl, 28], [portComment, 40]], 20);
        const pFill = (isClosed || isNotWorking) ? "FFCCCCCC" : null;
        for (let c = 1; c <= 13; c++) {
          const cell = pRow.getCell(c);
          cell.font = c === 13 ? fComment : fBase;
          cell.alignment = {
            horizontal: (c <= 2 || c === 4 || c === 5 || (c === 3 && !isClosed)) ? "center" : (c === 13 ? "center" : "left"),
            vertical: "middle",
            wrapText: true
          };
          cell.border = thinBorder;
          if (pFill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: pFill } };
        }
        rIdx++;
      }

      const facRows = state.facilities.filter(x => x.port_id === p.id).sort((a, b) => {
        if (p.operational_status === "ВВШ") {
          const rank = cd => (cd.startsWith("UADNK") ? 1 : cd.startsWith("UAZPR") ? 2 : 3);
          return rank(a.code) - rank(b.code) || a.code.localeCompare(b.code);
        }
        return a.code.localeCompare(b.code);
      });

      for (let idx = 0; idx < facRows.length; idx++) {
        const x = facRows[idx];
        const isLastInPort = idx === facRows.length - 1;
        const row = ws.getRow(rIdx);
        const actVal = x.act_expiry_date
          ? toExcelDate(x.act_expiry_date)
          : (x.act_status === "Відсутній" ? "" : x.act_status);
        const gisisOff = (x.officers_gisis_status || "").replace(/^Лише в ГІСІС:\s*/i, "");
        const conclVal = x.auto_conclusion || "";
        const inspVal = x.last_inspection_text || "";
        const commVal = x.comments || "";

        row.getCell(1).value = x.code;
        row.getCell(2).value = x.name;
        row.getCell(3).value = actVal;
        row.getCell(4).value = toExcelDate(x.oopz_expiry_date);
        row.getCell(5).value = toExcelDate(x.popz_expiry_date);
        row.getCell(6).value = x.gisis_popz_expiry_date
          ? toExcelDate(x.gisis_popz_expiry_date)
          : (x.gisis_popz_status || "");
        row.getCell(7).value = x.officers_popz || "";
        row.getCell(8).value = gisisOff;
        row.getCell(9).value = x.head_popz || "";
        row.getCell(10).value = x.head_gisis_status || "";
        row.getCell(11).value = conclVal;
        row.getCell(12).value = inspVal;
        row.getCell(13).value = commVal;

        [3, 4, 5, 6].forEach(cIdx => {
          if (row.getCell(cIdx).value instanceof Date) row.getCell(cIdx).numFmt = "dd.mm.yyyy";
        });

        let fg = null;
        if (x.facility_status === "Виключено") fg = "FF999999";
        else if (p.operational_status === "Закрито" || p.operational_status === "Не працює") fg = "FFCCCCCC";
        else if (p.operational_status === "ВВШ" && commVal.includes("НЕ ПРАЦЮЄ")) fg = "FFB7B7B7";
        else if (x.act_status === "Чинний" && x.act_expiry_date) fg = "FFD9EAD3";

        row.height = calcRowHeight([
          [x.name, colWidths[1]],
          [x.officers_popz, colWidths[6]],
          [conclVal, colWidths[10]],
          [inspVal, colWidths[11]],
          [commVal, colWidths[12]]
        ], 18, 13.5);

        for (let c = 1; c <= 13; c++) {
          const cell = row.getCell(c);
          cell.font = (c === 3 && actVal === "Втратив чинність")
            ? { ...fBase, color: { argb: "FFFF0000" } }
            : fBase;
          cell.alignment = {
            horizontal: [1, 3, 4, 5, 6, 8, 10].includes(c) ? "center" : "left",
            vertical: "middle",
            wrapText: true
          };
          cell.border = isLastInPort ? medBottom : thinBorder;
          if (fg) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fg } };
        }
        rIdx++;
      }
    }

    ws.columns = colWidths.map(w => ({ width: w }));
    applyA4Landscape(ws, "3:4");

    // Аркуш «Судна» — як у файлі від 12.11.2025
    const wsV = wb.addWorksheet("Судна");
    const fVBase = { name: "Times New Roman", size: 10, color: { argb: black } };
    const fVBold = { ...fVBase, bold: true };
    const medBox = {
      top: medium,
      left: thin,
      bottom: medium,
      right: thin
    };

    const years = [...new Set([...state.vessels.map(v => v.year), 2025, 2026])].sort((a, b) => a - b);
    const reserveEmptyCol = years.length <= 2 ? 1 : 0;
    const lastColIdx = 2 + years.length + reserveEmptyCol + 1;

    wsV.getRow(1).height = 30;
    wsV.mergeCells(1, 2, 1, lastColIdx);
    const vTitle = wsV.getCell(1, 2);
    vTitle.value = "ЗВЕДЕНА ІНФОРМАЦІЯ СТАНУ ОХОРОНИ СУДЕН ПІД ПРАПОРОМ УКРАЇНИ ТА НАГЛЯДОМ РЕГІСТРА СУДНОПЛАВСТВА УКРАЇНИ";
    vTitle.font = { name: "Times New Roman", size: 10, bold: true };
    vTitle.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    wsV.getRow(2).height = 12;

    const hdrV = wsV.getRow(3);
    hdrV.height = 24;
    hdrV.getCell(2).value = "";
    years.forEach((yr, idx) => { hdrV.getCell(3 + idx).value = `${yr} рік`; });
    hdrV.getCell(lastColIdx).value = "Примітки";
    for (let c = 2; c <= lastColIdx; c++) {
      const cell = hdrV.getCell(c);
      cell.font = fVBold;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = medBox;
    }

    const metricsMap = new Map();
    for (const v of [...state.vessels].sort((a, b) => a.metric_order - b.metric_order)) {
      if (!metricsMap.has(v.metric_order)) {
        metricsMap.set(v.metric_order, { order: v.metric_order, name: v.metric_name, regime: v.regime });
      }
    }
    const metricsArr = [...metricsMap.values()];
    let vr = 4;
    metricsArr.forEach((m, idx) => {
      const row = wsV.getRow(vr);
      const isLast = idx === metricsArr.length - 1;
      const isBoldMetric = m.order === 1 || m.order === 2 || m.name.includes("Дунаї");
      const isSectionSplit = m.name.includes("Дунаї");
      row.getCell(2).value = m.name;
      const notesList = [];
      const hPairs = [[m.name, 56]];

      years.forEach((yr, yIdx) => {
        const rec = state.vessels.find(v => v.year === yr && v.metric_order === m.order);
        const cellVal = rec
          ? (rec.metric_value !== null && rec.metric_value !== undefined
            ? rec.metric_value
            : (rec.metric_text || (m.order === 1 ? rec.letter_ref : "") || ""))
          : "";
        row.getCell(3 + yIdx).value = cellVal;
        hPairs.push([String(cellVal), 22]);
        if (rec?.notes) notesList.push(`${yr}: ${rec.notes}`);
      });

      const noteStr = notesList.join("; ");
      row.getCell(lastColIdx).value = noteStr;
      hPairs.push([noteStr, 24]);
      row.height = calcRowHeight(hPairs, 26, 15.5);

      for (let c = 2; c <= lastColIdx; c++) {
        const cell = row.getCell(c);
        cell.font = (c === 2 && isBoldMetric) ? fVBold : fVBase;
        cell.alignment = { horizontal: c === 2 ? "left" : "center", vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: isSectionSplit ? "medium" : "thin", color: { argb: black } },
          bottom: { style: isLast ? "medium" : "thin", color: { argb: black } },
          left: { style: c === 2 ? "medium" : "thin", color: { argb: black } },
          right: { style: c === lastColIdx ? "medium" : "thin", color: { argb: black } }
        };
      }
      vr++;
    });

    const vCols = [{ width: 2.3 }, { width: 69 }, ...years.map(() => ({ width: 28.7 }))];
    if (reserveEmptyCol) vCols.push({ width: 29 });
    vCols.push({ width: 29.4 });
    wsV.columns = vCols;
    applyA4Landscape(wsV);

    const buf = await wb.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `Зведена_охорона_ПЗ_797_${todayLocal()}.xlsx`
    );
  } catch (err) {
    notify("Помилка Excel: " + err.message, true);
  } finally {
    setLoading(false);
  }
}

/**
 * Службовий експорт списку ПЗ у просту таблицю (вибірка / тривоги).
 * @param {object[]} rows
 * @param {string} sheetName
 * @param {string} filename
 */
async function exportFacilitiesListToExcel(rows, sheetName, filename) {
  setLoading(true, "Експорт…");
  try {
    const wb = new ExcelJS.Workbook();
    addStyledTableSheet(wb, {
      sheetName,
      title: `${sheetName} — станом на ${new Date().toLocaleDateString("uk-UA")}`,
      headers: [
        "Код ПЗ", "Порт", "Назва ПЗ", "Стан", "Акт до", "ООПЗ до", "ПОПЗ до",
        "Офіцери охорони", "Оператор ПЗ / контакти", "ВИСНОВОК", "Перевірка", "Коментарі"
      ],
      widths: [14, 20, 30, 16, 13, 13, 13, 22, 26, 30, 20, 30],
      dateCols: [5, 6, 7],
      centerCols: [1, 4],
      rows: rows.map(x => [
        x.code, x.port_name, x.name, x.auto_badge,
        x.act_expiry_date ? toExcelDate(x.act_expiry_date) : (x.act_status || ""),
        toExcelDate(x.oopz_expiry_date), toExcelDate(x.popz_expiry_date),
        x.officers_popz || "",
        `${x.head_popz || ""}${x.head_gisis_status ? " / " + x.head_gisis_status : ""}`,
        x.auto_conclusion || "", x.last_inspection_text || "", x.comments || ""
      ])
    });
    const buf = await wb.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      filename
    );
  } catch (err) {
    notify("Помилка: " + err.message, true);
  } finally {
    setLoading(false);
  }
}

/**
 * Експорт поточного відфільтрованого реєстру ПЗ.
 */
async function exportFilteredExcel() {
  await exportFacilitiesListToExcel(getFilteredFacilities(), "Вибірка ПЗ", `Вибірка_ПЗ_${todayLocal()}.xlsx`);
}

/**
 * Діючі ПЗ з простроченням ≤90 днів або розбіжністю ГІСІС (для тривог).
 * @returns {object[]}
 */
function getUrgentFacilities() {
  return state.facilities
    .filter(x => x.is_active_operational && ((minDays(x) !== null && minDays(x) <= 90) || x.has_gisis_date_mismatch))
    .sort((a, b) => (minDays(a) ?? 9999) - (minDays(b) ?? 9999));
}

/**
 * Експорт оперативних тривог у Excel.
 */
async function exportAlertsExcel() {
  const rows = getUrgentFacilities();
  if (!rows.length) return notify("Тривог не знайдено");
  await exportFacilitiesListToExcel(rows, "Оперативні тривоги", `Тривоги_ПЗ_${todayLocal()}.xlsx`);
}
