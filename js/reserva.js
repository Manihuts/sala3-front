(function () {
  if (!requireAuth()) return;

  const user = getUser();
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

  // Modal de confirmação (Bootstrap)
  const confirmModalEl = document.getElementById("confirmModal");
  const confirmModal = new bootstrap.Modal(confirmModalEl);
  const confirmText = document.getElementById("confirmText");
  const confirmOkBtn = document.getElementById("confirmOkBtn");
  let pendingReservation = null; // { date, start }

  function renderSlots(slots, date) {
    slotsDiv.innerHTML = "";
    availabilityMsg.textContent = "";

    if (!slots.length) {
      availabilityMsg.textContent = "Sem horários disponíveis para este dia.";
      return;
    }

    for (const s of slots) {
      const col = document.createElement("div");
      col.className = "col-6 col-md-4 col-lg-3";

      const btn = document.createElement("button");
      btn.className =
        "btn w-100 slot-btn " +
        (s.status === "free" ? "btn-outline-success" : "btn-outline-secondary");
      btn.disabled = s.status !== "free";
      btn.textContent = `${s.start}–${s.end}` + (s.by ? ` (${s.by})` : "");

      if (s.status === "free") {
        btn.addEventListener("click", () => {
          pendingReservation = { date, start: s.start };
          confirmText.textContent = `Confirmar reserva em ${date} de ${s.start} a ${s.end}?`;
          confirmModal.show();
        });
      }

      col.appendChild(btn);
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
    if (!pendingReservation) return;
    const { date, start } = pendingReservation;
    confirmModal.hide();
    try {
      await api("/reserva/create", {
        method: "POST",
        body: JSON.stringify({ date, startTime: start }),
      });
      await loadAvailability(date);
    } catch (ex) {
      alert(ex.message || "Erro ao reservar");
    } finally {
      pendingReservation = null;
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
      const ymd = fmtYmd(info.date); // converte Date -> "YYYY-MM-DD"
      loadAvailability(ymd);
    },
  });
  calendar.render();

  // Carregar disponibilidade do dia atual inicialmente
  loadAvailability(fmtYmd(new Date()));
})();
