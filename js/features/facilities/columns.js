/* Видимість колонок реєстру ПЗ */

function initColumnMenu() {
  let hidden = [];
  try { hidden = JSON.parse(localStorage.getItem("facHiddenCols") || "[]"); } catch (_) {}
  const hiddenSet = new Set(hidden);
  document.getElementById("facColsMenu").innerHTML = FAC_COLUMNS.map(([col, label]) => `
    <label class="dropdown-item d-flex align-items-center gap-2 py-1 small" style="cursor:pointer;">
      <input type="checkbox" class="form-check-input mt-0 fac-col-chk" value="${col}" ${!hiddenSet.has(col) ? "checked" : ""} onchange="applyColumnVisibility()" />
      <span>${esc(label)}</span>
    </label>`).join("") +
    '<div class="dropdown-divider my-1"></div><button type="button" class="btn btn-sm btn-link w-100 text-start py-0" onclick="resetColumnVisibility()">Показати всі</button>';
  applyColumnVisibility();
}
/**
 * Застосовує приховані колонки до таблиці.
 */
function applyColumnVisibility() {
  const hidden = [];
  document.querySelectorAll(".fac-col-chk").forEach(c => { if (!c.checked) hidden.push(parseInt(c.value, 10)); });
  localStorage.setItem("facHiddenCols", JSON.stringify(hidden));
  document.getElementById("facColsCss").textContent = hidden
    .map(col => `#facilitiesWrap table tr:not(.virt-pad) > th:nth-child(${col}), #facilitiesWrap table tr:not(.virt-pad) > td:nth-child(${col}) { display: none; }`)
    .join("\n");
}
/**
 * Функція «resetColumnVisibility» — частина логіки модуля.
 */
function resetColumnVisibility() {
  document.querySelectorAll(".fac-col-chk").forEach(c => { c.checked = true; });
  applyColumnVisibility();
}
