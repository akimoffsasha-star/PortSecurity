/* Модальні вікна: налаштування, картка ПЗ, перевірка, показник суден, діалог */
Views.addModals(`
<div class="modal fade" id="configModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
  <div class="modal-header"><h5 class="modal-title">Підключення до Supabase та резервне копіювання</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
  <div class="modal-body">
    <div class="mb-2"><label class="form-label small">Project URL</label><input id="cfgUrl" type="text" class="form-control" /></div>
    <div class="mb-2"><label class="form-label small">Anon / Publishable Key</label><input id="cfgKey" type="password" class="form-control" /></div>
    <div class="form-check mb-2"><input class="form-check-input" type="checkbox" id="cfgSessionOnly" /><label class="form-check-label small" for="cfgSessionOnly">Зберігати ключ лише до закриття вкладки (<code>sessionStorage</code>)</label></div>
    <div class="mb-2"><label class="form-label small">Ваше ПІБ (для журналу змін)</label><input id="cfgOperator" type="text" class="form-control" placeholder="Іваненко О.В." /></div>
    <div class="border-top pt-3 mt-3">
      <div class="small fw-semibold mb-2"><i class="bi bi-hdd me-1"></i>Резервна копія бази даних (JSON)</div>
      <div class="d-flex gap-2 flex-wrap mb-2">
        <button type="button" class="btn btn-sm btn-outline-success" onclick="exportBackupJson()"><i class="bi bi-download"></i> Завантажити бекап (JSON)</button>
        <label class="btn btn-sm btn-outline-danger mb-0"><i class="bi bi-upload"></i> Відновити з JSON<input id="backupFileInput" type="file" accept=".json" class="d-none" onchange="importBackupJson(event)" /></label>
      </div>
      <div class="form-text">Експортує та відновлює всі 4 таблиці (ports, port_facilities, inspections, vessels_annual_stats) через upsert.</div>
    </div>
  </div>
  <div class="modal-footer"><button class="btn btn-primary" onclick="saveConfig()">Зберегти</button></div>
</div></div></div>

<div class="modal fade" id="facilityModal" tabindex="-1"><div class="modal-dialog modal-lg"><div class="modal-content">
  <div class="modal-header"><h5 class="modal-title" id="facModalTitle">ПЗ</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
  <div class="modal-body">
    <div id="fValidationHints" class="alert alert-warning py-2 px-3 small d-none mb-2"></div>
    <div class="row g-2">
      <div class="col-md-4"><label class="form-label small">Код ПЗ *</label><input id="fCode" class="form-control form-control-sm" /></div>
      <div class="col-md-8"><label class="form-label small">Назва ПЗ *</label><input id="fName" class="form-control form-control-sm" /></div>
      <div class="col-md-4"><label class="form-label small">Порт / Зона</label><select id="fPort" class="form-select form-select-sm"></select></div>
      <div class="col-md-4"><label class="form-label small">Статус ПЗ</label><select id="fStatus" class="form-select form-select-sm" onchange="updateFacilityHints()"><option>Діючий</option><option>Призупинено</option><option>Виключено</option><option>Порт закрито</option></select></div>
      <div class="col-md-4"><label class="form-label small">Статус Акту</label><select id="fActStatus" class="form-select form-select-sm" onchange="updateFacilityHints()"><option>Чинний</option><option>В процесі отримання</option><option>Втратив чинність</option><option>Відсутній</option><option>Не застосовується</option></select></div>
      <div class="col-md-3"><label class="form-label small">Акт до</label><input id="fActDt" type="date" class="form-control form-control-sm" oninput="updateFacilityHints()" /></div>
      <div class="col-md-3"><label class="form-label small">ООПЗ до</label><input id="fOopzDt" type="date" class="form-control form-control-sm" oninput="updateFacilityHints()" /></div>
      <div class="col-md-3"><label class="form-label small">ПОПЗ до</label><input id="fPopzDt" type="date" class="form-control form-control-sm" oninput="updateFacilityHints()" /></div>
      <div class="col-md-3 d-none"><label class="form-label small">ПОПЗ в ГІСІС до</label><input id="fGisisDt" type="date" class="form-control form-control-sm" /></div>
      <div class="col-md-6"><label class="form-label small">Офіцери охорони</label><input id="fOfficers" class="form-control form-control-sm" /></div>
      <div class="col-md-6 d-none"><label class="form-label small">Статус офіцерів у ГІСІС</label><input id="fOfficersGisis" class="form-control form-control-sm" /></div>
      <div class="col-md-6"><label class="form-label small">Оператор ПЗ</label><input id="fHead" class="form-control form-control-sm" /></div>
      <div class="col-md-6"><label class="form-label small">Контакти оператора</label><input id="fHeadGisis" class="form-control form-control-sm" placeholder="Відповідає" /></div>
      <div class="col-12"><label class="form-label small">Ручний висновок</label><input id="fManualConc" class="form-control form-control-sm" /></div>
      <div class="col-12"><label class="form-label small">Коментарі</label><textarea id="fComments" rows="2" class="form-control form-control-sm"></textarea></div>
      <div id="fInspectionsBox" class="col-12 mt-2 pt-2 border-top d-none">
        <div class="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-1">
          <span class="small fw-semibold"><i class="bi bi-clipboard2-check me-1"></i>Перевірки цього ПЗ</span>
          <div class="d-flex gap-1"><button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="jumpToCurrentFacilityInspections()">Усі</button><button type="button" class="btn btn-sm btn-outline-primary py-0 px-2" onclick="addInspectionForCurrentFacility()"><i class="bi bi-plus-lg"></i></button></div>
        </div>
        <div id="fInspectionsList" class="small text-muted"></div>
      </div>
      <div id="fTimelineBox" class="col-12 mt-2 pt-2 border-top d-none">
        <div class="small fw-semibold mb-1"><i class="bi bi-clock-history me-1"></i>Timeline змін (аудит)</div>
        <div id="fTimelineList" class="small text-muted" style="max-height:130px; overflow:auto;"></div>
      </div>
      <div class="col-12 small text-muted" id="fAuditMeta"></div>
    </div>
  </div>
  <div class="modal-footer justify-content-between">
    <button id="btnDeleteFac" class="btn btn-outline-danger btn-sm" onclick="deleteFacility()"><i class="bi bi-trash"></i> Видалити</button>
    <div class="d-flex gap-2"><button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Скасувати</button><button class="btn btn-primary btn-sm" onclick="saveFacility()"><i class="bi bi-check-lg"></i> Зберегти</button></div>
  </div>
</div></div></div>

<div class="modal fade" id="inspModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
  <div class="modal-header"><h5 class="modal-title" id="inspModalTitle">Перевірка</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
  <div class="modal-body">
    <input type="hidden" id="iId" />
    <div class="mb-2"><label class="form-label small">Портовий засіб</label><select id="iCode" class="form-select form-select-sm"></select></div>
    <div class="row g-2 mb-2">
      <div class="col-4"><label class="form-label small">Рік</label><input id="iYear" type="number" class="form-control form-control-sm" value="2026" /></div>
      <div class="col-4"><label class="form-label small">Дата з</label><input id="iStart" type="date" class="form-control form-control-sm" /></div>
      <div class="col-4"><label class="form-label small">Дата по</label><input id="iEnd" type="date" class="form-control form-control-sm" /></div>
    </div>
    <div class="mb-2"><label class="form-label small">Статус</label><select id="iStatus" class="form-select form-select-sm"><option>Проведено</option><option>Заплановано</option><option>Не проводилась</option><option>Перенесено</option></select></div>
    <div class="mb-2"><label class="form-label small">Примітки</label><textarea id="iNotes" rows="2" class="form-control form-control-sm"></textarea></div>
  </div>
  <div class="modal-footer justify-content-between"><button id="btnDeleteInsp" class="btn btn-outline-danger btn-sm" onclick="deleteInspection()"><i class="bi bi-trash"></i> Видалити</button><button class="btn btn-primary btn-sm" onclick="saveInspection()">Зберегти</button></div>
</div></div></div>

<div class="modal fade" id="vesselModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
  <div class="modal-header"><h5 class="modal-title">Редагування показника</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
  <div class="modal-body">
    <input type="hidden" id="vId" />
    <div class="mb-2 small text-muted" id="vLabel"></div>
    <div class="mb-2"><label class="form-label small">Значення</label><input id="vVal" type="text" class="form-control form-control-sm" /></div>
    <div class="mb-2"><label class="form-label small">Реквізити листа РСУ</label><input id="vLetter" type="text" class="form-control form-control-sm" /></div>
    <div class="mb-2"><label class="form-label small">Примітки</label><textarea id="vNotes" rows="2" class="form-control form-control-sm"></textarea></div>
  </div>
  <div class="modal-footer"><button class="btn btn-primary btn-sm" onclick="saveVesselStat()">Зберегти</button></div>
</div></div></div>

<div class="modal fade" id="uiDialogModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">
  <div class="modal-header py-2"><h6 class="modal-title fw-bold" id="uiDialogTitle">Підтвердження</h6><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
  <div class="modal-body"><div id="uiDialogMessage" class="small" style="white-space: pre-line;"></div><input id="uiDialogInput" type="text" class="form-control form-control-sm mt-2 d-none" /></div>
  <div class="modal-footer py-2"><button type="button" class="btn btn-sm btn-secondary" id="uiDialogCancelBtn" data-bs-dismiss="modal">Скасувати</button><button type="button" class="btn btn-sm btn-primary" id="uiDialogOkBtn">ОК</button></div>
</div></div></div>
`);


