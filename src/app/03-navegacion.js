// 03-navegacion.js — Navegación entre pantallas, gráfica y centros cercanos
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden numérico desde index.html.
// NAV
// Los íconos (_icon) están en 00-iconos.js

// Orden por rol: las 4 primeras van en la barra inferior; el resto, en "Más".
// En escritorio la barra lateral muestra todas.
const NAV={
  admin:[{id:"dash",k:"dash"},{id:"triage",k:"triage"},{id:"cola",k:"cola"},{id:"hc",k:"hc"},{id:"meds",k:"meds"},{id:"hist",k:"hist"},{id:"scores",k:"scores"},{id:"config",k:"config"}],
  admin_hosp:[{id:"dash",k:"dash"},{id:"cola",k:"cola"},{id:"hc",k:"hc"},{id:"hist",k:"hist"},{id:"scores",k:"scores"},{id:"config",k:"config"}],
  medico:[{id:"triage",k:"triage"},{id:"cola",k:"cola"},{id:"hc",k:"hc"},{id:"meds",k:"meds"},{id:"hist",k:"hist"},{id:"scores",k:"scores"},{id:"config",k:"config"}],
  paciente:[{id:"meds",k:"meds"},{id:"hc",k:"hc"},{id:"config",k:"config"}],
};
const NAV_MAX=5; // botones visibles en la barra inferior (incluido "Más")

// Etiquetas cortas y claras para la navegación (no cambian los títulos de las pantallas)
const _NAV_LBL={
  es:{dash:"Inicio",hc:"Pacientes",hist:"Historial",meds:"Medicamentos",more:"Más"},
  en:{dash:"Home",hc:"Patients",hist:"History",meds:"Medications",more:"More"},
  pt:{dash:"Início",hc:"Pacientes",hist:"Histórico",meds:"Remédios",more:"Mais"},
  fr:{dash:"Accueil",hc:"Patients",hist:"Historique",meds:"Médicaments",more:"Plus"},
  de:{dash:"Start",hc:"Patienten",hist:"Verlauf",meds:"Medikamente",more:"Mehr"},
  ja:{dash:"ホーム",hc:"患者",hist:"履歴",meds:"薬",more:"その他"},
};
function _navLabel(k){const tx=L[CL]||L.es;return _NAV_LBL[CL]?.[k]||_NAV_LBL.es[k]||tx[k]||k;}
function _navSplit(items){
  if(items.length<=NAV_MAX)return{main:items,extra:[]};
  return{main:items.slice(0,NAV_MAX-1),extra:items.slice(NAV_MAX-1)};
}

function buildNav(){
  const items=NAV[CR]||NAV.medico;
  const {main,extra}=_navSplit(items);
  const bnav=document.getElementById("bnav");
  const activeId=_curTab||null;
  bnav.innerHTML=`<div class="nind" id="nind"></div>`;
  const addBtn=(id,label,onclick)=>{
    const b=document.createElement("button");
    b.className="nb";b.id="nb-"+id;b.type="button";
    b.setAttribute("aria-label",label);
    b.innerHTML=`<span class="ni">${_icon(id)}</span><span class="nl">${_esc(label)}</span>`;
    b.onclick=onclick;bnav.appendChild(b);
  };
  main.forEach(it=>addBtn(it.id,_navLabel(it.k),()=>navigateTo(it.id)));
  if(extra.length)addBtn("more",_navLabel("more"),()=>_openMoreSheet());
  const snav=document.getElementById("sidebarNav");snav.innerHTML="";
  items.forEach(it=>{
    const b=document.createElement("button");b.className="snav-btn";b.id="snb-"+it.id;b.type="button";
    b.innerHTML=`<span class="sni">${_icon(it.id,20)}</span>${_esc(_navLabel(it.k))}`;
    b.onclick=()=>navigateTo(it.id);snav.appendChild(b);
  });
  requestAnimationFrame(()=>_markActiveNav(activeId||items[0].id));
}

// Resalta el botón activo; si la pantalla está dentro de "Más", resalta "Más"
function _markActiveNav(id){
  document.querySelectorAll(".nb,.snav-btn").forEach(b=>b.classList.remove("on"));
  const enExtra=_navSplit(NAV[CR]||NAV.medico).extra.some(x=>x.id===id);
  const nb=document.getElementById("nb-"+id)||(enExtra?document.getElementById("nb-more"):null);
  if(nb)nb.classList.add("on");
  const snb=document.getElementById("snb-"+id);if(snb)snb.classList.add("on");
  const ind=document.getElementById("nind");
  const on=document.querySelector(".nb.on");
  // El resaltado cubre solo el botón (no el espacio de la barrita de inicio del iPhone)
  if(ind&&on){ind.style.width=on.offsetWidth+"px";ind.style.left=on.offsetLeft+"px";ind.style.top=on.offsetTop+"px";ind.style.height=on.offsetHeight+"px";ind.style.opacity="1";}
  else if(ind)ind.style.opacity="0";
}

