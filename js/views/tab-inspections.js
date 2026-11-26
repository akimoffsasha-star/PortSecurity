/* Вкладка «Перевірки» */
Views.addTab("tabInspections", `
<div class="card p-3 mb-3 no-print">
  <div class="row g-2 align-items-end">
    <div class="col-md-4"><label class="form-label small mb-1">Пошук</label><input id="inspSearch" type="text" class="form-control form-control-sm" placeholder="Код, порт, примітка…" oninput="saveInspFilters(); renderInspectionsDebounced()" /></div>
    <div class="col-md-3"><label class="form-label small mb-1">Рік</label><select id="inspYearFlt" class="form-select form-select-sm" onchange="saveInspFilters(); renderInspections()"><option value="ALL">Усі роки</option></select></div>
    <div class="col-md-3"><label class="form-label small mb-1">Статус</label><select id="inspStatFlt" class="form-select form-select-sm" onchange="saveInspFilters(); renderInspections()"><option value="ALL">Усі</option><option>Проведено</option><option>Заплановано</option><option>Не проводилась</option><option>Перенесено</option></select></div>
    <div class="col-md-2 text-end"><button class="btn btn-sm btn-primary w-100" onclick="openInspectionModal(null)"><i class="bi bi-plus-lg"></i> Додати</button></div>
  </div>
</div>
<div id="inspectionsWrap" class="table-wrap shadow-sm">
  <table class="table table-sm table-bordered table-hover align-middle mb-0">
    <thead><tr><th class="no-print">Дії</th><th>Код ПЗ</th><th>Порт</th><th>Назва ПЗ</th><th>Рік</th><th>Період</th><th>Початок</th><th>Кінець</th><th>Статус</th><th>Примітки</th></tr></thead>
    <tbody id="inspectionsBody"></tbody>
  </table>
</div>
`);
