// Solo SELECT. Las relaciones 1:N se consultan aparte para no duplicar reportes.
const listSQL = `SELECT r.id_reporte, r.estatus AS status, r.prioridad AS priority,
 DATE_FORMAT(r.fecha, '%d/%m/%Y %H:%i') AS reportedAt,
 DATE_FORMAT(r.fecha, '%Y-%m-%d') AS date,
 r.descripcion AS observations, r.imagen_url AS evidence,
 c.nombre AS reporter, c.email, c.telefono AS phone,
 m.nombre AS municipality, a.nombre AS adminName, a.email AS adminEmail
 FROM Reporte r LEFT JOIN Ciudadano c ON c.id_usuario = r.id_usuario
 LEFT JOIN Municipio m ON m.id_municipio = r.id_municipio
 LEFT JOIN Administrador a ON a.id_admin = r.id_administrador`;
async function readReports(pool, id) {
 const [rows] = await pool.execute(listSQL + (id ? ' WHERE r.id_reporte = ?' : '') + ' ORDER BY r.fecha DESC, r.id_reporte DESC', id ? [id] : []);
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
module.exports = { readReports, listSQL };