/* Модалка конвенційного судна */
Views.addModals(`
<div class="modal fade" id="convVesselModal" tabindex="-1"><div class="modal-dialog modal-lg"><div class="modal-content">
  <div class="modal-header py-2"><h6 class="modal-title" id="convVesselModalTitle">Конвенційне судно</h6>
    <button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
  <div class="modal-body">
    <input type="hidden" id="cvId" />
    <div class="row g-2">
      <div class="col-md-8"><label class="form-label small">Судно / назва *</label>
        <input id="cvName" class="form-control form-control-sm" /></div>
      <div class="col-md-4 d-flex align-items-end">
        <div class="form-check mb-1"><input class="form-check-input" type="checkbox" id="cvActive" checked />
          <label class="form-check-label small" for="cvActive">Активне</label></div>
      </div>
      <div class="col-md-4"><label class="form-label small">Міжнародне / тимчасове свідоцтво до</label>
        <input type="date" id="cvCert" class="form-control form-control-sm" /></div>
      <div class="col-md-4"><label class="form-label small">Оцінка охорони до</label>
        <input type="date" id="cvAssess" class="form-control form-control-sm" /></div>
      <div class="col-md-4"><label class="form-label small">План охорони до</label>
        <input type="date" id="cvPlan" class="form-control form-control-sm" /></div>
      <div class="col-12"><label class="form-label small">Судновласник / контакти (електронна адреса)</label>
        <input id="cvOwner" class="form-control form-control-sm" placeholder="ТОВ «…», email@example.com" /></div>
      <div class="col-md-6"><label class="form-label small">Офіцер охорони компанії (CSO)</label>
        <input id="cvCso" class="form-control form-control-sm" /></div>
      <div class="col-md-6"><label class="form-label small">Особа, відповідальна за охорону на судні (SSO)</label>
        <input id="cvSso" class="form-control form-control-sm" /></div>
      <div class="col-12"><label class="form-label small">Висновок</label>
        <textarea id="cvConclusion" class="form-control form-control-sm" rows="2"></textarea></div>
    </div>
  </div>
  <div class="modal-footer py-2 justify-content-between">
    <button id="btnDeleteConvVessel" class="btn btn-sm btn-outline-danger" onclick="deleteConventionVessel()"><i class="bi bi-trash"></i> Видалити</button>
    <button class="btn btn-sm btn-primary" onclick="saveConventionVessel()">Зберегти</button>
  </div>
</div></div></div>
`);

