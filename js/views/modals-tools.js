/* Модальні вікна: імпорт ГІСІС, дублікати, довідник портів, журнал змін */
Views.addModals(`
<div class="modal fade" id="gisisImportModal" tabindex="-1"><div class="modal-dialog modal-xl"><div class="modal-content">
  <div class="modal-header"><h5 class="modal-title"><i class="bi bi-cloud-upload me-2"></i>Звірка з ГІСІС та історія імпортів</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
  <div class="modal-body">
    <ul class="nav nav-pills nav-fill mb-3 small" id="gisisPills">
      <li class="nav-item"><button class="nav-link active py-1" data-bs-toggle="pill" data-bs-target="#gisisPaneImport">Імпорт / Звірка файлу</button></li>
      <li class="nav-item"><button class="nav-link py-1" data-bs-toggle="pill" data-bs-target="#gisisPaneHistory" onclick="renderGisisHistory()">Історія імпортів ГІСІС</button></li>
    </ul>
    <div class="tab-content">
      <div class="tab-pane fade show active" id="gisisPaneImport">
        <div class="row g-2 align-items-end mb-3">
          <div class="col-md-5"><label class="form-label small fw-semibold">Файл вигрузки (.xlsx / .csv)</label><input id="gisisFileInput" type="file" accept=".xlsx,.csv,.tsv,.txt" class="form-control form-control-sm" onchange="handleGisisFileSelect(event)" /></div>
          <div class="col-md-7 small text-muted">Система спробує визначити колонки автоматично. Перевірте відповідність перед застосуванням.</div>
        </div>
        <div id="gisisMappingBox" class="card bg-light p-2 mb-3 d-none">
          <div class="small fw-semibold mb-2">Відповідність колонок</div>
          <div class="row g-2">
            <div class="col-md-3"><label class="form-label small mb-1">Код ПЗ *</label><select id="gMapCode" class="form-select form-select-sm" onchange="rebuildGisisPreview()"></select></div>
            <div class="col-md-3"><label class="form-label small mb-1">ПОПЗ в ГІСІС до</label><select id="gMapDate" class="form-select form-select-sm" onchange="rebuildGisisPreview()"></select></div>
            <div class="col-md-3"><label class="form-label small mb-1">Офіцери охорони</label><select id="gMapOfficer" class="form-select form-select-sm" onchange="rebuildGisisPreview()"></select></div>
            <div class="col-md-3"><label class="form-label small mb-1">Оператор ПЗ / контакти</label><select id="gMapHead" class="form-select form-select-sm" onchange="rebuildGisisPreview()"></select></div>
          </div>
        </div>
        <div id="gisisPreviewSection" class="d-none">
          <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
            <div id="gisisStatsSummary" class="small"></div>
            <div class="d-flex gap-2"><button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="toggleAllGisisRows(true)">Усі</button><button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="toggleAllGisisRows(false)">Жодного</button></div>
          </div>
          <div class="table-responsive border rounded" style="max-height: 44vh;">
            <table class="table table-sm table-bordered table-hover align-middle mb-0">
              <thead><tr><th style="width:34px;"><input type="checkbox" id="gChkAll" onclick="toggleAllGisisRows(this.checked)" /></th><th>Код</th><th>Назва</th><th>ПОПЗ до</th><th>ГІСІС (було → стане)</th><th>Офіцер</th><th>Керівник</th><th>Статус</th></tr></thead>
              <tbody id="gisisPreviewBody"></tbody>
            </table>
          </div>
          <div id="gisisUnmatchedBox" class="small text-muted mt-2 d-none"></div>
        </div>
      </div>
      <div class="tab-pane fade" id="gisisPaneHistory">
        <div class="table-responsive border rounded" style="max-height: 50vh;">
          <table class="table table-sm table-bordered mb-0"><thead><tr><th>Дата</th><th>Файл</th><th>Оператор</th><th>Оновлено ПЗ</th><th>Помилок</th></tr></thead><tbody id="gisisHistoryBody"></tbody></table>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-footer justify-content-between">
    <div class="small text-muted" id="gisisSelectedCount">Оберіть файл</div>
    <div class="d-flex gap-2"><button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Закрити</button><button id="btnApplyGisis" class="btn btn-primary btn-sm" disabled onclick="applyGisisImport()"><i class="bi bi-check2-all"></i> Застосувати</button></div>
  </div>
</div></div></div>

<div class="modal fade" id="duplicatesModal" tabindex="-1"><div class="modal-dialog modal-lg"><div class="modal-content">
  <div class="modal-header"><h5 class="modal-title"><i class="bi bi-intersect me-2"></i>Пошук дублікатів та збігів</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
  <div class="modal-body" id="duplicatesBody" style="max-height: 65vh; overflow:auto;"></div>
  <div class="modal-footer"><button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Закрити</button></div>
</div></div></div>

<div class="modal fade" id="portsModal" tabindex="-1">
  <div class="modal-dialog modal-xl" style="max-width: min(1480px, 96vw);">
    <div class="modal-content">
      <div class="modal-header py-2">
        <h5 class="modal-title fw-bold">Довідник портів</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body p-2">
        <div class="table-responsive">
          <table class="table table-sm table-bordered align-middle mb-0 ports-table-compact">
            <thead>
              <tr>
                <th style="width:46px;">Розд.</th>
                <th style="width:215px;">Порт / Зона</th>
                <th style="width:128px;">Статус</th>
                <th style="width:132px;">ООПЗ до</th>
                <th style="width:76px;">ООПЗ (рік)</th>
                <th style="width:145px;">ПОПЗ порту</th>
                <th>Примітки</th>
                <th style="width:44px;"></th>
              </tr>
            </thead>
            <tbody id="portsEditBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="modal fade" id="auditModal" tabindex="-1"><div class="modal-dialog modal-xl"><div class="modal-content">
  <div class="modal-header">
    <h5 class="modal-title"><i class="bi bi-clock-history me-2"></i>Журнал змін</h5>
    <div class="d-flex align-items-center gap-2 ms-auto me-2">
      <button type="button" class="btn btn-sm btn-outline-success" onclick="exportAuditCsv()"><i class="bi bi-filetype-csv"></i> Експорт CSV</button>
      <button type="button" class="btn btn-sm btn-outline-danger" onclick="clearAuditLog()"><i class="bi bi-trash3 me-1"></i>Очистити журнал</button>
    </div>
    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
  </div>
  <div class="modal-body"><div class="table-responsive" style="max-height: 60vh;"><table class="table table-sm table-bordered mb-0"><thead><tr><th>Час</th><th>Таблиця</th><th>Код / ID</th><th>Дія</th><th>Користувач</th><th>Деталі</th></tr></thead><tbody id="auditBody"></tbody></table></div></div>
</div></div></div>
`);