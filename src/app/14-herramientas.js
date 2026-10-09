// 14-herramientas.js — Vitales por imagen, modo offline, prehospital, entrega de turno y dosis pediátrica
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden numérico desde index.html.
// ── RECONOCIMIENTO DE VITALES POR IMAGEN ──────────────────────────────────
let _vitcamB64=null,_vitcamExtracted=null;

function openVitcam(){
  const tx=L[CL]||L.es;
  _vitcamB64=null;_vitcamExtracted=null;
  document.getElementById("vitcamTitleTxt").textContent=tx.vitcamTitle||"Vitales por imagen";
  document.getElementById("vitcamSubTxt").textContent=tx.vitcamSub||"Fotografía el monitor y la IA extrae los valores";
  document.getElementById("vitcamDropTxt").textContent=tx.vitcamDrop||"Toca para fotografiar o seleccionar imagen";
  document.getElementById("vitcamAnalyzeTxt").textContent="🔍 "+(tx.vitcamAnalyze||"Analizar imagen");
  document.getElementById("vitcamApplyTxt").textContent=tx.vitcamApply||"Aplicar vitales";
  document.getElementById("vitcamPreview").style.display="none";
  document.getElementById("vitcamDrop").style.display="";
  document.getElementById("vitcamResult").style.display="none";
  document.getElementById("vitcamAnalyzeBtn").style.display="none";
  document.getElementById("vitcamApplyBtn").style.display="none";
  document.getElementById("vitcamFileIn").value="";
  document.getElementById("vitcamOverlay").classList.add("on");
}
function closeVitcam(){document.getElementById("vitcamOverlay").classList.remove("on");}

function vitcamLoadImage(input){
  const file=input.files[0];if(!file)return;
  {const _e=_imagenPermitida(file);if(_e){toast(_e);input.value="";return;}}
  const reader=new FileReader();
  reader.onload=e=>{
    const img=document.getElementById("vitcamPreview");
    img.src=e.target.result;img.style.display="block";
    document.getElementById("vitcamDrop").style.display="none";
    // Resize to max 800px, JPEG 0.75 for API
    const imgEl=new Image();
    imgEl.onload=()=>{
      const MAX=800;let w=imgEl.width,h=imgEl.height;
      if(w>h){if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}}else{if(h>MAX){w=Math.round(w*MAX/h);h=MAX;}}
      const cv=document.createElement("canvas");cv.width=w;cv.height=h;
      cv.getContext("2d").drawImage(imgEl,0,0,w,h);
      _vitcamB64=cv.toDataURL("image/jpeg",0.75).split(",")[1];
      document.getElementById("vitcamAnalyzeBtn").style.display="";
    };
    imgEl.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

async function analyzeVitcam(){
  const tx=L[CL]||L.es;
  if(!_vitcamB64){toast("Seleccione una imagen primero");return;}
  const btn=document.getElementById("vitcamAnalyzeBtn");
  btn.disabled=true;btn.textContent=tx.vitcamAnalyzing||"Analizando...";
  try{
    const prompt="Analiza esta imagen de un monitor de signos vitales medico. Extrae SOLO los siguientes valores si son visibles. Responde UNICAMENTE con un JSON valido con estas claves exactas (usa null si no se ve el valor): {\"fc\":...,\"ps\":...,\"pd\":...,\"sat\":...,\"tem\":...,\"fr\":...}. fc=frecuencia cardiaca lpm, ps=presion sistolica mmHg, pd=presion diastolica mmHg, sat=saturacion O2 %, tem=temperatura C, fr=frecuencia respiratoria rpm.";
    const messages=[{role:"user",content:[{type:"text",text:prompt},{type:"image_url",image_url:{url:"data:image/jpeg;base64,"+_vitcamB64}}]}];
    const r=await _aiFetch({model:"deepseek-chat",max_tokens:200,messages});
    const d=await r.json();
    const txt=d.choices[0].message.content.replace(/```json|```/g,"").trim();
    const extracted=JSON.parse(txt);
    _vitcamExtracted=extracted;
    const labels={fc:"FC",ps:"P.Sis",pd:"P.Dia",sat:"SpO2",tem:"Temp",fr:"FR"};
    const units={fc:"lpm",ps:"mmHg",pd:"mmHg",sat:"%",tem:"°C",fr:"rpm"};
    document.getElementById("vitcamResGrid").innerHTML=Object.entries(extracted).map(([k,v])=>`
      <div class="vitcam-res-item">
        <div class="vitcam-res-val">${v!==null?_esc(v):"—"}</div>
        <div class="vitcam-res-lbl">${labels[k]||k} ${v!==null?units[k]||"":""}</div>
      </div>`).join("");
    document.getElementById("vitcamResult").style.display="";
    document.getElementById("vitcamApplyBtn").style.display="";
  }catch(e){
    toast(tx.vitcamError||"No se pudo leer la imagen.");
  }
  btn.disabled=false;
  const tx2=L[CL]||L.es;
  btn.textContent="🔍 "+(tx2.vitcamAnalyze||"Analizar imagen");
}

function applyVitcam(){
  if(!_vitcamExtracted)return;
  const tx=L[CL]||L.es;
  if(!TD.vit)TD.vit={};
  const map={fc:"fc",ps:"ps",pd:"pd",sat:"sat",tem:"tem",fr:"fr"};
  Object.entries(_vitcamExtracted).forEach(([k,v])=>{
    if(v!==null&&v!==undefined){
      TD.vit[map[k]||k]=String(v);
      const inp=document.getElementById("vf_"+k);
      if(inp)inp.value=v;
    }
  });
  closeVitcam();
  toast("📷 "+(tx.vitcamApplied||"Vitales aplicados"));
}

// ── MODO OFFLINE ──────────────────────────────────────────────────────────
const OFFLINE_QUEUE_KEY="ms_offline_triages";

function _leerColaOffline(){try{return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)||"[]");}catch(_){return[];}}

