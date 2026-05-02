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
const fineTypeSelect = document.getElementById("fine-type");
const fineAmountInput = document.getElementById("fine-amount");
const fineIssuedAtInput = document.getElementById("fine-issued-at");
const fineListEl = document.getElementById("fine-list");

const fineTypeForm = document.getElementById("fine-type-form");
const fineTypeNameInput = document.getElementById("fine-type-name");
const fineTypeAmountInput = document.getElementById("fine-type-amount");
const fineTypeListEl = document.getElementById("fine-type-list");

const totalSumEl = document.getElementById("total-sum");
const totalUnpaidSumEl = document.getElementById("total-unpaid-sum");
const totalCountEl = document.getElementById("total-count");
const summaryPersonEl = document.getElementById("summary-person");
const summaryMonthEl = document.getElementById("summary-month");
const summaryOverviewEl = document.getElementById("summary-overview");
const summaryPlayerDetailEl = document.getElementById("summary-player-detail");
const summaryPlayerBackBtn = document.getElementById("summary-player-back");
const summaryPlayerAvatarEl = document.getElementById("summary-player-avatar");
const summaryPlayerNameEl = document.getElementById("summary-player-name");
const summaryPlayerMetaEl = document.getElementById("summary-player-meta");
const summaryPlayerUnpaidEl = document.getElementById("summary-player-unpaid");
const summaryPlayerTotalEl = document.getElementById("summary-player-total");
const summaryPlayerFinesEl = document.getElementById("summary-player-fines");
const summaryRootEl = document.getElementById("summary-root");
const summaryMonthFilterEl = document.getElementById("summary-month-filter");
const summaryPaidFilterEl = document.getElementById("summary-paid-filter");
const summaryWorstTemplate = document.getElementById("summary-worst-item-template");
const menuToggleBtn = document.getElementById("menu-toggle");
const mobileMenuEl = document.getElementById("mobile-menu");
const menuBackdropEl = document.getElementById("menu-backdrop");
const tabButtons = document.querySelectorAll("[data-tab-target]");
const tabPanels = document.querySelectorAll("[data-tab-panel]");
let activeTab = "fine";
let selectedSummaryPlayerId = null;

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

let summaryFilterMonth = currentMonthKey();
let summaryFilterPaid = "all";

let supabase = null;

function initSupabase() {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return null;
  }
  if (typeof window.supabase === "undefined" || !window.supabase.createClient) {
    return null;
  }
  return window.supabase.createClient(url, key);
}

function showDbError(context, error) {
  const msg = error?.message || String(error);
  console.error(context, error);
  window.alert(`${context}: ${msg}`);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

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
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(Number(amount));
}

function formatDate(iso) {
  if (!iso) {
    return "";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return d.toLocaleDateString("sv-SE");
}

function todayDateInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateInputToIssuedAtIso(dateStr) {
  const trimmed = dateStr.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!m) {
    return null;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  return new Date(y, mo - 1, day, 12, 0, 0).toISOString();
}

function formatMonthLabel(yyyyMm) {
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) {
    return "";
  }
  const [y, m] = yyyyMm.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const monthName = d.toLocaleDateString("sv-SE", { month: "long" });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  return `${capitalizedMonth} ${y}`;
}

function formatMonthOnlyLabel(yyyyMm) {
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) {
    return "";
  }
  const [y, m] = yyyyMm.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const monthName = d.toLocaleDateString("sv-SE", { month: "long" });
  return monthName.charAt(0).toUpperCase() + monthName.slice(1);
}

function fineMonthKey(fine) {
  if (!fine.issuedAt) {
    return null;
  }
  const d = new Date(fine.issuedAt);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function filterFinesByMonth(fines, monthKey) {
  if (monthKey === "all") {
    return fines;
  }
  return fines.filter((fine) => fineMonthKey(fine) === monthKey);
}

function filterFinesByPayment(fines, paymentFilter) {
  if (paymentFilter === "paid") {
    return fines.filter((fine) => fine.paid);
  }
  if (paymentFilter === "unpaid") {
    return fines.filter((fine) => !fine.paid);
  }
  return fines;
}

function summaryPeriodText(monthKey) {
  if (monthKey === "all") {
    return "alla månader";
  }
  const label = formatMonthLabel(monthKey);
  return label ? `i ${label}` : "denna månad";
}

function compareMonthKeys(a, b) {
  return a.localeCompare(b);
}

function monthsForYearSpan(startYear, endYear) {
  const out = [];
  for (let year = startYear; year <= endYear; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      out.push(`${year}-${String(month).padStart(2, "0")}`);
    }
  }
  return out;
}

