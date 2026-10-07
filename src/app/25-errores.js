// 25-errores.js — Registro de errores de la app en los dispositivos de los usuarios.
//
// Captura los errores de JavaScript (window.onerror y promesas rechazadas) y los guarda
// en Firestore (colección errorLogs) para que el administrador los vea en
// Ajustes → Errores reportados. Así un fallo en el celular de alguien se ve sin que
// tenga que avisar. Límites: 8 errores por sesión, sin repetir el mismo mensaje.
// No se guardan datos clínicos: solo el mensaje técnico, dónde ocurrió, navegador y versión.

const _ERR_MAX=8;
const _errVistos=new Map(); // mensaje -> veces
let _errEnviados=0,_errCola=[];

function _errVersion(){
  const s=document.querySelector('script[src*="00-estado.js"]');
  const m=s&&s.getAttribute("src").match(/v=(\d+)/);
  return m?"v"+m[1]:"";
}
function _errLimpiar(t,max){return String(t||"").replace(/\b\d{6,}\b/g,"#").slice(0,max);} // sin números largos (documentos)

function _errRegistrar(msg,src,stack){
  msg=_errLimpiar(msg,500);
  if(!msg||/ResizeObserver loop|Script error\.?$/i.test(msg))return; // ruido conocido sin información
  const n=(_errVistos.get(msg)||0)+1;_errVistos.set(msg,n);
  if(n>1||_errEnviados>=_ERR_MAX)return;
  _errEnviados++;
  _errCola.push({msg,src:_errLimpiar(src,300),stack:_errLimpiar(stack,2000),url:location.pathname+location.search.replace(/[?&]demo=1/,""),ua:navigator.userAgent.slice(0,300),version:_errVersion()});
  _errEnviar();
}

async function _errEnviar(){
  // Se envían cuando hay sesión (las reglas lo exigen); en el modo demo solo se muestran en la consola
  if(!_errCola.length||typeof FB==="undefined"||!FB||!CU||FB._demo)return;
  const lote=_errCola.splice(0);
  for(const e of lote){
    try{await FB.addDoc(FB.collection(FB.db,"errorLogs"),{...e,userId:CU.uid,role:CR||"",count:1,ts:FB.serverTimestamp()});}catch(_){}
  }
}

window.addEventListener("error",e=>{
  if(e.target&&e.target!==window&&(e.target.src||e.target.href))return; // fallos de carga de imágenes/recursos
  _errRegistrar(e.message,(e.filename||"").split("/").pop()+":"+(e.lineno||0)+":"+(e.colno||0),e.error&&e.error.stack);
});
window.addEventListener("unhandledrejection",e=>{
  const r=e.reason;
  // Los errores de red de Firebase sin conexión no son fallos de la app
  if(r&&/offline|unavailable|network/i.test(String(r.code||r.message||"")))return;
  _errRegistrar(r&&(r.message||r.code)||String(r),"promesa",r&&r.stack);
});
// Lo que ocurrió antes de iniciar sesión se envía al entrar
setInterval(()=>{if(_errCola.length)_errEnviar();},20000);

// ── Ajustes (solo admin): lista de errores ──
async function _errCargar(){
  const el=document.getElementById("errList");if(!el)return;
  if(!FB||CR!=="admin"){el.innerHTML='<div class="err-vacio">Solo el administrador puede ver los errores.</div>';return;}
  if(FB._demo){el.innerHTML='<div class="err-vacio">En el modo demo no se guardan errores.</div>';return;}
  el.innerHTML='<div class="err-vacio">Cargando…</div>';
  try{
    const snap=await FB.getDocs(FB.query(FB.collection(FB.db,"errorLogs"),FB.orderBy("ts","desc"),FB.limit(50)));
    if(snap.empty){el.innerHTML='<div class="err-vacio">No hay errores reportados. Todo en orden.</div>';return;}
    const loc={es:"es-CO",en:"en-US",pt:"pt-BR",fr:"fr-FR",de:"de-DE",ja:"ja-JP"}[CL]||"es-CO";
    el.innerHTML=snap.docs.map(d=>{
      const e=d.data(),f=e.ts?.toDate?.()?.toLocaleString(loc,{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})||"";
      const disp=/iPhone|iPad/.test(e.ua)?"iPhone/iPad":/Android/.test(e.ua)?"Android":/Mac/.test(e.ua)?"Mac":/Windows/.test(e.ua)?"Windows":"Otro";
      return`<details class="err-item"><summary><b>${_esc(e.msg)}</b><small>${_esc(f)} · ${_esc(disp)} · ${_esc(e.role||"")} · ${_esc(e.version||"")}</small></summary>
        <pre>${_esc(e.src||"")}\n${_esc(e.stack||"")}\n\n${_esc(e.ua||"")}</pre></details>`;
    }).join("");
  }catch(e){el.innerHTML=`<div class="err-vacio">No se pudieron cargar: ${_esc(e.message)}</div>`;}
}
async function _errBorrarTodo(){
  if(!FB||CR!=="admin"||FB._demo)return;
  try{
    const snap=await FB.getDocs(FB.query(FB.collection(FB.db,"errorLogs"),FB.limit(200)));
    await Promise.all(snap.docs.map(d=>FB.deleteDoc(FB.doc(FB.db,"errorLogs",d.id))));
    toast("Errores borrados");_errCargar();
  }catch(e){toast("No se pudieron borrar: "+e.message);}
}