// Franja superior: sin conexión, o con conexión pero con triages aún por enviar
function _actualizarFranjaOffline(){
  const bar=document.getElementById("offlineBar"),txt=document.getElementById("offlineBarTxt");
  if(!bar)return;
  const n=_leerColaOffline().length,off=!navigator.onLine;
  const pend=n?` · ${n} triage${n>1?"s":""} por enviar`:"";
  bar.classList.toggle("on",off||n>0);
  bar.classList.toggle("sync",!off&&n>0);
  if(txt)txt.textContent=off?`Sin conexión — puedes seguir haciendo triages${pend}`:`Enviando triages guardados sin conexión${pend}`;
}

function _initOfflineDetection(){
  const update=()=>{
    _actualizarFranjaOffline();
    if(navigator.onLine)_syncOfflineQueue();
  };
  window.addEventListener("online",update);
  window.addEventListener("offline",update);
  update();
  setInterval(()=>{if(navigator.onLine&&_leerColaOffline().length)_syncOfflineQueue();},60000);
}

function _queueOfflineTriage(data){
  const queue=_leerColaOffline();
  if(data._id&&queue.some(q=>q._id===data._id))return;
  queue.push({...data,queuedAt:Date.now()});
  try{localStorage.setItem(OFFLINE_QUEUE_KEY,JSON.stringify(queue));}catch(_){}
  toast("📶 Triage guardado en este dispositivo: se enviará al volver la conexión");
  _actualizarFranjaOffline();
}

let _sincronizando=false;
async function _syncOfflineQueue(){
  if(!FB||!CU||_sincronizando||window._demoMode)return;
  const queue=_leerColaOffline();
  if(!queue.length){_actualizarFranjaOffline();return;}
  _sincronizando=true;
  try{
    const remaining=await _syncOfflineQueueFn(FB,queue);
    // Conserva lo que se haya encolado mientras se sincronizaba
    const ids=new Set(queue.map(q=>q._id||q.queuedAt));
    const nuevos=_leerColaOffline().filter(q=>!ids.has(q._id||q.queuedAt));
    try{localStorage.setItem(OFFLINE_QUEUE_KEY,JSON.stringify([...remaining,...nuevos]));}catch(_){}
    if(remaining.length<queue.length){
      const synced=queue.length-remaining.length;
      toast(`✓ ${synced} triage${synced>1?"s":""} guardado${synced>1?"s":""} sin conexión ya ${synced>1?"están":"está"} en la cola`);
      logAudit("offline_sync",{triages:synced});
    }
  }finally{_sincronizando=false;_actualizarFranjaOffline();}
}

