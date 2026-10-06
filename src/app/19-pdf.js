// 19-pdf.js — Utilidades compartidas para los PDF (jsPDF).
// Resuelve los dos problemas que hacían que el texto se saliera de la hoja:
//  1. El ancho de cada línea se calcula con la MISMA fuente y tamaño con que se imprime.
//  2. El texto largo continúa en la página siguiente en lugar de salirse por abajo.
// Además convierte símbolos que las fuentes estándar del PDF no pueden dibujar
// (≥, →, SpO₂, emojis…) para que no aparezcan caracteres extraños.

const _PDF_REEMPLAZOS={
  "≥":">=","≤":"<=","≠":"!=","≈":"~","→":"->","←":"<-","↑":"(sube)","↓":"(baja)","⇒":"=>","↔":"<->",
  "✓":"OK","✔":"OK","✅":"OK","✕":"x","✗":"x","✖":"x","❌":"x","⚠":"(!)","⛔":"(!)",
  "−":"-","‐":"-","‑":"-","‒":"-","―":"-","′":"'","″":"\"",
  "₀":"0","₁":"1","₂":"2","₃":"3","₄":"4","₅":"5","₆":"6","₇":"7","₈":"8","₉":"9",
  "⁰":"0","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9",
  " ":" "," ":" "," ":" "," ":" ","​":"","﻿":"",
};
const _PDF_WINANSI_EXTRA="€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

// Devuelve el texto solo con caracteres que la fuente Helvetica del PDF sabe dibujar
function _pdfSafe(v){
  const s=String(v??"").replace(/\r\n?/g,"\n").replace(/\t/g,"  ");
  let out="";
  for(const ch of s){
    const rep=_PDF_REEMPLAZOS[ch];
    if(rep!==undefined){out+=rep;continue;}
    const c=ch.codePointAt(0);
    if(c===10||(c>=32&&c<=126)||(c>=160&&c<=255)||_PDF_WINANSI_EXTRA.includes(ch)){out+=ch;continue;}
    const base=ch.normalize("NFD").replace(/[̀-ͯ]/g,"");   // letras con tildes poco comunes
    if(base&&/^[\x20-\x7e]+$/.test(base))out+=base;                 // lo demás (emojis, etc.) se omite
  }
  return out.split("\n").map(l=>l.replace(/\s+$/,"")).join("\n").replace(/^ +/,"");
}

function _pdfFont(pdf,size,style="normal",color=[30,30,30]){
  pdf.setFontSize(size);pdf.setFont("helvetica",style);pdf.setTextColor(...color);
}

// Corta el texto en líneas que caben en `width` mm con la fuente indicada
function _pdfLines(pdf,text,width,size,style="normal"){
  pdf.setFontSize(size);pdf.setFont("helvetica",style);
  return pdf.splitTextToSize(_pdfSafe(text),width);
}

// Una sola línea que cabe en `width`; si no cabe, la recorta con "…"
function _pdfFit(pdf,text,width,size,style="normal"){
  pdf.setFontSize(size);pdf.setFont("helvetica",style);
  let t=_pdfSafe(text).replace(/\n/g," ");
  if(pdf.getTextWidth(t)<=width)return t;
  while(t.length>1&&pdf.getTextWidth(t+"…")>width)t=t.slice(0,-1);
  return t.replace(/\s+$/,"")+"…";
}

// Flujo de texto con salto de página automático.
// opts: { top, bottom, onNewPage }  (y es la línea base, en mm)
function _pdfFlow(pdf,{top,bottom,onNewPage}){
  const f={
    y:top,
    newPage(){pdf.addPage();if(onNewPage)onNewPage();f.y=top;},
    ensure(h){if(f.y+h>bottom)f.newPage();},
    // Párrafo con ajuste de línea; cada línea revisa si cabe en la página
    para(text,{x,width,size=11,style="normal",color=[30,30,30],lineH,after=0}){
      const lh=lineH||size*0.45;
      const lines=_pdfLines(pdf,text,width,size,style);
      for(const l of lines){
        f.ensure(lh);
        _pdfFont(pdf,size,style,color);   // se reaplica por si hubo cambio de página
        pdf.text(l,x,f.y);
        f.y+=lh;
      }
      f.y+=after;
      return lines.length;
    },
  };
  return f;
}

// Pie de página en todas las hojas: texto a la izquierda y "Página X de N" a la derecha
function _pdfFooter(pdf,{left,margin,pageW=210,y=290,size=7,color=[130,130,130]}){
  const n=pdf.internal.getNumberOfPages();
  for(let i=1;i<=n;i++){
    pdf.setPage(i);
    const right=`Página ${i} de ${n}`;
    _pdfFont(pdf,size,"normal",color);
    const rw=pdf.getTextWidth(right);
    pdf.text(right,pageW-margin,y,{align:"right"});
    if(left)pdf.text(_pdfFit(pdf,left,pageW-margin*2-rw-6,size),margin,y);
  }
}

// Logo "Pulso M" (el trazo de electrocardiograma que forma la M).
// x, y = esquina superior izquierda; h = alto en mm. Devuelve el ancho dibujado.
function _pdfLogo(pdf,x,y,h,color=[0,200,240]){
  const P=[[6,62],[26,62],[36,30],[50,68],[64,30],[74,62],[94,62]];   // mismo trazo que la app
  const k=h/38,ox=x-6*k,oy=y-30*k;                                     // el trazo ocupa y 30–68
  pdf.setDrawColor(...color);pdf.setLineWidth(Math.max(.5,h*.16));
  if(pdf.setLineCap)pdf.setLineCap("round");if(pdf.setLineJoin)pdf.setLineJoin("round");
  for(let i=1;i<P.length;i++)pdf.line(ox+P[i-1][0]*k,oy+P[i-1][1]*k,ox+P[i][0]*k,oy+P[i][1]*k);
  pdf.setLineWidth(.2);if(pdf.setLineCap)pdf.setLineCap("butt");if(pdf.setLineJoin)pdf.setLineJoin("miter");
  return 88*k;
}
