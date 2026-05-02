const state = {
  people: [],
  fines: [],
  fineTypes: []
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

const fineTypeForm = document.getElementById("fine-type-form");
const fineTypeNameInput = document.getElementById("fine-type-name");
const fineTypeAmountInput = document.getElementById("fine-type-amount");
const fineTypeListEl = document.getElementById("fine-type-list");

const totalUnpaidEl = document.getElementById("total-unpaid");
const totalPaidEl = document.getElementById("total-paid");
const totalCountEl = document.getElementById("total-count");
const summaryPersonEl = document.getElementById("summary-person");
const summaryMonthEl = document.getElementById("summary-month");
const summaryWorstTemplate = document.getElementById("summary-worst-item-template");
const summaryLatestTemplate = document.getElementById("summary-latest-item-template");
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

function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0][0].toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
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

function renderFineTypes() {
  fineTypeListEl.innerHTML = "";
  if (state.fineTypes.length === 0) {
    fineTypeListEl.innerHTML = '<li class="empty">Inga bötestyper ännu. Lägg till den första ovan.</li>';
    return;
  }

  const sorted = [...state.fineTypes].sort((a, b) => a.name.localeCompare(b.name, "sv"));
  sorted.forEach((ft) => {
    const li = document.createElement("li");
    li.className = "fine-item";
    const amountText =
      ft.defaultAmount != null && ft.defaultAmount > 0 ? formatCurrency(ft.defaultAmount) : "Inget standardbelopp";
    li.innerHTML = `
      <div class="fine-header">
        <strong>${ft.name}</strong>
        <button class="btn-danger" data-action="delete-fine-type" data-id="${ft.id}" type="button">Ta bort</button>
      </div>
      <div class="muted">Standardbelopp: ${amountText}</div>
    `;
    fineTypeListEl.appendChild(li);
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
  const totalPaid = state.fines.filter((fine) => fine.paid).reduce((sum, fine) => sum + fine.amount, 0);
  const totalUnpaid = state.fines.filter((fine) => !fine.paid).reduce((sum, fine) => sum + fine.amount, 0);
  totalPaidEl.textContent = formatCurrency(totalPaid);
  totalUnpaidEl.textContent = formatCurrency(totalUnpaid);
  totalCountEl.textContent = String(state.fines.length);

  const personTotals = state.people.map((person) => {
    const personFines = state.fines.filter((fine) => fine.personId === person.id);
    const unpaid = personFines.filter((fine) => !fine.paid).reduce((sum, fine) => sum + fine.amount, 0);
    return { name: person.name, unpaid, finesCount: personFines.length };
  }).filter((item) => item.finesCount > 0).sort((a, b) => b.unpaid - a.unpaid).slice(0, 3);

  summaryPersonEl.innerHTML = "";
  if (personTotals.length === 0) {
    summaryPersonEl.innerHTML = '<li class="empty">Inga böter ännu.</li>';
  } else {
    const medals = ["🥇", "🥈", "🥉"];
    personTotals.forEach((item) => {
      const li = summaryWorstTemplate.content.firstElementChild.cloneNode(true);
      li.querySelector(".summary-medal").textContent = medals[personTotals.indexOf(item)] || "•";
      li.querySelector(".summary-avatar").textContent = initials(item.name);
      li.querySelector(".summary-row-name").textContent = item.name;
      li.querySelector(".summary-row-sub").textContent = `${item.finesCount} böter`;
      li.querySelector(".summary-row-amount").textContent = formatCurrency(item.unpaid);
      summaryPersonEl.appendChild(li);
    });
  }

  const latestFines = [...state.fines].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  summaryMonthEl.innerHTML = "";
  if (latestFines.length === 0) {
    summaryMonthEl.innerHTML = '<li class="empty">Inga böter registrerade.</li>';
  } else {
    latestFines.forEach((item) => {
      const name = personNameById(item.personId);
      const li = summaryLatestTemplate.content.firstElementChild.cloneNode(true);
      li.querySelector(".summary-avatar").textContent = initials(name);
      li.querySelector(".summary-row-name").textContent = name;
      li.querySelector(".summary-row-sub").textContent = item.description;
      li.querySelector(".summary-row-amount").textContent = formatCurrency(item.amount);
      const paidPill = li.querySelector(".summary-paid-pill");
      paidPill.textContent = item.paid ? "✓" : "•";
      paidPill.classList.toggle("is-paid", item.paid);
      summaryMonthEl.appendChild(li);
    });
  }
}

function renderAll() {
  renderPersonSelect();
  renderPeople();
  renderFines();
  renderFineTypes();
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

fineTypeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = fineTypeNameInput.value.trim();
  const amountRaw = fineTypeAmountInput.value.trim();
  if (!name) {
    return;
  }
  let defaultAmount = null;
  if (amountRaw !== "") {
    const n = Number(amountRaw);
    if (Number.isNaN(n) || n < 0) {
      return;
    }
    if (n > 0) {
      defaultAmount = n;
    }
  }
  state.fineTypes.push({
    id: crypto.randomUUID(),
    name,
    defaultAmount
  });
  fineTypeNameInput.value = "";
  fineTypeAmountInput.value = "";
  renderAll();
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

fineTypeListEl.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.dataset.action !== "delete-fine-type") {
    return;
  }
  const typeId = button.dataset.id;
  state.fineTypes = state.fineTypes.filter((t) => t.id !== typeId);
  renderAll();
});

renderAll();
setActiveTab(activeTab);