// ── NOTIFICACIÓN PRE-HOSPITALARIA ─────────────────────────────────────────
let _prehETA=null,_prehSex=null;

function openPrehNotif(){
  const tx=L[CL]||L.es;
  _prehETA=null;_prehSex=null;
  document.getElementById("prehTitleTxt").textContent=tx.prehTitle||"Notificacion Pre-hospitalaria";
  document.getElementById("prehSubTxt").textContent=tx.prehSub||"Aviso de llegada al hospital";
  document.getElementById("prehAgeLbl").textContent=tx.prehAge||"Edad";
  document.getElementById("prehSexLbl").textContent=tx.prehSex||"Sexo";
  document.getElementById("prehMechLbl").textContent=tx.prehMechanism||"Mecanismo / Motivo";
  document.getElementById("prehVitLbl").textContent=tx.prehVitals||"Signos vitales";
  document.getElementById("prehTxLbl").textContent=tx.prehTx||"Tratamiento";
  document.getElementById("prehTxIn").placeholder=tx.prehTxPh||"Ej: O2 15L/min...";
  document.getElementById("prehETALbl").textContent=tx.prehETA||"ETA (minutos)";
  document.getElementById("prehSendBtn").textContent="🚑 "+(tx.prehSend||"Enviar notificacion");
  ["prehAge","prehFC","prehPA","prehSat","prehFR","prehMechIn","prehTxIn"].forEach(id=>{document.getElementById(id).value="";});
  document.querySelectorAll(".preh-eta-btn").forEach(b=>b.classList.remove("sel"));
  document.getElementById("prehSexM").classList.remove("sel");
  document.getElementById("prehSexF").classList.remove("sel");
  document.getElementById("prehOverlay").classList.add("on");
}
function closePrehNotif(){document.getElementById("prehOverlay").classList.remove("on");}
function selPrehETA(min,btn){
  _prehETA=min;
  document.querySelectorAll(".preh-eta-btn").forEach(b=>b.classList.remove("sel"));
  btn.classList.add("sel");
}
function selPrehSex(s){
  _prehSex=s;
  document.getElementById("prehSexM").classList.toggle("sel",s==="M");
  document.getElementById("prehSexF").classList.toggle("sel",s==="F");
}

async function sendPrehNotif(){
  const tx=L[CL]||L.es;
  const age=document.getElementById("prehAge").value||"—";
  const mech=document.getElementById("prehMechIn").value||"—";
  const fc=document.getElementById("prehFC").value;
  const pa=document.getElementById("prehPA").value;
  const sat=document.getElementById("prehSat").value;
  const fr=document.getElementById("prehFR").value;
  const treatment=document.getElementById("prehTxIn").value;
  const eta=_prehETA?`${_prehETA} min`:"—";
  const sex=_prehSex||"—";
  const now=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  const vitStr=[fc?`FC ${fc}lpm`:"",pa?`PA ${pa}mmHg`:"",sat?`SpO2 ${sat}%`:"",fr?`FR ${fr}rpm`:""].filter(Boolean).join(" · ")||"No registrados";
  const txt=`🚑 NOTIFICACION PRE-HOSPITALARIA\n${now} — ETA: ${eta}\n${"─".repeat(30)}\nPaciente: ${age} años, ${sex}\nMotivo: ${mech}\nVitales: ${vitStr}${treatment?`\nTratamiento: ${treatment}`:""}\n— Enviado desde MedIA Suite`;
  if(FB&&CU){
    try{
      await FB.addDoc(FB.collection(FB.db,"prehospital"),{
        age,sex,mechanism:mech,vitals:{fc,pa,sat,fr},treatment,eta:_prehETA,
        userId:CU.uid,userName:CUName||CU.email,
        createdAt:FB.serverTimestamp()
      });
    }catch(e){}
  }
  if(navigator.share){
    navigator.share({title:"Notificacion Pre-hospitalaria",text:txt}).catch(()=>{});
  } else {
    navigator.clipboard?.writeText(txt);
    toast(tx.prehCopied||"Notificacion copiada");
  }
  closePrehNotif();
  toast("🚑 "+(tx.prehSent||"Notificacion enviada")+" — ETA "+eta);
}

