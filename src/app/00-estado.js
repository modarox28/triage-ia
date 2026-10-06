// 00-estado.js — Datos demo, estado global, auditoría, tema, toast, zoom y temporizador de triage
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden numérico desde index.html.

const PROXY="https://triage-ia-proxy.mdq2804.workers.dev/";
// Versión de la política de tratamiento de datos (privacidad.html). Si cambia, se pide aceptarla de nuevo.
const CONSENT_VERSION="1.0";
// Llamada a la IA a través del Worker. Envía el token de la sesión de Firebase para
// que el Worker verifique quién consulta y aplique el límite diario. En el modo demo
// no hay token y el Worker aplica un cupo pequeño por IP.
// Si el Worker rechaza la consulta, lanza un error con un mensaje para el usuario.
async function _aiFetch(payload){
  const headers={"Content-Type":"application/json"};
  try{
    const u=FB?.auth?.currentUser;
    if(u&&typeof u.getIdToken==="function")headers.Authorization="Bearer "+await u.getIdToken();
  }catch(_){}
  const r=await fetch(PROXY,{method:"POST",headers,body:JSON.stringify(payload)});
  if(!r.ok&&[400,401,403,429,503].includes(r.status)){
    let j={};try{j=await r.clone().json();}catch(_){}
    throw new Error(j.error||("La IA no está disponible ("+r.status+")"));
  }
  const left=r.headers.get("X-IA-Restantes");
  if(left!==null&&Number(left)<=3)toast(`Te quedan ${left} consultas de IA hoy`);
  return r;
}

// Nombre legible del tipo de paciente (los datos guardan claves como "adulto_mayor")
function _tipoLabel(t){
  const tx=(typeof L!=="undefined"&&L&&(L[CL]||L.es))||{};
  const m={adulto:tx.adultLbl||"Adulto",adulto_mayor:tx.elderLbl||"Adulto mayor",embarazada:tx.pregLbl||"Embarazada",
    nino:tx.childLbl||"Pediátrico",adolescente:tx.teenLbl||"Adolescente",MCI:"MCI"};
  return m[t]||t||"";
}
// Escapa texto antes de insertarlo con innerHTML (evita inyección de HTML/JS
// con nombres o correos escritos por los usuarios).
function _esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
const QR_SECRET=btoa("media-patient-2025");