function updateSummaryMonthFilterOptions() {
  if (!summaryMonthFilterEl) {
    return;
  }

  const datedKeys = state.fines.map(fineMonthKey).filter(Boolean).sort(compareMonthKeys);
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const capMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  const minYear = datedKeys.length > 0 ? Number(datedKeys[0].slice(0, 4)) : currentYear;
  const maxYear = datedKeys.length > 0 ? Number(datedKeys[datedKeys.length - 1].slice(0, 4)) : currentYear;
  const months = monthsForYearSpan(minYear, maxYear).sort(compareMonthKeys);
  const hasMultipleYears = minYear !== maxYear;

  if (summaryFilterMonth !== "all" && !months.includes(summaryFilterMonth)) {
    const preferred = months.includes(capMonth) ? capMonth : months[0];
    summaryFilterMonth = preferred;
  }

  summaryMonthFilterEl.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "Alla månader";
  summaryMonthFilterEl.appendChild(allOption);
  months.forEach((monthKey) => {
    const option = document.createElement("option");
    option.value = monthKey;
    option.textContent = hasMultipleYears ? (formatMonthLabel(monthKey) || monthKey) : (formatMonthOnlyLabel(monthKey) || monthKey);
    summaryMonthFilterEl.appendChild(option);
  });
}

function personNameById(personId) {
  const person = state.people.find((p) => p.id === personId);
  return person ? person.name : "Okänd spelare";
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

function mapFineRow(row) {
  const playerName = row.players?.name ?? personNameById(row.player_id);
  const typeName = row.fine_types?.name ?? "";
  return {
    id: row.id,
    playerId: row.player_id,
    fineTypeId: row.fine_type_id,
    amount: Number(row.amount),
    issuedAt: row.issued_at ?? null,
    paid: row.paid === true,
    playerName,
    typeName
  };
}

async function persistFinePaid(fineId, paid) {
  if (!supabase) {
    return;
  }
  const { data, error } = await supabase
    .from("fines")
    .update({ paid })
    .eq("id", fineId)
    .select(`
        id,
        amount,
        player_id,
        fine_type_id,
        issued_at,
        paid,
        players ( name ),
        fine_types ( name )
      `)
    .single();
  if (error) {
    showDbError("Kunde inte uppdatera betalstatus", error);
    return;
  }
  state.fines = state.fines.map((fine) => (fine.id === fineId ? mapFineRow(data) : fine));
  renderAll();
}

function sortFinesNewestFirst(list) {
  return [...list].sort((a, b) => {
    const ta = a.issuedAt ? new Date(a.issuedAt).getTime() : 0;
    const tb = b.issuedAt ? new Date(b.issuedAt).getTime() : 0;
    if (tb !== ta) {
      return tb - ta;
    }
    return String(b.id).localeCompare(String(a.id));
  });
}

function setSummaryDetailPlayer(playerId) {
  selectedSummaryPlayerId = playerId;
  const hasDetail = Boolean(playerId);
  summaryOverviewEl.classList.toggle("hidden", hasDetail);
  summaryPlayerDetailEl.classList.toggle("hidden", !hasDetail);
}

async function loadAllFromSupabase() {
  if (!supabase) {
    return;
  }

  const [playersRes, typesRes, finesRes] = await Promise.all([
    supabase.from("players").select("id,name").order("name", { ascending: true }),
    supabase.from("fine_types").select("id,name,amount").order("name", { ascending: true }),
    supabase.from("fines").select(`
        id,
        amount,
        player_id,
        fine_type_id,
        issued_at,
        paid,
        players ( name ),
        fine_types ( name )
      `)
  ]);

  if (playersRes.error) {
    showDbError("Kunde inte läsa spelare", playersRes.error);
    return;
  }
  if (typesRes.error) {
    showDbError("Kunde inte läsa bötestyper", typesRes.error);
    return;
  }
  if (finesRes.error) {
    const msg = finesRes.error.message ?? "";
    if (/issued_at|paid/i.test(msg)) {
      const retry = await supabase.from("fines").select(`
          id,
          amount,
          player_id,
          fine_type_id,
          players ( name ),
          fine_types ( name )
        `);
      if (retry.error) {
        showDbError("Kunde inte läsa böter", retry.error);
        return;
      }
      state.people = (playersRes.data ?? []).map((r) => ({ id: r.id, name: r.name }));
      state.fineTypes = (typesRes.data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        defaultAmount: Number(r.amount)
      }));
      state.fines = (retry.data ?? []).map((row) => mapFineRow(row));
      return;
    }
    showDbError("Kunde inte läsa böter", finesRes.error);
    return;
  }

  state.people = (playersRes.data ?? []).map((r) => ({ id: r.id, name: r.name }));
  state.fineTypes = (typesRes.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    defaultAmount: Number(r.amount)
  }));
  state.fines = (finesRes.data ?? []).map((row) => mapFineRow(row));
}

