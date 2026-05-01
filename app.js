const state = {
  people: [],
  fines: []
};

const personForm = document.getElementById("person-form");
const personNameInput = document.getElementById("person-name");
const personListEl = document.getElementById("person-list");

const fineForm = document.getElementById("fine-form");
const finePersonSelect = document.getElementById("fine-person");
const fineDescriptionInput = document.getElementById("fine-description");
const fineAmountInput = document.getElementById("fine-amount");
const fineDateInput = document.getElementById("fine-date");
const fineListEl = document.getElementById("fine-list");

const totalAllEl = document.getElementById("total-all");
const totalUnpaidEl = document.getElementById("total-unpaid");
const summaryPersonEl = document.getElementById("summary-person");
const summaryMonthEl = document.getElementById("summary-month");
const menuToggleBtn = document.getElementById("menu-toggle");
const mobileMenuEl = document.getElementById("mobile-menu");
const menuBackdropEl = document.getElementById("menu-backdrop");
const tabButtons = document.querySelectorAll("[data-tab-target]");
const tabPanels = document.querySelectorAll("[data-tab-panel]");
let activeTab = "fine";

function setActiveTab(tabName) {
  activeTab = tabName;
  tabPanels.forEach((panel) => {
    panel.classList.toggle("is-visible", panel.dataset.tabPanel === tabName);
  });
  tabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tabTarget === tabName);
  });
}

function setMobileMenuOpen(isOpen) {
  if (!mobileMenuEl || !menuToggleBtn || !menuBackdropEl) {
    return;
  }
  mobileMenuEl.classList.toggle("is-open", isOpen);
  menuBackdropEl.classList.toggle("is-open", isOpen);
  menuToggleBtn.setAttribute("aria-expanded", String(isOpen));
  document.body.classList.toggle("menu-open", isOpen);
}

function closeMobileMenu() {
  setMobileMenuOpen(false);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(amount);
}

function personNameById(personId) {
  const person = state.people.find((p) => p.id === personId);
  return person ? person.name : "Okänd person";
}

function renderPersonSelect() {
  const previousValue = finePersonSelect.value;
  finePersonSelect.innerHTML = '<option value="">Välj person</option>';
  state.people.forEach((person) => {
    const option = document.createElement("option");
    option.value = person.id;
    option.textContent = person.name;
    finePersonSelect.appendChild(option);
  });
  finePersonSelect.value = state.people.some((p) => p.id === previousValue) ? previousValue : "";
}

function renderPeople() {
  personListEl.innerHTML = "";
  if (state.people.length === 0) {
    personListEl.innerHTML = '<li class="empty">Inga personer ännu.</li>';
    return;
  }

  state.people.forEach((person) => {
    const personTotal = state.fines
      .filter((fine) => fine.personId === person.id)
      .reduce((sum, fine) => sum + fine.amount, 0);

    const li = document.createElement("li");
    li.className = "person-item";
    li.innerHTML = `
      <div class="person-header">
        <strong>${person.name}</strong>
        <button class="btn-danger" data-action="delete-person" data-id="${person.id}" type="button">Radera person</button>
      </div>
      <div class="muted">Totalt: ${formatCurrency(personTotal)}</div>
    `;
    personListEl.appendChild(li);
  });
}

function renderFines() {
  fineListEl.innerHTML = "";
  if (state.fines.length === 0) {
    fineListEl.innerHTML = '<li class="empty">Inga böter ännu.</li>';
    return;
  }

  const sortedFines = [...state.fines].sort((a, b) => new Date(b.date) - new Date(a.date));
  sortedFines.forEach((fine) => {
    const li = document.createElement("li");
    li.className = "fine-item";
    li.innerHTML = `
      <div class="fine-header">
        <strong>${personNameById(fine.personId)}</strong>
        <span class="tag ${fine.paid ? "tag-paid" : "tag-unpaid"}">${fine.paid ? "Betald" : "Obetald"}</span>
      </div>
      <div>${fine.description}</div>
      <div class="muted">Datum: ${fine.date} · Belopp: ${formatCurrency(fine.amount)}</div>
      <div class="toolbar">
        <button class="${fine.paid ? "" : "btn-success"}" data-action="toggle-paid" data-id="${fine.id}" type="button">${fine.paid ? "Markera som obetald" : "Markera som betald"}</button>
        <button class="btn-danger" data-action="delete-fine" data-id="${fine.id}" type="button">Radera böter</button>
      </div>
    `;
    fineListEl.appendChild(li);
  });
}

