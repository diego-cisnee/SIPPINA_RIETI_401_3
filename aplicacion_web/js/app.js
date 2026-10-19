(async () => {
  if (window.RIETI_AUTH_READY && !await window.RIETI_AUTH_READY) return;
  if (window.RIETI_READY) await window.RIETI_READY;
/*
  INTERACCIONES DEL DASHBOARD
  Los reportes se cargan mediante RIETI_READY. Los cambios de estado se guardan
  en la API con la identidad de sesión y la versión consultada del reporte.
*/

const passwordInput = document.querySelector("#password");
const passwordToggle = document.querySelector('[data-action="toggle-password"]');

if (passwordInput && passwordToggle) {
  const showPasswordIcon = passwordToggle.querySelector('[data-icon="show-password"]');
  const hidePasswordIcon = passwordToggle.querySelector('[data-icon="hide-password"]');

  passwordToggle.addEventListener("click", () => {
    const willShowPassword = passwordInput.type === "password";

    // Cambia la visualización sin modificar el contenido escrito por el usuario.
    passwordInput.type = willShowPassword ? "text" : "password";

    // Mantiene el control comprensible para teclado y lectores de pantalla.
    passwordToggle.setAttribute("aria-pressed", String(willShowPassword));
    passwordToggle.setAttribute(
      "aria-label",
      willShowPassword ? "Ocultar contraseña" : "Mostrar contraseña",
    );

    if (showPasswordIcon && hidePasswordIcon) {
      showPasswordIcon.hidden = willShowPassword;
      hidePasswordIcon.hidden = !willShowPassword;
    }
  });
}

/* ================================================================
   GESTIÓN DE REPORTES
   ================================================================ */
const reportRows = Array.from(document.querySelectorAll("[data-report-row]"));
// Navega al folio conservando el origen; se transmite id_reporte.
const openReport = (row) => {
  const reportId = row.dataset.reportId;
  const from = document.body.classList.contains("statistics-page") ? "estadisticas"
    : document.body.classList.contains("reports-management-page") ? "reportes" : "dashboard";
  window.location.href = `reporte.html?id=${encodeURIComponent(reportId)}&from=${from}`;
};

reportRows.forEach((row) => {
  row.addEventListener("click", (event) => {
    // Permite abrir el menú de tres puntos sin activar también el renglón.
    if (event.target instanceof Element && event.target.closest("a, button, details, summary, input, select")) {
      return;
    }

    openReport(row);
  });

  row.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    if (event.target !== row) {
      return;
    }

    event.preventDefault();
    openReport(row);
  });
});

// Mantiene abierto un solo menú de acciones por vez.
const reportMenus = Array.from(document.querySelectorAll(".row-menu"));

reportMenus.forEach((menu) => {
  menu.addEventListener("toggle", () => {
    if (!menu.open) {
      return;
    }

    reportMenus.forEach((otherMenu) => {
      if (otherMenu !== menu) {
        otherMenu.open = false;
      }
    });
    // La tabla de estadísticas se desplaza: coloca el menú fuera de su recorte.
    if (document.body.classList.contains("statistics-page")) {
      const popup = menu.querySelector(".row-menu__content");
      const anchor = menu.querySelector("summary").getBoundingClientRect();
      const height = popup.offsetHeight;
      popup.style.left = Math.max(12, Math.min(anchor.right - popup.offsetWidth, window.innerWidth - popup.offsetWidth - 12)) + "px";
      popup.style.top = Math.max(12, anchor.bottom + height + 12 > window.innerHeight ? anchor.top - height - 8 : anchor.bottom + 8) + "px";
    }
  });
});

// Cierra el menú si su fila se desplaza para no dejarlo flotando en otra posición.
document.querySelector(".statistics-scroll")?.addEventListener("scroll", () => {
  reportMenus.forEach((menu) => { menu.open = false; });
});

// Cierra cualquier menú abierto al hacer clic fuera de él.
document.addEventListener("click", (event) => {
  reportMenus.forEach((menu) => {
    if (menu.open && event.target instanceof Node && !menu.contains(event.target)) {
      menu.open = false;
    }
  });
});

// Escape ofrece una segunda forma accesible de cerrar el menú y devuelve el foco.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  reportMenus.forEach((menu) => {
    if (menu.open) {
      menu.open = false;
      menu.querySelector("summary")?.focus();
    }
  });
});

/*
  FILTROS LOCALES SOBRE LOS REPORTES CONSULTADOS A LA API.
*/
const filtersForm = document.querySelector("#report-filters");

