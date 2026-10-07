// 24-avisos.js — Aviso cuando un paciente rojo supera su tiempo objetivo.
//
// Mientras la app está abierta (aunque esté en otra pestaña o minimizada), el personal
// de salud recibe un aviso cuando un paciente ROJO sin atender supera COLA_DEADLINE.ROJO:
//  · una franja roja dentro de la app con el botón "Ver cola",
//  · sonido y vibración,
//  · y una notificación del sistema si se dio permiso (Ajustes → Avisos de pacientes rojos).
// Cada paciente avisa una sola vez por sesión. Con la app cerrada no llegan avisos:
// eso requiere notificaciones push desde un servidor (ver README).

let _avUnsub=null,_avTimer=null,_avReinicio=null,_avDocs=[];
let _avAvisados=new Set();
try{_avAvisados=new Set(JSON.parse(sessionStorage.getItem("ms_avisados")||"[]"));}catch(_){}
const _AV_ROLES=["medico","admin","admin_hosp"];
const _avActivo=()=>{try{return localStorage.getItem("ms_avisos")!=="off";}catch(_){return true;}};

function iniciarAvisos(){
  detenerAvisos();
  if(!FB||!CU||!_AV_ROLES.includes(CR)||!_avActivo())return;
  try{
    // Triages de las últimas 12 horas (un solo filtro de rango: no necesita índice compuesto);
    // los rojos sin atender se filtran aquí, porque los triages nuevos no siempre traen "atendido".
    const desde=new Date(Date.now()-12*3600000);
    const q=FB.query(FB.collection(FB.db,"triages"),FB.where("createdAt",">=",desde),FB.orderBy("createdAt","desc"),FB.limit(300));
    _avUnsub=FB.onSnapshot(q,snap=>{
      _avDocs=snap.docs.map(d=>({id:d.id,...d.data()})).filter(d=>d.clasificacion==="ROJO"&&!d.atendido);
      _avRevisar();
    },()=>{});
  }catch(_){return;}
  _avTimer=setInterval(_avRevisar,30000);
  _avReinicio=setTimeout(iniciarAvisos,3*3600000); // renueva la ventana de 12 h en sesiones largas
}
function detenerAvisos(){
  if(_avUnsub){try{_avUnsub();}catch(_){}_avUnsub=null;}
  if(_avTimer){clearInterval(_avTimer);_avTimer=null;}
  if(_avReinicio){clearTimeout(_avReinicio);_avReinicio=null;}
  _avDocs=[];
}

function _avRevisar(){
  const lim=(window.COLA_DEADLINE&&COLA_DEADLINE.ROJO)||15,ahora=Date.now();
  const nuevos=_avDocs.filter(d=>{
    const ms=d.createdAt?.toMillis?.();
    return ms&&ahora-ms>lim*60000&&!d.atendido&&!_avAvisados.has(d.id);
  });
  if(!nuevos.length)return;
  nuevos.forEach(d=>_avAvisados.add(d.id));
  try{sessionStorage.setItem("ms_avisados",JSON.stringify([..._avAvisados]));}catch(_){}
  _avNotificar(nuevos,lim);
}

const _AV_MOT={dolor_pecho:"Dolor de pecho",disnea:"Dificultad respiratoria",trauma:"Trauma",abdominal:"Dolor abdominal",neuro:"Neurológico",fiebre:"Fiebre",otro:"Otro motivo"};
function _avNotificar(lista,lim){
  const d=lista[0],min=Math.floor((Date.now()-d.createdAt.toMillis())/60000);
  const quien=d.pacienteNombre||(typeof _tipoLabel==="function"?_tipoLabel(d.tipo):"Paciente");
  const titulo=lista.length===1?"Paciente rojo superó su tiempo":`${lista.length} pacientes rojos superaron su tiempo`;
  const cuerpo=lista.length===1?`${_AV_MOT[d.motivo]||"Triage rojo"} · ${quien} · ${min} min esperando (objetivo ${lim} min)`:"Revisa la cola de espera: necesitan atención inmediata.";
  _avFranja(titulo,cuerpo);
  _avSonido();
  try{navigator.vibrate&&navigator.vibrate([220,120,220]);}catch(_){}
  if("Notification" in window&&Notification.permission==="granted"&&navigator.serviceWorker){
    navigator.serviceWorker.getRegistration().then(reg=>{
      if(reg)reg.showNotification(titulo,{body:cuerpo,tag:"rojo-"+d.id,icon:"./icon-192.png",badge:"./favicon-32.png",requireInteraction:true,data:{abrir:"cola"}});
      else new Notification(titulo,{body:cuerpo,icon:"./icon-192.png"});
    }).catch(()=>{});
  }
}

