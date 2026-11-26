/* Довідник портів */

function openPortsModal() {
  document.getElementById("portsEditBody").innerHTML = state.ports.map(p => `<tr><td><b>${esc(p.section_roman)}</b></td><td><b>${esc(p.port_name)}</b></td><td><select id="ps_${p.id}" class="form-select form-select-sm">${["Працює", "Не працює", "Закрито", "ВВШ"].map(st => `<option ${p.operational_status === st ? "selected" : ""}>${st}</option>`).join("")}</select></td><td><input id="po_${p.id}" type="date" class="form-control form-control-sm" value="${esc(p.port_oopz_expiry || "")}" /></td><td><input id="py_${p.id}" type="number" class="form-control form-control-sm" style="width:64px" value="${esc(p.port_oopz_year_only || "")}" /></td><td><input id="pp_${p.id}" type="text" class="form-control form-control-sm" value="${esc(p.port_popz_status || "")}" /></td><td><input id="pn_${p.id}" type="text" class="form-control form-control-sm" value="${esc(p.notes || "")}" /></td><td><button class="btn btn-sm btn-primary" onclick="savePortRow(${p.id})"><i class="bi bi-save"></i></button></td></tr>`).join("");
  bootstrap.Modal.getOrCreateInstance(document.getElementById("portsModal")).show();
}

/**
 * Зберігає один рядок довідника портів.
 */
async function savePortRow(id) {
  const payload = { operational_status: document.getElementById(`ps_${id}`).value, port_oopz_expiry: nullIfEmpty(document.getElementById(`po_${id}`).value), port_oopz_year_only: parseInt(document.getElementById(`py_${id}`).value, 10) || null, port_popz_status: nullIfEmpty(document.getElementById(`pp_${id}`).value), notes: nullIfEmpty(document.getElementById(`pn_${id}`).value) };
  setLoading(true, "Збереження порту…"); const { error } = await sb.from("ports").update(payload).eq("id", id); setLoading(false);
  if (error) return notify("Помилка: " + error.message, true); notify("Порт оновлено"); loadAll(true);
}