/* Cambios persistentes; la autoridad se obtiene del procurador municipal. */
const statusDialog = document.querySelector('#status-dialog');
const confirmationDialog = document.querySelector('#update-confirmation');
if (statusDialog && confirmationDialog) {
  const form = statusDialog.querySelector('form');
  const submit = form.querySelector('[type="submit"]');
  const errorMessage = document.createElement('p');
  errorMessage.setAttribute('role', 'alert');
  form.querySelector('.dialog-actions').before(errorMessage);
  const reload = document.createElement('button');
  reload.type = 'button'; reload.textContent = 'Recargar reporte'; reload.hidden = true;
  reload.addEventListener('click', () => location.reload());
  form.querySelector('.dialog-actions').prepend(reload);
  let selected = null, returnFocusTo = null, saving = false, saved = false;
  document.querySelectorAll('[data-report-action="status"]').forEach(button => {
    button.addEventListener('click', () => {
      const row = button.closest('[data-report-row], [data-report-context]');
      const report = row && window.RIETI_REPORTS[row.dataset.reportId];
      if (!report || saving) return;
      selected = { ...report };
      returnFocusTo = row.querySelector('summary') || button;
      reportMenus.forEach(menu => { menu.open = false; });
      form.reset(); errorMessage.textContent = ''; reload.hidden = true;
      statusDialog.querySelector('[data-dialog-report-id]').textContent = selected.folio;
      const currentStatus = statusDialog.querySelector('[data-current-status]');
      currentStatus.textContent = window.RIETI_STATUS_LABEL(selected.status);
      currentStatus.className = 'status' + (window.RIETI_STATUS_CLASSES[selected.status] ? ' status--' + window.RIETI_STATUS_CLASSES[selected.status] : '');
      const currentPriority = statusDialog.querySelector('[data-current-priority]');
      currentPriority.textContent = selected.priority; currentPriority.dataset.priority = selected.priority;
      form.elements.status.value = selected.status;
      const priority = form.elements.priority;
      if (![...priority.options].some(option => option.value === selected.priority)) priority.add(new Option(selected.priority, selected.priority));
      priority.value = selected.priority;
      priority.disabled = window.RIETI_USER?.role === 'procurador';
      statusDialog.showModal();
    });
  });
  statusDialog.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => { if (!saving) statusDialog.close(); }));
  statusDialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
  statusDialog.addEventListener('close', () => { if (!saved) returnFocusTo?.focus(); });
  confirmationDialog.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => confirmationDialog.close()));
  confirmationDialog.addEventListener('close', () => { if (saved) location.reload(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving || !selected || !form.reportValidity()) return;
    const body = { version: selected.version, status: form.elements.status.value, comments: form.elements.comments.value.trim() };
    if (window.RIETI_USER?.role === 'administrador') body.priority = form.elements.priority.value;
    saving = true; submit.disabled = true; submit.textContent = 'Guardando…';
    statusDialog.querySelectorAll('[data-close-dialog]').forEach(button => { button.disabled = true; });
    errorMessage.textContent = ''; reload.hidden = true;
    try {
      const response = await window.RIETI_API.request(`/api/reportes/${encodeURIComponent(selected.id)}/estado`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        reload.hidden = response.status !== 409;
        throw new Error(payload.error || 'No fue posible actualizar el reporte.');
      }
      saved = true;
      const summary = confirmationDialog.querySelector('[data-confirmation-summary]');
      summary.replaceChildren();
      const fields = [['Folio', selected.folio], ['Nuevo estado', window.RIETI_STATUS_LABEL(body.status)], ['Comentarios', body.comments || 'Sin comentarios']];
      if (Object.hasOwn(body, 'priority')) fields.splice(2, 0, ['Nueva prioridad', body.priority]);
      fields.forEach(([label, value]) => {
        const term = document.createElement('dt'), detail = document.createElement('dd');
        term.textContent = label; detail.textContent = value; summary.append(term, detail);
      });
      statusDialog.close(); confirmationDialog.showModal();
    } catch (error) {
      errorMessage.textContent = error instanceof TypeError || ['TimeoutError', 'SyntaxError'].includes(error.name)
        ? 'No se pudo confirmar el guardado. Recarga el reporte para comprobar su estado antes de volver a enviar.' : error.message;
    } finally {
      saving = false; submit.disabled = false; submit.textContent = 'Actualizar estado';
      statusDialog.querySelectorAll('[data-close-dialog]').forEach(button => { button.disabled = false; });
    }
  });
}

