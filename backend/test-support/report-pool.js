// Base transaccional aislada para probar las acciones. Nunca importa db.js ni usa RDS.
const { createHash } = require('node:crypto');
const { IsolatedPool } = require('./isolated-pool');
class ReportPool extends IsolatedPool {
  constructor(hash) {
    super(hash);
    this.reports = [22, 33].map((municipalityId, index) => ({ id_reporte:index + 1, id_usuario:50,
      id_administrador:999, id_municipio:municipalityId, estatus:'Registrado', prioridad:'Baja',
      descripcion:'Descripción original', fecha:'2026-10-18 12:00:00', imagen_url:null,
      folio:'RIETI-AISLADO-'+(index+1), active:1 }));
    this.histories=[]; this.transactionQueue=Promise.resolve(); this.released=0;
  }
  version(row) {return createHash('sha256').update(JSON.stringify([row,this.histories.filter(h=>h.id_reporte===row.id_reporte)])).digest('hex');}
  async execute(sql,args=[]) {
    if (sql.includes('FROM Reporte r') || sql.includes('FROM Reporte_Historial h')) {
      this.calls.push({sql,args});
      if (sql.includes('FROM Reporte_Historial h')) {
        const row=this.reports.find(r=>r.id_reporte===Number(args[0])&&r.active===1&&(args.length<2||r.id_municipio===args[1]));
        return [!row?[]:this.histories.filter(h=>h.id_reporte===row.id_reporte).map(h=>({id:h.id_historial,
          previousStatus:h.estatus,previousPriority:h.prioridad,comments:h.comentarios,changedAt:h.modificacion_fecha,
          adminId:h.id_administrador,procuratorId:h.id_procurador,
          adminName:this.admins.find(a=>a.id===h.id_administrador)?.name,
          procuratorName:this.procurators.find(p=>p.id===h.id_procurador)?.name,
          currentStatus:row.estatus,currentPriority:row.prioridad}))];
      }
      if (sql.includes('AS version FROM Reporte r')) {
        const row=this.reports.find(r=>r.id_reporte===Number(args[0]));return [[{version:this.version(row)}]];
      }
      if (sql.startsWith('SELECT r.id_reporte FROM')) return [this.reports.filter(r=>r.id_reporte===Number(args[0])&&r.active===1&&(args.length<2||r.id_municipio===args[1])).map(r=>({id_reporte:r.id_reporte}))];
      let offset=0;
      const id=sql.includes('AND r.id_reporte = ?')?Number(args[offset++]):null;
      const municipality=sql.includes('AND r.id_municipio = ?')?args[offset]:null;
      return [this.reports.filter(r=>r.active===1&&(id===null||r.id_reporte===id)&&(municipality===null||r.id_municipio===municipality)).map(r=>({
        id_reporte:r.id_reporte,folio:r.folio,status:r.estatus,priority:r.prioridad,version:this.version(r),
        reportedAt:'18/10/2026 12:00',date:'2026-10-18',observations:r.descripcion,evidence:r.imagen_url,
        municipality:'Municipio '+r.id_municipio,reporter:'Ciudadano aislado',authority:'Procurador aislado',
        updatedAt:this.histories.filter(h=>h.id_reporte===r.id_reporte).at(-1)?.modificacion_fecha||null,
      }))];
    }
    return super.execute(sql,args);
  }
  async getConnection() {
    let snapshot,unlock;
    return {
      beginTransaction:async()=>{},
      execute:async(sql,args=[])=>{
        if(sql.includes('FOR UPDATE')) {
          const previous=this.transactionQueue;
          this.transactionQueue=new Promise(resolve=>{unlock=resolve;});await previous;
          snapshot=structuredClone({reports:this.reports,histories:this.histories});
          this.calls.push({sql,args});
          return [this.reports.filter(r=>r.id_reporte===Number(args[0])&&r.active===1&&(args.length<2||r.id_municipio===args[1])).map(r=>({...r}))];
        }
        if(sql.startsWith('INSERT INTO Reporte_Historial')) {
          this.calls.push({sql,args});
          if(this.failAt==='insert')throw new Error('Fallo de historial aislado');
          const keys=['id_reporte','id_usuario','id_administrador','id_municipio','estatus','descripcion','fecha','prioridad','imagen_url','folio','id_procurador','comentarios'];
          this.histories.push({...Object.fromEntries(keys.map((k,i)=>[k,args[i]])),id_historial:this.histories.length+1,modificacion_fecha:'18/10/2026 13:00:00'});
          return [{insertId:this.histories.length}];
        }
        if(sql.startsWith('UPDATE Reporte SET')) {
          this.calls.push({sql,args});if(this.failAt==='update')throw new Error('Fallo de actualización aislado');
          const row=this.reports.find(r=>r.id_reporte===Number(args.at(-1)));
          if(sql.includes('active = 0'))row.active=0;else{row.estatus=args[0];row.prioridad=args[1];}
          return [{affectedRows:1}];
        }
        return this.execute(sql,args);
      },
      commit:async()=>{if(this.failAt==='commit')throw new Error('Fallo de commit aislado');},
      rollback:async()=>{if(snapshot){this.reports=snapshot.reports;this.histories=snapshot.histories;}},
      release:()=>{this.released++;unlock?.();},destroy:()=>{unlock?.();},
    };
  }
}
module.exports={ReportPool};
