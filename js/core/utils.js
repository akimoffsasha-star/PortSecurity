/**
 * utils.js — загальні утиліти без прив’язки до предметної області.
 *
 * Екранування HTML, робота з датами, безпечне заповнення <select>,
 * debounce, пакетна обробка запитів, завантаження Blob як файлу.
 */

/**
 * Екранує спецсимволи для безпечної вставки в HTML (захист від XSS).
 * @param {*} s — будь-яке значення; null/undefined → порожній рядок
 * @returns {string}
 */
const esc = s => String(s ?? "").replace(/[&<>"']/g, m =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
);

/**
 * Повертає обрізаний рядок або null, якщо значення порожнє.
 * Зручно перед записом у БД: порожні поля → NULL.
 * @param {*} v
 * @returns {string|null}
 */
const nullIfEmpty = v =>
  (v !== null && v !== undefined && String(v).trim() !== "")
    ? String(v).trim()
    : null;

/**
 * ПІБ оператора з localStorage (для журналу змін і підписів у звітах).
 * @returns {string|null}
 */
const getOperator = () => nullIfEmpty(localStorage.getItem("operator_name"));

/**
 * Ключ Supabase: спочатку sessionStorage, потім localStorage, інакше DEFAULT_KEY.
 * @returns {string}
 */
const getStoredKey = () =>
  sessionStorage.getItem("sb_key") || localStorage.getItem("sb_key") || DEFAULT_KEY;

/**
 * Локальна дата у форматі YYYY-MM-DD (без зсуву UTC).
 * @returns {string}
 */
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Перетворює ISO-дату YYYY-MM-DD на Date для ExcelJS (UTC-північ).
 * Невалідний рядок повертається як є.
 * @param {string} iso
 * @returns {Date|string}
 */
const toExcelDate = iso => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

/**
 * Обгортка debounce: відкладає виклик fn на wait мс після останнього спрацювання.
 * @param {Function} fn
 * @param {number} [wait=250]
 * @returns {Function}
 */
function debounce(fn, wait = 250) {
  let timerId = null;
  return function (...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Запускає завантаження Blob як файлу з заданим іменем.
 * @param {Blob} blob
 * @param {string} filename
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Встановлює value у <select> за id лише якщо така опція існує;
 * інакше ставить fallback (щоб не залишати «порожній» select).
 * @param {string} id — id елемента select
 * @param {string} val — бажане значення
 * @param {string} fallback — запасне значення
 */
function setSelectSafe(id, val, fallback) {
  const el = document.getElementById(id);
  if (!el) return;
  const exists = Array.from(el.options).some(o => o.value === val);
  el.value = exists ? val : fallback;
}

/**
 * Заповнює <select> списком опцій (об’єкти {value,label} або примітиви).
 * Не плутати з setSelectSafe — тут передається сам DOM-елемент.
 * @param {HTMLSelectElement|null} selectEl
 * @param {Array<string|{value:*,label:*}>} options
 * @param {string} [selectedValue=""]
 */
function fillSelectOptions(selectEl, options, selectedValue = "") {
  if (!selectEl) return;
  const list = Array.isArray(options) ? options : [];
  selectEl.innerHTML = list
    .map(opt => {
      const val = typeof opt === "object" ? opt.value : opt;
      const lbl = typeof opt === "object" ? opt.label : opt;
      const isSel = String(val) === String(selectedValue) ? " selected" : "";
      return `<option value="${esc(String(val ?? ""))}"${isSel}>${esc(String(lbl ?? ""))}</option>`;
    })
    .join("");
}

/**
 * Виконує worker для кожного елемента пакетами по size (паралельно всередині пакета).
 * worker має повертати об’єкт відповіді Supabase ({ error }).
 * @param {Array} items
 * @param {Function} worker — async (item) => { error? }
 * @param {number} [size=10]
 * @returns {Promise<{ok:number, fail:number}>}
 */
async function runBatched(items, worker, size = 10) {
  let ok = 0, fail = 0;
  for (let i = 0; i < items.length; i += size) {
    const results = await Promise.all(items.slice(i, i + size).map(worker));
    results.forEach(r => (r.error ? fail++ : ok++));
  }
  return { ok, fail };
}
