/*
  INTERACCIONES DEL PROTOTIPO
  Este archivo contiene únicamente comportamiento local de interfaz.
  Las conexiones con autenticación, API y base de datos se agregarán después.
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
// Navega al folio conservando el origen; solo se transmiten identificadores ficticios.
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
  FILTROS CON DATOS FICTICIOS
  Esta lógica se reemplazará por parámetros enviados a la API cuando el listado
  provenga de la base de datos.
*/
const filtersForm = document.querySelector("#report-filters");

/*
  FORMULARIOS COMPARTIDOS — ESTADO Y AUTORIDAD
  Se usan desde ambas tablas. No se guardan datos en localStorage ni se envían a
  ningún servicio. INTEGRACIÓN FUTURA: sustituir la confirmación simulada por una
  petición autenticada a la API y confirmar solo después de recibir éxito.
*/
const statusDialog = document.querySelector("#status-dialog");
const authorityDialog = document.querySelector("#authority-dialog");
const confirmationDialog = document.querySelector("#update-confirmation");

if (statusDialog && authorityDialog && confirmationDialog) {
  let selectedReportId = "";
  let returnFocusTo = null;
  const dialogs = [statusDialog, authorityDialog, confirmationDialog];

  document.querySelectorAll("[data-report-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest("[data-report-row], [data-report-context]");
      if (!row) return;

      selectedReportId = row.dataset.reportId;
      // El menú se cierra, así que el foco vuelve a su activador y no al botón oculto.
      returnFocusTo = row.querySelector("summary") || button;
      reportMenus.forEach((menu) => { menu.open = false; });

      const dialog = button.dataset.reportAction === "status" ? statusDialog : authorityDialog;
      const form = dialog.querySelector("form");
      form.reset();
      dialog.querySelector("[data-dialog-report-id]").textContent = selectedReportId;

      if (dialog === statusDialog) {
        const status = row.dataset.status || row.querySelector(".status")?.textContent.trim() || "Recibido";
        const priority = row.dataset.priority || "Media";
        dialog.querySelector("[data-current-status]").textContent = status;
        dialog.querySelector("[data-current-priority]").textContent = priority;
        form.elements.namedItem("status").value = status;
        form.elements.namedItem("priority").value = priority;
      }

      // El diálogo nativo retiene el foco y bloquea la interacción con el fondo.
      dialog.showModal();
    });
  });

  dialogs.forEach((dialog) => {
    dialog.querySelectorAll("[data-close-dialog]").forEach((button) => {
      button.addEventListener("click", () => { dialog.close(); });
    });
    dialog.addEventListener("close", () => {
      dialog.querySelector("form")?.reset();
      if (!dialogs.some((item) => item.open)) returnFocusTo?.focus();
    });
  });

  [statusDialog, authorityDialog].forEach((dialog) => {
    const form = dialog.querySelector("form");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const values = new FormData(form);
      const summary = confirmationDialog.querySelector("[data-confirmation-summary]");
      const fields = [["Reporte", selectedReportId]];
      if (dialog === statusDialog) {
        fields.push(["Nuevo estado", values.get("status")], ["Nueva prioridad", values.get("priority")]);
        fields.push(["Comentarios", String(values.get("comments") || "").trim() || "Sin comentarios"]);
      } else {
        fields.push(["Nueva autoridad", values.get("authority")]);
      }

      // textContent evita interpretar como HTML los comentarios escritos.
      summary.replaceChildren();
      fields.forEach(([label, value]) => {
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label;
        description.textContent = value;
        summary.append(term, description);
      });
      dialog.close();
      confirmationDialog.showModal();
    });
  });
}

if (filtersForm && reportRows.length > 0) {
  const municipalityFilter = filtersForm.querySelector('[data-filter="municipality"]');
  const statusFilter = filtersForm.querySelector('[data-filter="status"]');
  const priorityFilter = filtersForm.querySelector('[data-filter="priority"]');
  const workTypeFilter = filtersForm.querySelector('[data-filter="work-type"]');
  const startDateFilter = filtersForm.querySelector('[data-filter="start-date"]');
  const endDateFilter = filtersForm.querySelector('[data-filter="end-date"]');
  const emptyRow = document.querySelector("[data-empty-row]");
  const filterFeedback = document.querySelector("#filter-feedback");

  filtersForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const selectedMunicipality = municipalityFilter?.value ?? "";
    const selectedStatus = statusFilter?.value ?? "";
    const selectedPriority = priorityFilter?.value ?? "";
    const selectedWorkType = workTypeFilter?.value ?? "";
    const selectedStartDate = startDateFilter?.value ?? "";
    const selectedEndDate = endDateFilter?.value ?? "";
    let visibleReports = 0;

    reportRows.forEach((row) => {
      const matchesMunicipality = !selectedMunicipality || row.dataset.municipality === selectedMunicipality;
      const matchesStatus = !selectedStatus || row.dataset.status === selectedStatus;
      const matchesPriority = !selectedPriority || row.dataset.priority === selectedPriority;
      const matchesWorkType = !selectedWorkType || row.dataset.workType === selectedWorkType;
      const matchesStartDate = !selectedStartDate || row.dataset.date >= selectedStartDate;
      const matchesEndDate = !selectedEndDate || row.dataset.date <= selectedEndDate;
      const isVisible = matchesMunicipality && matchesStatus && matchesPriority && matchesWorkType && matchesStartDate && matchesEndDate;

      row.hidden = !isVisible;
      visibleReports += isVisible ? 1 : 0;
    });

    if (emptyRow) {
      emptyRow.hidden = visibleReports !== 0;
    }

    if (filterFeedback) {
      filterFeedback.textContent = `Mostrando ${visibleReports} ${visibleReports === 1 ? "reporte" : "reportes"}`;
    }
    // Solo Estadísticas recalcula las métricas sobre la muestra filtrada.
    const visibleRows = reportRows.filter((row) => !row.hidden);
    const counts = {
      "reports-total": visibleRows.length,
      "reports-pending": visibleRows.filter((row) => ["Recibido", "Pendiente"].includes(row.dataset.status)).length,
      "reports-progress": visibleRows.filter((row) => row.dataset.status === "En proceso").length,
      "reports-resolved": visibleRows.filter((row) => row.dataset.status === "Resuelto").length,
    };
    document.querySelectorAll("[data-filter-count]").forEach((node) => {
      node.textContent = counts[node.dataset.filterCount];
    });
    const listCount = document.querySelector("[data-list-count]");
    if (listCount) listCount.textContent = `(${visibleRows.length})`;
  });
}