// DEMO PATIENTS — use these IDs in the patient login screen
const DEMO_PATIENTS=[
  {doc:"482951",name:"Carlos Rodríguez Mendez",age:"45",sex:"M",
   antecedentes:["Hipertensión arterial","Diabetes tipo 2"],
   alergias:["Sulfas"],
   medicacion:["Metformina 850mg","Losartán 50mg","Aspirina 100mg"],
   notes:"Paciente con DM2 e HTA controladas. Última HbA1c 7.2%. Ex-fumador 10 años. Control cardiológico anual."},
  {doc:"739264",name:"María López Garza",age:"67",sex:"F",
   antecedentes:["EPOC moderado","Insuficiencia cardíaca leve","Osteoporosis"],
   alergias:["Penicilina","AINES"],
   medicacion:["Salbutamol inhalador","Furosemida 40mg","Omeprazol 20mg","Calcio+D3"],
   notes:"EPOC estadio II GOLD. FEV1 62%. ICC compensada. SatO2 basal 94%. Hospitalización hace 8 meses por reagudización."},
  {doc:"156873",name:"Andrés Martínez Ruiz",age:"28",sex:"M",
   antecedentes:["Asma bronquial leve intermitente"],
   alergias:["Penicilina","Ibuprofeno"],
   medicacion:["Salbutamol a demanda"],
   notes:"Asma desencadenada por ejercicio y exposición a alérgenos. Sin hospitalización previa. Usa broncodilatador ocasionalmente."},
  {doc:"624018",name:"Carmen Vega Torres",age:"55",sex:"F",
   antecedentes:["Hipotiroidismo primario","Depresión mayor","Obesidad grado I"],
   alergias:[],
   medicacion:["Levotiroxina 100mcg","Sertralina 50mg","Metformina 500mg"],
   notes:"Hipotiroidismo en tratamiento sustitutivo. TSH último control 2.8. Terapia psicológica activa. Sin alergias conocidas."},
  {doc:"318745",name:"Laura Quintero Sánchez",age:"29",sex:"F",
   antecedentes:["Embarazo 32 semanas","Hipertensión gestacional","Preclampsia leve"],
   alergias:["Aspirina"],
   medicacion:["Metildopa 250mg","Calcio 1g","Ácido fólico 5mg","Hierro oral"],
   notes:"Gestante G2P1, 32 semanas. HTA gestacional en control. PA basal 140/90. Edemas en MMII. Control prenatal mensual. Sin cirugías previas."},
  {doc:"201983",name:"Samuel Ortiz Ramos",age:"8",sex:"M",
   antecedentes:["Asma bronquial moderada persistente","Rinitis alérgica"],
   alergias:["Penicilina","Polen","Ácaros"],
   medicacion:["Fluticasona inhalada 100mcg","Salbutamol rescate","Cetirizina 5mg"],
   notes:"Niño de 8 años con asma moderada persistente. Multiples hospitalizaciones previas por crisis obstructiva. Último control espirométrico: FEV1 74%. Padres entrenados en uso de inhaladores."},
  {doc:"574921",name:"Beatriz Herrera Molina",age:"72",sex:"F",
   antecedentes:["Demencia senil moderada","Fibrilación auricular","HTA","Insuficiencia renal crónica estadio 3"],
   alergias:["Contraste yodado","AINES"],
   medicacion:["Rivaroxabán 20mg","Amlodipino 5mg","Donepezilo 10mg","Omeprazol 20mg"],
   notes:"Paciente con deterioro cognitivo moderado. FA permanente anticoagulada. TFG estimada 42 ml/min. Vive con cuidadora. Comunicación limitada — responde a su nombre. Revisar interacciones antes de prescribir."},
  {doc:"447632",name:"Diego Sarmiento Peña",age:"35",sex:"M",
   antecedentes:["Paraplejia espástica (lesión T6)","Vejiga neurógena","Infecciones urinarias a repetición"],
   alergias:["Sulfametoxazol"],
   medicacion:["Baclofeno 10mg","Oxibutinina 5mg","Vitamina D3","Omeprazol 20mg"],
   notes:"Paraplejia completa desde los 22 años por accidente de tránsito. Usa silla de ruedas. Historia de 3 ITU en el último año. Sin sensibilidad por debajo de T6. Cateterización intermitente vesical."},
  {doc:"389017",name:"Valentina Ríos Castro",age:"15",sex:"F",
   antecedentes:["Diabetes tipo 1","Hipotiroidismo autoinmune"],
   alergias:[],
   medicacion:["Insulina glargina 18 UI/noche","Insulina lispro a razón de comida","Levotiroxina 50mcg"],
   notes:"Adolescente con DM1 diagnosticada a los 9 años. Control metabólico aceptable. Última HbA1c 7.8%. Sin complicaciones crónicas detectadas. Adherencia regular al tratamiento. Escolarizada."},
  {doc:"665248",name:"Roberto Cárdenas Gil",age:"52",sex:"M",
   antecedentes:["Epilepsia focal con generalización secundaria","Hepatitis B crónica","Depresión moderada"],
   alergias:["Carbamazepina"],
   medicacion:["Levetiracetam 1000mg c/12h","Ácido valproico 500mg c/12h","Tenofovir 300mg","Escitalopram 10mg"],
   notes:"Epilepsia con buen control desde ajuste a politerapia hace 2 años. Última crisis hace 14 meses. HBsAg positivo, carga viral baja en seguimiento. Conduce con restricción médica. No consumo de alcohol."},
  {doc:"512834",name:"Isabella Moreno Díaz",age:"6",sex:"F",
   antecedentes:["Cardiopatía congénita operada (CIV pequeña)","Anemia ferropénica"],
   alergias:["Amoxicilina"],
   medicacion:["Sulfato ferroso pediátrico","Vitamina C"],
   notes:"Niña de 6 años. CIV intervenida a los 3 años, con buen resultado. Control ecocardiográfico semestral. Anemia en seguimiento nutricional. Activa y escolarizada. Sin limitaciones funcionales significativas."},
  {doc:"103856",name:"María Fernanda Osorio Pérez",age:"34",sex:"F",
   antecedentes:["Embarazo 38 semanas","Preeclampsia severa","Placenta previa marginal","Anemia ferropénica severa (Hb 7.2 g/dL)"],
   alergias:["Ibuprofeno","Ketorolaco"],
   medicacion:["Labetalol 100mg c/8h","Nifedipino 30mg retard","Sulfato de magnesio (protocolo UCI-Obs)","Hierro IV semanal","Ácido fólico 5mg"],
   notes:"Gestante G1P0, 38 semanas. Preeclampsia severa con PA 165/105 mmHg. Placenta previa marginal con episodio de sangrado en semana 34. Hb actual 7.2 — pendiente transfusión. Hospitalizada desde semana 36. Cesárea programada en 48h. Monitoreo fetal cada 6h. ALERTA: riesgo de desprendimiento y eclampsia."},
  {doc:"887234",name:"Tomás Galeano Ruiz",age:"4",sex:"M",
   antecedentes:["Asma bronquial grave persistente","Síndrome nefrótico en remisión parcial","Inmunosupresión por corticoides"],
   alergias:["Penicilina","Látex","Mariscos"],
   medicacion:["Prednisolona 1mg/kg/día","Fluticasona+Salmeterol inhalado","Salbutamol rescate","Montelukast 4mg","Cotrimoxazol profiláctico"],
   notes:"Niño de 4 años con asma grave e historia de 4 hospitalizaciones por crisis severa. Síndrome nefrótico con proteinuria residual 2+. Bajo esquema inmunosupresor — alto riesgo de infecciones oportunistas. Vacunas no actualizadas por inmunosupresión. Peso 14 kg. Padres capacitados en plan de acción de asma."},
  {doc:"294671",name:"Jorge Palomino Vera",age:"61",sex:"M",
   antecedentes:["IAM con STEMI anterior (hace 2 años)","Insuficiencia renal crónica estadio 4 (TFG 22)","EPOC severo (FEV1 38%)","Diabetes tipo 2 insulinorrequiriente","Polineuropatía diabética"],
   alergias:["Contraste yodado","Sulfas","Metamizol"],
   medicacion:["Insulina glargina 30 UI/noche","Insulina aspart a razón de comidas","Carvedilol 25mg","Atorvastatina 40mg","Amlodipino 10mg","Sevelamer 800mg","Eritropoyetina SC semanal","Tiotropio inhalado","Gabapentina 300mg c/8h"],
   notes:"Paciente pluripatológico de alto riesgo. FG 22 — en lista de espera de diálisis. STEMI previo con FE 38% en ecocardiograma reciente. EPOC estadio IV — O2 domiciliario 16h/día. DM2 con mal control (HbA1c 9.1%). Neuropatía en MMII con úlcera plantar derecha activa. PRECAUCIÓN con nefrotóxicos y contraste IV."},
  {doc:"563092",name:"Nadia Contreras Espinosa",age:"47",sex:"F",
   antecedentes:["Lupus eritematoso sistémico activo","Nefritis lúpica clase III","Hipertensión secundaria","Osteoporosis por corticoides","Depresión mayor recurrente"],
   alergias:["Sulfametoxazol","Cloroquina","AINES"],
   medicacion:["Micofenolato 1g c/12h","Prednisona 10mg","Hidroxicloroquina 200mg","Enalapril 10mg","Alendronato 70mg semanal","Calcio+D3","Escitalopram 20mg","Omeprazol 40mg"],
   notes:"LES con actividad moderada. SLEDAI-2K actual 8. Nefritis lúpica en tratamiento inmunosupresor — proteinuria 1.2 g/24h, creatinina 1.4. Hipertensión de difícil control. Osteoporosis vertebral con fractura T11 previa. Seguimiento reumatología mensual. Inmunodeprimida: manejo cuidadoso de infecciones."},
  {doc:"741583",name:"Fernando Castellanos Nieto",age:"19",sex:"M",
   antecedentes:["Ceguera congénita bilateral (atrofia óptica bilateral)","Hipoacusia neurosensorial leve izquierda","Sin otras patologías crónicas"],
   alergias:[],
   medicacion:["Sin medicación habitual"],
   notes:"Joven de 19 años con discapacidad visual total desde el nacimiento. Hipoacusia leve en oído izquierdo. Independiente funcionalmente con bastón y asistencia tecnológica. Estudiante universitario. Sin enfermedades crónicas ni alergias conocidas. COMUNICACIÓN: orientar verbalmente en todo momento, no gesticular — describir procedimientos antes de ejecutarlos."},
  {doc:"930427",name:"Rosa Amparo Peñaloza",age:"78",sex:"F",
   antecedentes:["ACV isquémico silviano derecho (hace 3 años)","Enfermedad de Parkinson estadio III (Hoehn & Yahr)","Disfagia orofaríngea moderada","Desnutrición calórico-proteica","Fibrilación auricular permanente","HTA","Incontinencia urinaria"],
   alergias:["Metoclopramida","AINES"],
   medicacion:["Levodopa/Carbidopa 250/25mg c/6h","Pramipexol 1mg c/8h","Apixabán 2.5mg c/12h","Enalapril 5mg","Omeprazol 20mg","Espesante alimenticio","Calcio+D3"],
   notes:"Paciente anciana con secuela motora del ACV (hemiparesia izquierda residual) y Parkinson avanzado con temblor de reposo y rigidez marcada. Disfagia moderada — dieta triturada + espesante; RIESGO ALTO DE BRONCOASPIRACIÓN. Desnutrición severa BMI 17.1. Anticoagulada por FA permanente — verificar última dosis antes de cualquier procedimiento invasivo. Vive con hija, usa andador. Estado cognitivo: orientada en persona, desorientada en tiempo/lugar."}
];
let _patientHC=null,_triageLookupDone=false,_triageLookupResult=null;
// Acceso de pacientes: cada paciente tiene una cuenta de Firebase Auth "interna"
// (<ID>@pacientes.media-suite.app) cuya contraseña se deriva de su PIN.
// Las reglas de Firestore usan ese correo para que solo vea su propia historia.
const PATIENT_DOMAIN="pacientes.media-suite.app";
const PIN_RE=/^\d{6}$/;
let _patientAuthBusy=false;
function _normId(id){return String(id||"").trim().toLowerCase().replace(/[^0-9a-z-]/g,"");}
function _patientEmail(id){return _normId(id)+"@"+PATIENT_DOMAIN;}
function _patientPwd(pin){return "ms-pin-"+pin;}
async function _loadPatientHC(docId){
  const snap=await FB.getDocs(FB.query(FB.collection(FB.db,"historias"),FB.where("doc","==",docId),FB.limit(1)));
  if(snap.empty)return null;
  const d=snap.docs[0];
  return{id:d.id,...d.data()};
}

