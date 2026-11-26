/* Резервна копія бази (JSON): експорт і відновлення */

async function exportBackupJson() {
  if (!sb) return;
  setLoading(true, "Формування бекапу…");
  try {
    const [pRes, fRes, iRes, vRes] = await Promise.all([sb.from("ports").select("*").order("id"), sb.from("port_facilities").select("*").order("code"), sb.from("inspections").select("*").order("id"), sb.from("vessels_annual_stats").select("*").order("id")]);
    for (const r of [pRes, fRes, iRes, vRes]) if (r.error) throw r.error;
    downloadBlob(new Blob([JSON.stringify({ exported_at: new Date().toISOString(), version: 1, tables: { ports: pRes.data, port_facilities: fRes.data, inspections: iRes.data, vessels_annual_stats: vRes.data } }, null, 2)], { type: "application/json;charset=utf-8;" }), `Backup_PZ797_${todayLocal()}.json`);
    notify("Резервну копію збережено");
  } catch (err) { notify("Помилка бекапу: " + err.message, true); }
  finally { setLoading(false); }
}

/**
 * Відновлює дані з JSON-бекапу.
 */
async function importBackupJson(evt) {
  const file = evt.target.files[0]; evt.target.value = ""; if (!file || !sb) return;
  try {
    const parsed = JSON.parse(await file.text()), t = parsed?.tables;
    if (!t || !Array.isArray(t.ports) || !Array.isArray(t.port_facilities)) throw new Error("Некоректний формат файлу бекапу");
    const msg = `Відновити дані з бекапу (${parsed.exported_at ? new Date(parsed.exported_at).toLocaleString("uk-UA") : file.name})?\n\n• Порти: ${t.ports.length}\n• ПЗ: ${t.port_facilities.length}\n• Перевірки: ${(t.inspections || []).length}\n• Судна: ${(t.vessels_annual_stats || []).length}`;
    if (!(await uiConfirm(msg, "Відновлення з бекапу", "btn-danger", "Відновити"))) return;
    setLoading(true, "Відновлення з бекапу…");
    const upsertBatches = async (table, rows, onConflict) => { for (let i = 0; i < rows.length; i += 100) { const { error } = await sb.from(table).upsert(rows.slice(i, i + 100), { onConflict }); if (error) throw error; } };
    if (t.ports.length) await upsertBatches("ports", t.ports, "id");
    if (t.port_facilities.length) await upsertBatches("port_facilities", t.port_facilities, "code");
    if (Array.isArray(t.inspections) && t.inspections.length) await upsertBatches("inspections", t.inspections, "id");
    if (Array.isArray(t.vessels_annual_stats) && t.vessels_annual_stats.length) await upsertBatches("vessels_annual_stats", t.vessels_annual_stats, "id");
    bootstrap.Modal.getInstance(document.getElementById("configModal"))?.hide();
    notify("Базу даних відновлено з бекапу"); loadAll();
  } catch (err) { notify("Помилка відновлення: " + err.message, true); }
  finally { setLoading(false); }
}
