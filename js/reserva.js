(function () {
  if (!requireAuth()) return;

  const user = getUser();
  const userId = user?.id;
  const userRole = user?.role;
  const isAdmin = userRole === "ADMIN";

  const welcome = document.getElementById("welcome");
  if (user?.name) welcome.textContent = `Bem-vindo(a), ${user.name}`;

  document.getElementById("logoutBtn").addEventListener("click", () => {
    clearToken();
    setUser(null);
    location.href = "login.html";
  });

  const slotsDiv = document.getElementById("slots");
  const selectedDateLabel = document.getElementById("selectedDateLabel");
  const availabilityMsg = document.getElementById("availabilityMsg");

  // Modal de confirmação
  const confirmModalEl = document.getElementById("confirmModal");
  const confirmModal = new bootstrap.Modal(confirmModalEl);
  const confirmText = document.getElementById("confirmText");
  const confirmOkBtn = document.getElementById("confirmOkBtn");

  // Menu dropdown para admins
  const adminAssignRow = document.getElementById("adminAssignRow");
  const userSelect = document.getElementById("userSelect");
  let collaborators = [];

  // Estado do modal { kind: 'create' | 'cancel', ... }
  let pendingAction = null; // { kind:'create', date, start } | { kind:'cancel', id, date, start, end }
  let selectedDateStr = null;

  // Helpers
  function hhmm(s) {
    return String(s || "").slice(0, 5);
  }
  function dateToYmd(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(
      date.getDate()
    )}`;
  }
  function add30(hhmmStr) {
    const [h, m] = hhmm(hhmmStr).split(":").map(Number);
    const total = h * 60 + m + 30;
    const HH = String(Math.floor(total / 60)).padStart(2, "0");
    const MM = String(total % 60).padStart(2, "0");
    return `${HH}:${MM}`;
  }

  function markSelectedDay(ymd) {
    document
      .querySelectorAll(".fc-daygrid-day.fc-selected-day")
      .forEach((el) => el.classList.remove("fc-selected-day"));
    const cell = calendarEl.querySelector(`[data-date="${ymd}"]`);
    if (cell) cell.classList.add("fc-selected-day");
  }

  function renderSlots(slots, date) {
    slotsDiv.innerHTML = "";
    availabilityMsg.textContent = "";

    if (!slots.length) {
      availabilityMsg.textContent = "Sem horários disponíveis para este dia.";
      return;
    }

    for (const s of slots) {
      const col = document.createElement("div");
      col.className = "col-12 col-sm-6 col-md-4 col-lg-3";

      const wrap = document.createElement("div");
      wrap.className = "d-grid gap-1";

      const mainBtn = document.createElement("button");
      mainBtn.className =
        "btn w-100 slot-btn " +
        (s.status === "free" ? "btn-outline-success" : "btn-outline-secondary");
      mainBtn.disabled = s.status !== "free";
      mainBtn.textContent = `${s.start}–${s.end}` + (s.by ? ` (${s.by})` : "");

      if (s.status === "free") {
        mainBtn.addEventListener("click", () => {
          pendingAction = { kind: "create", date, start: s.start, end: s.end };
          confirmText.textContent = `Confirmar reserva em ${date} de ${s.start} a ${s.end}?`;

          // Apenas ADMIN: mostrar/select de colaboradores
          if (isAdmin) {
            adminAssignRow.classList.remove("d-none");
          } else {
            adminAssignRow.classList.add("d-none");
          }

          confirmModal.show();
        });
      }

      wrap.appendChild(mainBtn);
      col.appendChild(wrap);
      slotsDiv.appendChild(col);
    }
  }

  async function loadAvailability(dateStr) {
    selectedDateLabel.textContent = `Data selecionada: ${dateStr}`;
    slotsDiv.innerHTML =
      '<div class="text-muted">Carregando disponibilidade...</div>';
    availabilityMsg.textContent = "";

    try {
      const slots = await api(`/reserva/availability?date=${dateStr}`);
      renderSlots(slots, dateStr);
    } catch (ex) {
      slotsDiv.innerHTML = "";
      availabilityMsg.textContent =
        ex.message || "Erro ao carregar disponibilidade.";
    }
  }

  confirmOkBtn.addEventListener("click", async () => {
    if (!pendingAction) return;
    const action = pendingAction;
    pendingAction = null;
    confirmModal.hide();

    try {
      if (action.kind === "create") {
        const payload = { date: action.date, startTime: action.start };

        if (isAdmin) {
          const sel = userSelect.value ? Number(userSelect.value) : NaN;
          if (!Number.isNaN(sel) && sel > 0) {
            payload.userId = sel;
          }
        }

        await api("/reserva/create", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await loadAvailability(action.date);
      }
    } catch (ex) {
      alert(ex.message || "Operação falhou");
    }
  });

  // FullCalendar
  const calendarEl = document.getElementById("calendar");
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    selectable: false,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "",
    },
    dateClick: function (info) {
      const ymd = dateToYmd(info.date);
      selectedDateStr = ymd;
      markSelectedDay(ymd);
      loadAvailability(ymd);
    },
  });
  calendar.render();

  selectedDateStr = dateToYmd(new Date());
  markSelectedDay(selectedDateStr);
  loadAvailability(selectedDateStr);

  // Caso seja Admin -> Carrega colaboradores em dropdown
  (async function LoadCollaborators() {
    if (!isAdmin) return;
    try {
      const users = await api("/user/list");
      collaborators = (users || []).filter((u) => u.role === "COLABORADOR");
      userSelect.innerHTML = "";
      if (!collaborators.length) {
        userSelect.innerHTML = `<option value="">(Nenhum colaborador encontrado)</option>`;
        return;
      }
      const opts = [`<option value="">— selecione —</option>`].concat(
        collaborators.map(
          (u) =>
            `<option value="${u.id}">${
              u.name || u.login || "#" + u.id
            }</option>`
        )
      );
      userSelect.innerHTML = opts.join("");
    } catch (ex) {
      userSelect.innerHTML = `<option value="">(Falha ao carregar colaboradores)</option>`;
    }
  })();
})();