// STATE
let TS=0,TD={},TM=[],MEDS=JSON.parse(localStorage.getItem("ms_meds")||"[]"),INT=[],ALM={},REC={},recog=null;
let CU=null,CR=null,CUName=null,CUPhoto=null,isDark=true,FB=null;
let _curTab=null;
let CC=localStorage.getItem("ms_country")||"CO";
function setCountry(cc){CC=cc;localStorage.setItem("ms_country",cc);loadConfig();}
function getInsLabel(){const m={CO:"EPS afiliada",AR:"Obra social / prepaga",US:"Insurance provider",DE:"Krankenkasse",JP:"健康保険組合"};return m[CC]||t("insLabel");}
function uName(fallback="Usuario"){return CUName||CU?.displayName||CU?.email?.split("@")[0]||fallback;}

// AUDIT LOG — writes to Firestore auditLogs collection (silent fail, never blocks the app)
async function logAudit(action,meta={}){
  if(!FB||!CU||CR==="paciente")return;
  try{
    await FB.addDoc(FB.collection(FB.db,"auditLogs"),{
      userId:CU.uid,userEmail:CU.email||"",userName:uName(),role:CR||"",
      action,meta,ts:FB.serverTimestamp()
    });
  }catch(e){}
}

// THEME — "dark", "light" o "auto" (sigue al sistema: oscuro de noche si el teléfono lo hace)
const _ICO_MOON='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
const _ICO_SUN='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
const _mqDark=window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)"):null;
let _themePref="auto";
try{_themePref=localStorage.getItem("theme")||"auto";}catch(_){}
function _applyTheme(){
  isDark=_themePref==="auto"?(_mqDark?_mqDark.matches:true):_themePref!=="light";
  document.body.classList.toggle("light",!isDark);
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=isDark?"#0b1120":"#f3f5f8";
  // El botón muestra a qué tema se cambia al tocarlo
  ["themeBtn","authThemeBtn"].forEach(id=>{const el=document.getElementById(id);if(!el)return;
    el.innerHTML=isDark?_ICO_SUN:_ICO_MOON;
    const lbl=isDark?"Cambiar a modo claro":"Cambiar a modo oscuro";el.title=lbl;el.setAttribute("aria-label",lbl);});
  document.querySelectorAll("[data-theme-opt]").forEach(b=>{const on=b.dataset.themeOpt===_themePref;b.classList.toggle("on",on);b.setAttribute("aria-pressed",on);});
  if(typeof _chartInst!=="undefined"&&_chartInst&&typeof buildChart==="function")buildChart(); // colores del gráfico
}
function setTheme(pref){
  _themePref=pref;
  try{localStorage.setItem("theme",pref);}catch(_){}
  _applyTheme();
}
// Botón rápido (barra superior y pantalla de acceso): alterna claro/oscuro
function toggleTheme(){setTheme(isDark?"light":"dark");}
if(_mqDark){const f=()=>{if(_themePref==="auto")_applyTheme();};_mqDark.addEventListener?_mqDark.addEventListener("change",f):_mqDark.addListener(f);}
_applyTheme();

