const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const fixture = { window: {} };
vm.runInNewContext(fs.readFileSync("js/report-data.js", "utf8"), fixture);
const records = fixture.window.RIETI_REPORTS;
const node = () => ({ dataset: {}, textContent: "", hidden: true, handlers: {}, classList: { add() {} }, addEventListener(k, fn) { this.handlers[k] = fn; }, focus() {} });
function render(id, from) {
  const content = node(), error = node(), origin = node(), back = node(), print = node(), meta = node();
  const fields = Object.keys(Object.values(records)[0]).map(key => Object.assign(node(), { dataset: { detail: key } }));
  const title = node(), message = node(), dismiss = node();
  const notice = Object.assign(node(), { open: false, querySelector: s => s === "h2" ? title : s === "[data-detail-notice-message]" ? message : dismiss, showModal() { this.open = true; }, close() { this.open = false; this.handlers.close(); } });
  const links = ["map", "attachment"].map(type => Object.assign(node(), { dataset: { detailNotice: type, filename: "imagen_1.png" } }));
  const selectors = { "[data-report-context]": content, "[data-report-error]": error, "[data-print-report]": print, 'meta[name="description"]': meta, "#detail-notice": notice };
  const lists = { "[data-origin-link]": [origin], "[data-back-link]": [back], "[data-detail]": fields, "[data-detail-notice]": links };
  const context = { URLSearchParams, window: { RIETI_REPORTS: records, location: { search: "?id=" + encodeURIComponent(id) + "&from=" + encodeURIComponent(from) }, print() {} }, document: { querySelector: s => selectors[s], querySelectorAll: s => lists[s] || [] } };
  vm.runInNewContext(fs.readFileSync("js/report-detail.js", "utf8"), context);
  return { content, error, origin, back, print, fields, notice, links, message };
}
for (const [id, report] of Object.entries(records)) {
  for (const from of ["dashboard", "reportes", "estadisticas"]) {
    const result = render(id, from);
    assert.equal(result.content.hidden, false);
    assert.equal(result.content.dataset.reportId, id);
    assert.equal(result.content.dataset.status, report.status);
    assert.equal(result.back.href, from + ".html");
    assert.ok(result.fields.every(n => n.textContent !== "No especificado" || n.dataset.detail === "reference"));
    result.links[0].handlers.click({ preventDefault() {} });
    assert.equal(result.notice.open, true);
    assert.ok(result.message.textContent.includes("mapa"));
    result.links[1].handlers.click({ preventDefault() {} });
    assert.ok(result.message.textContent.includes("imagen_1.png"));
  }
}
assert.equal(render("inexistente", "dashboard").error.hidden, false);
assert.equal(render("__proto__", "dashboard").content.hidden, true);
assert.equal(render(Object.keys(records)[0], "https://malicioso.example").back.href, "reportes.html");

// Comprueba que todos los folios existentes tengan un detalle correspondiente.
for (const path of ["pages/dashboard.html", "pages/reportes.html"]) {
  const html = fs.readFileSync(path, "utf8");
  for (const match of html.matchAll(/data-report-id="([^"]+)"/g)) assert.ok(records[match[1]]);
}
const detailHtml = fs.readFileSync("pages/reporte.html", "utf8");
for (const id of ["status-dialog", "authority-dialog", "update-confirmation"]) {
  assert.equal((detailHtml.match(new RegExp('id="' + id + '"', "g")) || []).length, 1);
}
assert.ok(detailHtml.indexOf('src="../js/report-detail.js"') < detailHtml.indexOf('src="../js/app.js"'));
console.log("OK: 11 folios, ambos orígenes, datos, avisos, formularios y folios inválidos.");