function renderFineTypeSelectForFineForm() {
  const previousType = fineTypeSelect.value;
  fineTypeSelect.innerHTML = '<option value="">Välj bötestyp</option>';
  state.fineTypes.forEach((ft) => {
    const option = document.createElement("option");
    option.value = ft.id;
    option.textContent = ft.name;
    fineTypeSelect.appendChild(option);
  });
  fineTypeSelect.value = state.fineTypes.some((t) => t.id === previousType) ? previousType : "";
  syncFineAmountFromType();
}

function syncFineAmountFromType() {
  const id = fineTypeSelect.value;
  const ft = state.fineTypes.find((t) => t.id === id);
  if (ft && ft.defaultAmount != null) {
    fineAmountInput.value = String(ft.defaultAmount);
  }
}

function renderPersonSelect() {
  const previousValue = finePersonSelect.value;
  finePersonSelect.innerHTML = '<option value="">Välj spelare</option>';
  state.people.forEach((person) => {
    const option = document.createElement("option");
    option.value = person.id;
    option.textContent = person.name;
    finePersonSelect.appendChild(option);
  });
  finePersonSelect.value = state.people.some((p) => p.id === previousValue) ? previousValue : "";
  renderFineTypeSelectForFineForm();
}

function renderPeople() {
  personListEl.innerHTML = "";
  if (state.people.length === 0) {
    personListEl.innerHTML = '<li class="empty">Inga spelare ännu.</li>';
    return;
  }

  state.people.forEach((person) => {
    const personTotal = state.fines
      .filter((fine) => fine.playerId === person.id)
      .reduce((sum, fine) => sum + fine.amount, 0);

    const li = document.createElement("li");
    li.className = "person-item";
    li.innerHTML = `
      <div class="person-header">
        <strong>${escapeHtml(person.name)}</strong>
        <button class="btn-danger" data-action="delete-person" data-id="${person.id}" type="button">Radera spelare</button>
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
    const amountText = formatCurrency(ft.defaultAmount);
    li.innerHTML = `
      <div class="fine-header">
        <strong>${escapeHtml(ft.name)}</strong>
        <button class="btn-danger" data-action="delete-fine-type" data-id="${ft.id}" type="button">Ta bort</button>
      </div>
      <div class="muted">Belopp: ${amountText}</div>
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

  const sortedFines = sortFinesNewestFirst(state.fines);
  sortedFines.forEach((fine) => {
    const li = document.createElement("li");
    li.className = "fine-item";
    const name = escapeHtml(fine.playerName || personNameById(fine.playerId));
    const typeName = escapeHtml(fine.typeName || "");
    const dateLine = fine.issuedAt ? `Datum: ${formatDate(fine.issuedAt)} · ` : "";
    li.innerHTML = `
      <div class="fine-header">
        <strong>${name}</strong>
        <span class="tag tag-unpaid">${typeName || "Bötestyp"}</span>
      </div>
      <div class="muted">${dateLine}Belopp: ${formatCurrency(fine.amount)}</div>
      <div class="toolbar">
        <button class="btn-danger" data-action="delete-fine" data-id="${fine.id}" type="button">Radera böter</button>
      </div>
    `;
    fineListEl.appendChild(li);
  });
}

function renderSummary() {
  updateSummaryMonthFilterOptions();
  if (summaryMonthFilterEl && summaryMonthFilterEl.options.length > 0) {
    summaryMonthFilterEl.value = summaryFilterMonth;
  }
  if (summaryPaidFilterEl) {
    summaryPaidFilterEl.value = summaryFilterPaid;
  }

  const periodText = summaryPeriodText(summaryFilterMonth);
  const finesForMonth = filterFinesByMonth(state.fines, summaryFilterMonth);
  const visibleFines = filterFinesByPayment(finesForMonth, summaryFilterPaid);

  const totalSum = visibleFines.reduce((sum, fine) => sum + fine.amount, 0);
  const totalUnpaidSum = visibleFines.filter((fine) => !fine.paid).reduce((sum, fine) => sum + fine.amount, 0);
  totalSumEl.textContent = formatCurrency(totalSum);
  totalUnpaidSumEl.textContent = formatCurrency(totalUnpaidSum);
  totalCountEl.textContent = String(visibleFines.length);

  const personTotals = state.people.map((person) => {
    const personFines = visibleFines.filter((fine) => fine.playerId === person.id);
    const visibleSum = personFines.reduce((sum, fine) => sum + fine.amount, 0);
    const unpaidSum = personFines.filter((fine) => !fine.paid).reduce((sum, fine) => sum + fine.amount, 0);
    return { id: person.id, name: person.name, visibleSum, unpaidSum, finesCount: personFines.length };
  }).filter((item) => item.finesCount > 0).sort((a, b) => b.visibleSum - a.visibleSum).slice(0, 3);

  summaryPersonEl.innerHTML = "";
  if (personTotals.length === 0) {
    summaryPersonEl.innerHTML = `<li class="empty">Inga böter ${periodText}.</li>`;
  } else {
    const medals = ["🥇", "🥈", "🥉"];
    personTotals.forEach((item) => {
      const li = summaryWorstTemplate.content.firstElementChild.cloneNode(true);
      li.querySelector(".summary-medal").textContent = medals[personTotals.indexOf(item)] || "•";
      li.querySelector(".summary-avatar").textContent = initials(item.name);
      li.querySelector(".summary-row-name").textContent = item.name;
      li.querySelector(".summary-row-sub").textContent = `${item.finesCount} böter`;
      li.querySelector(".summary-row-amount").textContent = formatCurrency(item.visibleSum);
      li.dataset.playerId = item.id;
      li.classList.add("summary-row-clickable");
      summaryPersonEl.appendChild(li);
    });
  }

  const finesToShow = sortFinesNewestFirst(visibleFines);

  summaryMonthEl.innerHTML = "";
  if (finesToShow.length === 0) {
    summaryMonthEl.innerHTML = `<li class="empty">Inga böter registrerade ${periodText}.</li>`;
  } else {
    finesToShow.forEach((item) => {
      const name = item.playerName || personNameById(item.playerId);
      const subLine = [item.typeName || "", item.paid ? "Betald" : "Obetald"].filter(Boolean).join(" · ");
      const li = document.createElement("li");
      li.className = "summary-row";
      li.innerHTML = `
        <div class="summary-row-left">
          <span class="summary-avatar">${escapeHtml(initials(name))}</span>
          <div>
            <div class="summary-row-name">${escapeHtml(name)}</div>
            <div class="summary-row-sub">${escapeHtml(subLine)}</div>
          </div>
        </div>
        <div class="summary-row-right summary-row-right-inline">
          <div class="summary-row-amount ${item.paid ? "is-paid" : ""}">${formatCurrency(item.amount)}</div>
          <button type="button" class="summary-pay-btn ${item.paid ? "" : "btn-success"}" data-action="summary-toggle-paid" data-id="${item.id}">${item.paid ? "Ångra" : "Markera betald"}</button>
        </div>
      `;
      summaryMonthEl.appendChild(li);
    });
  }

  if (selectedSummaryPlayerId) {
    const person = state.people.find((p) => p.id === selectedSummaryPlayerId);
    if (!person) {
      setSummaryDetailPlayer(null);
      return;
    }
    const playerFines = sortFinesNewestFirst(
      filterFinesByPayment(
        filterFinesByMonth(state.fines.filter((fine) => fine.playerId === person.id), summaryFilterMonth),
        summaryFilterPaid
      )
    );
    const total = playerFines.reduce((sum, fine) => sum + fine.amount, 0);
    const unpaid = playerFines.filter((fine) => !fine.paid).reduce((sum, fine) => sum + fine.amount, 0);

    summaryPlayerAvatarEl.textContent = initials(person.name);
    summaryPlayerNameEl.textContent = person.name;
    summaryPlayerMetaEl.textContent = `${playerFines.length} böter ${periodText}`;
    summaryPlayerTotalEl.textContent = formatCurrency(total);
    summaryPlayerUnpaidEl.textContent = formatCurrency(unpaid);

    summaryPlayerFinesEl.innerHTML = "";
    if (playerFines.length === 0) {
      summaryPlayerFinesEl.innerHTML = `<li class="empty">Inga böter ${periodText}.</li>`;
    } else {
      playerFines.forEach((fine) => {
        const li = document.createElement("li");
        li.className = "summary-row";
        const dateLine = `${formatDate(fine.issuedAt) || "Saknar datum"} · ${fine.paid ? "Betald" : "Obetald"}`;
        li.innerHTML = `
          <div class="summary-row-left">
            <div>
              <div class="summary-row-name">${escapeHtml(fine.typeName || "Böter")}</div>
              <div class="summary-row-sub">${escapeHtml(dateLine)}</div>
            </div>
          </div>
          <div class="summary-row-right summary-row-right-inline">
            <div class="summary-row-amount ${fine.paid ? "is-paid" : ""}">${formatCurrency(fine.amount)}</div>
            <button type="button" class="summary-pay-btn ${fine.paid ? "" : "btn-success"}" data-action="summary-toggle-paid" data-id="${fine.id}">${fine.paid ? "Ångra" : "Markera betald"}</button>
          </div>
        `;
        summaryPlayerFinesEl.appendChild(li);
      });
    }
    setSummaryDetailPlayer(person.id);
  } else {
    setSummaryDetailPlayer(null);
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
    if (button.dataset.tabTarget !== "summary") {
      setSummaryDetailPlayer(null);
    }
    closeMobileMenu();
  });
});