// Hoja inferior con las secciones que no caben en la barra
function _openMoreSheet(){
  const {extra}=_navSplit(NAV[CR]||NAV.medico);
  let sh=document.getElementById("moreSheet");
  if(!sh){
    sh=document.createElement("div");sh.id="moreSheet";sh.className="more-sheet";
    sh.addEventListener("click",e=>{if(e.target===sh)_closeMoreSheet();});
    document.body.appendChild(sh);
  }
  sh.innerHTML=`<div class="more-panel" role="dialog" aria-label="${_esc(_navLabel("more"))}">
    <div class="more-handle"></div>
    ${extra.map(it=>`<button type="button" class="more-item${_curTab===it.id?" on":""}" onclick="_closeMoreSheet();navigateTo('${it.id}')">
      <span class="more-ic">${_icon(it.id,22)}</span><span>${_esc(_navLabel(it.k))}</span></button>`).join("")}
  </div>`;
  requestAnimationFrame(()=>sh.classList.add("on"));
}
function _closeMoreSheet(){const sh=document.getElementById("moreSheet");if(sh)sh.classList.remove("on");}

function navigateTo(id,_fh){
  _curTab=id;
  if(!_fh)history.pushState({_ms:'tab',id},'');
  document.querySelectorAll(".sc").forEach(s=>s.classList.remove("on"));
  const sc=document.getElementById("sc-"+id);if(sc)sc.classList.add("on");
  _markActiveNav(id);
  if(id==="dash")loadDash();
  if(id==="triage"){
    if(CR!=="paciente"&&!_triageLookupDone){_showPatientLookup();}
    else{
      if(_patientHC&&!TD.notas)_applyPatientHCToNotes();
      if(!_triageStartTime)_startTriageTimer();
      rTriage();
    }
  }
  if(id==="hist")loadHist();
  if(id==="cola")loadCola();
  if(id==="hc"){if(CR==="paciente"&&_patientHC?.id){viewHC(_patientHC.id);}else{loadHC();}}
  if(id==="config")loadConfig();
  if(id==="prof")loadProf();
  if(id==="scores")_initScoresTab();
  if(id==="meds"){ss("bs");setTimeout(_showDefaultDrugs,80);const _mp=CR==="paciente";const mlc=document.getElementById("medPatientLookupCard");if(mlc)mlc.style.display=_mp?"none":"";const mld=document.getElementById("medPatientDivider");if(mld)mld.style.display=_mp?"none":"";}
  if(id!=="cola")_stopColaTimer();
  document.getElementById("mainBody").scrollTop=0;
  // Show FABs only on triage tab
  const fab=document.getElementById('voiceFab');
  if(fab){fab.classList.toggle('vis',id==='triage');if(id!=='triage'&&_voiceMode){_voiceMode=false;fab.classList.remove('on');_vStop();}}
}

function updateUI(){
  const name=uName();
  const email=CU?.email||"";
  const RL={admin:"ADMIN",admin_hosp:"ADM. HOSP",medico:"MEDICO",paciente:"PACIENTE"};
  const RC={admin:"admin",admin_hosp:"admin_hosp",medico:"medico",paciente:"paciente"};
  const rb=document.getElementById("roleBadge");if(rb){rb.textContent=RL[CR]||CR;rb.className="role-badge "+(RC[CR]||"medico");}
  const av=name[0].toUpperCase();
  const cols=["#00c8f0","#00e07a","#a855f7","#ffb830"];
  const col=cols[av.charCodeAt(0)%cols.length];
  const photo=CUPhoto||localStorage.getItem("ms_photo_"+CU?.uid);
  const avInner=photo?`<img id="userAvSidebar" src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:`<span id="userAvSidebar" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center">${av}</span>`;
  const sc=document.getElementById("sideChip");
  if(sc)sc.innerHTML=`<div class="user-av" style="background:${photo?"transparent":col}">${avInner}</div><div><div class="user-name">${_esc(name)}</div><div class="user-role">${RL[CR]||CR}</div></div>`;
  document.getElementById("qrCard").style.display=(CR==="admin"||CR==="medico")?"block":"none";
  const pqr=document.getElementById("patientQRCard");if(pqr)pqr.style.display=(CR==="paciente"&&_patientHC?.doc)?"block":"none";
  if(CR==="paciente"&&_patientHC?.doc){const d=document.getElementById("patientIdDisplay");if(d)d.textContent=_patientHC.doc;}
}