// TOAST
function toast(m){const t=document.getElementById("toast");t.textContent=m;t.classList.add("on");setTimeout(()=>t.classList.remove("on"),2400);}

// No JS height hacks needed — .app{position:fixed;top:0;left:0;right:0;bottom:0}
// correctly fills the viewport on both iOS and Android without override.

// ZOOM ACCESSIBILITY
let _zoomLevel=parseFloat(localStorage.getItem("ms_zoom")||"1");
function _updateZoomLbl(){const el=document.getElementById("zoomLbl");if(el)el.textContent=Math.round(_zoomLevel*100)+"%";}
function adjustZoom(dir){
  const steps=[0.8,0.9,1,1.1,1.2,1.35,1.5];
  const cur=steps.findIndex(s=>Math.abs(s-_zoomLevel)<0.01);
  const next=Math.max(0,Math.min(steps.length-1,(cur<0?2:cur)+dir));
  _zoomLevel=steps[next];
  document.documentElement.style.setProperty("--zoom",_zoomLevel);
  localStorage.setItem("ms_zoom",_zoomLevel);
  _updateZoomLbl();
  toast(_zoomLevel===1?"Tamaño normal":_zoomLevel>1?"Texto más grande":"Texto más pequeño");
}
(()=>{if(_zoomLevel!==1){document.documentElement.style.setProperty("--zoom",_zoomLevel);}_updateZoomLbl();})();

