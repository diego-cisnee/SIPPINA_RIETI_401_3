/* Dibujo compartido; recibe los conteos existentes sin consultar ni modificar datos. */
window.RIETI_DONUT_COLORS = ['#12344d', '#285b7b', '#4b83a5', '#8eafc5', '#cad9e3'];
window.RIETI_DRAW_DONUT = (labels, counts) => {
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const total = counts.reduce((sum, count) => sum + count, 0);
  const cx = 260, cy = 165, radius = 88;
  let offset = 0;
  const callouts = [];
  const segments = counts.map((count, index) => {
    if (!count || !total) return '';
    const share = count / total;
    const angle = (offset + share / 2) * Math.PI * 2 - Math.PI / 2;
    const right = Math.cos(angle) >= 0;
    callouts.push({ index, right, x: cx + Math.cos(angle) * 113, y: cy + Math.sin(angle) * 113 });
    const result = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${window.RIETI_DONUT_COLORS[index % 5]}" stroke-width="46" stroke-linecap="butt" pathLength="100" stroke-dasharray="${share * 100} ${100 - share * 100}" stroke-dashoffset="${-offset * 100}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += share;
    return result;
  }).join('');
  // Distribuye las etiquetas por lado para evitar cruces y superposiciones.
  [false, true].forEach(right => {
    const side = callouts.filter(item => item.right === right).sort((a, b) => a.y - b.y);
    side.forEach((item, i) => { item.labelY = Math.max(38, item.y, i ? side[i - 1].labelY + 42 : 38); });
    if (side.length && side.at(-1).labelY > 292) {
      side.at(-1).labelY = 292;
      for (let i = side.length - 2; i >= 0; i--) side[i].labelY = Math.min(side[i].labelY, side[i + 1].labelY - 42);
    }
  });
  const annotations = callouts.map(({ index, right, x, y, labelY }) => {
    const endX = right ? 397 : 123, elbowX = right ? 382 : 138;
    const percentage = (counts[index] / total * 100).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + '%';
    return `<path d="M${x} ${y} L${elbowX} ${labelY} H${endX}" fill="none" stroke="#91a2af" stroke-width="1.3"/><circle cx="${x}" cy="${y}" r="2" fill="#91a2af" stroke="none"/><text x="${right ? 404 : 116}" y="${labelY - 5}" text-anchor="${right ? 'start' : 'end'}">${escape(labels[index])}</text><text class="donut-percentage" x="${right ? 404 : 116}" y="${labelY + 13}" text-anchor="${right ? 'start' : 'end'}">${percentage}</text>`;
  }).join('');
  return `<svg class="status-donut" viewBox="0 0 520 330" xmlns="http://www.w3.org/2000/svg" focusable="false">${segments}${annotations}<text class="donut-total" x="260" y="164" text-anchor="middle">${total}</text><text class="donut-unit" x="260" y="185" text-anchor="middle">reportes</text></svg>`;
};
