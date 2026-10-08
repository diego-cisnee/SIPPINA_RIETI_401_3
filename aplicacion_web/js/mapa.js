document.addEventListener('DOMContentLoaded', () => {
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
            const Lambda = 'https://odsk3s766p4pshk3z5mbyjtggq0lrdft.lambda-url.us-east-1.on.aws/';

            const respuesta = await fetch(Lambda);
            const reportes = await respuesta.json();

            reportes.forEach(reporte => {
                // CORRECCIÓN: 'reporte' (singular) y 'latitud' bien escrito
                const lat = parseFloat(reporte.latitud);
                const long = parseFloat(reporte.longitud);
                
                if (!isNaN(lat) && !isNaN(long)) {
                    let colorPin = "#3b82f6";
                    if (reporte.estatus === "Recibido") colorPin = "#eab308";
                    if (reporte.estatus === "En proceso") colorPin = "#f97316";
                    if (reporte.estatus === "Resuelto") colorPin = "#22c55e";

                    const popup = new maplibregl.Popup({ offset:25 }).setHTML(`
                        <div style="font-family: sans-serif;">
                            <h4 style="margin: 0 0 5px 0;">Reporte #${reporte.id_reporte}</h4>
                            <p style="margin: 0; font-size: 13px;"><strong>Estatus:</strong> ${reporte.estatus}</p>
                            <p style="margin: 0; font-size: 13px;"><strong>Prioridad:</strong> ${reporte.prioridad}</p>
                            <hr style="border: 0.5px solid #ccc; margin: 8px 0;">
                            <p style="margin: 0; font-size: 12px; color: #666;">${reporte.direccion || 'Sin dirección registrada'}</p>
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