// RIPPLE EFFECT
document.addEventListener("pointerdown",e=>{
  const el=e.target.closest(".opt,.bpri,.bnxt,.bbk,.bsec,.nb,.htab,.icon-btn,.auth-btn,.auth-goo,.zoom-btn,.hist-flt,.near-item");
  if(!el)return;
  const r=document.createElement("span");r.className="rpl";
  const rect=el.getBoundingClientRect();
  r.style.left=(e.clientX-rect.left)+"px";r.style.top=(e.clientY-rect.top)+"px";
  if(getComputedStyle(el).position==="static")el.style.position="relative";
  el.style.overflow="hidden";el.appendChild(r);
  setTimeout(()=>r.remove(),560);
},{passive:true});

// TRIAGE TIMER
let _triageStartTime=null;
let _triageTimerInterval=null;
function _startTriageTimer(){
  _triageStartTime=Date.now();
  if(_triageTimerInterval)clearInterval(_triageTimerInterval);
  _triageTimerInterval=setInterval(_updateTriageTimer,1000);
  _updateTriageTimer();
}
function _stopTriageTimer(){if(_triageTimerInterval){clearInterval(_triageTimerInterval);_triageTimerInterval=null;}}
function _updateTriageTimer(){
  const el=document.getElementById("triageTimerBadge");if(!el)return;
  if(!_triageStartTime){el.style.display="none";return;}
  const s=Math.floor((Date.now()-_triageStartTime)/1000);
  const m=Math.floor(s/60),ss=s%60;
  el.textContent=`⏱ ${m}:${String(ss).padStart(2,"0")}`;
  el.style.display="";
  el.style.color=s>300?"var(--yw)":s>600?"var(--rd)":"var(--cy)";
}
function _getTriageElapsed(){
  if(!_triageStartTime)return null;
  return Math.floor((Date.now()-_triageStartTime)/1000);
}