if (filtersForm) {
  const municipalityFilter = filtersForm.querySelector('[data-filter="municipality"]');
  const statusFilter = filtersForm.querySelector('[data-filter="status"]');
  const priorityFilter = filtersForm.querySelector('[data-filter="priority"]');
  const workTypeFilter = filtersForm.querySelector('[data-filter="work-type"]');
  const startDateFilter = filtersForm.querySelector('[data-filter="start-date"]');
  const endDateFilter = filtersForm.querySelector('[data-filter="end-date"]');
  const emptyRow = document.querySelector("[data-empty-row]");
  const filterFeedback = document.querySelector("#filter-feedback");
  const pagination = document.querySelector('#report-pagination');
  const pageSize = 10;
  let currentPage = 1;
  let filteredRows = reportRows;

  const renderResults = () => {
    const total = filteredRows.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    currentPage = Math.min(currentPage, pageCount);
    const start = pagination ? (currentPage - 1) * pageSize : 0;
    const end = pagination ? Math.min(start + pageSize, total) : total;
    const pageRows = new Set(filteredRows.slice(start, end));
    reportRows.forEach(row => { row.hidden = !pageRows.has(row); });
    reportMenus.forEach(menu => { menu.open = false; });
    if (emptyRow) emptyRow.hidden = total !== 0;
    if (filterFeedback) filterFeedback.textContent = pagination && total
      ? `Mostrando ${start + 1}–${end} de ${total} ${total === 1 ? 'reporte' : 'reportes'}`
      : `Mostrando ${total} ${total === 1 ? 'reporte' : 'reportes'}`;
    if (!pagination) return;
    pagination.hidden = pageCount < 2;
    pagination.replaceChildren();
    if (!total) return;

    const addButton = (text, page, label, disabled = false) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      button.dataset.pageNumber = String(page);
      button.setAttribute('aria-label', label);
      button.disabled = disabled;
      pagination.append(button);
      return button;
    };
    addButton('‹ Previo', currentPage - 1, 'Página anterior', currentPage === 1);
    const pages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, pageCount])]
      .filter(page => page >= 1 && page <= pageCount).sort((a, b) => a - b);
    pages.forEach((page, index) => {
      if (index && page > pages[index - 1] + 1) {
        const gap = document.createElement('span');
        gap.textContent = '…';
        gap.setAttribute('aria-hidden', 'true');
        pagination.append(gap);
      }
      const button = addButton(String(page), page, `Ir a la página ${page}`, pageCount < 2);
      if (page === currentPage) {
        button.className = 'is-current';
        button.setAttribute('aria-current', 'page');
      }
    });
    addButton('Siguiente ›', currentPage + 1, 'Página siguiente', currentPage === pageCount);
  };

  pagination?.addEventListener('click', event => {
    const button = event.target.closest('button[data-page-number]');
    if (!button || button.disabled) return;
    const nextPage = Number(button.dataset.pageNumber);
    if (!Number.isInteger(nextPage) || nextPage < 1 || nextPage > Math.ceil(filteredRows.length / pageSize) || nextPage === currentPage) return;
    currentPage = nextPage;
    renderResults();
    pagination.querySelector('[aria-current="page"]').focus({ preventScroll: true });
  });

  const applyFilters = () => {
    if (window.RIETI_API_ERROR) return;
    const selectedMunicipality = municipalityFilter?.value ?? "";
    const selectedStatus = statusFilter?.value ?? "";
    const selectedPriority = priorityFilter?.value ?? "";
    const selectedWorkType = workTypeFilter?.value ?? "";
    const selectedStartDate = startDateFilter?.value ?? "";
    const selectedEndDate = endDateFilter?.value ?? "";
    if (startDateFilter && endDateFilter) {
      const invalidRange = selectedStartDate && selectedEndDate && selectedStartDate > selectedEndDate;
      endDateFilter.setCustomValidity(invalidRange ? 'La fecha fin debe ser igual o posterior a la fecha inicio.' : '');
      endDateFilter.setAttribute('aria-invalid', String(!endDateFilter.validity.valid));
      if (!filtersForm.checkValidity()) {
        if (filterFeedback) filterFeedback.textContent = `${invalidRange ? endDateFilter.validationMessage : 'Ingresa una fecha válida.'} Se conservan los últimos resultados.`;
        return;
      }
    }
    filteredRows = reportRows.filter((row) => {
      const matchesMunicipality = !selectedMunicipality || row.dataset.municipality === selectedMunicipality;
      const matchesStatus = !selectedStatus || row.dataset.status === selectedStatus;
      const matchesPriority = !selectedPriority || row.dataset.priority === selectedPriority;
      const matchesWorkType = !selectedWorkType || row.dataset.workType === selectedWorkType;
      const matchesStartDate = !selectedStartDate || row.dataset.date >= selectedStartDate;
      const matchesEndDate = !selectedEndDate || (row.dataset.date && row.dataset.date <= selectedEndDate);
      return matchesMunicipality && matchesStatus && matchesPriority && matchesWorkType && matchesStartDate && matchesEndDate;
    });
    currentPage = 1;
    renderResults();
    // Solo Estadísticas recalcula las métricas sobre la muestra filtrada.
    const visibleRows = filteredRows;
    const counts = {
      "reports-total": visibleRows.length,
      "reports-pending": visibleRows.filter((row) => window.RIETI_STATUS_GROUPS.pending.includes(row.dataset.status)).length,
      "reports-progress": visibleRows.filter((row) => window.RIETI_STATUS_GROUPS.progress.includes(row.dataset.status)).length,
      "reports-resolved": visibleRows.filter((row) => window.RIETI_STATUS_GROUPS.resolved.includes(row.dataset.status)).length,
    };
    document.querySelectorAll("[data-filter-count]").forEach((node) => {
      node.textContent = counts[node.dataset.filterCount];
    });
    const listCount = document.querySelector("[data-list-count]");
    if (listCount) listCount.textContent = `(${visibleRows.length})`;
  };

  filtersForm.addEventListener('input', applyFilters);
  filtersForm.addEventListener('change', applyFilters);
  filtersForm.addEventListener('submit', event => { event.preventDefault(); applyFilters(); });
  document.querySelector('#clear-report-filters').addEventListener('click', () => {
    filtersForm.reset();
    endDateFilter?.setCustomValidity('');
    applyFilters();
  });
  applyFilters();
}

})();
