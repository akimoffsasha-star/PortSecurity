/**
 * animations.js — легкі анімації на Web Animations API.
 * Поважає prefers-reduced-motion: reduce (системне «зменшити рух»).
 */

/**
 * Чи увімкнено зменшення анімацій у системі користувача.
 * @returns {boolean}
 */
const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Коротка анімація елемента (opacity / transform тощо).
 * Після завершення стилі повертаються до CSS (fill: backwards).
 * @param {Element|null} el
 * @param {Object} keyframes — { prop: [from, to] } або { prop: value }
 * @param {{duration?:number, delay?:number}} [opts]
 */
function animateEl(el, keyframes, opts = {}) {
  if (!el || prefersReducedMotion() || !el.animate) return;
  const from = {}, to = {};
  for (const [prop, val] of Object.entries(keyframes)) {
    from[prop] = Array.isArray(val) ? val[0] : val;
    to[prop] = Array.isArray(val) ? val[val.length - 1] : val;
  }
  el.animate([from, to], {
    duration: opts.duration || 220,
    delay: opts.delay || 0,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    fill: "backwards"
  });
}

/**
 * Плавно змінює числове значення KPI-картки від попереднього до нового.
 * @param {HTMLElement|null} el
 * @param {number|string} targetVal
 * @param {string} [suffix=""] — додається після числа (наприклад «%»)
 */
function animateKpiValue(el, targetVal, suffix = "") {
  if (!el) return;
  const num = Number(targetVal);
  if (isNaN(num) || prefersReducedMotion()) {
    el.textContent = targetVal + suffix;
    return;
  }
  const prev = parseInt(String(el.dataset.lastVal ?? "0"), 10) || 0;
  el.dataset.lastVal = String(num);
  if (prev === num && el.textContent !== "—") {
    el.textContent = num + suffix;
    return;
  }
  cancelAnimationFrame(el._kpiFrame);
  const started = performance.now();
  const duration = 480;
  const tick = now => {
    const p = Math.min(1, (now - started) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(prev + (num - prev) * eased) + suffix;
    if (p < 1) el._kpiFrame = requestAnimationFrame(tick);
  };
  el._kpiFrame = requestAnimationFrame(tick);
}

/**
 * Одноразова поява карток аналітики при першому показі вкладки.
 */
function animateDashboardCards() {
  if (dashboardAnimatedOnce || prefersReducedMotion()) return;
  dashboardAnimatedOnce = true;
  document.querySelectorAll("#tabDashboard .kpi-card, #tabDashboard .horizon-tile").forEach((el, i) =>
    animateEl(el, { opacity: [0, 1], transform: ["translateY(10px)", "translateY(0)"] }, {
      duration: 360,
      delay: i * 35
    })
  );
}
