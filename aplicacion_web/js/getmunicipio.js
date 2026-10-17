window.RIETI_MUNICIPIOS = [];
window.RIETI_API_ERROR = null;

window.RIETI_MUNICIPIOS_READY = (async () => {
  const selectMunicipio = document.getElementById('id_municipio');
  if (!selectMunicipio) return;
  

  selectMunicipio.innerHTML = '<option value="" disabled selected>Cargando municipios...</option>';


  const apiBase = (window.RIETI_API_BASE || (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && location.port !== '3000' ? 'http://127.0.0.1:3000' : location.origin)).replace(/\/$/, '');
  const apiURL = apiBase + '/api/municipios';

  try {
   
    const response = await fetch(apiURL, { 
        method: 'GET', 
        signal: AbortSignal.timeout(15000), 
        cache: 'no-store' 
    });
    
    if (!response.ok) throw new Error('No fue posible consultar los municipios.');
    
    const payload = await response.json();
    
    const records = payload.data ? payload.data : payload;
    
    if (!Array.isArray(records)) throw new Error('Respuesta de API inválida.');

    
    window.RIETI_MUNICIPIOS = records;

    
    selectMunicipio.innerHTML = '<option value="" disabled selected>Selecciona un municipio</option>';


    records.forEach(municipio => {
      const option = document.createElement('option');
      option.value = municipio.id_municipio;

      option.textContent = `${municipio.nombre} - ${municipio.clave_corta}`;
      selectMunicipio.appendChild(option);
    });

  } catch (error) {
    window.RIETI_API_ERROR = error.message;
    console.error('Error cargando municipios:', error);
    selectMunicipio.innerHTML = '<option value="" disabled selected>No disponible (Error de conexión)</option>';
  }
})();