// Real-time vitals alert during triage entry
function _checkVitalsRealtime(){
  const box=document.getElementById("vitAlertBox");if(!box)return;
  const vt=TD.vit||{};
  const alerts=checkCriticalVitals({sys:parseFloat(vt.ps),hr:parseFloat(vt.fc),spo2:parseFloat(vt.sat),rr:parseFloat(vt.fr),temp:parseFloat(vt.tem)}).filter(a=>!a.warn);
  if(!alerts.length){box.innerHTML="";return;}
  box.innerHTML=`<div style="background:var(--rd-a);border:1.5px solid rgba(255,58,92,.4);border-radius:10px;padding:10px 12px;animation:critBlink 1.2s ease-in-out infinite">
    <div style="font-family:JetBrains Mono,monospace;font-size:.6rem;color:var(--rd);font-weight:700;letter-spacing:1px;margin-bottom:6px">⚠ VALORES CRÍTICOS DETECTADOS</div>
    ${alerts.map(a=>`<div style="font-size:.78rem;color:var(--rd);margin-bottom:3px">• ${a.msg}</div>`).join("")}
  </div>`;
}

// COPILOT HINTS — thin adapters (implementations in src/clinical/copilot.js)
function _getCopilotHints(){return getCopilotHints(TD);}
function _renderCopilotCard(hints){return renderCopilotCard(hints);}

// CLINICAL TIMELINE — thin adapter (implementation in src/clinical/timeline.js)
function _buildTriageTimeline(qsofa,news2,si,res,elapsed){return buildTriageTimeline(TD,_triageStartTime,qsofa,news2,si,res,elapsed);}

const LC={es:"ES",en:"EN",pt:"PT",fr:"FR",de:"DE",ja:"JA"};
let CL=localStorage.getItem("ms_lang")||"es";
function t(k){return(L[CL]||L.es)[k]||k;}

function setLang(lang){
  CL=lang;localStorage.setItem("ms_lang",lang);
  ["topLC","authLC"].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=LC[lang]||"ES";});
  document.querySelectorAll(".lang-item").forEach(el=>{const o=el.getAttribute("onclick")||"";el.classList.toggle("cur",o.includes("'"+lang+"'"));});
  document.querySelectorAll(".lang-menu").forEach(m=>m.classList.remove("open"));
  // Config screen lang buttons
  ["es","en","pt","fr","de","ja"].forEach(l=>{const b=document.getElementById("lng-"+l);if(b)b.classList.toggle("sel",l===lang);});
  _updateZoomLbl();
  applyTrans();
}

function toggleLang(w){
  const id=w==="top"?"topLM":"authLM";
  const m=document.getElementById(id);if(!m)return;
  const was=m.classList.contains("open");
  document.querySelectorAll(".lang-menu").forEach(x=>x.classList.remove("open"));
  if(!was)m.classList.add("open");
}
document.addEventListener("click",e=>{if(!e.target.closest(".lang-wrap"))document.querySelectorAll(".lang-menu").forEach(m=>m.classList.remove("open"));});

