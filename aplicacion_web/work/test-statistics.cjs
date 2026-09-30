const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const data = { window: {} };
vm.runInNewContext(fs.readFileSync("js/report-data.js", "utf8"), data);
const records = Object.values(data.window.RIETI_REPORTS);
const types = data.window.RIETI_WORK_TYPES;
const node = () => ({ value: "", handlers: {}, addEventListener(k, fn) { this.handlers[k] = fn; } });
const rows = records.map(r => Object.assign(node(), {
  hidden: false,
  dataset: { reportId: r.id, municipality: r.municipality, status: r.status, priority: r.priority, date: r.reportedAt.slice(0, 10).split("/").reverse().join("-"), workType: r.workTypeId },
}));
const controls = Object.fromEntries(["municipality", "work-type", "start-date", "end-date"].map(k => [k, node()]));
const form = Object.assign(node(), { querySelector(s) { return controls[s.match(/="([^"]+)"/)[1]] || null; } });
const empty = node(), feedback = node(), listCount = node();
const counters = ["reports-total", "reports-pending", "reports-progress", "reports-resolved"].map(k => ({ dataset: { filterCount: k } }));
const lookups = { "#report-filters": form, "[data-empty-row]": empty, "#filter-feedback": feedback, "[data-list-count]": listCount };
const lists = { "[data-report-row]": rows, "[data-filter-count]": counters };
const context = {
  Element: class {},
  window: { location: {} },
  document: {
    body: { classList: { contains: value => value === "statistics-page" } },
    querySelector: s => lookups[s] || null,
    querySelectorAll: s => lists[s] || [],
    addEventListener() {},
  },
};
vm.runInNewContext(fs.readFileSync("js/app.js", "utf8"), context);
const submit = () => form.handlers.submit({ preventDefault() {} });
submit();
assert.equal(counters[0].textContent, 11);
controls["work-type"].value = types[0].id;
submit();
assert.equal(counters[0].textContent, records.filter(r => r.workTypeId === types[0].id).length);
controls.municipality.value = "Municipio inexistente";
submit();
assert.equal(counters[0].textContent, 0);
assert.equal(empty.hidden, false);
controls.municipality.value = "";
controls["work-type"].value = "";
controls["start-date"].value = "2026-10-01";
submit();
assert.ok(rows.filter(r => !r.hidden).every(r => r.dataset.date >= "2026-10-01"));
rows[0].handlers.click({ target: {} });
assert.ok(context.window.location.href.includes("from=estadisticas"));
const html = fs.readFileSync("pages/estadisticas.html", "utf8");
// El orden visual debe coincidir en encabezados y datos de todos los reportes.
const plainText = cell => cell.replace(/<[^>]+>/g, "").trim();
const headers = html.match(/<thead>[\s\S]*?<\/thead>/)[0].match(/<th\b[\s\S]*?<\/th>/g).map(plainText);
assert.deepEqual(headers, ["Folio", "Tipo de trabajo", "Observaciones", "Municipio", "Autoridad", "Estatus", "Prioridad", "Fecha", "Denunciante", "Acciones"]);
for (const match of html.matchAll(/<tr\b[^>]*data-report-row[^>]*>[\s\S]*?<\/tr>/g)) {
  const cells = match[0].match(/<td\b[\s\S]*?<\/td>/g).map(plainText);
  const record = records.find(r => r.id === cells[0]);
  assert.ok(record);
  assert.deepEqual(cells.slice(1, 7), [record.workType, record.observations, record.municipality, record.authority, record.status, record.priority]);
  assert.equal(cells[8], record.reporter);
}
assert.equal((html.match(/data-report-row/g) || []).length, 11);
assert.ok(html.includes('href="graficos.html">Gráficos'));
assert.ok(html.includes('href="rendimiento.html">Rendimiento'));
for (const record of records) {
  assert.ok(types.some(type => type.id === record.workTypeId && type.label === record.workType));
  assert.ok(html.includes(record.id));
  assert.ok(html.includes(record.observations));
  assert.ok(html.includes(record.reporter));
  assert.ok(html.includes(record.authority));
}
console.log("OK: catálogo, columnas, filas, filtros, totales, vacío y origen Estadísticas.");
