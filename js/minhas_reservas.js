(function () {
  if (!requireAuth()) return;

  const user = getUser();
  const welcome = document.getElementById("welcome");
  const logoutBtn = document.getElementById("logoutBtn");
  const contentArea = document.getElementById("contentArea");
  const statusMsg = document.getElementById("statusMsg");

  // Modal
  const confirmModalEl = document.getElementById("confirmModal");
  const confirmModal = new bootstrap.Modal(confirmModalEl);
  const confirmText = document.getElementById("confirmText");
  const confirmOkBtn = document.getElementById("confirmOkBtn");
  let pendingCancel = null; // { id, date, time, userName }

  if (user?.name) welcome.textContent = `Bem-vindo(a), ${user.name}`;
  logoutBtn?.addEventListener("click", () => {
    clearToken();
    setUser(null);
    location.href = "login.html";
  });

  // Helpers
  function hhmm(s) {
    return String(s || "").slice(0, 5); // "HH:MM[:SS]" -> "HH:MM"
  } 
  function add30(hhmmStr) {
    const [h,m] = hhmm(hhmmStr).split(':').map(Number);
    const total = h*60 + m + 30;
    const HH = String(Math.floor(total/60)).padStart(2,'0');
    const MM = String(total % 60).padStart(2,'0');
    return `${HH}:${MM}`;
  }
  function dateBR(ymd) {
    const [y, m, d] = String(ymd || "").split("-");
    if (!y || !m || !d) return ymd;
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }
  function cmp(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  function sortByDateTime(list) {
    return [...list].sort((r1, r2) => {
      const c = cmp(r1.date, r2.date);
      if (c !== 0) return c;
      return cmp(hhmm(r1.startTime), hhmm(r2.startTime));
    });
  }
  function groupByUser(reservas){
    const map = new Map(); // userId -> { user, items: [] }
    for (const r of reservas){
      const u = r.User || {};
      const key = String(u.id ?? '_unknown');
      if (!map.has(key)){
        map.set(key, { user: u, items: [] });
      }
      map.get(key).items.push(r);
    }
    return map;
  }

  function renderCollaborator(reservas) {
    const items = sortByDateTime(reservas);
    if (items.length === 0) {
      contentArea.innerHTML = `<div class="alert alert-info">Você ainda não possui reservas.</div>`;
      return;
    }

    const list = document.createElement("div");
    list.className = "list-group";

    for (const r of items) {
      const li = document.createElement("div");
      li.className = "list-group-item d-flex justify-content-between align-items-center";

      const start = hhmm(r.startTime);
      const end = add30(start);

      const left = document.createElement("div");
      left.innerHTML = `<strong>${dateBR(r.date)}</strong> &middot; ${start} - ${end}`;

      const right = document.createElement("div");
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "btn btn-outline-danger btn-sm";
      cancelBtn.textContent = "Cancelar";
      cancelBtn.addEventListener("click", () => {
        pendingCancel = {
          id: r.id,
          date: r.date,
          time: start,
          userName: user?.name || "",
        };
        confirmText.textContent = `Cancelar a reserva de ${dateBR(r.date)} às ${start}?`;
        confirmModal.show();
      });

      right.appendChild(cancelBtn);

      li.appendChild(left);
      li.appendChild(right);
      list.appendChild(li);
    }

    contentArea.innerHTML = "";
    contentArea.appendChild(list);
  }

  function renderAdmin(reservas) {
    if (!reservas.length) {
      contentArea.innerHTML = `<div class="alert alert-info">Não há reservas cadastradas.</div>`;
      return;
    }

    const groups = groupByUser(reservas);
    const wrapper = document.createElement("div");
    wrapper.className = "row g-3";

    for (const [, group] of groups) {
      const col = document.createElement("div");
      col.className = "col-12";
      const card = document.createElement("div");
      card.className = "card shadow-sm";

      const header = document.createElement("div");
      header.className = "card-header d-flex justify-content-between align-items-center";
      const userName = group.user?.name || "(N/A)";
      const userLogin = group.user?.login ? ` (${group.user.login})` : "";
      header.innerHTML = `<strong>${userName}</strong>${userLogin}`;

      const body = document.createElement("div");
      body.className = "card-body";

      const items = sortByDateTime(group.items);
      if (!items.length) {
        body.innerHTML = `<div class="text-muted small">Sem reservas no momento.</div>`;
      } else {
        const table = document.createElement("table");
        table.className = "table table-sm align-middle mb-0";
        table.innerHTML = `
          <thead>
            <tr>
              <th style="width: 140px;">Data</th>
              <th style="width: 120px;">Horário</th>
              <th style="width: 120px;"></th>
            </tr>
          </thead>
          <tbody></tbody>
        `;
        const tbody = table.querySelector("tbody");

        for (const r of items) {
          const start = hhmm(r.startTime);
          const end = add30(start);

          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${dateBR(r.date)}</td>
            <td>${start} - ${end}</td>
            <td class="text-end"></td>
          `;
          const tdActions = tr.lastElementChild;

          const cancelBtn = document.createElement("button");
          cancelBtn.className = "btn btn-outline-danger btn-sm";
          cancelBtn.textContent = "Cancelar";
          cancelBtn.addEventListener("click", () => {
            pendingCancel = { id: r.id, date: r.date, time: start, userName };
            confirmText.textContent = `Cancelar a reserva de ${userName} em ${dateBR(r.date)} às ${start}?`;
            confirmModal.show();
          });
          tdActions.appendChild(cancelBtn);

          tbody.appendChild(tr);
        }

        const wrap = document.createElement('div');
        wrap.className = 'table-responsive';
        wrap.appendChild(table);
        body.appendChild(wrap);
      }

      card.appendChild(header);
      card.appendChild(body);
      col.appendChild(card);
      wrapper.appendChild(col);
    }

    contentArea.innerHTML = "";
    contentArea.appendChild(wrapper);
  }

  async function loadList() {
    statusMsg.textContent = "Carregando reservas...";
    contentArea.innerHTML = "";
    
    try {
      const reservas = await api("/reserva/list?upcoming=1"); // admin-> todas (com User); colaborador -> próprias
      statusMsg.textContent = "";
      if (user?.role === "ADMIN") {
        renderAdmin(reservas || []);
      } else {
        renderCollaborator(reservas || []);
      }
    } catch (ex) {
      statusMsg.textContent = ex.message || "[ERROR] :: Erro ao carregar reservas.";
    }
  }

  confirmOkBtn.addEventListener("click", async () => {
    if (!pendingCancel) return;

    const { id } = pendingCancel;
    confirmModal.hide();

    try {
      await api(`/reserva/${id}`, { method: "DELETE" });
      await loadList();
    } catch (ex) {
      alert(ex.message || "[ERROR] :: Falha ao cancelar a reserva.");
    } finally {
      pendingCancel = null;
    }
  });

  loadList();
})();