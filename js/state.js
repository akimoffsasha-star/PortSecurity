/**
 * state.js — спільний стан застосунку.
 */

let sb = null;

/**
 * ports              — довідник портів / зон
 * facilities         — аналітика ПЗ
 * inspections        — перевірки ПЗ
 * vessels            — річна статистика (legacy, для зворотної сумісності звітів)
 * conventionVessels  — перелік конвенційних суден (ISPS / гл. XI-2 SOLAS)
 * vesselInspections  — перевірки ОСПЗ на суднах
 */
let state = {
  ports: [],
  facilities: [],
  inspections: [],
  vessels: [],
  conventionVessels: [],
  vesselInspections: []
};

let portsChart = null, readinessChart = null, deadlinesChart = null;
let chartsDirty = true;
let dashboardAnimatedOnce = false;
let isNewFacility = false;
let editingFacilityUpdatedAt = null;
let realtimeChannel = null;
let autoRefreshTimer = null;
let autoRefreshIntervalMs = 0;
let lastLoadTime = 0;
let gisisParsed = null, gisisPreviewRows = [], lastAuditRows = [];
let selectedFacCodes = new Set();
let customFacFilter = null;
let loadingCount = 0;
let calYear = new Date().getFullYear(), calMonth = new Date().getMonth();
let fcInstance = null;
let calSelectedDate = null;
let isNewConventionVessel = false;
