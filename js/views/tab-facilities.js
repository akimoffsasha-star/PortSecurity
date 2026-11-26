/* Вкладка «Реєстр ПЗ» */
Views.addTab("tabFacilities", `
<div class="card p-3 mb-3 no-print">
  <div class="row g-2 align-items-end">
    <div class="col-md-3">
      <label class="form-label small mb-1">Пошук <span class="text-muted">(клавіша /)</span></label>
      <input id="fltSearch" type="text" class="form-control form-control-sm" placeholder="Код, назва, офіцер…" oninput="renderFacilitiesDebounced()" />
    </div>
    <div class="col-md-2"><label class="form-label small mb-1">Порт / Зона</label><select id="fltPort" class="form-select form-select-sm" onchange="renderFacilities()"><option value="ALL">Усі зони</option></select></div>
    <div class="col-md-2"><label class="form-label small mb-1">Стан</label><select id="fltBadge" class="form-select form-select-sm" onchange="renderFacilities()"><option value="ALL">Усі стани</option></select></div>
    <div class="col-md-2">
      <label class="form-label small mb-1">Швидкий фільтр</label>
      <select id="fltQuick" class="form-select form-select-sm" onchange="renderFacilities()">
        <option value="NONE">Без обмежень</option>
        <option value="OVERDUE_ACTIVE">Прострочено (діючі)</option>
        <option value="SOON30">Дедлайн ≤ 30 дн. (діючі)</option>
        <option value="SOON60">Дедлайн ≤ 60 дн. (діючі)</option>
        <option value="SOON90">Дедлайн ≤ 90 дн. (діючі)</option>
        <option value="ACTIVE_ONLY">Лише діючі</option>
        <option value="VALID_OR_PROC">Чинний / В процесі</option>
        <option value="BAD_ACTIVE">Прострочено (діючі)</option>
      </select>
    </div>
    <div class="col-md-3">
      <label class="form-label small mb-1">Сортування</label>
      <select id="fltSort" class="form-select form-select-sm" onchange="renderFacilities()">
        <option value="DEFAULT">За портами та кодом</option>
        <option value="URGENCY">За строком (найближчі)</option>
        <option value="RISK">За Risk Score (спадання)</option>
        <option value="CODE">За кодом</option>
      </select>
    </div>
  </div>
  <div class="d-flex justify-content-between align-items-center mt-2 pt-2 border-top flex-wrap gap-2">
    <div class="small text-muted">Показано: <b id="facCountLabel">0</b></div>
    <div class="d-flex gap-2 flex-wrap">
      <button class="btn btn-sm btn-outline-secondary" onclick="resetFacilityFilters()"><i class="bi bi-x-circle"></i> Скинути</button>
      <div class="dropdown">
        <button class="btn btn-sm btn-outline-dark dropdown-toggle" type="button" data-bs-toggle="dropdown" data-bs-auto-close="outside"><i class="bi bi-layout-three-columns"></i> Колонки</button>
        <div id="facColsMenu" class="dropdown-menu p-2 shadow-sm" style="min-width: 220px;"></div>
      </div>
      <button class="btn btn-sm btn-outline-warning text-dark" onclick="openDuplicatesModal()"><i class="bi bi-intersect"></i> Дублікати</button>
      <button class="btn btn-sm btn-primary" onclick="openFacilityModal(null)"><i class="bi bi-plus-lg"></i> Додати ПЗ</button>
      <button class="btn btn-sm btn-outline-success" onclick="exportFilteredExcel()"><i class="bi bi-file-earmark-spreadsheet"></i> Вибірка</button>
      <button class="btn btn-sm btn-success" onclick="exportExcel797()"><i class="bi bi-download"></i> Повний звіт</button>
      <button class="btn btn-sm btn-outline-secondary" onclick="exportOperatorsContacts()"><i class="bi bi-person-lines-fill"></i> Оператори ПЗ</button>
    </div>
  </div>
</div>

<div id="customFilterBanner" class="alert alert-info py-2 px-3 mb-2 d-none no-print">
  <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 small">
    <span><i class="bi bi-funnel-fill me-1"></i><b id="customFilterLabel"></b></span>
    <div class="d-flex gap-2">
      <button id="btnFlipCustomFilter" class="btn btn-sm btn-outline-primary py-0 px-2 d-none" onclick="flipCustomFilter()"></button>
      <button class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="clearCustomFilter()">Скинути зріз ×</button>
    </div>
  </div>
</div>

<div id="bulkActionsBar" class="card p-2 mb-2 bg-primary-subtle border border-primary-subtle d-none no-print">
  <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
    <div class="small fw-semibold text-primary-emphasis"><i class="bi bi-check2-square me-1"></i>Обрано: <b id="bulkCountLabel">0</b></div>
    <div class="d-flex align-items-center flex-wrap gap-2">
      <div class="input-group input-group-sm" style="width: auto;">
        <select id="bulkFacStatus" class="form-select form-select-sm"><option value="">Стан ПЗ…</option><option>Діючий</option><option>Призупинено</option><option>Виключено</option><option>Порт закрито</option></select>
        <button class="btn btn-primary" type="button" onclick="applyBulkField('facility_status', 'bulkFacStatus')">OK</button>
      </div>
      <div class="input-group input-group-sm" style="width: auto;">
        <select id="bulkActStatus" class="form-select form-select-sm"><option value="">Стан Акту…</option><option>Чинний</option><option>В процесі отримання</option><option>Втратив чинність</option><option>Відсутній</option><option>Не застосовується</option></select>
        <button class="btn btn-primary" type="button" onclick="applyBulkField('act_status', 'bulkActStatus')">OK</button>
      </div>
      <div class="input-group input-group-sm" style="width: auto;">
        <select id="bulkDateField" class="form-select form-select-sm"><option value="act_expiry_date">Акт до</option><option value="oopz_expiry_date">ООПЗ до</option><option value="popz_expiry_date">ПОПЗ до</option></select>
        <input type="date" id="bulkDateValue" class="form-control form-control-sm" />
        <button class="btn btn-primary" type="button" onclick="applyBulkDate()">Дата</button>
      </div>
      <button class="btn btn-sm btn-outline-dark" onclick="copySelectedCodes()"><i class="bi bi-clipboard"></i> Коди</button>
      <button class="btn btn-sm btn-success" onclick="exportSelectedExcel()"><i class="bi bi-file-earmark-excel"></i> Excel</button>
      <button class="btn btn-sm btn-outline-danger" onclick="applyBulkDelete()"><i class="bi bi-trash"></i> Видалити</button>
      <button class="btn btn-sm btn-outline-secondary" onclick="clearFacilitySelection()"><i class="bi bi-x"></i></button>
    </div>
  </div>
</div>

<div id="facilitiesWrap" class="table-wrap shadow-sm">
  <table class="table table-sm table-bordered table-hover align-middle mb-0">
    <thead>
      <tr>
        <th class="no-print text-center" style="width:32px;"><input type="checkbox" id="facSelectAll" title="Обрати / зняти всю вибірку" onclick="toggleSelectAllFacilities(this.checked)" /></th>
        <th class="no-print">Дії</th><th>Код</th><th>Порт / Зона</th><th>Назва ПЗ</th><th>Стан</th>
        <th>Акт до</th><th>ООПЗ до</th><th>ПОПЗ до</th>
        <th>Офіцери охорони</th><th>Оператор ПЗ / контакти</th><th>ВИСНОВОК</th><th>Остання перевірка</th><th>Коментарі</th>
      </tr>
    </thead>
    <tbody id="facilitiesBody"></tbody>
  </table>
</div>
`);