// ── RESUMEN DE TURNO / HANDOFF ────────────────────────────────────────────
async function openHandoff(){
  const tx=L[CL]||L.es;
  document.getElementById("handoffTitleTxt").textContent=tx.handoffTitle||"Resumen de Turno";
  document.getElementById("handoffSubTxt").textContent=tx.handoffSub||"Reporte de cierre y traspaso";
  document.getElementById("handoffShiftLbl").textContent=tx.handoffShift||"Turno actual (ultimas 8h)";
  document.getElementById("handoffNotesLbl").textContent=tx.handoffNotes||"Notas de traspaso";
  document.getElementById("handoffNotesIn").placeholder=tx.handoffNotesPh||"Pendientes, observaciones criticas...";
  document.getElementById("handoffShareBtnTxt").textContent=tx.handoffShare||"Compartir";
  document.getElementById("handoffStats").innerHTML=`<div style="text-align:center;padding:10px;color:var(--mu);font-size:.75rem">Cargando...</div>`;
  document.getElementById("handoffList").innerHTML="";
  document.getElementById("handoffOverlay").classList.add("on");
  if(!FB||!CU)return;
  try{
    const since=new Date(Date.now()-8*3600*1000);
    const q=FB.query(FB.collection(FB.db,"triages"),FB.orderBy("createdAt","desc"),FB.limit(50));
    const snap=await FB.getDocs(q);
    const items=[];
    snap.forEach(d=>{
      const dd=d.data();
      const ts=dd.createdAt?.toDate?.();
      if(ts&&ts>=since)items.push({id:d.id,...dd,ts});
    });
    const counts={ROJO:0,AMARILLO:0,VERDE:0,total:0,pending:0};
    items.forEach(it=>{
      counts[it.clasificacion]=(counts[it.clasificacion]||0)+1;
      counts.total++;
      if(!it.atendido)counts.pending++;
    });
    const statHtml=`
      <div class="handoff-stat ro"><div class="handoff-stat-n">${counts.ROJO||0}</div><div class="handoff-stat-l">ROJO</div></div>
      <div class="handoff-stat am"><div class="handoff-stat-n">${counts.AMARILLO||0}</div><div class="handoff-stat-l">AMARILLO</div></div>
      <div class="handoff-stat ve"><div class="handoff-stat-n">${counts.VERDE||0}</div><div class="handoff-stat-l">VERDE</div></div>
      <div class="handoff-stat total"><div class="handoff-stat-n">${counts.total}</div><div class="handoff-stat-l">${tx.handoffTotal||"Total"}</div></div>`;
    document.getElementById("handoffStats").innerHTML=statHtml;
    const clrDot={ROJO:"#ff3c3c",AMARILLO:"#ffc832",VERDE:"#00e07a"};
    const listHtml=items.slice(0,20).map(it=>{
      const dt=it.ts?it.ts.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"—";
      const mM={dolor_pecho:"Dolor pecho",disnea:"Dif. respirar",trauma:"Trauma",abdominal:"Dolor abd.",neuro:"Neurologico",fiebre:"Fiebre",otro:"Otro"};
      return `<div class="handoff-entry">
        <div class="handoff-entry-cl" style="background:${clrDot[it.clasificacion]||"#888"}"></div>
        <div class="handoff-entry-info">
          <div class="handoff-entry-top">${_esc(it.clasificacion)} — ${_esc(mM[it.motivo]||it.motivo||"—")}</div>
          <div class="handoff-entry-sub">${_esc(_tipoLabel(it.tipo)||"—")} · ${_esc(it.userName||"—")} ${it.atendido?"✓":""}</div>
        </div>
        <div class="handoff-entry-time">${dt}</div>
      </div>`;}).join("");
    document.getElementById("handoffList").innerHTML=listHtml||`<div style="font-size:.75rem;color:var(--mu);padding:10px;text-align:center">${tx.noData||"Sin datos."}</div>`;
  }catch(e){document.getElementById("handoffStats").innerHTML="";document.getElementById("handoffList").innerHTML=`<div style="font-size:.75rem;color:var(--rd);padding:8px">Error: ${_esc(e.message)}</div>`;}
}
function closeHandoff(){document.getElementById("handoffOverlay").classList.remove("on");}