summaryPersonEl.addEventListener("click", (event) => {
  const row = event.target.closest("[data-player-id]");
  if (!row) {
    return;
  }
  setSummaryDetailPlayer(row.dataset.playerId);
  renderSummary();
});

summaryPlayerBackBtn.addEventListener("click", () => {
  setSummaryDetailPlayer(null);
  renderSummary();
});

if (summaryMonthFilterEl) {
  summaryMonthFilterEl.addEventListener("change", () => {
    if (summaryMonthFilterEl.options.length === 0) {
      return;
    }
    summaryFilterMonth = summaryMonthFilterEl.value;
    renderSummary();
  });
}

if (summaryPaidFilterEl) {
  summaryPaidFilterEl.addEventListener("change", () => {
    summaryFilterPaid = summaryPaidFilterEl.value || "all";
    renderSummary();
  });
}

if (summaryRootEl) {
  summaryRootEl.addEventListener("click", async (event) => {
    const btn = event.target.closest('button[data-action="summary-toggle-paid"]');
    if (!btn || !supabase) {
      return;
    }
    const fineId = btn.dataset.id;
    if (!fineId) {
      return;
    }
    const fine = state.fines.find((f) => String(f.id) === String(fineId));
    if (!fine) {
      return;
    }
    await persistFinePaid(fineId, !fine.paid);
  });
}

