/* Вкладки конвенційних суден та перевірок ОСПЗ */
Views.addTab("tabVessels", `
<div class="no-print mb-2">
  <ul class="nav nav-pills gap-1" id="vesselsSubTabs">
    <li class="nav-item"><button class="nav-link active py-1 px-3" data-bs-toggle="pill" data-bs-target="#paneConvVessels" type="button"><i class="bi bi-ship me-1"></i>Перелік конвенційних суден</button></li>
    <li class="nav-item"><button class="nav-link py-1 px-3" data-bs-toggle="pill" data-bs-target="#paneVesselInsp" type="button"><i class="bi bi-clipboard2-check me-1"></i>Перевірки суден</button></li>
    <li class="nav-item"><button class="nav-link py-1 px-3" data-bs-toggle="pill" data-bs-target="#paneVesselStats" type="button"><i class="bi bi-graph-up me-1"></i>Річна статистика</button></li>
  </ul>
</div>
<div class="tab-content">
  <div class="tab-pane fade show active" id="paneConvVessels">
    <div class="card p-3 mb-3 no-print">
      <div class="row g-2 align-items-end">
        <div class="col-md-4"><label class="form-label small mb-1">Пошук</label>
          <input id="cvSearch" type="text" class="form-control form-control-sm" placeholder="Назва, судновласник, офіцер…" oninput="renderConventionVessels()" /></div>
        <div class="col-md-3"><label class="form-label small mb-1">Швидкий фільтр</label>
          <select id="cvQuick" class="form-select form-select-sm" onchange="renderConventionVessels()">
            <option value="NONE">Усі</option><option value="OVERDUE">Прострочені документи</option>
            <option value="SOON60">Дедлайн ≤ 60 дн.</option><option value="ACTIVE">Лише активні</option>
          </select></div>
        <div class="col-md-5 text-end">
          <button class="btn btn-sm btn-outline-secondary" onclick="exportConventionVesselsList()" title="Зберегти список суден з урахуванням фільтрів"><i class="bi bi-file-earmark-excel"></i> Список суден</button>
          <button class="btn btn-sm btn-outline-secondary" onclick="exportShipownersContacts()"><i class="bi bi-person-lines-fill"></i> Судновласники</button>
          <button class="btn btn-sm btn-outline-secondary" onclick="exportConventionVesselsList()" title="Зберегти список суден з урахуванням фільтрів"><i class="bi bi-file-earmark-excel"></i> Список суден</button>
          <button class="btn btn-sm btn-outline-primary" onclick="exportConventionVesselsWord()" title="Зберегти список суден у Word з урахуванням фільтрів"><i class="bi bi-file-earmark-word"></i> Судна (Word)</button>
          <button class="btn btn-sm btn-outline-secondary" onclick="exportShipownersContacts()"><i class="bi bi-file-earmark-excel"></i> Судновласники</button>
          <button class="btn btn-sm btn-outline-primary" onclick="exportShipownersWord()"><i class="bi bi-file-earmark-word"></i> Судновласники (Word)</button>
          <button class="btn btn-sm btn-primary" onclick="openConventionVesselModal(null)"><i class="bi bi-plus-lg"></i> Додати судно</button>
        </div>
      </div>
      <div class="small text-muted mt-2">Судна під прапором України (гл. XI-2 SOLAS / ОСПЗ). Показано: <b id="cvCountLabel">0</b></div>
    </div>
    <div id="convVesselsWrap" class="table-wrap shadow-sm">
      <table class="table table-sm table-bordered table-hover align-middle mb-0">
        <thead><tr>
          <th class="no-print">Дії</th><th>Судно / назва</th>
          <th>Міжнародне / тимчасове свідоцтво до</th><th>Оцінка охорони до</th><th>План охорони до</th>
          <th>Судновласник / контакти</th><th>Офіцер охорони компанії</th>
          <th>Особа, відповідальна за охорону на судні</th><th>Висновок</th>
        </tr></thead>
        <tbody id="convVesselsBody"></tbody>
      </table>
    </div>
  </div>
  <div class="tab-pane fade" id="paneVesselInsp">
    <div class="card p-3 mb-3 no-print">
      <div class="row g-2 align-items-end">
        <div class="col-md-4"><label class="form-label small mb-1">Пошук</label>
          <input id="viSearch" type="text" class="form-control form-control-sm" placeholder="Судно, вид перевірки…" oninput="renderVesselInspections()" /></div>
        <div class="col-md-2"><label class="form-label small mb-1">Рік</label>
          <select id="viYearFlt" class="form-select form-select-sm" onchange="renderVesselInspections()"><option value="ALL">Усі роки</option></select></div>
        <div class="col-md-2"><label class="form-label small mb-1">Статус</label>
          <select id="viStatFlt" class="form-select form-select-sm" onchange="renderVesselInspections()">
            <option value="ALL">Усі</option>
            <option value="Проведено">Проведено</option>
            <option value="Заплановано">Заплановано</option>
            <option value="Скасовано">Скасовано</option>
          </select></div>
        <div class="col-md-4 text-end">
          <button class="btn btn-sm btn-primary" onclick="openVesselInspectionModal(null)"><i class="bi bi-plus-lg"></i> Додати перевірку</button>
        </div>
      </div>
      <div class="small text-muted mt-2">Процедури контролю виконання вимог ОСПЗ на суднах. Показано: <b id="viCountLabel">0</b></div>
    </div>
    <div id="vesselInspWrap" class="table-wrap shadow-sm">
      <table class="table table-sm table-bordered table-hover align-middle mb-0">
        <thead><tr>
          <th class="no-print">Дії</th>
          <th>Судно / назва</th>
          <th>Міжнародне / тимчасове свідоцтво видане</th>
          <th>Прапор</th>
          <th>Дата перевірки</th>
          <th>Вид перевірки</th>
          <th>Статус</th>
          <th>Результат</th>
          <th>Зауваження / заходи</th>
          <th>Коментарі</th>
        </tr></thead>
        <tbody id="vesselInspBody"></tbody>
      </table>
    </div>
  </div>
  <div class="tab-pane fade" id="paneVesselStats">
    <div class="card p-3 mb-3 no-print">
      <div class="row g-2 align-items-end">
        <div class="col-md-3"><label class="form-label small mb-1">Рік</label>
          <select id="vesYearFlt" class="form-select form-select-sm" onchange="renderVessels()"><option value="ALL">Усі роки</option></select></div>
        <div class="col-md-9 text-end">
          <button class="btn btn-sm btn-outline-primary" onclick="openNewYearVesselsModal()"><i class="bi bi-calendar-plus"></i> Новий рік</button>
        </div>
      </div>
    </div>
    <div id="vesselsWrap" class="table-wrap shadow-sm">
      <table class="table table-sm table-bordered table-hover align-middle mb-0">
        <thead><tr>
          <th class="no-print">Дії</th><th>Рік</th><th>Режим</th><th>Показник</th><th>Значення</th><th>Текст</th><th>Примітки</th>
        </tr></thead>
        <tbody id="vesselsBody"></tbody>
      </table>
    </div>
  </div>
</div>
`);
