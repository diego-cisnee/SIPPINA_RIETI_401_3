/* PDF local: cada gráfica se rasteriza antes de incrustarse en el documento. */
(() => {
  const scripts = new Map();
  function library(file, ready) {
    if (ready()) return Promise.resolve();
    if (scripts.has(file)) return scripts.get(file);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL(`../assets/vendor/pdf/${file}`, document.baseURI).href;
      script.onload = () => ready() ? resolve() : reject(new Error('Biblioteca no disponible'));
      script.onerror = () => { scripts.delete(file); script.remove(); reject(new Error('Biblioteca no disponible')); };
      document.head.append(script);
    });
    scripts.set(file, promise);
    return promise;
  }
  async function capture(card) {
    // Resolver colores CSS y fuentes antes de serializar los SVG como imágenes.
    const svgStyles = [...card.querySelectorAll('svg, svg *')].map(node => {
      const style = getComputedStyle(node);
      return Object.fromEntries(['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','font-family','font-size','font-weight'].map(key=>[key,style.getPropertyValue(key)]));
    });
    return window.html2canvas(card, {
      backgroundColor: '#ffffff', scale: 2, logging: false, windowWidth: 1440, width: 820,
      onclone(doc) {
        const clone = doc.getElementById(card.id);
        clone.style.cssText += ';width:820px;height:auto;min-height:0;align-self:start;box-shadow:none;border:0;border-radius:0;';
        clone.querySelectorAll('.chart-heading,.chart-hint,.chart-period-controls').forEach(node=>node.remove());
        clone.querySelectorAll('.chart-open,.chart-visual').forEach(node=>{node.style.height='auto';node.style.minHeight='0';});
        clone.querySelectorAll('.horizontal-bars').forEach(node=>{node.style.maxHeight='none';node.style.overflow='visible';});
        [...clone.querySelectorAll('svg, svg *')].forEach((node,index)=>{
          Object.entries(svgStyles[index]).forEach(([key,value])=>node.style.setProperty(key,value));
        });
        // Dimensiones explícitas: el SVG serializado no hereda el ancho de su contenedor.
        clone.querySelectorAll('svg').forEach(svg=>{
          const box=svg.viewBox.baseVal;
          const height=776*box.height/box.width;
          svg.setAttribute('width','776');svg.setAttribute('height',String(height));
          svg.style.width='776px';svg.style.height=`${height}px`;svg.style.maxHeight='none';svg.style.minWidth='0';
        });
      },
    });
  }
  window.RIETI_EXPORT_CHARTS = async snapshot => {
    await Promise.all([
      library('html2canvas.min.js',()=>typeof window.html2canvas==='function'),
      library('jspdf.umd.min.js',()=>typeof window.jspdf?.jsPDF==='function'),
      document.fonts.ready,
    ]);
    const cards=[...document.querySelectorAll('.analytics-card')].filter(card=>!card.hidden&&card.getBoundingClientRect().width>0);
    if(!cards.length)throw new Error('Sin gráficas');
    const pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4',compress:true});
    pdf.setProperties({title:'Estadísticas RIETI',subject:snapshot.filters,creator:'RIETI'});
    const generated=new Date().toLocaleString('es-MX');
    let first=true;
    for(const card of cards){
      const image=await capture(card);
      const title=card.querySelector('.chart-heading').textContent;
      const meta=[snapshot.scope,snapshot.filters,...(card.id==='card-trend'?[snapshot.period]:[])];
      pdf.setFont('helvetica','normal');pdf.setFontSize(9);
      const metaLines=pdf.splitTextToSize(meta.join('\n'),180);
      const top=43+metaLines.length*4;
      const ratio=180/image.width;
      const sliceHeight=Math.floor((280-top)/ratio);
      for(let offset=0;offset<image.height;offset+=sliceHeight){
        if(!first)pdf.addPage();first=false;
        pdf.setFont('helvetica','bold');pdf.setFontSize(19);pdf.setTextColor('#12344d');
        pdf.text('RIETI · Estadísticas',15,20);
        pdf.setFontSize(13);pdf.text(title+(offset?' (continuación)':''),15,31);
        pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor('#526171');
        pdf.text(metaLines,15,40);
        const slice=document.createElement('canvas');slice.width=image.width;slice.height=Math.min(sliceHeight,image.height-offset);
        slice.getContext('2d').drawImage(image,0,offset,image.width,slice.height,0,0,slice.width,slice.height);
        pdf.addImage(slice.toDataURL('image/jpeg',.95),'JPEG',15,top,180,slice.height*ratio);
        slice.width=slice.height=0;
        pdf.setFontSize(8);pdf.text(`Generado: ${generated} · Página ${pdf.getNumberOfPages()}`,15,290);
      }
      image.width=image.height=0;
    }
    await pdf.save('graficas_rieti.pdf',{returnPromise:true});
  };
})();
