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
const fineListEl = document.getElementById("fine-list");

const fineTypeForm = document.getElementById("fine-type-form");
const fineTypeNameInput = document.getElementById("fine-type-name");
const fineTypeAmountInput = document.getElementById("fine-type-amount");
const fineTypeListEl = document.getElementById("fine-type-list");

const totalSumEl = document.getElementById("total-sum");
const totalPlayersEl = document.getElementById("total-players");
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
    createdAt: row.created_at ?? null,
    playerName,
    typeName
  };
}

function sortFinesNewestFirst(list) {
  return [...list].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (tb !== ta) {
      return tb - ta;
    }
    return String(b.id).localeCompare(String(a.id));
  });
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
        created_at,
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
    if (finesRes.error.message?.includes("created_at")) {
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
      state.fines = (retry.data ?? []).map((row) => ({ ...mapFineRow(row), createdAt: null }));
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
    const dateLine = fine.createdAt ? `Registrerad: ${formatDate(fine.createdAt)} · ` : "";
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
  const totalSum = state.fines.reduce((sum, fine) => sum + fine.amount, 0);
  const playerIdsWithFines = new Set(state.fines.map((f) => f.playerId));
  totalSumEl.textContent = formatCurrency(totalSum);
  totalPlayersEl.textContent = String(playerIdsWithFines.size);
  totalCountEl.textContent = String(state.fines.length);

  const personTotals = state.people.map((person) => {
    const personFines = state.fines.filter((fine) => fine.playerId === person.id);
    const total = personFines.reduce((sum, fine) => sum + fine.amount, 0);
    return { name: person.name, total, finesCount: personFines.length };
  }).filter((item) => item.finesCount > 0).sort((a, b) => b.total - a.total).slice(0, 3);

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
      li.querySelector(".summary-row-amount").textContent = formatCurrency(item.total);
      summaryPersonEl.appendChild(li);
    });
  }

  const latestFines = sortFinesNewestFirst(state.fines).slice(0, 8);

  summaryMonthEl.innerHTML = "";
  if (latestFines.length === 0) {
    summaryMonthEl.innerHTML = '<li class="empty">Inga böter registrerade.</li>';
  } else {
    latestFines.forEach((item) => {
      const name = item.playerName || personNameById(item.playerId);
      const li = summaryLatestTemplate.content.firstElementChild.cloneNode(true);
      li.querySelector(".summary-avatar").textContent = initials(name);
      li.querySelector(".summary-row-name").textContent = name;
      li.querySelector(".summary-row-sub").textContent = item.typeName || "";
      li.querySelector(".summary-row-amount").textContent = formatCurrency(item.amount);
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
  if (!button || button.dataset.action !== "delete-person" || !supabase) {
    return;
  }
  const personId = button.dataset.id;
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
  if (!playerId || !fineTypeId || !supabase || Number.isNaN(amount) || amount <= 0) {
    return;
  }
  const { data, error } = await supabase
    .from("fines")
    .insert({
      player_id: playerId,
      fine_type_id: fineTypeId,
      amount
    })
    .select(`
        id,
        amount,
        player_id,
        fine_type_id,
        created_at,
        players ( name ),
        fine_types ( name )
      `)
    .single();

  if (error) {
    if (error.message?.includes("created_at")) {
      const retry = await supabase
        .from("fines")
        .insert({ player_id: playerId, fine_type_id: fineTypeId, amount })
        .select(`
            id,
            amount,
            player_id,
            fine_type_id,
            players ( name ),
            fine_types ( name )
          `)
        .single();
      if (retry.error) {
        showDbError("Kunde inte lägga till böter", retry.error);
        return;
      }
      state.fines.unshift(mapFineRow(retry.data));
    } else {
      showDbError("Kunde inte lägga till böter", error);
      return;
    }
  } else {
    state.fines.unshift(mapFineRow(data));
  }

  fineAmountInput.value = "";
  fineTypeSelect.value = "";
  syncFineAmountFromType();
  renderAll();
});

fineListEl.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || button.dataset.action !== "delete-fine" || !supabase) {
    return;
  }
  const fineId = button.dataset.id;
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
  if (!button || button.dataset.action !== "delete-fine-type" || !supabase) {
    return;
  }
  const typeId = button.dataset.id;
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
    return;
  }
  await loadAllFromSupabase();
  renderAll();
  setActiveTab(activeTab);
}

bootstrap();
