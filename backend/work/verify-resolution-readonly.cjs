// Ejecutar desde backend con --env-file-if-exists=.env. Solo SELECT en MySQL.
// Las CTE siguientes sustituyen las cuatro tablas SOLO dentro de esta consulta.
// No crea tablas, cuentas, reportes ni historiales y nunca llama a la API de escritura.
const assert=require('node:assert/strict');
const pool=require('../db');const {readPerformance,performanceQuery}=require('../performance');
const {readReports,completionDateSQL}=require('../reports');
const day=86400;
const date=daysAgo=>daysAgo===null?'NULL':`TIMESTAMPADD(SECOND, ${-daysAgo*day}, CURRENT_TIMESTAMP)`;
const reports=[
 [1,1,'Concluido',1],[2,1,'Concluido',1],[3,1,'En_revision',1],[4,1,'Concluido',0],
 [5,1,'Concluido',1],[6,1,'Concluido',1],[7,1,'Concluido',1],[8,1,'Concluido',1],
 [9,1,'Concluido',1],[10,1,'Concluido',1],
 [11,2,'Concluido',1],[12,2,'Concluido',1],[13,2,'Concluido',1],[14,2,'Concluido',1],
 [15,4,'Registrado',0], // Municipio con solo bajas: tampoco se muestra.
];
const movements=[
 [1,'Registrado',29],[1,'Concluido',28],[1,'Concluido',27], // Comentarios/prioridad no prolongan el primer día.
 [3,'Registrado',29],[3,'Concluido',28], // Reabierto: no participa mientras no esté concluido.
 [4,'Registrado',29], // Baja: no participa.
 [5,'Registrado',29],[5,'Concluido',28],[5,'En_revision',25],[5,'Concluido',24], // Última conclusión: cinco días.
 [6,'Registrado',31], // Fecha anterior al registro: excluir.
 [7,'Concluido',29], // Solo comentario; conclusión sin transición conocida: excluir.
 [8,'Registrado',-1], // Fecha futura: excluir.
 [9,'Registrado',null], // Sin fecha: excluir.
 [10,null,29], // Estado anterior desconocido: excluir.
 [11,'Registrado',27],[12,'En_revision',28],[13,'Registrado',30],[14,'Registrado',29.5],
];
const fixtures=`WITH Reporte AS (${reports.map(([id,municipality,status,active],index)=>
 `SELECT ${id}${index?'':' AS id_reporte'}, ${municipality}${index?'':' AS id_municipio'}, '${status}'${index?'':' AS estatus'}, ${date(30)}${index?'':' AS fecha'}, ${active}${index?'':' AS active'}`).join(' UNION ALL ')}),
 Reporte_Historial AS (${movements.map(([reportId,status,daysAgo],index)=>
 `SELECT ${index+1}${index?'':' AS id_historial'}, ${reportId}${index?'':' AS id_reporte'}, ${status===null?'NULL':"'"+status+"'"}${index?'':' AS estatus'}, ${date(daysAgo)}${index?'':' AS modificacion_fecha'}`).join(' UNION ALL ')}),
 Municipio AS (SELECT 1 AS id_municipio, 'Municipio A' AS nombre UNION ALL SELECT 2, 'Municipio B' UNION ALL SELECT 3, 'Sin reportes' UNION ALL SELECT 4, 'Solo bajas'),
 Procurador AS (SELECT 1 AS id_procurador, 1 AS id_municipio, 'Procurador A' AS nombre, 1 AS activo UNION ALL SELECT 2, 2, 'Procurador B', 1), `;
(async()=>{
 const derivedPool={query:(sql,args)=>pool.query(sql.replace(/^WITH /,fixtures),args)};
 const [completionDates]=await pool.query(fixtures+`completion_dates AS (
  SELECT r.id_reporte, ${completionDateSQL} AS resolvedAt FROM Reporte r WHERE r.active = 1
 ) SELECT * FROM completion_dates ORDER BY id_reporte`);
 assert.deepEqual(completionDates.filter(r=>r.resolvedAt!==null).map(r=>r.id_reporte),[1,5,11,12,13,14]);
 const [expectedDates]=await pool.query(`SELECT
  DATE_FORMAT(TIMESTAMPADD(SECOND, -29*86400, CURRENT_TIMESTAMP), '%Y-%m-%d') AS first,
  DATE_FORMAT(TIMESTAMPADD(SECOND, -25*86400, CURRENT_TIMESTAMP), '%Y-%m-%d') AS reopened`);
 assert.equal(completionDates.find(r=>r.id_reporte===1).resolvedAt,expectedDates[0].first);
 assert.equal(completionDates.find(r=>r.id_reporte===5).resolvedAt,expectedDates[0].reopened);
 const rows=await readPerformance(derivedPool);
 const a=rows.find(r=>r.municipalityId===1),b=rows.find(r=>r.municipalityId===2);
 assert.equal(a.total,9);assert.equal(a.resolved,8);assert.equal(a.progress,1);assert.equal(a.measuredResolved,2);assert.equal(a.averageDays,3);
 assert.equal(b.total,4);assert.equal(b.measuredResolved,4);assert.equal(b.averageDays,1.375);
 assert.deepEqual(rows.map(r=>r.municipalityId),[1,2]);
 const measured=rows.reduce((n,r)=>n+r.measuredResolved,0),seconds=rows.reduce((n,r)=>n+r.resolutionSeconds,0);
 assert.equal(measured,6);assert.equal(seconds,11.5*day);
 for(const municipalityId of [2,2,1,2,null,1,null]) {
  const result=await readPerformance(derivedPool,municipalityId);
  if(municipalityId===null) assert.equal(result.find(r=>r.municipalityId===2).averageDays,1.375);
  else {assert.equal(result.length,1);assert.equal(result[0].averageDays,municipalityId===2?1.375:3,JSON.stringify({municipalityId,result}));}
 }
 for(const municipalityId of [3,4]) assert.deepEqual(await readPerformance(derivedPool,municipalityId),[]);
 const real=await readPerformance(pool);
 const realReports=await readReports(pool);
 assert.equal(realReports.filter(r=>r.resolvedAt!==null).length,real.reduce((sum,r)=>sum+r.measuredResolved,0));
 assert.ok(realReports.every(r=>r.resolvedAt===null||(r.status==='Concluido'&&/^\d{4}-\d{2}-\d{2}$/.test(r.resolvedAt))));
 assert.ok(real.every(r=>r.total>0&&Number.isSafeInteger(r.measuredResolved)&&r.measuredResolved<=r.resolved&&r.resolutionSeconds>=0));
 const [[expected]]=await pool.query('SELECT COUNT(DISTINCT id_municipio) AS municipalities FROM Reporte WHERE active = 1');
 assert.equal(real.length,expected.municipalities);
 console.log(JSON.stringify({verified:true,sqlCases:'Conclusión, comentarios, reapertura, segunda conclusión, baja, fecha inválida/futura/nula, estado desconocido, sin historial, cero días, medio día, promedio ponderado y municipio',realMunicipalities:real.length,operations:'Solo SELECT; las filas aisladas de las CTE no se guardan en RDS.'}));
})().catch(e=>{console.error(e.code==='ERR_ASSERTION'?e.stack:e.code||e.message);process.exitCode=1;}).finally(()=>pool.end());
