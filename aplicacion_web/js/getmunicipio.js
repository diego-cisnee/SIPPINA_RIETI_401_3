window.RIETI_MUNICIPIOS = [];
window.RIETI_API_ERROR = null;

window.RIETI_MUNICIPIOS_READY = (async () => {
  const user = await window.RIETI_AUTH_READY;
  if (!user && !window.RIETI_PUBLIC_REGISTRATION) return;
  const selectMunicipio = document.getElementById('id_municipio');
  if (!selectMunicipio) return;
  

  selectMunicipio.innerHTML = '<option value="" disabled selected>Cargando municipios...</option>';



  try {
   
    const response = await window.RIETI_API.request(user ? '/api/municipios' : '/api/auth/registration/municipios');
    
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
