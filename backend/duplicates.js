// Coincidencias orientativas: solo lectura, sin fusionar ni descartar reportes.
const WINDOW_DAYS = 7;
const MAX_DISTANCE_METERS = 100;
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const stopwords = new Set(['para', 'como', 'esta', 'este', 'estos', 'estas', 'unos', 'unas', 'donde', 'sobre', 'entre']);
function similarity(a, b) {
  const tokens = value => new Set(normalize(value).split(' ').filter(word => word.length >= 4 && !stopwords.has(word)));
  const left = tokens(a), right = tokens(b);
  if (left.size < 3 || right.size < 3) return 0;
  const common = [...left].filter(word => right.has(word)).length;
  return common / (left.size + right.size - common);
}
function coordinates(row) {
  if ([row.latitud, row.longitud].some(v => v == null || String(v).trim() === '')) return null;
  const lat = Number(row.latitud), lng = Number(row.longitud);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
}
function distance(a, b) {
  const rad = value => value * Math.PI / 180;
  const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
async function readDuplicates(pool, id) {
  const [target] = await pool.execute(`SELECT r.id_reporte, r.id_municipio, r.fecha, r.descripcion,
    u.latitud, u.longitud, u.direccion FROM Reporte r
    LEFT JOIN Ubicacion_Reporte u ON u.id_reporte = r.id_reporte WHERE r.id_reporte = ?`, [id]);
  if (!target.length) return null;
  const [candidates] = await pool.execute(`SELECT r.id_reporte, r.folio, r.descripcion,
    DATE_FORMAT(r.fecha, '%d/%m/%Y %H:%i') AS reportedAt,
    ABS(TIMESTAMPDIFF(SECOND, original.fecha, r.fecha)) / 86400 AS daysApart,
    u.latitud, u.longitud, u.direccion,
    EXISTS (SELECT 1 FROM Demografico_Reporte a JOIN Demografico_Reporte b
      ON a.tipo_trabajo = b.tipo_trabajo
      WHERE a.id_reporte = original.id_reporte AND b.id_reporte = r.id_reporte
      AND a.tipo_trabajo IS NOT NULL AND TRIM(a.tipo_trabajo) <> '') AS sameWorkType
    FROM Reporte original JOIN Reporte r ON r.id_municipio = original.id_municipio
    LEFT JOIN Ubicacion_Reporte u ON u.id_reporte = r.id_reporte
    WHERE original.id_reporte = ? AND r.id_reporte <> original.id_reporte
    AND r.fecha BETWEEN DATE_SUB(original.fecha, INTERVAL ${WINDOW_DAYS} DAY)
      AND DATE_ADD(original.fecha, INTERVAL ${WINDOW_DAYS} DAY)`, [id]);
  const matches = new Map();
  for (const candidate of candidates) {
    let meters = Infinity, sameAddress = false;
    for (const location of target) {
      const a = coordinates(location), b = coordinates(candidate);
      if (a && b) meters = Math.min(meters, distance(a, b));
      const address = normalize(location.direccion);
      // La dirección sirve de respaldo solo si faltan coordenadas comparables.
      if ((!a || !b) && address.length >= 10 && address === normalize(candidate.direccion)) sameAddress = true;
    }
    const nearby = meters <= MAX_DISTANCE_METERS;
    const similarDescription = similarity(target[0].descripcion, candidate.descripcion) >= 0.6;
    const sameWorkType = Number(candidate.sameWorkType) === 1;
    if (!(nearby || sameAddress) || !(sameWorkType || similarDescription)) continue;
    const reasons = [nearby ? `Ubicación a ${Math.round(meters)} metros` : 'Misma dirección',
      `Fechas de registro con ${Number(candidate.daysApart).toFixed(1)} días de diferencia`];
    if (sameWorkType) reasons.push('Mismo tipo de trabajo');
    if (similarDescription) reasons.push('Descripciones similares');
    const score = (nearby ? 2 : 1) + Number(sameWorkType) + Number(similarDescription);
    const match = { id: String(candidate.id_reporte), folio: candidate.folio, reportedAt: candidate.reportedAt, reasons, score };
    if (!matches.has(match.id) || matches.get(match.id).score < score) matches.set(match.id, match);
  }
  return [...matches.values()].sort((a, b) => b.score - a.score || Number(a.id) - Number(b.id)).slice(0, 5).map(({ score, ...match }) => match);
}
module.exports = { readDuplicates };
