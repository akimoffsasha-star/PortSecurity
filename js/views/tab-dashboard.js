/* Вкладка «Аналітика» */
Views.addTab("tabDashboard", `
<div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2 no-print">
  <span class="small text-muted">Зведена панель моніторингу та ризиків</span>
  <div class="form-check form-switch mb-0">
    <input class="form-check-input" type="checkbox" id="chkExecutiveMode" onchange="toggleExecutiveMode()" />
    <label class="form-check-label small fw-semibold" for="chkExecutiveMode"><i class="bi bi-briefcase me-1"></i>Режим керівництва (KPI)</label>
  </div>
</div>

<div id="executivePanel" class="d-none mb-3">
  <div class="row g-3 mb-3">
    <div class="col-6 col-md-4 col-xl-2">
      <div class="card kpi-card p-3 border-top border-4 border-secondary h-100" onclick="jumpToFacilities({})">
        <div class="text-muted small">Усього ПЗ у базі</div>
        <h2 id="execTotal" class="mb-0 fw-bold mt-1 tabular-nums">—</h2>
        <div id="execTotalSub" class="kpi-sub mt-1"></div>
      </div>
    </div>
    <div class="col-6 col-md-4 col-xl-2">
      <div class="card kpi-card p-3 border-top border-4 border-primary h-100" onclick="jumpToFacilities({ quick: 'ACTIVE_ONLY' })">
        <div class="text-muted small">Діючих ПЗ</div>
        <h2 id="execActive" class="mb-0 fw-bold text-primary mt-1 tabular-nums">—</h2>
        <div id="execActiveSub" class="kpi-sub mt-1"></div>
      </div>
    </div>
    <div class="col-6 col-md-4 col-xl-2">
      <div class="card kpi-card p-3 border-top border-4 border-danger h-100" onclick="jumpToFacilities({ quick: 'OVERDUE_ACTIVE' })">
        <div class="text-muted small">Прострочених (діючі)</div>
        <h2 id="execOverdue" class="mb-0 fw-bold text-danger mt-1 tabular-nums">—</h2>
        <div id="execOverdueSub" class="kpi-sub mt-1"></div>
      </div>
    </div>
    <div class="col-6 col-md-4 col-xl-2">
      <div class="card kpi-card p-3 border-top border-4 border-warning h-100" onclick="jumpToFacilities({ quick: 'SOON60' })">
        <div class="text-muted small">Критичних (≤ 60 дн.)</div>
        <h2 id="execCritical" class="mb-0 fw-bold text-warning mt-1 tabular-nums">—</h2>
        <div id="execCriticalSub" class="kpi-sub mt-1"></div>
      </div>
    </div>
    <div class="col-6 col-md-4 col-xl-2">
      <div class="card kpi-card p-3 border-top border-4 border-success h-100" onclick="jumpToInspections({ year: new Date().getFullYear(), status: 'Проведено' })">
        <div class="text-muted small" id="execInspLabel">Перевірок за рік</div>
        <h2 id="execInspections" class="mb-0 fw-bold text-success mt-1 tabular-nums">—</h2>
        <div id="execInspSub" class="kpi-sub mt-1"></div>
      </div>
    </div>
    <div class="col-6 col-md-4 col-xl-2">
      <div class="card kpi-card p-3 border-top border-4 border-dark h-100" onclick="jumpToRiskyFacilities()">
        <div class="text-muted small">Середній Risk Score</div>
        <h2 id="execAvgRisk" class="mb-0 fw-bold mt-1 tabular-nums">—</h2>
        <div id="execRiskSub" class="kpi-sub mt-1"></div>
      </div>
    </div>
  </div>

  <!-- Блок планування: exposure · concentration · action queue -->
  <div class="row g-3 mb-3" id="execPlanningRow">
    <div class="col-12">
      <div class="card p-3">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <h6 class="fw-bold mb-0"><i class="bi bi-graph-up-arrow text-primary me-1"></i>Планування документів — горизонт 90 днів</h6>
            <small class="text-muted">Розподіл ризику спливу · концентрація по зонах · черга управлінських дій</small>
          </div>
          <div class="d-flex flex-wrap gap-2 no-print">
            <button type="button" class="btn btn-sm btn-outline-danger" id="planBtnOverdue" title="Перейти до прострочених діючих ПЗ">
              <i class="bi bi-exclamation-triangle me-1"></i>Прострочені
            </button>
            <button type="button" class="btn btn-sm btn-outline-warning" id="planBtn30" title="ПЗ з документами ≤30 днів">
              ≤30 дн.
            </button>
          </div>
        </div>

        <div class="row g-3">
          <!-- 1. Exposure / distribution -->
          <div class="col-lg-4">
            <div class="border rounded-3 p-3 h-100" style="background:linear-gradient(180deg,#f8fafc 0%,#fff 100%);">
              <div class="d-flex justify-content-between align-items-baseline mb-2">
                <span class="small fw-semibold text-uppercase text-secondary" style="letter-spacing:.04em;">Розподіл ризику</span>
                <span class="small tabular-nums text-muted" id="planWatchTotal">—</span>
              </div>

              <!-- Stacked horizon bar -->
              <div class="progress mb-2" style="height:14px;border-radius:8px;background:#e2e8f0;" id="planHorizonBar" title="Частка документів у кожному горизонті">
                <div class="progress-bar bg-danger" id="planSegOver" style="width:0%;border-radius:8px 0 0 8px;" data-bs-toggle="tooltip" title="Прострочено"></div>
                <div class="progress-bar" id="planSeg30" style="width:0%;background:#ef4444;"></div>
                <div class="progress-bar" id="planSeg60" style="width:0%;background:#f59e0b;"></div>
                <div class="progress-bar" id="planSeg90" style="width:0%;background:#38bdf8;border-radius:0 8px 8px 0;"></div>
              </div>
              <div class="d-flex flex-wrap gap-2 small mb-3" style="row-gap:4px;">
                <span><span class="d-inline-block rounded-1 me-1" style="width:10px;height:10px;background:#b91c1c;"></span>Простр. <b class="tabular-nums" id="planOverCnt">0</b></span>
                <span><span class="d-inline-block rounded-1 me-1" style="width:10px;height:10px;background:#ef4444;"></span>≤30 <b class="tabular-nums" id="plan30Cnt">0</b></span>
                <span><span class="d-inline-block rounded-1 me-1" style="width:10px;height:10px;background:#f59e0b;"></span>31–60 <b class="tabular-nums" id="plan60Cnt">0</b></span>
                <span><span class="d-inline-block rounded-1 me-1" style="width:10px;height:10px;background:#38bdf8;"></span>61–90 <b class="tabular-nums" id="plan90Cnt">0</b></span>
              </div>

              <div class="row g-2 small">
                <div class="col-6">
                  <div class="text-muted">ПЗ під наглядом</div>
                  <div class="fw-bold tabular-nums fs-5" id="planFacAffected">—</div>
                  <div class="text-muted" style="font-size:11px;"><span id="planFacShare">—</span> від діючих</div>
                </div>
                <div class="col-6">
                  <div class="text-muted">Середній запас</div>
                  <div class="fw-bold tabular-nums fs-5" id="planMedianDays">—</div>
                  <div class="text-muted" style="font-size:11px;">днів до найближчого спливу</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Concentration (Pareto) -->
          <div class="col-lg-4">
            <div class="border rounded-3 p-3 h-100">
              <div class="small fw-semibold text-uppercase text-secondary mb-2" style="letter-spacing:.04em;">Концентрація ризику</div>
              <div class="small text-muted mb-2">Топ зон за кількістю документів у горизонті ≤90 дн. (і прострочених)</div>
              <div id="planConcentration" class="d-flex flex-column gap-2"></div>
              <div class="small text-muted mt-2" id="planConcHint"></div>
            </div>
          </div>

          <!-- 3. Action queue -->
          <div class="col-lg-4">
            <div class="border rounded-3 p-3 h-100" style="border-color:#cbd5e1 !important;">
              <div class="small fw-semibold text-uppercase text-secondary mb-2" style="letter-spacing:.04em;">Черга дій</div>
              <ol class="mb-2 ps-3" id="planActionQueue" style="font-size:13px;"></ol>
              <div class="alert alert-light border py-2 px-2 mb-0 small" id="planManagementNote" style="border-radius:8px;">
                —
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Кумулятивний горизонт + розбиття за типом документа -->
  <div class="row g-3 mb-3" id="execHorizonChartsRow">
    <div class="col-lg-7">
      <div class="card p-3 h-100">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
          <div>
            <h6 class="fw-bold mb-0"><i class="bi bi-activity text-primary me-1"></i>Кумулятивний сплив документів (90 днів)</h6>
            <small class="text-muted">Накопичення спливів від сьогодні · клік по графіку відкриває Реєстр (≤30 / ≤60 / ≤90)</small>
          </div>
        </div>
        <div class="chart-frame" style="position:relative;height:240px;"><canvas id="execCumulativeChart"></canvas></div>
      </div>
    </div>
    <div class="col-lg-5">
      <div class="card p-3 h-100">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
          <div>
            <h6 class="fw-bold mb-0"><i class="bi bi-pie-chart text-primary me-1"></i>Структура за типом документа</h6>
            <small class="text-muted">Акт / ООПЗ / ПОПЗ · клік по рядку → фільтр у Реєстрі</small>
          </div>
          <div data-chart-switcher-for="execDocType"></div>
          </div>
        <div class="chart-frame" style="position:relative;height:240px;"><canvas id="execDocTypeChart"></canvas></div>
      </div>
    </div>
  </div>

  <div class="row g-3 mb-3">
    <div class="col-lg-5">
      <div class="card p-3 h-100 d-flex flex-column">
        <h6 class="fw-bold mb-1"><i class="bi bi-bar-chart-steps text-primary me-1"></i>Готовність та профіль ризиків (діючі ПЗ)</h6>
        <small class="text-muted mb-3">Відповідність документації вимогам Наказу № 797 та розподіл за ризиками</small>
        <div id="execReadinessBars" class="mb-3"></div>
        <div class="border-top pt-3 mt-auto">
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
            <span class="small fw-semibold text-dark">Розподіл діючих ПЗ за Risk Score</span>
            <div class="d-flex align-items-center gap-2">
              <span id="execRiskTotalLabel" class="small text-muted tabular-nums"></span>
              <span data-chart-switcher-for="execRisk"></span>
            </div>
          </div>
          <div class="chart-frame" style="position: relative; height: 165px;"><canvas id="execRiskDoughnut"></canvas></div>
        </div>
      </div>
    </div>
    <div class="col-lg-7">
      <div class="card p-3 h-100">
        <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
          <div>
            <h6 class="fw-bold mb-0"><i class="bi bi-building-check text-primary me-1"></i>Рейтинг портів / зон (діючі ПЗ)</h6>
            <small class="text-muted">Натисніть на рядок порту для переходу до його ПЗ у Реєстрі</small>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table table-sm table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Порт / Зона</th>
                <th class="text-center">Діючих</th>
                <th style="min-width:130px;">Готовність (Акт)</th>
                <th class="text-center">Простроч.</th>
                <th class="text-center">ГІСІС ≠</th>
                <th class="text-center">Сер. ризик</th>
              </tr>
            </thead>
            <tbody id="execPortRatingBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div class="row g-3">
    <div class="col-lg-7">
      <div class="card p-3 h-100">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h6 class="fw-bold mb-0"><i class="bi bi-shield-exclamation text-danger me-1"></i>ТОП-5 ПЗ за рівнем ризику (потребують рішень)</h6>
          <span class="badge bg-light text-secondary border small">Режим перегляду</span>
        </div>
        <div id="execTopRisks"></div>
      </div>
    </div>
    <div class="col-lg-5">
      <div class="card p-3 h-100 d-flex flex-column">
        <h6 class="fw-bold mb-2"><i class="bi bi-tsunami text-info me-1"></i>Судна, перевірки та швидкі звіти</h6>
        <div id="execVesselsSummary" class="small flex-grow-1"></div>
        <div class="border-top pt-2 mt-2 d-flex flex-wrap gap-2 no-print">
          <button type="button" class="btn btn-sm btn-success" onclick="exportExcel797()"><i class="bi bi-download me-1"></i>Звіт Наказ №797</button>
          <button type="button" class="btn btn-sm btn-outline-danger" onclick="exportPdfReport()"><i class="bi bi-file-earmark-pdf me-1"></i>PDF-довідка</button>
          <button type="button" class="btn btn-sm btn-outline-primary" onclick="sendAlertsEmail()"><i class="bi bi-envelope me-1"></i>Email-зведення</button>
        </div>
      </div>
    </div>
  </div>
</div>

<div id="standardDashboardWrap">
  <div class="row g-3 mb-3">
    <div class="col-6 col-xl-3">
      <div class="card kpi-card p-3 border-start border-4 border-primary h-100" title="Показати діючі ПЗ" onclick="jumpToFacilities({ quick: 'ACTIVE_ONLY' })">
        <div class="text-muted small">Діючі ПЗ (працюючі порти + ВВШ)</div>
        <div class="d-flex align-items-baseline gap-2 mt-1 flex-wrap"><h2 id="kpiActive" class="mb-0 fw-bold tabular-nums">—</h2><span id="kpiTotalSub" class="kpi-sub"></span></div>
      </div>
    </div>
    <div class="col-6 col-xl-3">
      <div class="card kpi-card p-3 border-start border-4 border-success h-100" title="Чинний Акт або в процесі" onclick="jumpToFacilities({ quick: 'VALID_OR_PROC' })">
        <div class="text-muted small">Чинний Акт / В процесі</div>
        <div class="d-flex align-items-baseline gap-2 mt-1 flex-wrap"><h2 id="kpiValid" class="mb-0 fw-bold text-success tabular-nums">—</h2><span id="kpiValidSub" class="kpi-sub"></span></div>
      </div>
    </div>
    <div class="col-6 col-xl-3">
      <div class="card kpi-card p-3 border-start border-4 border-warning h-100" title="≤ 60 днів" onclick="jumpToFacilities({ quick: 'SOON60' })">
        <div class="text-muted small">Критично (≤ 60 днів)</div>
        <div class="d-flex align-items-baseline gap-2 mt-1 flex-wrap"><h2 id="kpiSoon" class="mb-0 fw-bold text-warning tabular-nums">—</h2><span class="kpi-sub">попередження ≤ 90 дн.</span></div>
      </div>
    </div>
    <div class="col-6 col-xl-3">
      <div class="card kpi-card p-3 border-start border-4 border-danger h-100" title="Прострочені документи діючих ПЗ" onclick="jumpToFacilities({ quick: 'BAD_ACTIVE' })">
        <div class="text-muted small">Прострочено (діючі)</div>
        <div class="d-flex align-items-baseline gap-2 mt-1 flex-wrap"><h2 id="kpiBad" class="mb-0 fw-bold text-danger tabular-nums">—</h2><span id="kpiGisisSub" class="kpi-sub"></span></div>
      </div>
    </div>
  </div>


  <!-- Конвенційні судна — той самий ряд KPI, що й ПЗ -->
  <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2" id="vesselAnalyticsCard">
    <span class="small text-muted fw-semibold"><i class="bi bi-ship me-1"></i>Конвенційні судна (ОСПЗ)</span>
    <a href="#" class="small fw-semibold text-decoration-none" onclick="event.preventDefault(); document.querySelector('#mainTabs [data-bs-target=\\'#tabVessels\\']')?.click()">До реєстру суден →</a>
  </div>
  <div class="row g-3 mb-3">
    <div class="col-6 col-xl-3">
      <div class="card kpi-card p-3 border-start border-4 border-info h-100"
        title="Усі конвенційні судна у реєстрі"
        onclick="bootstrap.Tab.getOrCreateInstance(document.querySelector('[data-bs-target=\'#tabVessels\']')).show()">
        <div class="text-muted small">У реєстрі</div>
        <div class="d-flex align-items-baseline gap-2 mt-1 flex-wrap">
          <h2 id="kpiConvVessels" class="mb-0 fw-bold tabular-nums">—</h2>
          <span class="kpi-sub">конвенційні судна</span>
        </div>
      </div>
    </div>
    <div class="col-6 col-xl-3">
      <div class="card kpi-card p-3 border-start border-4 border-danger h-100"
        title="Судна з простроченими документами"
        onclick="openConvVesselsFiltered('OVERDUE')">
        <div class="text-muted small">Прострочені документи</div>
        <div class="d-flex align-items-baseline gap-2 mt-1 flex-wrap">
          <h2 id="kpiConvOverdue" class="mb-0 fw-bold text-danger tabular-nums">—</h2>
          <span class="kpi-sub">потребують уваги</span>
        </div>
      </div>
    </div>
    <div class="col-6 col-xl-3">
      <div class="card kpi-card p-3 border-start border-4 border-warning h-100"
        title="Дедлайн документів ≤ 60 днів"
        onclick="openConvVesselsFiltered('SOON60')">
        <div class="text-muted small">Критично (≤ 60 днів)</div>
        <div class="d-flex align-items-baseline gap-2 mt-1 flex-wrap">
          <h2 id="kpiConvSoon" class="mb-0 fw-bold text-warning tabular-nums">—</h2>
          <span class="kpi-sub">наближення дедлайну</span>
        </div>
      </div>
    </div>
    <div class="col-6 col-xl-3">
      <div class="card kpi-card p-3 border-start border-4 border-secondary h-100"
        title="Перевірки / процедури ОСПЗ на суднах"
        onclick="openVesselInspectionsTab()">
        <div class="text-muted small">Перевірок суден</div>
        <div class="d-flex align-items-baseline gap-2 mt-1 flex-wrap">
          <h2 id="kpiVesselInsp" class="mb-0 fw-bold tabular-nums">—</h2>
          <span class="kpi-sub">процедури ОСПЗ</span>
        </div>
      </div>
    </div>
  </div>

  <div class="row g-3 mb-3">
    <div class="col-lg-7">
      <div class="card p-3 h-100">
        <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
          <div>
            <h6 class="fw-bold mb-0">Стан портових засобів по зонах</h6>
            <small class="text-muted">Клік по кольоровому сегменту — перехід до ПЗ цієї зони та статусу</small>
          </div>
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <span data-chart-switcher-for="ports"></span>
            <div class="form-check form-switch mb-0">
              <input class="form-check-input" type="checkbox" id="chkOnlyActivePorts" onchange="saveDashPrefs(); renderDashboard()" />
              <label class="form-check-label small" for="chkOnlyActivePorts">Лише працюючі</label>
            </div>
          </div>
        </div>
        <div class="chart-frame" style="position: relative; height: 420px;"><canvas id="portsChart"></canvas></div>
      </div>
    </div>
    <div class="col-lg-5">
      <div class="card p-3 h-100 d-flex flex-column">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
          <div>
            <h6 class="fw-bold mb-1">Документальна готовність діючих ПЗ</h6>
            <small class="text-muted mb-2 d-block">Клік по смужці відкриває відповідні ПЗ у Реєстрі</small>
          </div>
          <span data-chart-switcher-for="readiness"></span>
        </div>
        <div class="chart-frame mb-3" style="position: relative; flex: 1 1 285px; min-height: 285px;"><canvas id="readinessChart"></canvas></div>
        <div class="border-top pt-2 mt-auto">
          <div class="small fw-semibold mb-1">Статуси (усі ПЗ):</div>
          <div id="statusSummaryPills" class="d-flex flex-wrap gap-1"></div>
        </div>
      </div>
    </div>
  </div>

  <div class="row g-3 mb-3">
    <div class="col-lg-5">
      <div class="card p-3 h-100 d-flex flex-column">
        <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-1">
          <h6 class="fw-bold mb-0"><i class="bi bi-bell text-danger me-1"></i>Сповіщення та прогноз (діючі ПЗ)</h6>
          <div class="d-flex gap-1 no-print">
            <button class="btn btn-sm btn-outline-success py-0 px-2" title="Експорт у Excel" onclick="exportAlertsExcel()"><i class="bi bi-file-earmark-excel"></i> xlsx</button>
            <button class="btn btn-sm btn-outline-danger py-0 px-2" title="PDF-звіт" onclick="exportPdfReport()"><i class="bi bi-file-earmark-pdf"></i> pdf</button>
            <button class="btn btn-sm btn-outline-primary py-0 px-2" title="Email-звіт" onclick="sendAlertsEmail()"><i class="bi bi-envelope"></i> email</button>
          </div>
        </div>
        <div class="horizon-grid flex-grow-1 mb-2" id="horizonTiles"></div>
        <div class="border-top pt-2 mt-auto small text-muted" id="forecastBox"></div>
      </div>
    </div>
    <div class="col-lg-7">
      <div class="card p-3 h-100 d-flex flex-column">
        <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
          <div>
            <h6 class="fw-bold mb-0"><i class="bi bi-calendar3 text-primary me-1"></i>Календар планових дедлайнів (діючі ПЗ)</h6>
            <small class="text-muted">Кількість документів за строком дії — клік по сегменту відкриває ці ПЗ</small>
          </div>
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <span data-chart-switcher-for="deadlines"></span>
            <select id="calHorizonMode" class="form-select form-select-sm" style="width:auto;" onchange="saveDashPrefs(); renderCharts()">
              <option value="BY_YEAR">По роках (майбутні)</option>
              <option value="NEXT12">Найближчі 12 місяців</option>
              <option value="NONEMPTY">Усі місяці з подіями</option>
            </select>
          </div>
        </div>
        <div class="chart-frame" style="position: relative; flex: 1 1 310px; min-height: 310px;">
          <div id="deadlinesChartInner" style="position: relative; height: 310px;">
            <canvas id="deadlinesChart"></canvas>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="card p-3 mb-3">
    <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
      <div>
        <h6 class="fw-bold mb-0"><i class="bi bi-speedometer2 text-danger me-1"></i>Аналіз ризиків терміналів (діючі ПЗ, score > 0)</h6>
        <small class="text-muted">Акт прострочено +50 · ООПЗ прострочено +25 · ПОПЗ прострочено +25 · Розбіжність ГІСІС +20</small>
      </div>
      <span class="badge bg-danger-subtle text-danger border border-danger-subtle" id="riskCountBadge">0 ПЗ</span>
    </div>
    <div id="riskWrap" class="table-responsive" style="max-height: 260px;">
      <table class="table table-sm table-hover align-middle mb-0">
        <thead><tr><th>Дія</th><th>Код</th><th>Порт / термінал</th><th>Назва ПЗ</th><th>Рівень</th><th>Score</th><th>Фактори ризику</th></tr></thead>
        <tbody id="riskBody"></tbody>
      </table>
    </div>
  </div>

  <div class="card p-3">
    <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
      <h6 class="fw-bold mb-0"><i class="bi bi-exclamation-triangle text-warning me-1"></i>Оперативний контроль (≤ 90 дн., прострочення, ГІСІС)</h6>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" id="chkHideStoppedAlerts" checked onchange="saveDashPrefs(); renderDashboard()" />
        <label class="form-check-label small" for="chkHideStoppedAlerts">Приховати зупинені / непрацюючі</label>
      </div>
    </div>
    <div id="alertsWrap" class="table-responsive" style="max-height: 360px;">
      <table class="table table-sm table-hover align-middle mb-0">
        <thead><tr><th>Дія</th><th>Код</th><th>Порт</th><th>Назва ПЗ</th><th>Стан</th><th>Мін. днів</th><th>Причина</th></tr></thead>
        <tbody id="alertsBody"></tbody>
      </table>
    </div>
  </div>
</div>

<div class="card p-3 mb-3" id="dashVesselsSummaryCard">
  <h6 class="fw-bold mb-2"><i class="bi bi-ship me-1"></i>Конвенційні судна (гл. XI-2 SOLAS / ОСПЗ) та перевірки</h6>
  <div class="row g-2 small">
    <div class="col-md-3">Усього суден: <b id="dashVesTotal">0</b> (активних: <b id="dashVesActive">0</b>)</div>
    <div class="col-md-3">Прострочено документи: <b id="dashVesOverdue" class="text-danger">0</b></div>
    <div class="col-md-3">Дедлайн ≤ 60 дн.: <b id="dashVesSoon60" class="text-warning">0</b></div>
    <div class="col-md-3">Перевірок суден: <b id="dashVesInspTotal">0</b> (проведено: <b id="dashVesInspDone">0</b>)</div>
  </div>
</div>

`);
