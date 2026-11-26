/* Імпорт та звірка з ГІСІС */

function openGisisImportModal() {
  gisisParsed = null; gisisPreviewRows = [];
  document.getElementById("gisisFileInput").value = ""; document.getElementById("gisisMappingBox").classList.add("d-none");
  document.getElementById("gisisPreviewSection").classList.add("d-none"); document.getElementById("gisisPreviewBody").innerHTML = "";
  document.getElementById("gisisUnmatchedBox").classList.add("d-none"); document.getElementById("gisisSelectedCount").textContent = "Оберіть файл";
  document.getElementById("btnApplyGisis").disabled = true;
  renderGisisHistory();
  bootstrap.Modal.getOrCreateInstance(document.getElementById("gisisImportModal")).show();
}

/**
 * Застосовує підтверджені рядки ГІСІС до БД.
 */
async function applyGisisImport() {
  const toSave = gisisPreviewRows.filter(r => r.checked); if (!toSave.length) return;
  document.getElementById("btnApplyGisis").disabled = true; setLoading(true, "Оновлення ГІСІС…");
  const nowIso = new Date().toISOString(), op = getOperator();
  const { ok, fail } = await runBatched(toSave, r => sb.from("port_facilities").update({
    gisis_popz_expiry_date: nullIfEmpty(r.newDate),
    officers_gisis_status: nullIfEmpty(r.newOffStatus),
    head_gisis_status: nullIfEmpty(r.newHeadStatus),
    updated_at: nowIso,
    updated_by: op
  }).eq("code", r.code));
  try {
    const { error: logErr } = await sb.from("gisis_import_log").insert({
      imported_at: nowIso,
      file_name: gisisParsed?.fileName || "file",
      operator_name: op,
      updated_count: ok,
      error_count: fail
    });
    if (logErr && typeof console !== "undefined") console.warn("gisis_import_log:", logErr.message);
  } catch (_) { /* журнал не критичний для імпорту */ }
  setLoading(false);
  bootstrap.Modal.getInstance(document.getElementById("gisisImportModal")).hide();
  if (fail) notify(`Оновлено ${ok}, помилок: ${fail}`, true); else notify(`Оновлено ${ok} ПЗ`);
  loadAll(true);
}