/**
 * virtual-table.js — віртуалізація великих таблиць.
 *
 * У DOM лишаються лише рядки видимого вікна + overscan.
 * До 60 рядків малюється все одразу (простіше і без «стрибків»).
 * Для друку expandAllVirtualForPrint виводить повний список.
 */

/** Стан кожної віртуальної таблиці: body-id → { heights, prefix, rows, … }. */
const virtTables = new Map();

/**
 * Підключає / оновлює віртуальну таблицю.
 * @param {object} opts
 * @param {string} opts.wrap — id контейнера з overflow (scroll)
 * @param {string} opts.body — id <tbody>
 * @param {number} opts.colspan — для spacer-рядків
 * @param {string[]} opts.rowHtml — HTML кожного <tr>
 * @param {string} [opts.emptyHtml] — HTML, коли список порожній
 * @param {number} [opts.estimate=46] — оцінка висоти рядка до вимірювання
 */
function mountVirtual({ wrap, body, colspan, rowHtml, emptyHtml, estimate }) {
  let st = virtTables.get(body);
  if (!st) {
    st = { heights: [], remeasureCount: 0 };
    virtTables.set(body, st);
    document.getElementById(wrap).addEventListener("scroll", () => {
      const cur = virtTables.get(body);
      if (!cur || cur.raf) return;
      cur.remeasureCount = 0;
      cur.raf = requestAnimationFrame(() => {
        cur.raf = 0;
        paintVirtual(body);
      });
    }, { passive: true });
  }

  Object.assign(st, {
    wrap,
    body,
    colspan,
    rows: rowHtml,
    emptyHtml: emptyHtml || "",
    estimate: estimate || 46,
    overscan: 10,
    remeasureCount: 0
  });

  // Зберігаємо вже виміряні висоти, нові рядки — estimate
  if (st.heights.length !== rowHtml.length) {
    const next = new Array(rowHtml.length);
    for (let i = 0; i < rowHtml.length; i++) next[i] = st.heights[i] || st.estimate;
    st.heights = next;
  }

  st.prefix = null;
  st.force = true;
  paintVirtual(body);
}

/**
 * Малює видиме вікно рядків для таблиці bodyId.
 * Бінарний пошук стартового індексу за prefix-сумою висот.
 * @param {string} bodyId
 */
function paintVirtual(bodyId) {
  const st = virtTables.get(bodyId);
  if (!st) return;
  const wrap = document.getElementById(st.wrap);
  const body = document.getElementById(st.body);
  if (!wrap || !body) return;

  const n = st.rows.length;
  if (!n) {
    body.innerHTML = st.emptyHtml;
    return;
  }

  // Малі списки — без віртуалізації
  if (n <= 60) {
    if (st.mode !== "all" || st.force) {
      body.innerHTML = st.rows.join("");
      st.mode = "all";
      st.force = false;
    }
    return;
  }

  if (!st.prefix) {
    st.prefix = new Array(n + 1);
    st.prefix[0] = 0;
    for (let i = 0; i < n; i++) st.prefix[i + 1] = st.prefix[i] + (st.heights[i] || st.estimate);
  }

  const total = st.prefix[n];
  const viewTop = wrap.scrollTop;
  const viewH = wrap.clientHeight || 480;

  // Перший рядок, що перетинає верх видимої області
  let lo = 0, hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (st.prefix[mid + 1] <= viewTop) lo = mid + 1;
    else hi = mid;
  }

  const start = Math.max(0, lo - st.overscan);
  let end = lo;
  const limit = viewTop + viewH;
  while (end < n && st.prefix[end] < limit) end++;
  end = Math.min(n, end + st.overscan);

  if (!st.force && st.mode === "win" && st.start === start && st.end === end) return;

  st.mode = "win";
  st.start = start;
  st.end = end;
  st.force = false;

  const topH = st.prefix[start];
  const botH = Math.max(0, total - st.prefix[end]);
  const html = [`<tr class="virt-pad"><td colspan="${st.colspan}" style="height:${topH}px"></td></tr>`];
  for (let i = start; i < end; i++) html.push(st.rows[i]);
  html.push(`<tr class="virt-pad"><td colspan="${st.colspan}" style="height:${botH}px"></td></tr>`);
  body.innerHTML = html.join("");

  // Уточнення висот після фактичного рендеру (до 4 ітерацій)
  const trs = body.querySelectorAll("tr:not(.virt-pad)");
  let changed = false;
  for (let i = 0; i < trs.length; i++) {
    const h = Math.round(trs[i].getBoundingClientRect().height);
    const idx = start + i;
    if (h > 0 && Math.abs(h - st.heights[idx]) > 1) {
      st.heights[idx] = h;
      changed = true;
    }
  }
  if (changed && !st.remeasure && st.remeasureCount < 4) {
    st.prefix = null;
    st.force = true;
    st.remeasure = true;
    st.remeasureCount++;
    requestAnimationFrame(() => {
      st.remeasure = false;
      paintVirtual(bodyId);
    });
  }
}

/**
 * Скидає кеш висот і перемальовує всі віртуальні таблиці
 * (після зміни вкладки або виходу з режиму друку).
 */
function repaintAllVirtual() {
  virtTables.forEach(s => {
    s.force = true;
    s.prefix = null;
    s.remeasureCount = 0;
  });
  virtTables.forEach((_, id) => paintVirtual(id));
}

/**
 * Для друку: підставляє всі рядки замість віртуального вікна.
 */
function expandAllVirtualForPrint() {
  virtTables.forEach(s => {
    const el = document.getElementById(s.body);
    if (el) el.innerHTML = s.rows.join("") || s.emptyHtml;
  });
}