/* Модалка перевірки судна — деталізація процедур ОСПЗ */
Views.addModals(`
<div class="modal fade" id="vesselInspModal" tabindex="-1"><div class="modal-dialog modal-lg"><div class="modal-content">
  <div class="modal-header py-2">
    <h6 class="modal-title" id="vesselInspModalTitle">Перевірка судна (ОСПЗ)</h6>
    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
  </div>
  <div class="modal-body">
    <input type="hidden" id="viId" />
    <div class="row g-2">
      <div class="col-md-8">
        <label class="form-label small">Судно / назва *</label>
        <input id="viVesselName" class="form-control form-control-sm" list="viVesselList" />
        <datalist id="viVesselList"></datalist>
      </div>
      <div class="col-md-4">
        <label class="form-label small">Прапор</label>
        <input id="viFlag" class="form-control form-control-sm" value="Україна" />
      </div>
      <div class="col-md-6">
        <label class="form-label small">Міжнародне / тимчасове свідоцтво видане</label>
        <input id="viCertIssued" class="form-control form-control-sm" placeholder="дата або реквізити" />
      </div>
      <div class="col-md-3">
        <label class="form-label small">Дата перевірки *</label>
        <input type="date" id="viDate" class="form-control form-control-sm" />
      </div>
      <div class="col-md-3">
        <label class="form-label small">Статус процедури</label>
        <select id="viStatus" class="form-select form-select-sm">
          <option value="Проведено">Проведено</option>
          <option value="Заплановано">Заплановано</option>
          <option value="Скасовано">Скасовано</option>
        </select>
      </div>
      <div class="col-md-6">
        <label class="form-label small">Вид перевірки (процедура)</label>
        <select id="viType" class="form-select form-select-sm">
          <option value="">— оберіть —</option>
          <option value="Первинна перевірка ОСПЗ">Первинна перевірка ОСПЗ</option>
          <option value="Планова перевірка ОСПЗ">Планова перевірка ОСПЗ</option>
          <option value="Позапланова перевірка">Позапланова перевірка</option>
          <option value="Контроль доступу на судно">Контроль доступу на судно</option>
          <option value="Перевірка плану охорони судна">Перевірка плану охорони судна</option>
          <option value="Аудит системи охорони">Аудит системи охорони</option>
          <option value="Перевірка Журналу безперервної реєстрації">Перевірка Журналу безперервної реєстрації</option>
          <option value="Інша">Інша</option>
        </select>
      </div>
      <div class="col-md-6">
        <label class="form-label small">Результат процедури</label>
        <select id="viResult" class="form-select form-select-sm">
          <option value="">—</option>
          <option value="Без зауважень">Без зауважень</option>
          <option value="Зауваження">Зауваження</option>
          <option value="Критичні невідповідності">Критичні невідповідності</option>
          <option value="Рекомендації">Рекомендації</option>
        </select>
      </div>
      <div class="col-12">
        <label class="form-label small">Виявлені зауваження / результати процедури</label>
        <textarea id="viFindings" class="form-control form-control-sm" rows="2"
          placeholder="Напр.: не виконується контроль доступу; відсутні форми №2, №3 у Журналі…"></textarea>
      </div>
      <div class="col-12">
        <label class="form-label small">Коригувальні заходи / доручення</label>
        <textarea id="viCorrective" class="form-control form-control-sm" rows="2"
          placeholder="Що необхідно усунути, строк, відповідальний"></textarea>
      </div>
      <div class="col-12">
        <label class="form-label small">Коментарі</label>
        <textarea id="viComments" class="form-control form-control-sm" rows="2"></textarea>
      </div>
    </div>
  </div>
  <div class="modal-footer py-2">
    <button id="btnDeleteVesselInsp" class="btn btn-sm btn-outline-danger me-auto" onclick="deleteVesselInspection()"><i class="bi bi-trash"></i> Видалити</button>
    <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Скасувати</button>
    <button class="btn btn-sm btn-primary" onclick="saveVesselInspection()"><i class="bi bi-check2"></i> Зберегти</button>
  </div>
</div></div></div>
`);
