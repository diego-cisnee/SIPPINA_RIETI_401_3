document.addEventListener('DOMContentLoaded', async () => {
    if (window.RIETI_AUTH_READY && !await window.RIETI_AUTH_READY) return;
    if (!window.maplibregl) {
        document.getElementById('map').textContent = 'No fue posible cargar el mapa base.';
        return;
    }
    // límites del EDOMEX
    const edomexBounds = [
        [-100.65, 18.35], 
        [-98.55, 20.35]   
    ];

    const map = new maplibregl.Map({
        container: 'map',
        style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json', 
        center: [-99.6557, 19.2826],
        zoom: 8,
        maxBounds: edomexBounds,
        minZoom: 7
    });

    map.addControl(new maplibregl.NavigationControl());

    map.on('load', async () => {
        try {
            // La misma API filtra los reportes activos para ambos mapas.
            const respuesta = await window.RIETI_API.request('/api/mapa-calor');
            if (!respuesta.ok) throw new Error('No fue posible consultar el mapa.');
            const payload = await respuesta.json();
            const reportes = payload.data?.puntos;
            if (!Array.isArray(reportes)) throw new Error('Respuesta del mapa inválida.');

            const sharedColors = getComputedStyle(document.documentElement);
            const statusColors = {
                Registrado: '#eab308', En_revision: '#f97316', En_seguimiento: '#f97316',
                Canalizado: '#f97316', Concluido: '#22c55e', Archivado: '#69737e',
                Cancelado: sharedColors.getPropertyValue('--color-status-cancelled').trim(),
                Reincidente: sharedColors.getPropertyValue('--color-status-recurrent').trim(),
            };
            reportes.forEach(reporte => {
                // CORRECCIÓN: 'reporte' (singular) y 'latitud' bien escrito
                const lat = parseFloat(reporte.latitud);
                const long = parseFloat(reporte.longitud);
                
                if (!isNaN(lat) && !isNaN(long)) {
                    const colorPin = statusColors[reporte.estatus] || '#3b82f6';
                    const status = document.createElement('span');
                    status.textContent = window.RIETI_STATUS_LABEL(reporte.estatus);

                    const folio = document.createElement('span');
                    folio.textContent = reporte.folio ?? 'No disponible';
                    const priority = document.createElement('span');
                    priority.textContent = reporte.prioridad ?? 'No disponible';
                    const address = document.createElement('span');
                    address.textContent = reporte.direccion || 'Sin dirección registrada';
                    const popup = new maplibregl.Popup({ offset:25 }).setHTML(`
                        <div style="font-family: sans-serif;">
                            <h4 style="margin: 0 0 5px 0;">Folio ${folio.innerHTML}</h4>
                            <p style="margin: 0; font-size: 13px;"><strong>Estatus:</strong> ${status.innerHTML}</p>
                            <p style="margin: 0; font-size: 13px;"><strong>Prioridad:</strong> ${priority.innerHTML}</p>
                            <hr style="border: 0.5px solid #ccc; margin: 8px 0;">
                            <p style="margin: 0; font-size: 12px; color: #666;">${address.innerHTML}</p>
                        </div>`);

                    new maplibregl.Marker({color: colorPin})
                        .setLngLat([long, lat])
                        .setPopup(popup)
                        .addTo(map);
                }
            });
        }
        catch (error) {
            console.error("Error", error);
        }
    });

    // CORRECCIÓN: Eventos de pantalla completa movidos adentro para que puedan acceder a la variable 'map'
    const mapHover = document.getElementById('hoverMap');
    const botonex = document.getElementById('BotonExpandir');

    botonex.addEventListener('click', () => {
        if (mapHover.requestFullscreen) {
            mapHover.requestFullscreen();
        }
    });

    document.addEventListener('fullscreenchange', () => {
        setTimeout(() => {
            map.resize();
        }, 200);
    });
});
