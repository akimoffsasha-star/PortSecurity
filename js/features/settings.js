/* Налаштування підключення, оператор, автооновлення */

function openConfigModal() {
  document.getElementById("cfgUrl").value = localStorage.getItem("sb_url") || DEFAULT_URL;
  document.getElementById("cfgKey").value = sessionStorage.getItem("sb_key") || localStorage.getItem("sb_key") || "";
  document.getElementById("cfgKey").placeholder = DEFAULT_KEY ? "Використовується вбудований ключ (заповніть лише для заміни)" : "Вставте Anon / Publishable Key";
  document.getElementById("cfgSessionOnly").checked = !!sessionStorage.getItem("sb_key") && !localStorage.getItem("sb_key");
  document.getElementById("cfgOperator").value = localStorage.getItem("operator_name") || "";
  bootstrap.Modal.getOrCreateInstance(document.getElementById("configModal")).show();
}

/**
 * Зберігає URL, ключ і ПІБ оператора; перезапускає клієнт.
 */
async function saveConfig() {
  const u = document.getElementById("cfgUrl").value.trim();
  const k = document.getElementById("cfgKey").value.trim();
  const sessionOnly = document.getElementById("cfgSessionOnly").checked;
  const op = document.getElementById("cfgOperator").value.trim();
  const effectiveKey = k || DEFAULT_KEY;
  if (!u || !effectiveKey) return uiAlert("Вкажіть URL та ключ", "Помилка");
  localStorage.setItem("sb_url", u);
  if (k) {
    if (sessionOnly) { sessionStorage.setItem("sb_key", k); localStorage.removeItem("sb_key"); }
    else { localStorage.setItem("sb_key", k); sessionStorage.removeItem("sb_key"); }
  } else {
    localStorage.removeItem("sb_key");
    sessionStorage.removeItem("sb_key");
  }
  if (op) localStorage.setItem("operator_name", op); else localStorage.removeItem("operator_name");
  bootstrap.Modal.getInstance(document.getElementById("configModal")).hide();
  initClient();
}

/**
 * Вмикає/вимикає періодичне оновлення даних.
 */
function changeAutoRefresh(msStr) {
  const ms = parseInt(msStr, 10) || 0;
  autoRefreshIntervalMs = ms;
  localStorage.setItem("autoRefreshMs", String(ms));
  clearInterval(autoRefreshTimer); autoRefreshTimer = null;
  if (ms > 0) {
    autoRefreshTimer = setInterval(() => {
      if (!document.hidden && !document.querySelector(".modal.show") && sb) loadAll(true);
    }, ms);
  }
}
