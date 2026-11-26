/* Пошук дублікатів і збігів у реєстрі */

function openDuplicatesModal() {
  const f = state.facilities;
  const groupBy = (arr, keyFn) => {
    const m = new Map();
    for (const x of arr) { const k = keyFn(x); if (!k) continue; if (!m.has(k)) m.set(k, []); m.get(k).push(x); }
    return [...m.entries()].filter(([, list]) => list.length > 1);
  };
  const norm = s => String(s || "").trim().toLowerCase().replace(/["'«»„“\s]+/g, " ");
  const dupNames = groupBy(f, x => norm(x.name)), dupCodes = groupBy(f, x => x.code.replace(/[^A-Z0-9]/gi, "").toUpperCase());
  const dupOfficers = groupBy(f, x => { const o = norm(x.officers_popz); return o && o !== "—" && o.length >= 4 ? o : null; });
  const dupDates = groupBy(f, x => (x.act_expiry_date && x.oopz_expiry_date && x.popz_expiry_date) ? `${x.act_expiry_date}|${x.oopz_expiry_date}|${x.popz_expiry_date}` : null);
  const renderGroup = (title, groups, fmtKey) => `
    <h6 class="fw-bold mt-2">${title} <span class="badge bg-secondary">${groups.length}</span></h6>
    ${groups.length ? groups.map(([k, list]) => `<div class="border rounded p-2 mb-2 bg-light small"><div class="fw-semibold mb-1">${esc(fmtKey ? fmtKey(k) : k)}</div>${list.map(x => `<div class="d-flex justify-content-between align-items-center py-0"><span><b>${esc(x.code)}</b> (${esc(x.port_name)}) — ${esc(x.name)}</span><button class="btn btn-sm btn-link py-0" data-action="edit-facility" data-code="${esc(x.code)}" data-hide-modal="duplicatesModal">Відкрити</button></div>`).join("")}</div>`).join("") : '<div class="small text-muted mb-2">Збігів не знайдено</div>'}`;

  document.getElementById("duplicatesBody").innerHTML = renderGroup("1. Схожі / однакові назви ПЗ", dupNames) + renderGroup("2. Однакові коди (без урахування дефісів)", dupCodes) + renderGroup("3. Спільні офіцери ПОПЗ на кількох ПЗ", dupOfficers) + renderGroup("4. Однакові трійки дат (Акт | ООПЗ | ПОПЗ)", dupDates, k => k.replace(/\|/g, " · "));
  bootstrap.Modal.getOrCreateInstance(document.getElementById("duplicatesModal")).show();
}
