// Datos mínimos para el mapa; consultas exclusivamente de lectura.
async function readHeatmap(pool, municipalityId = null) {
 const scoped = municipalityId !== null;
 const args = scoped ? [municipalityId] : [];
 const [municipalities] = await pool.execute('SELECT m.id_municipio AS id, m.clave, m.nombre FROM Municipio m' + (scoped ? ' WHERE m.id_municipio = ?' : '') + ' ORDER BY m.nombre', args);
 const [reports] = await pool.execute(`SELECT r.id_reporte AS id, r.folio, r.prioridad AS prioridad, r.estatus AS estatus,
 DATE_FORMAT(r.fecha, '%Y-%m-%d') AS fecha_registro,
 u.id_ubicacion, u.latitud, u.longitud, u.direccion
 FROM Reporte r LEFT JOIN Ubicacion_Reporte u ON u.id_reporte = r.id_reporte
 WHERE r.active = 1${scoped ? ' AND r.id_municipio = ?' : ''}
 ORDER BY r.id_reporte, u.id_ubicacion`, args);
 const number = value => value === null || value === undefined || value === '' ? null : Number(value);
 return { municipios: municipalities.map(m => ({...m, clave: String(m.clave)})), puntos: reports.map(r => ({...r,latitud:number(r.latitud),longitud:number(r.longitud),intensidad:1})) };
}
module.exports = {readHeatmap};
