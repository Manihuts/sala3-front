(function () {
  if (!requireAuth()) return;

  const user = getUser();
  const userId = user?.id;
  const userRole = user?.role;

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

  // Estado do modal
  let pendingAction = null; // { kind:'create', date, start } | { kind:'cancel', id, date, start, end }

  function hhmm(str) {
    return String(str || "").slice(0, 5);
  }

  function renderSlots(slots, date, reservesForDate) {
    slotsDiv.innerHTML = "";
    availabilityMsg.textContent = "";

    if (!slots.length) {
      availabilityMsg.textContent = "Sem horários disponíveis para este dia.";
      return;
    }

    const idByStart = new Map();
    for (const r of reservesForDate) {
      idByStart.set(hhmm(r.startTime), r.id);
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
      mainBtn.textContent = `${s.start} – ${s.end}` + (s.by ? ` (${s.by})` : "");

      if (s.status === "free") {
        mainBtn.addEventListener("click", () => {
          pendingAction = { kind: "create", date, start: s.start };
          confirmText.textContent = `Confirmar reserva em ${date} de ${s.start} a ${s.end}?`;
          confirmModal.show();
        });
      }

      wrap.appendChild(mainBtn);

      if (s.status === "booked") {
        const slotStart = s.start;
        const reservationId = idByStart.get(slotStart);

        const canCancel =
          (userRole === "ADMIN" && reservationId) ||
          (userRole === "COLABORADOR" && reservationId);

        if (canCancel) {
          const cancelBtn = document.createElement("button");
          cancelBtn.className = "btn btn-outline-danger btn-sm";
          cancelBtn.textContent = "Cancelar";
          cancelBtn.addEventListener("click", () => {
            pendingAction = {
              kind: "cancel",
              id: reservationId,
              date,
              start: s.start,
              end: s.end,
            };
            confirmText.textContent = `Cancelar reserva em ${date} de ${s.start} a ${s.end}?`;
            confirmModal.show();
          });
          wrap.appendChild(cancelBtn);
        }
      }

      col.appendChild(wrap);
      slotsDiv.appendChild(col);
    }
  }

  async function loadAvailabilityAndMyReserves(dateStr) {
    selectedDateLabel.textContent = `Data selecionada: ${dateStr}`;
    slotsDiv.innerHTML =
      '<div class="text-muted">Carregando disponibilidade...</div>';
    availabilityMsg.textContent = "";

    try {
      const [slots, reservesAll] = await Promise.all([
        api(`/reserva/availability?date=${dateStr}`),
        api("/reserva/list"),
      ]);

      const reservesForDate = (reservesAll || []).filter(
        (r) => r.date === dateStr
      );

      renderSlots(slots, dateStr, reservesForDate);
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
        await api("/reserva/create", {
          method: "POST",
          body: JSON.stringify({ date: action.date, startTime: action.start }),
        });
        await loadAvailabilityAndMyReserves(action.date);
      } else if (action.kind === "cancel") {
        await api(`/reserva/${action.id}`, { method: "DELETE" });
        await loadAvailabilityAndMyReserves(action.date);
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
      const ymd = fmtYmd(info.date); // "YYYY-MM-DD"
      loadAvailabilityAndMyReserves(ymd);
    },
  });
  calendar.render();

  loadAvailabilityAndMyReserves(fmtYmd(new Date()));
})();
