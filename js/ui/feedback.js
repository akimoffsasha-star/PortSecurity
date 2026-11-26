/**
 * feedback.js — зворотний зв’язок користувачу:
 * оверлей завантаження, toast, alert у шапці, універсальний діалог.
 */

/**
 * Показує / ховає оверлей «Завантаження…».
 * Підтримує вкладені виклики через loadingCount.
 * @param {boolean} on — true = +1, false = −1
 * @param {string} [text] — підпис на оверлеї
 */
function setLoading(on, text) {
  loadingCount += on ? 1 : -1;
  if (loadingCount < 0) loadingCount = 0;
  const el = document.getElementById("loadingOverlay");
  const txt = document.getElementById("loadingText");
  if (loadingCount > 0) {
    if (text) txt.textContent = text;
    el.classList.add("show");
  } else {
    el.classList.remove("show");
  }
}

/**
 * Коротке сповіщення (Bootstrap Toast) у правому нижньому куті.
 * @param {string} msg
 * @param {boolean} [isError=false]
 */
function notify(msg, isError = false) {
  const el = document.getElementById("appToast");
  el.className = `toast align-items-center text-bg-${isError ? "danger" : "success"} border-0`;
  document.getElementById("appToastBody").textContent = msg;
  bootstrap.Toast.getOrCreateInstance(el, { delay: 3200 }).show();
}

/**
 * Показує постійний alert під шапкою (поки не викличуть hideAlert).
 * @param {string} msg
 * @param {string} [type="warning"] — bootstrap alert-* клас
 */
function showAlert(msg, type = "warning") {
  const el = document.getElementById("statusAlert");
  el.className = `alert alert-${type} no-print`;
  el.textContent = msg;
  el.classList.remove("d-none");
}

/** Ховає alert у шапці. */
function hideAlert() {
  document.getElementById("statusAlert").classList.add("d-none");
}

/**
 * Універсальний модальний діалог: alert / confirm / prompt.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {"alert"|"confirm"|"prompt"} [opts.mode="alert"]
 * @param {string} [opts.defaultVal=""] — початкове значення для prompt
 * @param {string} [opts.okText="ОК"]
 * @param {string} [opts.okClass="btn-primary"]
 * @returns {Promise<boolean|string|null>}
 *   alert → true; confirm → true/false; prompt → рядок або null (скасовано)
 */
function showUiDialog({ title, message, mode = "alert", defaultVal = "", okText = "ОК", okClass = "btn-primary" }) {
  return new Promise(resolve => {
    const modalEl = document.getElementById("uiDialogModal");
    const msgEl = document.getElementById("uiDialogMessage");
    const inpEl = document.getElementById("uiDialogInput");
    const okBtn = document.getElementById("uiDialogOkBtn");
    const cancelBtn = document.getElementById("uiDialogCancelBtn");

    document.getElementById("uiDialogTitle").textContent = title;
    msgEl.textContent = message;
    okBtn.textContent = okText;
    okBtn.className = `btn btn-sm ${okClass}`;
    cancelBtn.classList.toggle("d-none", mode === "alert");

    if (mode === "prompt") {
      inpEl.classList.remove("d-none");
      inpEl.value = defaultVal;
    } else {
      inpEl.classList.add("d-none");
    }

    let settled = false;
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

    const finish = val => {
      if (settled) return;
      settled = true;
      okBtn.onclick = null;
      modalEl.removeEventListener("hidden.bs.modal", onHidden);
      resolve(val);
    };

    const onHidden = () => finish(mode === "prompt" ? null : false);
    modalEl.addEventListener("hidden.bs.modal", onHidden);
    okBtn.onclick = () => {
      const val = mode === "prompt" ? inpEl.value : true;
      modal.hide();
      finish(val);
    };
    // Діалог має бути поверх будь-якої відкритої модалки (напр. редагування судна)
    modalEl.style.zIndex = "1075";
    modal.show();
    const backs = document.querySelectorAll(".modal-backdrop");
    if (backs.length) backs[backs.length - 1].style.zIndex = "1070";
    if (mode === "prompt") setTimeout(() => { inpEl.focus(); inpEl.select(); }, 180);
  });
}

/** Спрощений alert (лише кнопка ОК). */
const uiAlert = (message, title = "Повідомлення") =>
  showUiDialog({ title, message, mode: "alert" });

/** Підтвердження дії (ОК / Скасувати). */
const uiConfirm = (message, title = "Підтвердження", okClass = "btn-primary", okText = "Підтвердити") =>
  showUiDialog({ title, message, mode: "confirm", okClass, okText });

/** Запит текстового значення. */
const uiPrompt = (message, defaultVal = "", title = "Введення") =>
  showUiDialog({ title, message, mode: "prompt", defaultVal });