function shareHandoff(){
  const tx=L[CL]||L.es;
  const notes=document.getElementById("handoffNotesIn").value.trim();
  const stats=document.getElementById("handoffStats");
  const ro=stats.querySelector(".ro .handoff-stat-n")?.textContent||"0";
  const am=stats.querySelector(".am .handoff-stat-n")?.textContent||"0";
  const ve=stats.querySelector(".ve .handoff-stat-n")?.textContent||"0";
  const tot=stats.querySelector(".total .handoff-stat-n")?.textContent||"0";
  const now=new Date().toLocaleString();
  const txt=`📋 ${tx.handoffTitle||"RESUMEN DE TURNO"}\n${now}\n${"─".repeat(32)}\n🔴 ROJO: ${ro}  🟡 AMARILLO: ${am}  🟢 VERDE: ${ve}  📊 TOTAL: ${tot}\n${"─".repeat(32)}\n${notes?`📝 Notas:\n${notes}\n`:""}\n— MedIA Suite`;
  if(navigator.share){navigator.share({title:tx.handoffTitle||"Resumen de Turno",text:txt}).catch(()=>{});}
  else{navigator.clipboard?.writeText(txt);toast(tx.handoffCopy||"Reporte copiado");}
}

// ── DOSIS PEDIÁTRICA ──────────────────────────────────────────────────────
const PED_DRUGS=[
  {n:"Paracetamol",sub:"10-15 mg/kg c/6h",dmin:10,dmax:15,maxDose:1000,freq:"c/6h",concs:[{l:"250mg/5ml",mml:50},{l:"500mg/5ml",mml:100},{l:"1g/5ml (jarabe fuerte)",mml:200}]},
  {n:"Ibuprofeno",sub:"5-10 mg/kg c/8h",dmin:5,dmax:10,maxDose:400,freq:"c/8h",concs:[{l:"200mg/5ml",mml:40},{l:"400mg/5ml",mml:80}]},
  {n:"Amoxicilina",sub:"25-50 mg/kg/dia c/8h",dmin:25,dmax:50,maxDose:500,freq:"c/8h (dosis total diaria ÷3)",concs:[{l:"250mg/5ml",mml:50},{l:"500mg/5ml",mml:100}],perDay:true},
  {n:"Azitromicina",sub:"10 mg/kg/dia c/24h",dmin:10,dmax:10,maxDose:500,freq:"c/24h",concs:[{l:"200mg/5ml",mml:40}],perDay:true},
  {n:"Diazepam",sub:"0.2-0.5 mg/kg dosis unica",dmin:0.2,dmax:0.5,maxDose:10,freq:"Dosis unica",concs:[{l:"5mg/ml IV/IO",mml:5},{l:"2mg/ml rectal",mml:2}]},
  {n:"Midazolam",sub:"0.1-0.2 mg/kg dosis unica",dmin:0.1,dmax:0.2,maxDose:5,freq:"Dosis unica",concs:[{l:"5mg/ml",mml:5},{l:"1mg/ml",mml:1}]},
  {n:"Epinefrina",sub:"0.01 mg/kg dosis unica",dmin:0.01,dmax:0.01,maxDose:0.5,freq:"Dosis unica",concs:[{l:"1mg/ml (1:1000)",mml:1},{l:"0.1mg/ml (1:10000)",mml:0.1}]},
  {n:"Dexametasona",sub:"0.15-0.6 mg/kg c/6-8h",dmin:0.15,dmax:0.6,maxDose:8,freq:"c/6-8h",concs:[{l:"4mg/ml",mml:4},{l:"8mg/ml",mml:8}]},
  {n:"Salbutamol",sub:"0.1-0.15 mg/kg NEB c/4h",dmin:0.1,dmax:0.15,maxDose:2.5,freq:"c/4-6h NEB",concs:[{l:"5mg/ml (Nebulizar)",mml:5}]},
  {n:"Ondansetron",sub:"0.1-0.15 mg/kg c/8h",dmin:0.1,dmax:0.15,maxDose:4,freq:"c/8h",concs:[{l:"2mg/ml",mml:2},{l:"4mg/5ml",mml:0.8}]},
];
let _dospDrug=null;

