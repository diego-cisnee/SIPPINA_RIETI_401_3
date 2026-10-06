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

    
    const marcadores = [];

    
    map.on('click', (e) => {
        const coordenadas = e.lngLat;

        const nuevoMarcador = new maplibregl.Marker({ color: "#e63946" }) 
            .setLngLat([coordenadas.lng, coordenadas.lat])
            .addTo(map);

        marcadores.push(nuevoMarcador);

    
        console.log(`Nuevo reporte en Lng: ${coordenadas.lng}, Lat: ${coordenadas.lat}`);
    });
});

const mapHover= document.getElementById('hoverMap');
const botonex=document.getElementById('BotonExpandir');

botonex.addEventListener('click',()=>{
    if (mapHover.requestFullscreen){
        mapHover.requestFullscreen();
    }
    
    
});

document.addEventListener('fullscreenchange',()=>{
    setTimeout(()=>{
        map.resize();
    },200);
});

