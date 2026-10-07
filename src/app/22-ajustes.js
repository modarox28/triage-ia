// 22-ajustes.js — Ajustes con navegación tipo iOS.
//
// La lista principal abre subpáginas (Apariencia, Idioma, País, Cuenta) que entran
// deslizándose desde la derecha; la lista se corre un poco a la izquierda detrás.
// "Atrás" (botón, gesto del navegador o del teléfono) hace el camino inverso.
// Cada página muestra sus filas en cascada y los selectores mueven una píldora
// con efecto resorte. Con "reducir movimiento" activado todo cambia sin animación.

let _setSub=null,_setMainScroll=0,_setBusy=false;
const _SET_EASE="cubic-bezier(.32,.72,0,1)";
const _setReduce=()=>window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
const _setBody=()=>document.getElementById("mainBody");

// Filas en cascada al entrar a una página
function _setCascade(page){
  if(_setReduce())return;
  page.querySelectorAll(".set-anim").forEach((el,i)=>{
    el.animate([{opacity:0,transform:"translateY(10px)"},{opacity:1,transform:"none"}],
      {duration:380,delay:Math.min(i,10)*35,easing:_SET_EASE,fill:"backwards"});
  });
}

// Transición entre dos páginas: dir=1 entra la nueva desde la derecha, dir=-1 vuelve.
// La página que sale se saca del flujo (absoluta) en la misma posición en que se veía,
// así no salta aunque cambie el scroll.
function _setSlide(from,to,dir,done){
  const body=_setBody();
  const antes=body?body.scrollTop:0,despues=dir>0?0:_setMainScroll;
  to.hidden=false;
  if(body)body.scrollTop=despues;
  if(_setReduce()||!from.animate){from.hidden=true;done&&done();return;}
  _setBusy=true;
  Object.assign(from.style,{position:"absolute",top:(despues-antes)+"px",left:"0",right:"0",zIndex:dir>0?"0":"2"});
  to.style.position="relative";to.style.zIndex=dir>0?"2":"0";
  const dur=440,op={duration:dur,easing:_SET_EASE};
  const sale=dir>0?[{transform:"translateX(0)",opacity:1},{transform:"translateX(-28%)",opacity:.3}]
                  :[{transform:"translateX(0)"},{transform:"translateX(100%)"}];
  const entra=dir>0?[{transform:"translateX(100%)"},{transform:"translateX(0)"}]
                   :[{transform:"translateX(-28%)",opacity:.3},{transform:"translateX(0)",opacity:1}];
  const a=from.animate(sale,op);to.animate(entra,op);
  a.onfinish=a.oncancel=()=>{
    from.hidden=true;
    Object.assign(from.style,{position:"",top:"",left:"",right:"",zIndex:""});
    Object.assign(to.style,{position:"",zIndex:""});
    _setBusy=false;done&&done();
  };
}

function _setOpen(id){
  const to=document.getElementById("setp-"+id),from=document.getElementById("setp-main");
  if(!to||_setSub===id||_setBusy)return;
  _setMainScroll=_setBody()?.scrollTop||0;
  _setSub=id;
  history.pushState({_ms:"set",sub:id},"");
  _setRefresh();
  _setSlide(from,to,1);
  _setCascade(to);
  if(id==="idioma")_setHello(false);
  requestAnimationFrame(()=>_setPills(to));
}
function _setBack(){
  if(!_setSub)return;
  const from=document.getElementById("setp-"+_setSub),to=document.getElementById("setp-main");
  _setSub=null;
  _setRefresh();
  _setSlide(from,to,-1);
}
// Al entrar a Ajustes desde otra pestaña siempre se ve la lista principal
function _setReset(){
  if(!_setSub)return;
  document.querySelectorAll(".set-page").forEach(p=>{p.hidden=p.id!=="setp-main";p.getAnimations?.().forEach(a=>a.cancel());});
  _setSub=null;_setBusy=false;
}

// ── Píldoras de los selectores (tema y tamaño de texto) ──
function _setPill(seg,instant){
  if(!seg)return;
  const pill=seg.querySelector(".seg-pill"),on=seg.querySelector("button.on");
  if(!pill)return;
  if(!on||!on.offsetWidth){pill.style.opacity="0";return;}
  if(instant)pill.style.transition="none";
  pill.style.opacity="1";
  pill.style.width=on.offsetWidth+"px";
  pill.style.transform=`translateX(${on.offsetLeft}px)`;
  if(instant){pill.offsetWidth;pill.style.transition="";}
}
function _setPills(scope,instant){(scope||document).querySelectorAll(".set-seg").forEach(s=>_setPill(s,instant));}

// ── Tamaño de texto ──
function setZoom(v){
  _zoomLevel=v;
  document.documentElement.style.setProperty("--zoom",v);
  try{localStorage.setItem("ms_zoom",v);}catch(_){}
  _updateZoomLbl();_setRefresh();
  // la letra cambia el ancho de todo: se recoloca la píldora cuando termina de acomodarse
  requestAnimationFrame(()=>_setPills());
}

// ── Saludo del idioma ──
const _HELLO={es:["Hola","Menús y textos en español"],en:["Hello","Menus and text in English"],pt:["Olá","Menus e textos em português"],
  fr:["Bonjour","Menus et textes en français"],de:["Hallo","Menüs und Texte auf Deutsch"],ja:["こんにちは","メニューとテキストは日本語"]};
