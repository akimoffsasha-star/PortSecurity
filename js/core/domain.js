/**
 * domain.js — предметна логіка охорони ПЗ (Наказ № 797).
 *
 * Розрахунок залишку днів, прострочок, Risk Score, HTML-бейджів стану.
 * Не залежить від DOM (крім formatDateCell / badgeHtml, які повертають HTML-рядки).
 */

/**
 * Мінімальний залишок днів серед Акта, ООПЗ і ПОПЗ.
 * null, якщо жодна дата не задана.
 * @param {object} x — запис ПЗ з analytics-view
 * @returns {number|null}
 */
function minDays(x) {
  const nums = [x.days_to_act_expiry, x.days_to_oopz_expiry, x.days_to_popz_expiry]
    .filter(v => v !== null && v !== undefined);
  return nums.length ? Math.min(...nums) : null;
}

/**
 * Чи є діючий ПЗ простроченим (бейдж або від’ємний залишок днів).
 * @param {object} x
 * @returns {boolean}
 */
function isOverdueActive(x) {
  if (!x.is_active_operational) return false;
  const m = minDays(x);
  return x.auto_badge === "Прострочено" || (m !== null && m < 0);
}

/**
 * Чи наближається строк документів у діючого ПЗ (0…lim днів включно).
 * @param {object} x
 * @param {number} lim — поріг у днях (30 / 60 / 90)
 * @returns {boolean}
 */
function isSoonActive(x, lim) {
  if (!x.is_active_operational) return false;
  const m = minDays(x);
  return m !== null && m >= 0 && m <= lim;
}

/**
 * Risk Score для пріоритизації уваги керівництва.
 * Бали: Акт −50, ООПЗ −25, ПОПЗ −25, розбіжність ГІСІС −20.
 * @param {object} x
 * @returns {{score:number, factors:string[]}}
 */
function calcRiskInfo(x) {
  let score = 0;
  const factors = [];
  const badge = x.auto_badge || "";
  const actD = x.days_to_act_expiry;
  const oopzD = x.days_to_oopz_expiry;
  const popzD = x.days_to_popz_expiry;

  // Прострочені документи
  if (actD !== null && actD < 0) {
    score += 50;
    factors.push("Акт прострочено (+50)");
  }
  if (oopzD !== null && oopzD < 0) {
    score += 25;
    factors.push("ООПЗ прострочено (+25)");
  }
  if (popzD !== null && popzD < 0) {
    score += 25;
    factors.push("ПОПЗ прострочено (+25)");
  }

  // Відсутність документів
  const noOopz = !x.oopz_expiry_date && (x.oopz_status === "Відсутній" || !x.oopz_status);
  const noPopz = !x.popz_expiry_date && (x.popz_status === "Відсутній" || !x.popz_status);
  if (badge === "Документи відсутні" || (noOopz && noPopz)) {
    score += 40;
    factors.push("ООПЗ/ПОПЗ відсутні (+40)");
  } else {
    if (noOopz) { score += 15; factors.push("ООПЗ відсутня (+15)"); }
    if (noPopz) { score += 15; factors.push("ПОПЗ відсутній (+15)"); }
  }

  // Наближення дедлайнів (діючі)
  if (actD !== null && actD >= 0 && actD <= 60) {
    score += 15;
    factors.push("Акт ≤60 дн. (+15)");
  }
  if (oopzD !== null && oopzD >= 0 && oopzD <= 60) {
    score += 10;
    factors.push("ООПЗ ≤60 дн. (+10)");
  }
  if (popzD !== null && popzD >= 0 && popzD <= 60) {
    score += 10;
    factors.push("ПОПЗ ≤60 дн. (+10)");
  }

  // Операційний стан терміналу
  if (badge === "Роботу зупинено" || (x.facility_status || "").includes("зупинен")) {
    score += 30;
    factors.push("Роботу зупинено (+30)");
  }
  if (x.facility_status === "Виключено") {
    score += 5;
    factors.push("Виключено з переліку (+5)");
  }

  // Розбіжність дат (якщо ще є в даних)
  if (x.has_gisis_date_mismatch) {
    score += 20;
    factors.push("Розбіжність дат (+20)");
  }

  // Давність перевірки Адміністрацією (якщо є last_inspection_text і рік < поточний-1)
  const insp = (x.last_inspection_text || "").trim();
  if (!insp || /не проводилась/i.test(insp)) {
    const yr = new Date().getFullYear();
    // лише для діючих портів з документами
    if (badge !== "Порт закрито" && badge !== "Виключено з переліку") {
      score += 12;
      factors.push("Перевірка не проводилась (+12)");
    }
  }

  return { score, factors };
}

/**
 * Рівень ризику терміналу за балами.
 * @param {number} score
 * @returns {"критичний"|"високий"|"середній"|"низький"}
 */
function riskLevel(score) {
  if (score >= 75) return "критичний";
  if (score >= 50) return "високий";
  if (score >= 25) return "середній";
  return "низький";
}

/**
 * HTML комірки дати з колірним класом залежно від залишку днів.
 * @param {string|null} dt — дата YYYY-MM-DD
 * @param {number|null|undefined} daysLeft
 * @returns {string}
 */
function formatDateCell(dt, daysLeft) {
  if (!dt) return "";
  if (daysLeft === null || daysLeft === undefined) return esc(dt);
  if (daysLeft < 0) {
    return `<span class="date-expired" title="Прострочено на ${Math.abs(daysLeft)} дн.">${esc(dt)}</span>`;
  }
  if (daysLeft <= 60) {
    return `<span class="date-soon" title="Залишилось ${daysLeft} дн.">${esc(dt)}</span>`;
  }
  return `<span class="date-ok">${esc(dt)}</span>`;
}

/**
 * HTML бейджа автоматичного стану ПЗ (auto_badge з analytics-view).
 * @param {string} b
 * @returns {string}
 */
function badgeHtml(b) {
  const map = {
    "Чинний": "bg-success-subtle text-success border border-success-subtle",
    "В процесі отримання Акта": "bg-primary-subtle text-primary border border-primary-subtle",
    "Критично (< 60 дн.)": "bg-warning-subtle text-warning-emphasis border border-warning-subtle",
    "Прострочено": "bg-danger-subtle text-danger border border-danger-subtle",
    "Потребує уваги": "bg-info-subtle text-info-emphasis border border-info-subtle",
    "Документи відсутні": "bg-secondary-subtle text-secondary-emphasis",
    "Роботу зупинено": "bg-secondary text-white",
    "Порт закрито": "bg-dark-subtle text-dark",
    "Виключено з переліку": "bg-dark text-white"
  };
  return `<span class="badge-soft ${map[b] || "bg-light text-dark"}">${esc(b)}</span>`;
}

/**
 * CSS-клас бейджа Risk Score (колір за рівнем ризику).
 * @param {number} score
 * @returns {string}
 */
function riskBadgeClass(score) {
  return score >= 75 ? "bg-danger" : score >= 50 ? "bg-warning text-dark" : "bg-info text-dark";
}