function _avFranja(titulo,cuerpo){
  let f=document.getElementById("avisoRojo");
  if(!f){
    f=document.createElement("div");f.id="avisoRojo";f.className="aviso-rojo";f.setAttribute("role","alert");
    document.body.appendChild(f);
  }
  f.innerHTML=`<div class="aviso-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg></div>
    <div class="aviso-txt"><b>${_esc(titulo)}</b><span>${_esc(cuerpo)}</span></div>
    <button type="button" class="aviso-ver" onclick="_avCerrar();navigateTo('cola')">Ver cola</button>
    <button type="button" class="aviso-x" onclick="_avCerrar()" aria-label="Cerrar aviso">✕</button>`;
  requestAnimationFrame(()=>f.classList.add("on"));
}
function _avCerrar(){const f=document.getElementById("avisoRojo");if(f)f.classList.remove("on");}

// Dos tonos cortos con Web Audio (sin archivos de sonido)
function _avSonido(){
  try{
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
    const ctx=_avSonido.ctx||(_avSonido.ctx=new C());
    [0,.28].forEach((t,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type="sine";o.frequency.value=i?660:880;
      g.gain.setValueAtTime(.0001,ctx.currentTime+t);
      g.gain.exponentialRampToValueAtTime(.25,ctx.currentTime+t+.02);
      g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+t+.22);
      o.connect(g).connect(ctx.destination);o.start(ctx.currentTime+t);o.stop(ctx.currentTime+t+.25);
    });
  }catch(_){}
}

// ── Ajustes: activar/desactivar y pedir permiso de notificaciones ──
async function toggleAvisos(){
  // Si están activos pero falta el permiso del sistema, el toque pide el permiso (no los apaga)
  if(_avActivo()&&"Notification" in window&&Notification.permission==="default"){
    try{await Notification.requestPermission();}catch(_){}
    _avRefrescarAjuste();return;
  }
  const on=!_avActivo();
  try{localStorage.setItem("ms_avisos",on?"on":"off");}catch(_){}
  if(on&&"Notification" in window&&Notification.permission==="default"){
    try{await Notification.requestPermission();}catch(_){}
  }
  if(on)iniciarAvisos();else detenerAvisos();
  _avRefrescarAjuste();
  toast(on?"Avisos de pacientes rojos activados":"Avisos desactivados");
}
function _avRefrescarAjuste(){
  const sw=document.getElementById("setAvisosSw"),sub=document.getElementById("setAvisosS"),row=document.getElementById("setAvisosRow");
  if(!sw)return;
  if(row)row.style.display=_AV_ROLES.includes(CR)?"":"none";
  const on=_avActivo();sw.classList.toggle("on",on);
  const perm="Notification" in window?Notification.permission:"unsupported";
  sub.textContent=!on?"Desactivados":perm==="granted"?"En la app y como notificación del sistema":perm==="denied"?"En la app · notificaciones bloqueadas en el navegador":"En la app · toca para permitir notificaciones";
}
// Desde la notificación del sistema: el service worker pide abrir la cola
if(navigator.serviceWorker)navigator.serviceWorker.addEventListener("message",e=>{if(e.data&&e.data.type==="OPEN_COLA"&&typeof navigateTo==="function")navigateTo("cola");});