function _setHello(animar){
  const w=document.getElementById("helloW"),s=document.getElementById("helloS");if(!w||!s)return;
  const [hola,sub]=_HELLO[CL]||_HELLO.es;
  if(w.textContent===hola&&s.textContent===sub)return;
  if(!animar||_setReduce()||!w.animate){w.textContent=hola;s.textContent=sub;return;}
  const fuera=[{opacity:1,filter:"blur(0)",transform:"none"},{opacity:0,filter:"blur(8px)",transform:"translateY(-10px) scale(.96)"}];
  const dentro=[{opacity:0,filter:"blur(8px)",transform:"translateY(10px) scale(.96)"},{opacity:1,filter:"blur(0)",transform:"none"}];
  const a=w.animate(fuera,{duration:170,easing:"ease-in"});s.animate(fuera,{duration:170,easing:"ease-in"});
  a.onfinish=()=>{w.textContent=hola;s.textContent=sub;
    w.animate(dentro,{duration:380,easing:_SET_EASE});s.animate(dentro,{duration:380,delay:40,easing:_SET_EASE,fill:"backwards"});};
}

// ── Textos de la lista principal ──
const _SET_LANG_N={es:"Español",en:"English",pt:"Português",fr:"Français",de:"Deutsch",ja:"日本語"};
const _SET_CTR_N={CO:"Colombia",AR:"Argentina",US:"Estados Unidos",DE:"Alemania",JP:"Japón"};
function _setRefresh(){
  const $=id=>document.getElementById(id);
  if(!$("setp-main"))return;
  // Perfil
  if(typeof CU!=="undefined"&&CU){
    const nombre=uName();
    $("setName").textContent=nombre;$("setEmail").textContent=CU.email&&!CU.email.endsWith("@"+(typeof PATIENT_DOMAIN!=="undefined"?PATIENT_DOMAIN:"x"))?CU.email:(CR==="paciente"?"Paciente":"");
    const src=$("profRole");if(src){$("setRole").textContent=src.textContent;$("setRole").className=src.className;}
    const av=$("setAv"),foto=$("configPhotoAv");
    if(av&&foto){av.innerHTML=foto.innerHTML||_esc(nombre[0]||"?");av.style.background=foto.style.background||"var(--cy)";}
  }
  // Tema (fila rápida con interruptor)
  const oscuro=typeof isDark==="undefined"?true:isDark;
  const sw=$("setThemeSw");if(sw)sw.classList.toggle("on",oscuro);
  $("setThemeT").textContent=oscuro?"Modo oscuro":"Modo claro";
  $("setThemeS").textContent=(typeof _themePref!=="undefined"&&_themePref==="auto"?"Automático · ":"")+(oscuro?"Toca para cambiar a claro":"Toca para cambiar a oscuro");
  const ic=$("setThemeIc");if(ic&&typeof _ICO_MOON!=="undefined")ic.innerHTML=oscuro?_ICO_MOON:_ICO_SUN;
  // Subtítulos
  const tema={dark:"Oscuro",light:"Claro",auto:"Automático"}[typeof _themePref!=="undefined"?_themePref:"dark"]||"Oscuro";
  $("setApSub").textContent=`${tema} · Texto ${Math.round((typeof _zoomLevel!=="undefined"?_zoomLevel:1)*100)}%`;
  $("setLangSub").textContent=_SET_LANG_N[CL]||"Español";
  $("setCtrSub").textContent=_SET_CTR_N[typeof CC!=="undefined"?CC:"CO"]||"Colombia";
  // Selección de idioma, país y tamaño
  Object.keys(_SET_LANG_N).forEach(l=>{const b=$("lng-"+l);if(b){b.classList.toggle("sel",l===CL);b.setAttribute("aria-pressed",l===CL);}});
  Object.keys(_SET_CTR_N).forEach(c=>{const b=$("ctr-"+c);if(b){const on=typeof CC!=="undefined"&&c===CC;b.classList.toggle("sel",on);b.setAttribute("aria-pressed",on);}});
  document.querySelectorAll("#setZoomSeg button[data-zoom]").forEach(b=>{
    const on=Math.abs(parseFloat(b.dataset.zoom)-(typeof _zoomLevel!=="undefined"?_zoomLevel:1))<.01;b.classList.toggle("on",on);b.setAttribute("aria-pressed",on);});
  _setPills();
  if(typeof _avRefrescarAjuste==="function")_avRefrescarAjuste();
  const er=$("setErrRow");if(er)er.style.display=CR==="admin"?"":"none";
}

// Al cambiar de idioma o país: refrescar textos y animar el saludo
(function(){
  const origLang=setLang;
  setLang=function(l){origLang(l);_setRefresh();_setHello(true);};
  const origCtr=setCountry;
  setCountry=function(c){origCtr(c);_setRefresh();};
  const origCfg=loadConfig;
  loadConfig=function(){origCfg();_setRefresh();requestAnimationFrame(()=>_setPills(null,true));};
  window.addEventListener("resize",()=>_setPills(null,true));
})();

// En una subpágina, el título pequeño de la barra aparece cuando el título grande sale de la vista
document.addEventListener("scroll",e=>{
  if(!_setSub||!e.target||e.target.id!=="mainBody")return;
  const pg=document.getElementById("setp-"+_setSub);if(!pg)return;
  const h1=pg.querySelector(".set-h1"),t=pg.querySelector(".set-bar-t"),bar=pg.querySelector(".set-bar");
  if(!h1&&t)t.style.opacity="1";
  else if(h1&&t&&bar)t.style.opacity=h1.getBoundingClientRect().bottom<bar.getBoundingClientRect().bottom+4?"1":"0";
},{capture:true,passive:true});
