// 21-estadisticas.js — Estadísticas del inicio: gráfico, resumen en tabla y reporte PDF.
//
// _estResumen() calcula todo a partir de los triages cargados (sin tocar la pantalla),
// así el gráfico, la tabla y el PDF siempre muestran los mismos números.
// Períodos: "day" = hoy desde las 00:00, "week" = últimos 7 días, "month" = últimos 30 días.

const _EST_PRIOR=[
  ["ROJO","legendCritical","Atención inmediata","#ff3a5c",[220,38,38]],
  ["AMARILLO","legendUrgent","Atención urgente","#ffb830",[202,138,4]],
  ["VERDE","legendStable","Puede esperar","#00e07a",[21,128,61]],
];
const _EST_TIPOS=[
  ["adulto","tAdulto","Adulto","#00c8f0",[2,132,199]],
  ["adulto_mayor","tMayor","Adulto mayor","#a855f7",[126,34,206]],
  ["nino","tNino","Pediátrico","#00e07a",[21,128,61]],
  ["adolescente","tAdol","Adolescente","#ffb830",[202,138,4]],
  ["embarazada","tEmbar","Embarazada","#ff7043",[234,88,12]],
  ["movilidad","tMovil","Movilidad reducida","#94a3b8",[100,116,139]],
];
const _EST_MOTIVOS=[
  ["dolor_pecho","mPecho","Dolor de pecho","#ff3a5c",[220,38,38]],
  ["disnea","mDisnea","Dificultad respiratoria","#00c8f0",[2,132,199]],
  ["trauma","mTrauma","Trauma","#ffb830",[202,138,4]],
  ["abdominal","mAbdominal","Dolor abdominal","#a855f7",[126,34,206]],
  ["neuro","mNeuro","Neurológico","#00e07a",[21,128,61]],
  ["fiebre","mFiebre","Fiebre","#ff7043",[234,88,12]],
  ["otro","mOtro","Otro","#94a3b8",[100,116,139]],
];
const _EST_ORIGEN=[
  ["normal","","Triage normal","#00c8f0",[2,132,199]],
  ["mci","","Múltiples víctimas (MCI)","#ff8060",[234,88,12]],
  ["preh","","Prehospitalario","#a855f7",[126,34,206]],
];
const _EST_PERIODOS={day:"Hoy",week:"Últimos 7 días",month:"Últimos 30 días"};

function _estMs(v){
  if(!v)return NaN;
  if(typeof v.toMillis==="function")return v.toMillis();
  if(v instanceof Date)return v.getTime();
  return Date.parse(v);
}
function _estCorte(p,now=new Date()){
  if(p==="day")return new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
  return now.getTime()-(p==="week"?7:30)*864e5;
}
function _estPct(n,total){return total?Math.round(n*100/total):0;}

function _estResumen(docs,preh,p,now=new Date()){
  const cut=_estCorte(p,now),fin=now.getTime()+60000;
  const enPeriodo=arr=>(arr||[]).filter(d=>{const ms=_estMs(d.createdAt);return ms>=cut&&ms<=fin;});
  const ds=enPeriodo(docs),ph=enPeriodo(preh);
  const contar=(lista,campo,resto)=>{
    const n=lista.map(([k])=>ds.filter(d=>d[campo]===k).length);
    if(resto!==undefined){ // lo que no está en la lista se suma a "otro"
      const conocidos=new Set(lista.map(([k])=>k));
      n[resto]+=ds.filter(d=>!conocidos.has(d[campo])).length;
    }
    return n;
  };
  const mci=ds.filter(d=>d.esMCI===true).length;
  // Tendencia: por hora si es hoy; por día si son 7 o 30 días
  const tendencia=[];
  if(p==="day"){
    for(let h=0;h<=now.getHours();h++)tendencia.push({label:String(h).padStart(2,"0")+"h",n:0});
    ds.forEach(d=>{const b=tendencia[new Date(_estMs(d.createdAt)).getHours()];if(b)b.n++;});
  }else{
    const dias=p==="week"?7:30;
    const hoy=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    for(let i=dias-1;i>=0;i--){
      const d=new Date(hoy);d.setDate(d.getDate()-i);
      tendencia.push({label:`${d.getDate()}/${d.getMonth()+1}`,ms:d.getTime(),n:0});
    }
    ds.forEach(d=>{
      const x=new Date(_estMs(d.createdAt));
      const b=tendencia.find(t=>t.ms===new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime());
      if(b)b.n++;
    });
  }
  return{
    periodo:p,desde:cut,hasta:now.getTime(),total:ds.length,
    prioridad:contar(_EST_PRIOR,"clasificacion"),
    tipo:contar(_EST_TIPOS,"tipo"),
    motivo:contar(_EST_MOTIVOS,"motivo",_EST_MOTIVOS.length-1),
    origen:[ds.length-mci,mci,ph.length],
    mci,preh:ph.length,atendidos:ds.filter(d=>d.atendido).length,
    tendencia,
  };
}

