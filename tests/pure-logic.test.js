/**
 * Постійний набір автотестів чистої логіки (без DOM / Supabase).
 * Запуск у браузері: відкрити tests/run.html
 * Запуск у Node: node tests/pure-logic.test.js
 *
 * Пріоритет: тестує реальні модулі js/core/utils.js та js/core/domain.js;
 * локальні дзеркала використовуються лише як fallback (і для parseFlexibleDate / detectGisisColumns).
 */

(function (root) {
  "use strict";

  let loadedRealCore = false;

  // У Node автоматично завантажуємо бойові модулі js/core/utils.js та js/core/domain.js
  if (typeof require !== "undefined" && typeof module !== "undefined") {
    try {
      const fs = require("fs");
      const path = require("path");
      const vm = require("vm");
      const coreDir = path.resolve(__dirname, "..", "js", "core");
      const utilsPath = path.join(coreDir, "utils.js");
      const domainPath = path.join(coreDir, "domain.js");
      if (fs.existsSync(utilsPath) && fs.existsSync(domainPath)) {
        if (typeof root.esc !== "function") {
          vm.runInThisContext(fs.readFileSync(utilsPath, "utf8"), { filename: utilsPath });
        }
        if (typeof root.calcRiskInfo !== "function") {
          vm.runInThisContext(fs.readFileSync(domainPath, "utf8"), { filename: domainPath });
        }
        loadedRealCore = true;
      }
    } catch (_) {
      loadedRealCore = false;
    }
  } else {
    // У браузері (tests/run.html) модулі вже підключені через <script>
    loadedRealCore = typeof calcRiskInfo === "function" && typeof esc === "function";
  }

  // ─── Дзеркала (використовуються, якщо бойові модулі не завантажені) ──────

  function mirrorParseFlexibleDate(val) {
    if (val === null || val === undefined || val === "") return null;
    const pad = n => String(n).padStart(2, "0");
    if (val instanceof Date && !isNaN(val)) {
      return `${val.getUTCFullYear()}-${pad(val.getUTCMonth() + 1)}-${pad(val.getUTCDate())}`;
    }
    if (typeof val === "number" && val > 20000 && val < 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(val) * 86400000);
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    }
    const s = String(val).trim();
    if (!s) return null;
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
    m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
    m = s.match(/^(\d{1,2})[\s-]+([A-Za-z]{3,9})[\s-]+(\d{4})$/);
    if (m) {
      const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
      const mo = months[m[2].slice(0, 3).toLowerCase()];
      if (mo) return `${m[3]}-${pad(mo)}-${pad(m[1])}`;
    }
    return null;
  }

  function mirrorDetectGisisColumns(headers, dataRows) {
    const findCol = patterns => {
      for (const p of patterns) {
        const idx = headers.findIndex(h => p.test(String(h || "").toLowerCase()));
        if (idx !== -1) return idx;
      }
      return -1;
    };
    let codeIdx = findCol([
      /код\s*пз/, /^код$/, /pf\s*number/, /port\s*facility\s*(number|code|id)/, /imo.*number/, /un\/locode/, /locator/
    ]);
    if (codeIdx === -1 && dataRows.length) {
      for (let c = 0; c < headers.length; c++) {
        if (dataRows.slice(0, 20).filter(r => /\bUA[A-Z]{2,4}[-\s]?\d{3,5}\b/i.test(String(r[c] || ""))).length >= 2) {
          codeIdx = c;
          break;
        }
      }
    }
    return {
      codeIdx,
      dateIdx: findCol([/гісіс.*до/, /gisis/, /pfsp.*(expir|valid|approv|date)/, /(expir|valid\s*until)/, /строк.*попз/, /дата.*попз/, /попз/]),
      offIdx: findCol([/pfso/, /security\s*officer/, /офіцер/, /пфсо/]),
      headIdx: findCol([/керівник/, /реквізит/, /company|operator|owner|head/])
    };
  }

  function mirrorMinDays(x) {
    const nums = [x.days_to_act_expiry, x.days_to_oopz_expiry, x.days_to_popz_expiry].filter(v => v !== null && v !== undefined);
    return nums.length ? Math.min(...nums) : null;
  }
  function mirrorIsOverdueActive(x) {
    if (!x.is_active_operational) return false;
    const m = mirrorMinDays(x);
    return x.auto_badge === "Прострочено" || (m !== null && m < 0);
  }
  function mirrorIsSoonActive(x, lim) {
    if (!x.is_active_operational) return false;
    const m = mirrorMinDays(x);
    return m !== null && m >= 0 && m <= lim;
  }
  function mirrorCalcRiskInfo(x) {
    let score = 0;
    const factors = [];
    if (x.days_to_act_expiry !== null && x.days_to_act_expiry < 0) { score += 50; factors.push("Акт прострочено (+50)"); }
    if (x.days_to_oopz_expiry !== null && x.days_to_oopz_expiry < 0) { score += 25; factors.push("ООПЗ прострочено (+25)"); }
    if (x.days_to_popz_expiry !== null && x.days_to_popz_expiry < 0) { score += 25; factors.push("ПОПЗ прострочено (+25)"); }
    if (x.has_gisis_date_mismatch) { score += 20; factors.push("ГІСІС розбіжність (+20)"); }
    return { score, factors };
  }
  const mirrorEsc = s => String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const mirrorNullIfEmpty = v => (v !== null && v !== undefined && String(v).trim() !== "") ? String(v).trim() : null;
  const mirrorTodayLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const mirrorToExcelDate = iso => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "";
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  };

  // Вибір бойової функції, якщо вона доступна в області видимості
  const fnParseFlexibleDate = typeof parseFlexibleDate === "function" ? parseFlexibleDate : mirrorParseFlexibleDate;
  const fnDetectGisisColumns = typeof detectGisisColumns === "function" ? detectGisisColumns : mirrorDetectGisisColumns;
  const fnMinDays = typeof minDays === "function" ? minDays : mirrorMinDays;
  const fnIsOverdueActive = typeof isOverdueActive === "function" ? isOverdueActive : mirrorIsOverdueActive;
  const fnIsSoonActive = typeof isSoonActive === "function" ? isSoonActive : mirrorIsSoonActive;
  const fnCalcRiskInfo = typeof calcRiskInfo === "function" ? calcRiskInfo : mirrorCalcRiskInfo;
  const fnEsc = typeof esc === "function" ? esc : mirrorEsc;
  const fnNullIfEmpty = typeof nullIfEmpty === "function" ? nullIfEmpty : mirrorNullIfEmpty;
  const fnTodayLocal = typeof todayLocal === "function" ? todayLocal : mirrorTodayLocal;
  const fnToExcelDate = typeof toExcelDate === "function" ? toExcelDate : mirrorToExcelDate;

  // ─── Міні-фреймворк ───────────────────────────────────────────────────────

  const results = [];
  function assert(cond, msg) {
    results.push({ ok: !!cond, msg });
    if (!cond && typeof console !== "undefined") console.error("FAIL:", msg);
  }
  function assertEq(a, b, msg) {
    const ok = Object.is(a, b) || (a && b && typeof a === "object" && JSON.stringify(a) === JSON.stringify(b));
    assert(ok, msg + (ok ? "" : ` (очікувалось ${JSON.stringify(b)}, отримано ${JSON.stringify(a)})`));
  }

  // ─── Тести parseFlexibleDate ──────────────────────────────────────────────

  function testParseFlexibleDate() {
    assertEq(fnParseFlexibleDate(null), null, "null → null");
    assertEq(fnParseFlexibleDate(""), null, "порожній рядок → null");
    assertEq(fnParseFlexibleDate("2024-03-15"), "2024-03-15", "ISO yyyy-mm-dd");
    assertEq(fnParseFlexibleDate("15.03.2024"), "2024-03-15", "dd.mm.yyyy");
    assertEq(fnParseFlexibleDate("15/03/2024"), "2024-03-15", "dd/mm/yyyy");
    assertEq(fnParseFlexibleDate("15-03-2024"), "2024-03-15", "dd-mm-yyyy");
    assertEq(fnParseFlexibleDate("1.2.2024"), "2024-02-01", "d.m.yyyy");
    assertEq(fnParseFlexibleDate("15 Mar 2024"), "2024-03-15", "dd Mon yyyy");
    assertEq(fnParseFlexibleDate("15 March 2024"), "2024-03-15", "dd Month yyyy");
    assertEq(fnParseFlexibleDate(45366), "2024-03-15", "Excel serial number");
    assertEq(fnParseFlexibleDate("not-a-date"), null, "сміття → null");
  }

  // ─── Тести detectGisisColumns ─────────────────────────────────────────────

  function testDetectGisisColumns() {
    const headersUk = ["Код ПЗ", "Назва", "Строк ПОПЗ", "ПФСО", "Керівник"];
    const detUk = fnDetectGisisColumns(headersUk, []);
    assertEq(detUk.codeIdx, 0, "УК: код ПЗ");
    assertEq(detUk.dateIdx, 2, "УК: строк ПОПЗ");
    assertEq(detUk.offIdx, 3, "УК: офіцер");
    assertEq(detUk.headIdx, 4, "УК: керівник");

    const headersEn = ["PF Number", "Facility", "PFSP Expiry Date", "PFSO", "Company"];
    const detEn = fnDetectGisisColumns(headersEn, []);
    assertEq(detEn.codeIdx, 0, "EN: PF Number");
    assertEq(detEn.dateIdx, 2, "EN: PFSP Expiry");
    assertEq(detEn.offIdx, 3, "EN: PFSO");
    assertEq(detEn.headIdx, 4, "EN: Company");

    const headersWeird = ["A", "B", "C"];
    const rows = [
      ["UAODS-001", "x", "y"],
      ["UAODS-002", "x", "y"],
      ["UAODS-003", "x", "y"]
    ];
    const detData = fnDetectGisisColumns(headersWeird, rows);
    assertEq(detData.codeIdx, 0, "евристика: код у колонці A");
  }

  // ─── Тести domain ─────────────────────────────────────────────────────────

  function testDomain() {
    const tag = loadedRealCore ? "[реальні модулі core]" : "[дзеркало]";
    const overdue = {
      is_active_operational: true,
      auto_badge: "Прострочено",
      days_to_act_expiry: -10,
      days_to_oopz_expiry: 5,
      days_to_popz_expiry: 20
    };
    assert(fnIsOverdueActive(overdue) === true, `${tag} isOverdueActive: прострочено`);
    assert(fnIsSoonActive({ is_active_operational: true, days_to_act_expiry: 30, days_to_oopz_expiry: 40, days_to_popz_expiry: 50 }, 60) === true, `${tag} isSoonActive: в межах 60`);
    assert(fnIsSoonActive({ is_active_operational: true, days_to_act_expiry: 90, days_to_oopz_expiry: 100, days_to_popz_expiry: 110 }, 60) === false, `${tag} isSoonActive: поза межами`);

    const risk = fnCalcRiskInfo({
      days_to_act_expiry: -1,
      days_to_oopz_expiry: -1,
      days_to_popz_expiry: null,
      has_gisis_date_mismatch: true
    });
    assertEq(risk.score, 95, `${tag} calcRiskInfo: 50+25+20`);
    assert(risk.factors.length === 3, `${tag} calcRiskInfo: 3 фактори`);

    assertEq(fnMinDays({ days_to_act_expiry: 10, days_to_oopz_expiry: 3, days_to_popz_expiry: 7 }), 3, `${tag} minDays`);
    assertEq(fnMinDays({}), null, `${tag} minDays порожній`);
  }

  // ─── Тести utils ──────────────────────────────────────────────────────────

  function testUtils() {
    const tag = loadedRealCore ? "[реальні модулі core]" : "[дзеркало]";
    assertEq(fnEsc('<script>"&\'</script>'), "&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;", `${tag} esc`);
    assertEq(fnNullIfEmpty("  "), null, `${tag} nullIfEmpty пробіли`);
    assertEq(fnNullIfEmpty("ok"), "ok", `${tag} nullIfEmpty значення`);
    assertEq(fnNullIfEmpty(null), null, `${tag} nullIfEmpty null`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(fnTodayLocal()), `${tag} todayLocal YYYY-MM-DD`);
    const d = fnToExcelDate("2024-03-15");
    assert(d instanceof Date && d.getUTCFullYear() === 2024 && d.getUTCMonth() === 2 && d.getUTCDate() === 15, `${tag} toExcelDate`);
  }

  // ─── Запуск ───────────────────────────────────────────────────────────────

  function runAll() {
    results.length = 0;
    testParseFlexibleDate();
    testDetectGisisColumns();
    testDomain();
    testUtils();
    const passed = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok);
    return { passed, failed: failed.length, total: results.length, details: results, failedList: failed, loadedRealCore };
  }

  const api = {
    runAll,
    parseFlexibleDate: fnParseFlexibleDate,
    detectGisisColumns: fnDetectGisisColumns,
    calcRiskInfo: fnCalcRiskInfo,
    minDays: fnMinDays,
    isOverdueActive: fnIsOverdueActive,
    isSoonActive: fnIsSoonActive,
    esc: fnEsc,
    nullIfEmpty: fnNullIfEmpty,
    todayLocal: fnTodayLocal,
    toExcelDate: fnToExcelDate
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.PureLogicTests = api;
  }

  // Node CLI
  if (typeof require !== "undefined" && require.main === module) {
    const r = runAll();
    console.log(`\nДжерело core: ${r.loadedRealCore ? "реальні файли js/core/*" : "резервні дзеркала"}`);
    console.log(`Результат: ${r.passed}/${r.total} пройдено`);
    if (r.failed) {
      r.failedList.forEach(f => console.log("  ✗", f.msg));
      process.exit(1);
    }
    console.log("Усі тести пройдено.\n");
    process.exit(0);
  }
})(typeof globalThis !== "undefined" ? globalThis : this);