function openDosP(ageHint){
  const tx=L[CL]||L.es;
  document.getElementById("dospTitleTxt").textContent=tx.dospTitle||"Dosis Pediatrica";
  document.getElementById("dospSubLbl").textContent=tx.dospDrug||"Seleccione medicamento y peso";
  document.getElementById("dospDrugLbl").textContent=tx.dospDrug||"Medicamento";
  document.getElementById("dospWtLbl").textContent=tx.dospWeight||"Peso (kg)";
  document.getElementById("dospConcLbl").textContent=tx.dospConc||"Concentracion";
  _dospDrug=null;
  const grid=document.getElementById("dospDrugGrid");
  grid.innerHTML=PED_DRUGS.map((d,i)=>`
    <button class="dosp-drug" onclick="_selDospDrug(${i})">
      <div class="dosp-drug-name">${d.n}</div>
      <div class="dosp-drug-sub">${d.sub}</div>
    </button>`).join("");
  document.getElementById("dospWeightIn").value="";
  document.getElementById("dospResult").innerHTML=`<div style="font-size:.75rem;color:var(--mu);text-align:center;padding:12px">${tx.dospNoData||"Seleccione medicamento y peso."}</div>`;
  document.getElementById("dospOverlay").classList.add("on");
}
function closeDosP(){document.getElementById("dospOverlay").classList.remove("on");}

function _selDospDrug(idx){
  _dospDrug=PED_DRUGS[idx];
  document.querySelectorAll(".dosp-drug").forEach((b,i)=>b.classList.toggle("sel",i===idx));
  const sel=document.getElementById("dospConcSel");
  sel.innerHTML=_dospDrug.concs.map(c=>`<option value="${c.mml}">${c.l}</option>`).join("");
  document.getElementById("dospConcWrap").style.display="";
  _calcDosP();
}

function _calcDosP(){
  if(!_dospDrug)return;
  const tx=L[CL]||L.es;
  const wt=parseFloat(document.getElementById("dospWeightIn").value);
  const mml=parseFloat(document.getElementById("dospConcSel").value);
  const res=document.getElementById("dospResult");
  if(!wt||wt<=0||wt>150){
    res.innerHTML=`<div style="font-size:.75rem;color:var(--mu);text-align:center;padding:12px">${tx.dospNoData||"Ingrese peso valido."}</div>`;
    return;
  }
  const d=_dospDrug;
  let doseMin=d.dmin*wt,doseMax=d.dmax*wt;
  const capped=doseMax>d.maxDose;
  if(doseMin>d.maxDose)doseMin=d.maxDose;
  if(doseMax>d.maxDose)doseMax=d.maxDose;
  const volMin=mml?(doseMin/mml):null;
  const volMax=mml?(doseMax/mml):null;
  const fmt=n=>Number.isInteger(n)?n.toString():n.toFixed(2);
  const doseStr=doseMin===doseMax?`${fmt(doseMin)} mg`:`${fmt(doseMin)}–${fmt(doseMax)} mg`;
  const volStr=volMin&&volMax?(volMin===volMax?`${fmt(volMin)} ml`:`${fmt(volMin)}–${fmt(volMax)} ml`):"—";
  res.innerHTML=`
    <div class="dosp-result">
      <div class="dosp-res-row"><span class="dosp-res-lbl">${tx.dospDose||"Dosis"}</span><span class="dosp-res-val">${doseStr}</span></div>
      <div class="dosp-res-row"><span class="dosp-res-lbl">${tx.dospVol||"Volumen"}</span><span class="dosp-res-val">${volStr}</span></div>
      <div class="dosp-res-row"><span class="dosp-res-lbl">${tx.dospMax||"Max"}</span><span class="dosp-res-val">${d.maxDose} mg</span></div>
      <div class="dosp-res-row"><span class="dosp-res-lbl">${tx.dospFreq||"Frecuencia"}</span><span class="dosp-res-val" style="font-size:.75rem">${_esc(d.freq)}</span></div>
    </div>
    ${capped?`<div class="dosp-warn">⚠️ ${tx.dospWarn||"Dosis supera el maximo. Usar dosis maxima."}</div>`:""}`;
}