// Estadísticas del inicio: ver src/app/21-estadisticas.js
let _dashAllDocs=[],_dashPeriod="day",_dashShown=5,_dashPrehDocs=[];

// NEARBY
let _nearbyMap=null;
const _OVERPASS_ENDPOINTS=[
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
];

function _haversine(lat1,lon1,lat2,lon2){
  const R=6371000,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

async function _fetchOverpass(query){
  const body='data='+encodeURIComponent(query);
  for(const url of _OVERPASS_ENDPOINTS){
    try{
      const r=await Promise.race([
        fetch(url,{method:"POST",body,headers:{"Content-Type":"application/x-www-form-urlencoded"}}),
        new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),15000))
      ]);
      if(r.ok){const d=await r.json();return d;}
    }catch(e){continue;}
  }
  throw new Error("all_failed");
}

function searchNearby(){
  const card=document.getElementById("nearbyCard");
  const status=document.getElementById("nearbyStatus");
  const mapEl=document.getElementById("nearbyMap");
  const btn=document.getElementById("nearbySearchBtn");
  if(!card)return;
  card.style.display="block";
  status.innerHTML=`<span class="sp"></span>&nbsp;${t("nearbyLocating")||"Obteniendo ubicacion..."}`;
  if(btn){btn.disabled=true;btn.textContent="⏳";}
  if(!navigator.geolocation){
    status.textContent="⚠️ "+(t("nearbyError")||"Geolocalización no disponible.");
    if(btn){btn.disabled=false;btn.textContent=t("nearbyBtn")||"Buscar";}
    return;
  }
  navigator.geolocation.getCurrentPosition(async pos=>{
    const {latitude:lat,longitude:lon,accuracy}=pos.coords;
    const eps=(document.getElementById("nearbyEpsInput")?.value||"").trim();
    const radius=6000;
    const query=`[out:json][timeout:25];(node["amenity"~"^(hospital|clinic|pharmacy|health_post|doctors|health_centre)$"](around:${radius},${lat},${lon});way["amenity"~"^(hospital|clinic|pharmacy|health_post|doctors|health_centre)$"](around:${radius},${lat},${lon});node["healthcare"](around:${radius},${lat},${lon}););out center 30;`;
    status.innerHTML=`<span class="sp"></span>&nbsp;${t("nearbySearching")||"Buscando..."}`;
    try{
      const data=await _fetchOverpass(query);
      let elements=data.elements||[];
      // Add distance and sort
      elements=elements.map(e=>{
        const elat=e.lat||e.center?.lat;const elon=e.lon||e.center?.lon;
        const dist=elat&&elon?_haversine(lat,lon,elat,elon):Infinity;
        return{...e,_dist:dist};
      }).sort((a,b)=>a._dist-b._dist);
      if(eps)elements=elements.filter(e=>{const n=(e.tags?.name||"").toLowerCase();return n.includes(eps.toLowerCase());});
      if(btn){btn.disabled=false;btn.textContent=t("nearbyBtn")||"Buscar";}
      renderNearby(lat,lon,elements);
    }catch(e){
      status.innerHTML=`❌ Error al buscar. <a href="https://www.google.com/maps/search/hospital+cl%C3%ADnica/@${lat},${lon},14z" target="_blank" style="color:var(--cy)">Abrir Google Maps →</a>`;
      if(btn){btn.disabled=false;btn.textContent=t("nearbyBtn")||"Buscar";}
    }
  },err=>{
    const msgs={1:"Permiso de ubicación denegado.",2:"Ubicación no disponible.",3:"Tiempo de espera agotado."};
    status.textContent="❌ "+(msgs[err.code]||"No se pudo obtener la ubicación.");
    if(btn){btn.disabled=false;btn.textContent=t("nearbyBtn")||"Buscar";}
  },{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
}

function renderNearby(lat,lon,elements){
  const status=document.getElementById("nearbyStatus");
  const list=document.getElementById("nearbyList");
  const mapEl=document.getElementById("nearbyMap");
  const gmBase=`https://www.google.com/maps/search/hospital+cl%C3%ADnica/@${lat},${lon},14z`;
  if(!elements.length){
    status.innerHTML=`📍 ${t("nearbyNone")||"Sin resultados."} <a href="${gmBase}" target="_blank" style="color:var(--cy);font-size:.75rem">Ver en Google Maps →</a>`;
    list.innerHTML="";if(mapEl)mapEl.style.display="none";return;
  }
  const shown=elements.slice(0,12);
  status.innerHTML=`📍 ${shown.length} ${t("nearbyFoundN")||"centros encontrados"} &nbsp;<a href="${gmBase}" target="_blank" style="color:var(--cy);font-size:.72rem;opacity:.8">Google Maps →</a>`;
  if(mapEl){
    mapEl.style.display="block";
    if(_nearbyMap){try{_nearbyMap.remove();}catch(er){}; _nearbyMap=null;}
    if(window.L){
      try{
        _nearbyMap=L.map("nearbyMap",{zoomControl:true,attributionControl:false}).setView([lat,lon],14);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19}).addTo(_nearbyMap);
        const uIcon=L.divIcon({html:"<div style='background:#00c8f0;border:3px solid #fff;border-radius:50%;width:14px;height:14px;box-shadow:0 0 8px #00c8f0'></div>",className:"",iconSize:[14,14],iconAnchor:[7,7]});
        L.marker([lat,lon],{icon:uIcon}).addTo(_nearbyMap).bindPopup("📍 Tu ubicación");
        const aic={"hospital":"🏥","clinic":"🏨","pharmacy":"💊","health_post":"🏥","doctors":"👨‍⚕️","health_centre":"🏥"};
        shown.forEach(e=>{
          const elat=e.lat||e.center?.lat;const elon=e.lon||e.center?.lon;
          if(!elat||!elon)return;
          const name=e.tags?.name||"Centro de salud";
          const am=e.tags?.amenity||"hospital";
          L.marker([elat,elon]).addTo(_nearbyMap).bindPopup(`<b>${aic[am]||"🏥"} ${_esc(name)}</b>`);
        });
        setTimeout(()=>{try{_nearbyMap.invalidateSize();}catch(er){}},300);
      }catch(er){
        mapEl.innerHTML=`<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${lon-.04},${lat-.04},${lon+.04},${lat+.04}&layer=mapnik&marker=${lat},${lon}" style="width:100%;height:100%;border:none" loading="lazy"></iframe>`;
      }
    }else{
      mapEl.innerHTML=`<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${lon-.04},${lat-.04},${lon+.04},${lat+.04}&layer=mapnik&marker=${lat},${lon}" style="width:100%;height:100%;border:none" loading="lazy"></iframe>`;
    }
  }
  const aic={"hospital":"🏥","clinic":"🏨","pharmacy":"💊","health_post":"🏥","doctors":"👨‍⚕️","health_centre":"🏥"};
  list.innerHTML=shown.map(e=>{
    const name=e.tags?.name||"Centro de salud";
    const addr=e.tags?.["addr:street"]?`${e.tags["addr:street"]} ${e.tags["addr:housenumber"]||""}`.trim():"";
    const am=e.tags?.amenity||e.tags?.healthcare||"hospital";
    const dist=e._dist<1000?`${Math.round(e._dist)}m`:`${(e._dist/1000).toFixed(1)}km`;
    const phone=e.tags?.phone||e.tags?.["contact:phone"]||"";
    const elat=e.lat||e.center?.lat;const elon=e.lon||e.center?.lon;
    const gmDir=elat&&elon?`https://www.google.com/maps/dir/?api=1&destination=${elat},${elon}`:"";
    return`<div class="near-item"${gmDir?` onclick="window.open('${gmDir}','_blank')" style="cursor:pointer"`:""}><span class="near-icon">${aic[am]||"🏥"}</span><div style="flex:1;min-width:0"><div class="near-name">${_esc(name)}</div>${addr?`<div class="near-addr">${addr}</div>`:""}<div style="display:flex;gap:8px;align-items:center;margin-top:2px">${phone?`<span style="font-size:.65rem;color:var(--mu)">📞 ${_esc(phone)}</span>`:""}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px"><span class="near-dist">${dist}</span>${gmDir?`<span style="font-size:.6rem;color:var(--cy);opacity:.75">Maps →</span>`:""}</div></div>`;
  }).join("");
}



// iOS 26 instalado como app: a veces el área visible termina antes del borde inferior.
// Si pasa, se marca <html class="vp-short"> para no sumar otra vez el espacio inferior.
function _checkIOSViewport(){
  const standalone=window.navigator.standalone===true||window.matchMedia("(display-mode: standalone)").matches;
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  if(!standalone||!ios){document.documentElement.classList.remove("vp-short");return;}
  const landscape=window.innerWidth>window.innerHeight;
  const screenH=landscape?Math.min(screen.width,screen.height):Math.max(screen.width,screen.height);
  document.documentElement.classList.toggle("vp-short",screenH-window.innerHeight>20);
  const on=document.querySelector(".nb.on");if(on&&typeof _curTab!=="undefined"&&_curTab)_markActiveNav(_curTab);
}
_checkIOSViewport();
window.addEventListener("resize",()=>setTimeout(_checkIOSViewport,60));
window.addEventListener("orientationchange",()=>setTimeout(_checkIOSViewport,300));
