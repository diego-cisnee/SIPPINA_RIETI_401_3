/* MUESTRA INDEPENDIENTE DE RENDIMIENTO, NO DATOS REALES.
   Una autoridad ficticia por municipio. No sustituye el catálogo pendiente de asignación.
   INTEGRACIÓN FUTURA: obtener autoridades y conteos de la API; garantizar municipio único.
   resolutionDays contiene los días empleados por cada caso finalizado de esta muestra.
   El total se calcula sumando pendientes, en proceso y finalizados para evitar inconsistencias. */
window.RIETI_AUTHORITY_PERFORMANCE = Object.freeze([
  { id: 'demo-atz', authority: 'Atención Atizapán', municipality: 'Atizapán de Zaragoza', pending: 2, progress: 1, resolutionDays: [] },
  { id: 'demo-tla', authority: 'Atención Tlalnepantla', municipality: 'Tlalnepantla de Baz', pending: 2, progress: 1, resolutionDays: [7, 9] },
  { id: 'demo-nau', authority: 'Atención Naucalpan', municipality: 'Naucalpan de Juárez', pending: 3, progress: 2, resolutionDays: [4, 5, 6] },
  { id: 'demo-coa', authority: 'Atención Coacalco', municipality: 'Coacalco', pending: 1, progress: 2, resolutionDays: [3, 4, 5] },
  { id: 'demo-vdc', authority: 'Atención Villa', municipality: 'Villa del Carbón', pending: 2, progress: 1, resolutionDays: [7] },
  { id: 'demo-hui', authority: 'Atención Huixquilucan', municipality: 'Huixquilucan', pending: 1, progress: 1, resolutionDays: [2, 3, 4] },
  { id: 'demo-ciz', authority: 'Atención Izcalli', municipality: 'Cuautitlán Izcalli', pending: 1, progress: 1, resolutionDays: [5, 7] },
  { id: 'demo-tul', authority: 'Atención Tultitlán', municipality: 'Tultitlán', pending: 0, progress: 0, resolutionDays: [] },
  { id: 'demo-nro', authority: 'Atención Nicolás Romero', municipality: 'Nicolás Romero', pending: 1, progress: 2, resolutionDays: [9] },
]);
