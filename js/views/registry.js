/* Реєстр шаблонів інтерфейсу.
   Кожен файл у js/views/ реєструє свою вкладку або модальні вікна; Views.mount() вставляє їх у index.html. */
const Views = {
  tabs: [],
  modals: [],
  addTab(id, html) { this.tabs.push({ id, html }); },
  addModals(html) { this.modals.push(html); },
  mount() {
    document.getElementById("tabContent").innerHTML = this.tabs
      .map((t, i) => `<div class="tab-pane fade${i === 0 ? " show active" : ""}" id="${t.id}">${t.html}</div>`)
      .join("\n");
    document.getElementById("modalsHost").innerHTML = this.modals.join("\n");
  }
};