function applyTrans(){
  const tx=L[CL]||L.es;
  // Map element IDs to translation keys
  const ids={
    // Auth
    authSub:"sub","atab-in":"login","atab-up":"register",authMainBtn:"cont",
    forgotLink:"forgot",googleBtnTxt:"google",ptnBtnTitle:"ptnTitle",
    ptnBtnSub:"ptnSub",staffLink:"staffLink",rememberLbl:"rememberMe",
    patientLoginBtn:"patientEnter",authBackLink:"backToPatient",
    lbName:"nameLbl",lbEmail:"emailLbl",lbPass:"passLbl",authDivOr:"orDivider",
    // Meds
    lbSearchDrug:"searchDrug",consultBtn:"consultAI",lbNewMed:"newMed",
    lbDose:"dose",lbFreq:"freq",lbHour:"hour",lbNotes:"notes",addMedBtn:"addMed",
    addListTxt:"addList",verifyTxt:"verify",lbReminders:"reminders",
    alarmsNote:"alarmsNote",lbCheckInter:"checkInter",interDesc:"interDesc",
    lbMyMeds:"myMedsLabel",
    // Dashboard
    lbRecentT:"recentT",lbUserMgmt:"userMgmt",
    // History
    lbHistTitle:"histTitle",
    // Config
    lbAppearance:"appearance",lbDarkMode:"darkMode",lbDarkSub:"darkSub",lbAccount:"account",
    lbZoomMode:"zoomMode",lbZoomSub:"zoomSub",
    // Sign out buttons (all of them)
    signOutTxt:"signOut",signOutTxt2:"signOut",signOutTxt3:"signOut",
    // Chart + nearby + country labels
    lbChartTitle:"chartTitle",lbNearbyTitle:"nearbyTitle",
    lbCountryLabel:"countryLabel",lbCountrySub:"countrySub",
    "chartPer-day":"chartDay","chartPer-week":"chartWeek","chartPer-month":"chartMonth",
    nearbySearchBtn:"nearbyBtn",
    // Cola de espera (patient queue) — previously untranslated
    lbColaTitle:"colaTitle",colaRefreshBtn:"colaRefresh",colaPendingBtn:"colaPending",
    // Handoff button
    handoffBtnTxt:"handoffTitle",
  };
  Object.entries(ids).forEach(([id,key])=>{
    const el=document.getElementById(id);
    if(el&&tx[key])el.textContent=tx[key];
  });
  // data-i18n attributes - universal translation hook
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const k=el.getAttribute("data-i18n");
    if(k&&tx[k])el.textContent=tx[k];
  });
  // Sub-tab labels
  document.querySelectorAll(".sst").forEach(el=>{
    const k=el.getAttribute("data-k");if(k&&tx[k])el.textContent=tx[k];
  });
  // Hist filter "all" button
  const hfAll=document.querySelector('.hist-flt[data-f="all"]');
  if(hfAll)hfAll.textContent=tx.histAll||tx.filterAll||"Todos";
  // Meds empty states (re-render if visible)
  if(document.getElementById("ms-ms")?.classList.contains("on"))rML();
  if(document.getElementById("ms-al")?.classList.contains("on"))rRL();
  // Triage step titles and subs (if triage is showing)
  translateTriageStep(tx);
  // Rebuild nav with new language
  if(CU)buildNav();
  // Also update html lang attribute
  document.documentElement.lang=CL;
}

function translateTriageStep(tx){
  if(!document.getElementById("sc-triage")?.classList.contains("on"))return;
  const steps=aSteps();
  if(TS>=steps.length)return;
  const s=steps[TS];
  const stag=document.querySelector("#trc .stag");
  const qtitle=document.querySelector("#trc .qtitle");
  const qsub=document.querySelector("#trc .qsub");
  if(stag)stag.textContent=`${t("step")} ${TS+1} ${t("of")} ${steps.length}`;
  if(qtitle)qtitle.textContent=s.title;
  if(qsub)qsub.textContent=s.sub;
  if(s.opts){
    document.querySelectorAll("#trc .opt").forEach((btn,i)=>{
      if(s.opts[i])btn.innerHTML=`<span class="opic">${s.opts[i].ic}</span>${s.opts[i].l}`;
    });
  }
  const bbk=document.querySelector("#trc .bbk");
  const bnxt=document.querySelector("#trc .bnxt");
  if(bbk)bbk.textContent=`← ${t("back")}`;
  if(bnxt)bnxt.textContent=(TS===steps.length-1?t("analyze"):t("continueBtn"))+" →";
  if(CU)buildNav();
  document.documentElement.lang=CL;
}

