/* Журнал змін і експорт у CSV */

async function openAuditModal() {
  setLoading(true, "Журнал…");
  const { data, error } = await sb.from("audit_log").select("*").order("id", { ascending: false }).limit(50);
  setLoading(false);
  if (error) return notify("Помилка журналу: " + error.message, true);
  lastAuditRows = data || [];
  document.getElementById("auditBody").innerHTML = lastAuditRows.map(a => `<tr><td class="small text-nowrap">${new Date(a.changed_at).toLocaleString("uk-UA")}</td><td><code>${esc(a.table_name)}</code></td><td><b>${esc(a.record_id)}</b></td><td><span class="badge bg-${a.action === "INSERT" ? "success" : a.action === "DELETE" ? "danger" : "primary"}">${esc(a.action)}</span></td><td class="small">${esc(a.changed_by)}</td><td class="small text-muted" style="max-width:420px;word-break:break-word;">${esc(JSON.stringify(a.new_data || a.old_data).slice(0, 220))}…</td></tr>`).join("") || '<tr><td colspan="6" class="text-center text-muted">Порожньо</td></tr>';
  bootstrap.Modal.getOrCreateInstance(document.getElementById("auditModal")).show();
}

/**
 * Експортує журнал змін у CSV.
 */
function exportAuditCsv() {
  if (!lastAuditRows.length) return notify("Немає записів для експорту", true);
  const csvEsc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["Час", "Таблиця", "Код / ID", "Дія", "Користувач", "Деталі"].map(csvEsc).join(";")];
  for (const a of lastAuditRows) lines.push([new Date(a.changed_at).toLocaleString("uk-UA"), a.table_name, a.record_id, a.action, a.changed_by || "", JSON.stringify(a.new_data || a.old_data || {})].map(csvEsc).join(";"));
  downloadBlob(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" }), `Журнал_змін_${todayLocal()}.csv`);
}

/* Очищення журналу змін (audit_log) */
async function clearAuditLog() {
  const confirmed = window.confirm(
    "Ви дійсно хочете повністю очистити Журнал змін? Цю дію неможливо скасувати."
  );
  if (!confirmed) return;

  try {
    if (typeof setLoading === "function") setLoading(true, "Очищення журналу…");
    if (typeof sb !== "undefined" && sb) {
      const { error } = await sb.from("audit_log").delete().neq("id", 0);
      if (error) throw error;
    }

    lastAuditRows = [];
    if (typeof state !== "undefined") {
      state.audit = [];
    }

    const tbody = document.getElementById("auditBody") || document.querySelector("#auditModal tbody");
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Порожньо</td></tr>';
    }

    if (typeof notify === "function") {
      notify("Журнал змін успішно очищено");
    }
  } catch (err) {
    console.error("Помилка очищення журналу:", err);
    if (typeof notify === "function") {
      notify("Не вдалося очистити журнал: " + (err.message || err), true);
    } else {
      alert("Не вдалося очистити журнал: " + (err.message || err));
    }
  } finally {
    if (typeof setLoading === "function") setLoading(false);
  }
}