function renderSummary() {
  const totalAll = state.fines.reduce((sum, fine) => sum + fine.amount, 0);
  const totalUnpaid = state.fines.filter((fine) => !fine.paid).reduce((sum, fine) => sum + fine.amount, 0);
  totalAllEl.textContent = formatCurrency(totalAll);
  totalUnpaidEl.textContent = formatCurrency(totalUnpaid);

  const personTotals = state.people.map((person) => {
    const personFines = state.fines.filter((fine) => fine.personId === person.id);
    const total = personFines.reduce((sum, fine) => sum + fine.amount, 0);
    const unpaid = personFines.filter((fine) => !fine.paid).reduce((sum, fine) => sum + fine.amount, 0);
    return { name: person.name, total, unpaid };
  }).sort((a, b) => b.total - a.total);

  summaryPersonEl.innerHTML = "";
  if (personTotals.length === 0) {
    summaryPersonEl.innerHTML = '<li class="empty">Ingen data att visa per person.</li>';
  } else {
    personTotals.forEach((item) => {
      const li = document.createElement("li");
      li.className = "summary-item";
      li.innerHTML = `<strong>${item.name}</strong><span class="muted">Totalt: ${formatCurrency(item.total)} · Obetalt: ${formatCurrency(item.unpaid)}</span>`;
      summaryPersonEl.appendChild(li);
    });
  }

  const monthMap = new Map();
  state.fines.forEach((fine) => {
    const monthKey = fine.date.slice(0, 7);
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { total: 0, unpaid: 0 });
    }
    const data = monthMap.get(monthKey);
    data.total += fine.amount;
    if (!fine.paid) {
      data.unpaid += fine.amount;
    }
  });

  const monthTotals = [...monthMap.entries()]
    .map(([month, values]) => ({ month, ...values }))
    .sort((a, b) => b.month.localeCompare(a.month));

  summaryMonthEl.innerHTML = "";
  if (monthTotals.length === 0) {
    summaryMonthEl.innerHTML = '<li class="empty">Ingen data att visa per månad.</li>';
  } else {
    monthTotals.forEach((item) => {
      const li = document.createElement("li");
      li.className = "summary-item";
      li.innerHTML = `<strong>${item.month}</strong><span class="muted">Totalt: ${formatCurrency(item.total)} · Obetalt: ${formatCurrency(item.unpaid)}</span>`;
      summaryMonthEl.appendChild(li);
    });
  }
}

function renderAll() {
  renderPersonSelect();
  renderPeople();
  renderFines();
  renderSummary();
}

if (menuToggleBtn && mobileMenuEl && menuBackdropEl) {
  menuToggleBtn.addEventListener("click", () => {
    const isOpen = !mobileMenuEl.classList.contains("is-open");
    setMobileMenuOpen(isOpen);
  });
  menuBackdropEl.addEventListener("click", closeMobileMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileMenu();
    }
  });
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTab(button.dataset.tabTarget);
    closeMobileMenu();
  });
});

personForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = personNameInput.value.trim();
  if (!name) {
    return;
  }
  state.people.push({
    id: crypto.randomUUID(),
    name
  });
  personNameInput.value = "";
  renderAll();
});

personListEl.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  if (button.dataset.action === "delete-person") {
    const personId = button.dataset.id;
    state.people = state.people.filter((person) => person.id !== personId);
    state.fines = state.fines.filter((fine) => fine.personId !== personId);
    renderAll();
  }
});

fineForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const personId = finePersonSelect.value;
  const description = fineDescriptionInput.value.trim();
  const amount = Number(fineAmountInput.value);
  const date = fineDateInput.value;
  if (!personId || !description || amount <= 0 || !date) {
    return;
  }
  state.fines.push({
    id: crypto.randomUUID(),
    personId,
    description,
    amount,
    date,
    paid: false
  });
  fineDescriptionInput.value = "";
  fineAmountInput.value = "";
  fineDateInput.value = "";
  renderAll();
});

fineListEl.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  const fineId = button.dataset.id;
  if (button.dataset.action === "delete-fine") {
    state.fines = state.fines.filter((fine) => fine.id !== fineId);
  }
  if (button.dataset.action === "toggle-paid") {
    state.fines = state.fines.map((fine) => {
      if (fine.id !== fineId) {
        return fine;
      }
      return { ...fine, paid: !fine.paid };
    });
  }
  renderAll();
});

renderAll();
setActiveTab(activeTab);
