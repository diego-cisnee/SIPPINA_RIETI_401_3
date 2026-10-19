// Solo SELECT. Las relaciones 1:N se consultan aparte para no duplicar reportes.
const { municipalAuthoritiesSQL, authorityNameSQL } = require('./authorities');
const { versionSQL } = require('./report-actions');
// El historial guarda el estado anterior. Se toma la última entrada a Concluido,
// no los comentarios posteriores ni la fecha de registro como sustituto.
// Día del calendario de MySQL: no se inventa una zona horaria para el DATETIME.
const completionDateSQL = `CASE WHEN r.estatus = 'Concluido' THEN (
 SELECT CASE WHEN ch.estatus <> 'Concluido'
   AND ch.modificacion_fecha >= r.fecha AND ch.modificacion_fecha <= CURRENT_TIMESTAMP
   THEN DATE_FORMAT(ch.modificacion_fecha, '%Y-%m-%d') END
 FROM Reporte_Historial ch
 WHERE ch.id_reporte = r.id_reporte AND (ch.estatus <> 'Concluido' OR ch.estatus IS NULL)
 ORDER BY ch.id_historial DESC LIMIT 1
) END`;
const listSQL = `SELECT r.id_reporte, r.folio, r.estatus AS status, r.prioridad AS priority,
 ${versionSQL} AS version,
 ${completionDateSQL} AS resolvedAt,
 (SELECT DATE_FORMAT(MAX(uh.modificacion_fecha), '%d/%m/%Y %H:%i:%s') FROM Reporte_Historial uh WHERE uh.id_reporte = r.id_reporte) AS updatedAt,
 DATE_FORMAT(r.fecha, '%d/%m/%Y %H:%i') AS reportedAt,
 DATE_FORMAT(r.fecha, '%Y-%m-%d') AS date,
 r.descripcion AS observations, r.imagen_url AS evidence,
 c.nombre AS reporter, c.email, c.telefono AS phone,
 m.nombre AS municipality, a.nombre AS adminName, a.email AS adminEmail,
 p.authorityId, ${authorityNameSQL} AS authority
 FROM Reporte r LEFT JOIN Ciudadano c ON c.id_usuario = r.id_usuario
 LEFT JOIN Municipio m ON m.id_municipio = r.id_municipio
 LEFT JOIN Administrador a ON a.id_admin = r.id_administrador
 LEFT JOIN (${municipalAuthoritiesSQL}) p ON p.id_municipio = r.id_municipio
 WHERE r.active = 1`;
async function readReports(pool, id, municipalityId = null) {
 const args = id ? [id] : [];
 if (municipalityId !== null) args.push(municipalityId);
 const [rows] = await pool.execute(listSQL + (id ? ' AND r.id_reporte = ?' : '') + (municipalityId !== null ? ' AND r.id_municipio = ?' : '') + ' ORDER BY r.fecha DESC, r.id_reporte DESC', args);
 if (!rows.length) return [];
 const ids = rows.map(r => r.id_reporte);
 const placeholders = ids.map(() => '?').join(',');
 const [demographics] = await pool.execute(`SELECT id_reporte, numero_ninos, edad, tipo_trabajo FROM Demografico_Reporte WHERE id_reporte IN (${placeholders}) ORDER BY id_demog`, ids);
 const [locations] = await pool.execute(`SELECT id_reporte, direccion, latitud, longitud FROM Ubicacion_Reporte WHERE id_reporte IN (${placeholders}) ORDER BY id_ubicacion`, ids);
 const combine = (records, key) => {
   const values = [...new Set(records.map(r => r[key]).filter(v => v !== null && v !== ''))];
   return values.length ? values.join(' · ') : null;
 };
 return rows.map(row => {
   const demo = demographics.filter(d => d.id_reporte === row.id_reporte);
   const location = locations.filter(l => l.id_reporte === row.id_reporte);
   return { ...row, id: String(row.id_reporte), children: combine(demo, 'numero_ninos'), ages: combine(demo, 'edad'), workType: combine(demo, 'tipo_trabajo'), workTypeId: combine(demo, 'tipo_trabajo'), address: combine(location, 'direccion'), latitude: combine(location, 'latitud'), longitude: combine(location, 'longitud') };
 });
}
module.exports = { readReports, listSQL, completionDateSQL };
