export const colors=['#edf4f8','#c8dce9','#92b7ce','#5b8aa7','#285b7b','#12344d'];
export const mapOptions={zoomControl:false, preferCanvas:true, minZoom:7, maxZoom:18};
export const heatOptions={radius:20,blur:20,minOpacity:.5,maxZoom:10,max:3,gradient:{.15:'#27834d',.35:'#73b744',.5:'#facc15',.65:'#f5a623',.8:'#e58027',1:'#ce4545'}};
export const controls={mode:['heat','municipal'],events:{mode:'change',municipio:'change','priority-filter':'change',points:'change',basemap:'change',reset:'click'}};

export const boundaryOptions={selectedColor:'#12344d',color:'#5b8aa7',heatFill:'#c8dce9',selectedWeight:2.5,weight:.8,dimOpacity:.35,opacity:.85,municipalFillOpacity:.85,dimMunicipalFillOpacity:.2,heatFillOpacity:.16,dimHeatFillOpacity:.05};
export const dotOptions={pane:'dots',radius:3,color:'#fff',weight:1,fillColor:'#285b7b',fillOpacity:.85};

export const priorities=['Baja','Media','Alta','Urgente'];
export const priorityColors={Baja:'#27834d',Media:'#d6ac19',Alta:'#e58027',Urgente:'#ce4545','Sin especificar':'#738392'};
