// Exclusivo de pruebas aisladas: no contiene conexión ni credenciales de RDS.
class IsolatedPool {
  constructor(hash) {
    this.admins = [{ id: 1, municipalityId: 11, name: 'Cuenta aislada', email: 'admin@example.test', passwordHash: hash }];
    this.procurators = [{ id: 2, municipalityId: 22, name: 'Procurador aislado', email: 'proc@example.test', passwordHash: hash, active: true }];
    this.calls = []; this.lock = Promise.resolve();
  }
  async execute(sql, args = []) {
    this.calls.push({ sql, args });
    if (sql.includes('UNION ALL')) return [[...this.admins.map(row=>({...row,role:'administrador'})),...this.procurators.filter(row=>row.active).map(row=>({...row,role:'procurador'}))].map(({passwordHash,active,...row})=>row)];
    if (sql.startsWith('UPDATE ')) {
      const records=sql.includes('Procurador')?this.procurators.filter(row=>row.active):this.admins;
      const row=records.find(row=>row.id===args[1]);
      if(row)row.passwordHash=args[0];
      return [{affectedRows:row?1:0}];
    }
    if (sql.includes('FROM Municipio')) return [[{id_municipio:11,nombre:'Municipio aislado',clave_corta:'AAA'}]];
    if (sql.includes('FROM Administrador') || sql.includes('FROM Procurador')) {
      const records = sql.includes('FROM Administrador') ? this.admins : this.procurators.filter(row => row.active);
      const rows = sql.includes('LIMIT 2') ? records.filter(row => row.email === args[0] || row.name === args[1]) : records.filter(row => row.id === args[0]);
      return [rows.map(row => ({ ...row }))];
    }
    // Estas rutas solo necesitan cero registros para comprobar la restricción SQL.
    return [[]];
  }
  query(sql, args) { return this.execute(sql, args); }
  async getConnection() {
    let releaseLock;
    return {
      execute: async (sql, args = []) => {
        this.calls.push({ sql, args });
        if (sql.includes('GET_LOCK')) {
          const previous = this.lock;
          this.lock = new Promise(resolve => { releaseLock = resolve; });
          await previous; return [[{ acquired: 1 }]];
        }
        if (sql.includes('RELEASE_LOCK')) { releaseLock?.(); return [[{ released: 1 }]]; }
        if (sql.includes('FROM Municipio')) return [args[0] === 11 || args[0] === 22 ? [{ id_municipio: args[0] }] : []];
        if (sql.includes('FROM Administrador')) return [this.admins.filter(row => row.email === args[0] || row.name === args[1])];
        if (sql.includes('FROM Procurador')) return [this.procurators.filter(row => row.email === args[0] || row.name === args[1])];
        if (sql.startsWith('INSERT INTO Administrador')) {
          const id = this.admins.length + 1;
          this.admins.push({ id, municipalityId: args[0], name: args[1], email: args[2], passwordHash: args[3] });
          return [{ insertId: id }];
        }
        if (sql.startsWith('INSERT INTO Procurador')) {
          const id = Math.max(0,...this.procurators.map(row=>row.id)) + 1;
          this.procurators.push({id,municipalityId:args[0],name:args[1],email:args[2],passwordHash:args[3],active:true});
          return [{insertId:id}];
        }
        throw new Error('Consulta no esperada en prueba aislada');
      }, release() {}, destroy() { releaseLock?.(); },
    };
  }
}
module.exports = { IsolatedPool };