// ── Pantalla ────────────────────────────────────────────────
let _chartInst=null,_chartPer="day",_chartType="color",_chartData=[];
const _estT=(k,f)=>{try{const v=k&&typeof t==="function"?t(k):"";return v&&v!==k?v:f;}catch(_){return f;}};

function setChartPeriod(p,btn){
  _chartPer=p;
  document.querySelectorAll('[id^="chartPer-"]').forEach(b=>b.classList.toggle("on",b===btn));
  buildChart();
}
function setChartType(tp,btn){
  _chartType=tp;
  document.querySelectorAll('[id^="chartType-"]').forEach(b=>b.classList.toggle("on",b===btn));
  buildChart();
}

// Filas [etiqueta, cantidad, color] de la vista elegida
function _estFilas(r,tipo){
  const filas=(lista,vals)=>lista.map((x,i)=>[_estT(x[1],x[2]),vals[i],x[3]]);
  if(tipo==="type")return filas(_EST_TIPOS,r.tipo);
  if(tipo==="motivo")return filas(_EST_MOTIVOS,r.motivo);
  if(tipo==="mci")return filas(_EST_ORIGEN,r.origen);
  return filas(_EST_PRIOR,r.prioridad);
}

function buildChart(){
  const card=document.getElementById("chartCard");
  if(!card)return;
  card.style.display="block";
  const r=_estResumen(_chartData,_dashPrehDocs,_chartPer);
  const sub=document.getElementById("chartSub");
  if(sub)sub.textContent=`${r.total} ${r.total===1?"triage":"triages"} · ${_EST_PERIODOS[_chartPer]}`;
  const vacio=_chartType==="mci"?!(r.total||r.preh):!r.total;
  document.getElementById("chartEmpty").style.display=vacio?"":"none";
  document.getElementById("chartBody").style.display=vacio?"none":"";
  if(_chartInst){_chartInst.destroy();_chartInst=null;}
  // En celular, Motivo y Tipo se ven solo como tabla (ya trae barras y cifras)
  card.classList.toggle("solo-tabla",_chartType==="motivo"||_chartType==="type");
  if(vacio)return;
  _renderEstResumen(r);
  if(!window.Chart)return;

  const dark=!document.body.classList.contains("light");
  const textC=dark?"rgba(255,255,255,.7)":"rgba(0,0,0,.6)",gridC=dark?"rgba(255,255,255,.07)":"rgba(0,0,0,.07)";
  const ejes={x:{ticks:{color:textC,font:{size:10},maxRotation:0,autoSkip:true},grid:{display:false}},
             y:{beginAtZero:true,ticks:{color:textC,precision:0},grid:{color:gridC}}};
  const tooltip={callbacks:{label:c=>{const n=c.parsed.y??c.parsed;const tot=c.dataset.data.reduce((a,b)=>a+b,0);return ` ${n} (${_estPct(n,tot)}%)`;}}};
  let cfg;
  if(_chartType==="trend"){
    cfg={type:"bar",data:{labels:r.tendencia.map(x=>x.label),datasets:[{data:r.tendencia.map(x=>x.n),backgroundColor:"rgba(0,200,240,.55)",borderColor:"#00c8f0",borderWidth:1,borderRadius:4}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.parsed.y} triages`}}},scales:ejes}};
  }else{
    const filas=_estFilas(r,_chartType);
    const dona=_chartType==="color"||_chartType==="mci";
    cfg=dona
      ?{type:"doughnut",data:{labels:filas.map(f=>f[0]),datasets:[{data:filas.map(f=>f[1]),backgroundColor:filas.map(f=>f[2]),borderColor:dark?"#111827":"#fff",borderWidth:2,hoverOffset:6}]},
        options:{responsive:true,maintainAspectRatio:false,cutout:"64%",plugins:{legend:{display:false},tooltip},animation:{duration:500}}}
      :{type:"bar",data:{labels:filas.map(f=>f[0]),datasets:[{data:filas.map(f=>f[1]),backgroundColor:filas.map(f=>f[2]+"cc"),borderColor:filas.map(f=>f[2]),borderWidth:1,borderRadius:6}]},
        options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip},
          scales:{x:{beginAtZero:true,ticks:{color:textC,precision:0},grid:{color:gridC}},y:{ticks:{color:textC,font:{size:11}},grid:{display:false}}}}};
  }
  _chartInst=new Chart(document.getElementById("mainChart"),cfg);
}

// Tabla con cantidades y porcentajes al lado del gráfico (se lee sin pasar el mouse)
function _renderEstResumen(r){
  const el=document.getElementById("chartSummary");if(!el)return;
  if(_chartType==="trend"){
    const pico=r.tendencia.reduce((a,b)=>b.n>a.n?b:a,{n:0,label:"—"});
    const unidad=r.periodo==="day"?"hora":"día";
    const prom=r.tendencia.length?(r.total/r.tendencia.length):0;
    el.innerHTML=`<div class="est-kpis">
      <div><b>${r.total}</b><span>triages</span></div>
      <div><b>${prom<10?prom.toFixed(1):Math.round(prom)}</b><span>promedio por ${unidad}</span></div>
      <div><b>${pico.n?_esc(pico.label):"—"}</b><span>${unidad} con más triages${pico.n?` (${pico.n})`:""}</span></div>
    </div>`;
    return;
  }
  const filas=_estFilas(r,_chartType);
  const tot=filas.reduce((a,f)=>a+f[1],0);
  const max=Math.max(1,...filas.map(f=>f[1]));
  el.innerHTML=filas.map(([lab,n,col])=>`<div class="est-row${n?"":" cero"}">
      <span class="est-dot" style="background:${col}"></span>
      <span class="est-lbl">${_esc(lab)}</span>
      <span class="est-bar"><i style="width:${Math.round(n*100/max)}%;background:${col}"></i></span>
      <span class="est-n">${n}</span><span class="est-p">${_estPct(n,tot)}%</span>
    </div>`).join("")
    +`<div class="est-tot"><span>Total</span><b>${tot}</b></div>`;
}

// ── Reporte PDF ─────────────────────────────────────────────
function _buildStatsPDF(r,{quien="",fecha=new Date()}={}){
  const {jsPDF}=window.jspdf||{};
  if(!jsPDF)return null;
  const pdf=new jsPDF({unit:"mm",format:"a4"});
  const W=210,PH=297,M=16,cw=W-M*2;
  const GRIS=[100,116,139],TEXTO=[30,30,30],PISTA=[232,236,242];
  const f=_pdfFlow(pdf,{top:M+4,bottom:PH-18});
  const fmt=ms=>new Date(ms).toLocaleDateString("es-CO",{day:"numeric",month:"short",year:"numeric"});

  // Encabezado
  pdf.setFillColor(11,17,32);pdf.rect(0,0,W,30,"F");
  _pdfFont(pdf,16,"bold",[255,255,255]);
  pdf.text("MedIA Suite — Reporte de estadísticas",M,13);
  _pdfFont(pdf,9,"normal",[170,190,210]);
  const rango=r.periodo==="day"?fmt(r.hasta):`${fmt(r.desde)} a ${fmt(r.hasta)}`;
  pdf.text(_pdfFit(pdf,`${_EST_PERIODOS[r.periodo]} (${rango})`,cw,9),M,20);
  pdf.text(_pdfFit(pdf,`Generado el ${fecha.toLocaleString("es-CO")}${quien?" por "+quien:""}`,cw,9),M,25.5);
  f.y=40;

  // Indicadores
  const kpis=[["Triages",r.total,[11,110,127]],["Inmediata",r.prioridad[0],_EST_PRIOR[0][4]],["Urgente",r.prioridad[1],_EST_PRIOR[1][4]],
    ["Puede esperar",r.prioridad[2],_EST_PRIOR[2][4]],["MCI",r.mci,[234,88,12]],["Prehospital",r.preh,[126,34,206]]];
  const gap=3,kw=(cw-gap*(kpis.length-1))/kpis.length,kh=20;
  kpis.forEach(([lab,n,col],i)=>{
    const x=M+i*(kw+gap);
    pdf.setFillColor(246,248,251);pdf.setDrawColor(222,227,235);pdf.roundedRect(x,f.y-6,kw,kh,2,2,"FD");
    _pdfFont(pdf,15,"bold",col);pdf.text(String(n),x+kw/2,f.y+3.5,{align:"center"});
    _pdfFont(pdf,7,"normal",GRIS);pdf.text(_pdfFit(pdf,lab,kw-3,7),x+kw/2,f.y+9.5,{align:"center"});
  });
  f.y+=kh+6;
  if(r.total){
    _pdfFont(pdf,9,"normal",GRIS);
    f.para(`Atendidos: ${r.atendidos} de ${r.total} (${_estPct(r.atendidos,r.total)}%). Críticos: ${_estPct(r.prioridad[0],r.total)}% del total.`,{x:M,width:cw,size:9,color:GRIS,after:4});
  }else{
    f.para("No hay triages registrados en este período.",{x:M,width:cw,size:10,color:GRIS,after:4});
  }

  const titulo=txt=>{f.ensure(16);_pdfFont(pdf,11,"bold",TEXTO);pdf.text(_pdfSafe(txt),M,f.y);
    pdf.setDrawColor(222,227,235);pdf.line(M,f.y+2,W-M,f.y+2);f.y+=9;};
  const barras=(txt,lista,vals)=>{
    titulo(txt);
    const tot=vals.reduce((a,b)=>a+b,0),max=Math.max(1,...vals);
    const labW=46,numW=24,barX=M+labW,barW=cw-labW-numW;
    lista.forEach((x,i)=>{
      f.ensure(8);
      const n=vals[i],y=f.y;
      _pdfFont(pdf,9,"normal",TEXTO);pdf.text(_pdfFit(pdf,x[2],labW-3,9),M,y);
      pdf.setFillColor(...PISTA);pdf.roundedRect(barX,y-3.3,barW,4.4,1,1,"F");
      if(n){pdf.setFillColor(...x[4]);pdf.roundedRect(barX,y-3.3,Math.max(1.5,barW*n/max),4.4,1,1,"F");}
      _pdfFont(pdf,9,"bold",TEXTO);pdf.text(`${n}`,W-M-10,y,{align:"right"});
      _pdfFont(pdf,8,"normal",GRIS);pdf.text(`${_estPct(n,tot)}%`,W-M,y,{align:"right"});
      f.y+=6.6;
    });
    f.y+=5;
  };
  barras("Por prioridad",_EST_PRIOR,r.prioridad);

  // Tendencia en columnas
  const tend=r.tendencia;
  titulo(r.periodo==="day"?"Triages por hora":"Triages por día");
  const altoG=38;f.ensure(altoG+12);
  const base=f.y+altoG,max=Math.max(1,...tend.map(x=>x.n));
  const paso=cw/Math.max(1,tend.length),ancho=Math.min(8,paso*0.7);
  pdf.setDrawColor(222,227,235);pdf.line(M,base,W-M,base);
  _pdfFont(pdf,7,"normal",GRIS);pdf.text(String(max),M,f.y-1);
  const cada=Math.ceil(tend.length/12); // etiquetas sin amontonarse
  tend.forEach((x,i)=>{
    const cx=M+paso*i+paso/2;
    if(x.n){const h=altoG*x.n/max;pdf.setFillColor(11,110,127);pdf.rect(cx-ancho/2,base-h,ancho,h,"F");}
    if(i%cada===0||i===tend.length-1){_pdfFont(pdf,6.5,"normal",GRIS);pdf.text(x.label,cx,base+4,{align:"center"});}
  });
  f.y=base+12;

  barras("Por motivo de consulta",_EST_MOTIVOS,r.motivo);
  barras("Por tipo de paciente",_EST_TIPOS,r.tipo);
  barras("Por origen",_EST_ORIGEN,r.origen);

  f.ensure(14);
  f.para("Datos tomados de los triages registrados en MedIA Suite. Las cifras son de apoyo a la gestión del servicio y no contienen datos personales de los pacientes.",{x:M,width:cw,size:7.5,color:GRIS});
  _pdfFooter(pdf,{left:"MedIA Suite — Reporte de estadísticas",margin:M});
  return pdf;
}

function exportStatsPDF(){
  if(typeof window.jspdf==="undefined"){toast("PDF no disponible — recarga la app");return;}
  try{
    const r=_estResumen(_chartData,_dashPrehDocs,_chartPer);
    const pdf=_buildStatsPDF(r,{quien:uName("")});
    if(!pdf){toast("No se pudo generar el PDF");return;}
    const d=new Date(),ymd=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    pdf.save(`estadisticas-${{day:"hoy",week:"7-dias",month:"30-dias"}[_chartPer]}-${ymd}.pdf`);
    logAudit("stats_pdf",{periodo:_chartPer,total:r.total});
    toast("PDF generado");
  }catch(e){toast("Error al generar PDF: "+e.message);console.error("[PDF]",e);}
}
