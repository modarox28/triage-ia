// 23-guia.js — Guía rápida del modo demo.
//
// La primera vez que alguien entra a la demo, unos globos señalan las partes clave
// (críticos, nuevo triage, cola, estadísticas y ajustes). Se puede saltar en cualquier
// momento y volver a ver desde el botón "Guía" de la franja amarilla de la demo.

const _GUIA_KEY="ms_guia_demo_v1";
let _guia=null; // {i, pasos, capa, hueco, globo}

function _guiaPasos(){
  const ancho=window.innerWidth>=768;
  return[
    {sel:"#dashCritical",t:"Críticos en espera",d:"Los pacientes rojos que todavía no han sido atendidos. Si alguno supera su tiempo objetivo, aquí lo ves primero."},
    {sel:"#dashNewTriage",t:"Nuevo triage",d:"Registra los signos vitales y los síntomas. La IA sugiere una prioridad y explica por qué; la decisión es del profesional."},
    {sel:ancho?"#snb-cola":"#nb-cola",t:"Cola de espera",d:"Todos los pacientes ordenados por prioridad, con el tiempo que les queda. Los vencidos se resaltan."},
    {sel:"#chartCard",t:"Estadísticas del turno",d:"Pacientes por prioridad, motivo y tipo, hoy o en 7 y 30 días. El reporte se descarga en PDF."},
    {sel:ancho?"#snb-config":"#nb-more",t:"Ajustes",d:"Tema claro u oscuro, idioma y tamaño de letra. Todo en la demo es ficticio: explora sin miedo."},
  ];
}

function iniciarGuia(forzar){
  if(_guia)return;
  if(!forzar){try{if(localStorage.getItem(_GUIA_KEY))return;}catch(_){}}
  if(typeof navigateTo==="function"&&_curTab!=="dash")navigateTo("dash");
  const capa=document.createElement("div");capa.className="guia-capa";capa.addEventListener("click",e=>{if(e.target===capa)_guiaFin();});
  const hueco=document.createElement("div");hueco.className="guia-hueco";
  const globo=document.createElement("div");globo.className="guia-globo";globo.setAttribute("role","dialog");globo.setAttribute("aria-modal","true");globo.setAttribute("aria-labelledby","guiaT");
  capa.append(hueco,globo);document.body.appendChild(capa);
  _guia={i:0,pasos:_guiaPasos(),capa,hueco,globo};
  document.addEventListener("keydown",_guiaTecla);
  addEventListener("resize",_guiaPos);
  _guiaMostrar(0);
}

function _guiaTecla(e){
  if(!_guia)return;
  if(e.key==="Escape")_guiaFin();
  else if(e.key==="ArrowRight"||e.key==="Enter")_guiaSig();
  else if(e.key==="ArrowLeft"&&_guia.i>0)_guiaMostrar(_guia.i-1);
}

function _guiaMostrar(i){
  const g=_guia;if(!g)return;
  g.i=i;
  const p=g.pasos[i],el=document.querySelector(p.sel);
  if(!el||!el.offsetParent){ // si el elemento no está visible (p. ej. rol distinto), se salta
    if(i<g.pasos.length-1)return _guiaMostrar(i+1);
    return _guiaFin();
  }
  // Lleva el elemento a la vista dentro del área con scroll
  const cuerpo=document.getElementById("mainBody");
  if(cuerpo&&cuerpo.contains(el)){
    const r=el.getBoundingClientRect(),rc=cuerpo.getBoundingClientRect();
    if(r.top<rc.top+20||r.bottom>rc.bottom-120)cuerpo.scrollTo({top:cuerpo.scrollTop+r.top-rc.top-90,behavior:"smooth"});
  }
  const ultimo=i===g.pasos.length-1;
  g.globo.innerHTML=`<div class="guia-paso">${i+1} de ${g.pasos.length}</div>
    <h3 id="guiaT">${_esc(p.t)}</h3><p>${_esc(p.d)}</p>
    <div class="guia-btns">
      <button type="button" class="guia-saltar" onclick="_guiaFin()">${ultimo?"Cerrar":"Saltar guía"}</button>
      <div style="display:flex;gap:8px">
        ${i>0?'<button type="button" class="guia-atras" onclick="_guiaMostrar(_guia.i-1)" aria-label="Paso anterior">Atrás</button>':""}
        <button type="button" class="guia-sig" onclick="_guiaSig()">${ultimo?"Empezar a explorar":"Siguiente"}</button>
      </div>
    </div>`;
  setTimeout(_guiaPos,ultimo||i===3?380:30);
  setTimeout(()=>g.globo.querySelector(".guia-sig")?.focus({preventScroll:true}),60);
}

function _guiaPos(){
  const g=_guia;if(!g)return;
  const el=document.querySelector(g.pasos[g.i].sel);if(!el)return;
  const r=el.getBoundingClientRect(),m=8;
  Object.assign(g.hueco.style,{top:(r.top-m)+"px",left:(r.left-m)+"px",width:(r.width+m*2)+"px",height:(r.height+m*2)+"px"});
  // El globo va debajo del elemento si cabe; si no, encima
  const gw=Math.min(340,innerWidth-24),gh=g.globo.offsetHeight||180;
  let top=r.bottom+m+14;
  if(top+gh>innerHeight-12)top=Math.max(12,r.top-m-14-gh);
  let left=Math.min(Math.max(12,r.left+r.width/2-gw/2),innerWidth-gw-12);
  Object.assign(g.globo.style,{top:top+"px",left:left+"px",width:gw+"px"});
}

function _guiaSig(){
  if(!_guia)return;
  if(_guia.i<_guia.pasos.length-1)_guiaMostrar(_guia.i+1);else _guiaFin();
}

function _guiaFin(){
  if(!_guia)return;
  try{localStorage.setItem(_GUIA_KEY,"1");}catch(_){}
  const c=_guia.capa;c.classList.add("fuera");setTimeout(()=>c.remove(),250);
  document.removeEventListener("keydown",_guiaTecla);
  removeEventListener("resize",_guiaPos);
  _guia=null;
  const cuerpo=document.getElementById("mainBody");if(cuerpo)cuerpo.scrollTo({top:0,behavior:"smooth"});
}

// Se reposiciona mientras el área de la app hace scroll
document.addEventListener("scroll",()=>{if(_guia)_guiaPos();},{capture:true,passive:true});