fineTypeSelect.addEventListener("change", syncFineAmountFromType);

personForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = personNameInput.value.trim();
  if (!name || !supabase) {
    return;
  }
  const { data, error } = await supabase.from("players").insert({ name }).select("id,name").single();
  if (error) {
    showDbError("Kunde inte lägga till spelare", error);
    return;
  }
  state.people.push({ id: data.id, name: data.name });
  personNameInput.value = "";
  state.people.sort((a, b) => a.name.localeCompare(b.name, "sv"));
  renderAll();
});

personListEl.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || button.dataset.action !== "delete-person") {
    return;
  }
  const personId = button.dataset.id;
  const player = state.people.find((p) => p.id === personId);
  const label = player ? `"${player.name}"` : "den här spelaren";
  if (
    !window.confirm(
      `Vill du verkligen radera ${label}? Alla böter som hör till spelaren tas också bort.\n\nTryck OK för att radera eller Avbryt för att behålla.`
    )
  ) {
    return;
  }
  if (!supabase) {
    return;
  }
  const { error } = await supabase.from("players").delete().eq("id", personId);
  if (error) {
    showDbError("Kunde inte radera spelare", error);
    return;
  }
  state.people = state.people.filter((person) => person.id !== personId);
  state.fines = state.fines.filter((fine) => fine.playerId !== personId);
  renderAll();
});

fineTypeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = fineTypeNameInput.value.trim();
  const amount = Number(fineTypeAmountInput.value);
  if (!name || !supabase || Number.isNaN(amount) || amount <= 0) {
    return;
  }
  const { data, error } = await supabase.from("fine_types").insert({ name, amount }).select("id,name,amount").single();
  if (error) {
    showDbError("Kunde inte lägga till bötestyp", error);
    return;
  }
  state.fineTypes.push({
    id: data.id,
    name: data.name,
    defaultAmount: Number(data.amount)
  });
  state.fineTypes.sort((a, b) => a.name.localeCompare(b.name, "sv"));
  fineTypeNameInput.value = "";
  fineTypeAmountInput.value = "";
  renderAll();
});

fineForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const playerId = finePersonSelect.value;
  const fineTypeId = fineTypeSelect.value;
  const amount = Number(fineAmountInput.value);
  const issuedRaw = fineIssuedAtInput ? fineIssuedAtInput.value.trim() : "";
  const issued_at = issuedRaw ? dateInputToIssuedAtIso(issuedRaw) : null;
  if (!playerId || !fineTypeId || !supabase || Number.isNaN(amount) || amount <= 0 || !issued_at) {
    return;
  }
  const { data, error } = await supabase
    .from("fines")
    .insert({
      player_id: playerId,
      fine_type_id: fineTypeId,
      amount,
      issued_at,
      paid: false
    })
    .select(`
        id,
        amount,
        player_id,
        fine_type_id,
        issued_at,
        paid,
        players ( name ),
        fine_types ( name )
      `)
    .single();

  if (error) {
    showDbError("Kunde inte lägga till böter", error);
    return;
  }

  state.fines.unshift(mapFineRow(data));

  fineAmountInput.value = "";
  fineTypeSelect.value = "";
  syncFineAmountFromType();
  if (fineIssuedAtInput) {
    fineIssuedAtInput.value = todayDateInputValue();
  }
  renderAll();
});

fineListEl.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || button.dataset.action !== "delete-fine") {
    return;
  }
  const fineId = button.dataset.id;
  const fineRow = state.fines.find((f) => f.id === fineId);
  const detail =
    fineRow != null
      ? `${fineRow.playerName || personNameById(fineRow.playerId)} · ${formatCurrency(fineRow.amount)}`
      : "denna bötesrad";
  if (
    !window.confirm(
      `Vill du verkligen radera ${detail}?\n\nTryck OK för att radera eller Avbryt för att behålla.`
    )
  ) {
    return;
  }
  if (!supabase) {
    return;
  }
  const { error } = await supabase.from("fines").delete().eq("id", fineId);
  if (error) {
    showDbError("Kunde inte radera böter", error);
    return;
  }
  state.fines = state.fines.filter((fine) => fine.id !== fineId);
  renderAll();
});

fineTypeListEl.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || button.dataset.action !== "delete-fine-type") {
    return;
  }
  const typeId = button.dataset.id;
  const ft = state.fineTypes.find((t) => t.id === typeId);
  const label = ft ? `"${ft.name}"` : "den här bötestypen";
  if (
    !window.confirm(
      `Vill du verkligen ta bort bötestypen ${label}? Det går bara om inga böter är kopplade till typen.\n\nTryck OK för att ta bort eller Avbryt för att behålla.`
    )
  ) {
    return;
  }
  if (!supabase) {
    return;
  }
  const { error } = await supabase.from("fine_types").delete().eq("id", typeId);
  if (error) {
    showDbError("Kunde inte ta bort bötestyp (finns kopplade böter?)", error);
    return;
  }
  state.fineTypes = state.fineTypes.filter((t) => t.id !== typeId);
  renderAll();
});

async function bootstrap() {
  supabase = initSupabase();
  if (!supabase) {
    window.alert(
      "Saknar Supabase: lägg till config.js (kopiera från config.example.js) med SUPABASE_URL och SUPABASE_ANON_KEY, och ladda sidan igen."
    );
    renderAll();
    setActiveTab(activeTab);
    if (fineIssuedAtInput && !fineIssuedAtInput.value) {
      fineIssuedAtInput.value = todayDateInputValue();
    }
    return;
  }
  await loadAllFromSupabase();
  renderAll();
  setActiveTab(activeTab);
  if (fineIssuedAtInput && !fineIssuedAtInput.value) {
    fineIssuedAtInput.value = todayDateInputValue();
  }
}

bootstrap();
