/* Вкладка «Календар перевірок» */
Views.addTab("tabCalendar", `
<div class="row g-3 align-items-stretch">
  <div class="col-xl-8">
    <div class="card p-3 h-100">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3 pb-2 border-bottom no-print">
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <button type="button" class="cal-ev cal-ev-all border-0" data-action="cal-filter-status" data-status="ALL">Усі</button>
          <button type="button" class="cal-ev cal-ev-done border-0" data-action="cal-filter-status" data-status="Проведено">Проведено</button>
          <button type="button" class="cal-ev cal-ev-plan border-0" data-action="cal-filter-status" data-status="Заплановано">Заплановано</button>
          <button type="button" class="cal-ev cal-ev-move border-0" data-action="cal-filter-status" data-status="Перенесено">Перенесено</button>
          <button type="button" class="cal-ev cal-ev-none border-0" data-action="cal-filter-status" data-status="Не проводилась">Не проводилась</button>
        </div>
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <div class="form-check form-check-inline small mb-0 me-1" title="Перевірки конвенційних суден (ОСПЗ)">
            <input class="form-check-input" type="checkbox" id="calShowVesselInsp" checked onchange="saveCalPrefs(); renderCalendar()" />
            <label class="form-check-label" for="calShowVesselInsp">⚓ Перевірки суден</label></div>
          <div class="form-check form-check-inline small mb-0 me-1" title="Строки свідоцтва, оцінки та плану охорони суден">
            <input class="form-check-input" type="checkbox" id="calShowVesselDocs" checked onchange="saveCalPrefs(); renderCalendar()" />
            <label class="form-check-label" for="calShowVesselDocs">⚓ Терміни документів</label></div>
          <select id="calStatusFlt" class="form-select form-select-sm d-none" onchange="saveCalPrefs(); renderCalendar()">
            <option value="ALL">Усі статуси</option>
            <option>Проведено</option>
            <option>Заплановано</option>
            <option>Перенесено</option>
            <option>Не проводилась</option>
          </select>
          <button type="button" class="btn btn-sm btn-primary" onclick="openInspectionModal(null, null, calSelectedDate)"><i class="bi bi-plus-lg me-1"></i>Додати перевірку</button>
        </div>
      </div>

      <div id="fcCalendar"></div>

      <div id="calFallbackWrap" class="d-none">
        <div class="d-flex align-items-center gap-2 mb-2">
          <button type="button" class="btn btn-sm btn-outline-secondary" onclick="shiftCalendarMonth(-1)"><i class="bi bi-chevron-left"></i></button>
          <h6 id="calMonthTitle" class="mb-0 fw-bold">—</h6>
          <button type="button" class="btn btn-sm btn-outline-secondary" onclick="shiftCalendarMonth(1)"><i class="bi bi-chevron-right"></i></button>
          <button type="button" class="btn btn-sm btn-outline-primary" onclick="resetCalendarToday()">Сьогодні</button>
        </div>
        <div class="cal-grid mb-1"><div class="cal-hdr">Пн</div><div class="cal-hdr">Вт</div><div class="cal-hdr">Ср</div><div class="cal-hdr">Чт</div><div class="cal-hdr">Пт</div><div class="cal-hdr">Сб</div><div class="cal-hdr">Нд</div></div>
        <div id="calGridBody" class="cal-grid"></div>
      </div>
    </div>
  </div>

  <div class="col-xl-4">
    <div class="card p-3 h-100 d-flex flex-column">
      <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom gap-2">
        <div>
          <h6 class="fw-bold mb-0" id="calSideTitle">Перевірки місяця</h6>
          <small class="text-muted" id="calSideSub">Натисніть на дату в календарі для деталізації</small>
        </div>
        <button type="button" id="btnCalShowMonth" class="btn btn-sm btn-outline-secondary d-none" onclick="calSelectedDate = null; renderCalSidePanel()">Увесь місяць</button>
      </div>
      <div id="calSideList" class="flex-grow-1 overflow-auto" style="max-height: 560px;"></div>
    </div>
  </div>
</div>
`);