// Verificación local del controlador; no necesita navegador ni red.
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const element = () => ({
  textContent: "", value: "", handlers: {}, children: [],
  addEventListener(type, fn) { this.handlers[type] = fn; },
  replaceChildren() { this.children = []; },
  append(...nodes) { this.children.push(...nodes); },
  focus() { this.focused = true; },
});
const makeDialog = (kind) => {
  const fields = Object.fromEntries((kind === "status" ? ["status", "priority", "comments"] : ["authority"]).map(k => [k, element()]));
  const form = Object.assign(element(), {
    fields, elements: { namedItem: name => fields[name] },
    reset() { Object.values(fields).forEach(field => { field.value = ""; }); },
    reportValidity() { return kind !== "authority" || Boolean(fields.authority.value); },
  });
  const close = element();
  const nodes = { form, "[data-dialog-report-id]": element(), "[data-current-status]": element(), "[data-current-priority]": element(), "[data-confirmation-summary]": element() };
  return Object.assign(element(), {
    open: false, form, closeButton: close, nodes,
    querySelector: selector => nodes[selector],
    querySelectorAll: () => [close],
    showModal() { this.open = true; },
    close() { this.open = false; this.handlers.close?.(); },
  });
};
const status = makeDialog("status"), authority = makeDialog("authority"), confirmation = makeDialog("confirmation");
const summaryButton = element();
const row = { dataset: { reportId: "TEST-0001", status: "Recibido", priority: "Alta" }, querySelector: () => summaryButton };
const buttons = ["status", "authority"].map(action => Object.assign(element(), { dataset: { reportAction: action }, closest: () => row }));
const lookup = { "#status-dialog": status, "#authority-dialog": authority, "#update-confirmation": confirmation };
const context = {
  document: { querySelector: selector => lookup[selector] || null, querySelectorAll: selector => selector === "[data-report-action]" ? buttons : [], addEventListener() {}, createElement: element },
  window: { location: {} },
  FormData: class { constructor(form) { this.form = form; } get(key) { return this.form.fields[key]?.value; } },
};
vm.runInNewContext(fs.readFileSync("js/app.js", "utf8"), context);
buttons[0].handlers.click();
assert.equal(status.open, true);
assert.equal(status.nodes["[data-dialog-report-id]"].textContent, "TEST-0001");
assert.equal(status.form.fields.priority.value, "Alta");
status.form.fields.status.value = "En proceso";
status.form.fields.comments.value = "<script>comentario</script>";
status.form.handlers.submit({ preventDefault() {} });
assert.equal(status.open, false);
assert.equal(confirmation.open, true);
assert.ok(confirmation.nodes["[data-confirmation-summary]"].children.some(node => node.textContent === "<script>comentario</script>"));
confirmation.closeButton.handlers.click();
buttons[0].handlers.click();
status.form.fields.comments.value = "Descartar";
status.closeButton.handlers.click();
assert.equal(status.form.fields.comments.value, "");
assert.equal(summaryButton.focused, true);
buttons[1].handlers.click();
authority.form.handlers.submit({ preventDefault() {} });
assert.equal(authority.open, true);
authority.form.fields.authority.value = "Por definir";
authority.form.handlers.submit({ preventDefault() {} });
assert.equal(confirmation.open, true);
assert.ok(confirmation.nodes["[data-confirmation-summary]"].children.some(node => node.textContent === "Por definir"));
for (const path of ["pages/dashboard.html", "pages/reportes.html", "pages/estadisticas.html"]) {
  const html = fs.readFileSync(path, "utf8");
  assert.equal((html.match(/id="status-dialog"/g) || []).length, 1);
  assert.ok(html.includes('data-delete-report aria-haspopup="dialog" aria-controls="delete-report-dialog">Eliminar'));
  assert.ok(html.includes('data-report-action="authority"'));
}
console.log("OK: formularios, selección, comentarios, cancelar, validación y confirmación.");
