// 16-glasgow-gestos.js — Escala de Glasgow y gestos de navegación
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden numérico desde index.html.
// ── GLASGOW COMA SCALE ─────────────────────────────────────────────────────
const GCS_DATA={
  eye:[
    {n:4,es:"Espontanea",en:"Spontaneous",pt:"Espontanea",fr:"Spontanee",de:"Spontan",ja:"自発的"},
    {n:3,es:"Al llamado verbal",en:"To voice",pt:"A voz",fr:"A la voix",de:"Auf Ansprechen",ja:"呼声"},
    {n:2,es:"Al estimulo doloroso",en:"To pain",pt:"A dor",fr:"A la douleur",de:"Auf Schmerz",ja:"疼痛"},
    {n:1,es:"Sin respuesta",en:"No response",pt:"Sem resposta",fr:"Aucune reponse",de:"Keine",ja:"なし"}
  ],
  verbal:[
    {n:5,es:"Orientado",en:"Oriented",pt:"Orientado",fr:"Oriente",de:"Orientiert",ja:"見当識あり"},
    {n:4,es:"Confuso / desorientado",en:"Confused",pt:"Confuso",fr:"Confus",de:"Verwirrt",ja:"混乱"},
    {n:3,es:"Palabras inapropiadas",en:"Inappropriate words",pt:"Palavras inapropriadas",fr:"Mots inappropries",de:"Unangemessen",ja:"不適切語"},
    {n:2,es:"Sonidos incomprensibles",en:"Incomprehensible sounds",pt:"Sons incompreensiveis",fr:"Sons incomprehensibles",de:"Unverstandlich",ja:"不明音"},
    {n:1,es:"Sin respuesta / intubado",en:"No response / intubated",pt:"Sem resposta / intubado",fr:"Aucune reponse / intube",de:"Keine / intubiert",ja:"なし/挿管"}
  ],
  motor:[
    {n:6,es:"Obedece ordenes",en:"Obeys commands",pt:"Obedece ordens",fr:"Obeissance",de:"Befolgt Befehle",ja:"命令に従う"},
    {n:5,es:"Localiza el dolor",en:"Localizes pain",pt:"Localiza a dor",fr:"Localise la douleur",de:"Lokalisiert Schmerz",ja:"疼痛局在"},
    {n:4,es:"Retira al dolor",en:"Withdraws from pain",pt:"Retira a dor",fr:"Retrait a la douleur",de:"Beugebewegung",ja:"疼痛回避"},
    {n:3,es:"Flexion anormal (decorticacion)",en:"Abnormal flexion",pt:"Flexao anormal",fr:"Flexion anormale",de:"Abnorme Beugung",ja:"異常屈曲"},
    {n:2,es:"Extension anormal (descerebracion)",en:"Extension (decerebrate)",pt:"Extensao anormal",fr:"Extension anormale",de:"Strecksynergie",ja:"伸展反応"},
    {n:1,es:"Sin respuesta",en:"No response",pt:"Sem resposta",fr:"Aucune reponse",de:"Keine",ja:"なし"}
  ]
};
let _gcs={E:null,V:null,M:null};

function openGCS(){
  _gcs={E:TD.gcs?TD.gcs.E:null,V:TD.gcs?TD.gcs.V:null,M:TD.gcs?TD.gcs.M:null};
  _renderGCSBody();
  _updateGCSScore();
  document.getElementById("gcsOverlay").classList.add("on");
}
function closeGCS(){document.getElementById("gcsOverlay").classList.remove("on");}

function selectGCS(comp,val){
  _gcs[comp]=val;
  document.querySelectorAll(`.gcs-opt[data-comp="${comp}"]`).forEach(b=>b.classList.toggle("sel",+b.dataset.val===val));
  _updateGCSScore();
}

function _updateGCSScore(){
  const {E,V,M}=_gcs;
  const scoreEl=document.getElementById("gcsTotalN");
  const sevEl=document.getElementById("gcsSevChip");
  const evmEl=document.getElementById("gcsEvmLbl");
  const applyBtn=document.getElementById("gcsApplyBtn");
  const tx=L[CL]||L.es;
  if(E&&V&&M){
    const tot=E+V+M;
    scoreEl.textContent=tot;
    let cls,lbl;
    if(tot>=13){cls="leve";lbl=tx.gcsSevLeve||"Leve";}
    else if(tot>=9){cls="mod";lbl=tx.gcsSevMod||"Moderado";}
    else{cls="grave";lbl=tx.gcsSevGrave||"Grave";}
    sevEl.className="gcs-sev "+cls;sevEl.textContent=lbl;sevEl.style.display="";
    evmEl.innerHTML=`E: ${E} &nbsp;|&nbsp; V: ${V} &nbsp;|&nbsp; M: ${M}`;
    if(applyBtn)applyBtn.style.display="";
  } else {
    scoreEl.textContent="—";
    sevEl.style.display="none";
    evmEl.innerHTML=`E: ${E||"—"} &nbsp;|&nbsp; V: ${V||"—"} &nbsp;|&nbsp; M: ${M||"—"}`;
    if(applyBtn)applyBtn.style.display="none";
  }
}

function _renderGCSBody(){
  const tx=L[CL]||L.es;const lang=CL||"es";
  const secs=[
    {key:"E",comp:"eye",title:tx.gcsEye||"Apertura ocular",ic:"👁️"},
    {key:"V",comp:"verbal",title:tx.gcsVerbal||"Respuesta verbal",ic:"🗣️"},
    {key:"M",comp:"motor",title:tx.gcsMotor||"Respuesta motora",ic:"✊"}
  ];
  document.getElementById("gcsBody").innerHTML=secs.map(s=>`
    <div class="gcs-section">
      <div class="gcs-sec-lbl">${s.ic} ${s.title}</div>
      <div class="gcs-grid">
        ${GCS_DATA[s.comp].map(o=>`
          <button class="gcs-opt${_gcs[s.key]===o.n?" sel":""}" data-comp="${s.key}" data-val="${o.n}" onclick="selectGCS('${s.key}',${o.n})">
            <div class="gcs-opt-n">${o.n}</div>
            <div class="gcs-opt-l">${o[lang]||o.es}</div>
          </button>`).join("")}
      </div>
    </div>`).join("");
}

function applyGCS(){
  const {E,V,M}=_gcs;
  if(!E||!V||!M)return;
  const total=E+V+M;
  TD.gcs={E,V,M,total};
  const gcsText=`GCS: ${total}/15 (E${E}V${V}M${M})`;
  if(TD.notas){if(!TD.notas.includes("GCS"))TD.notas=gcsText+". "+TD.notas;}
  else{TD.notas=gcsText+".";}
  closeGCS();
  rTriage();
  toast("🧠 GCS "+total+"/15 aplicado");
}

// Block pinch zoom on iOS (viewport user-scalable=no is ignored by iOS 10+)
document.addEventListener('gesturestart', e => e.preventDefault(), {passive:false});
document.addEventListener('gesturechange', e => e.preventDefault(), {passive:false});
document.addEventListener('touchmove', e => { if(e.touches.length > 1) e.preventDefault(); }, {passive:false});

// ── GESTURE & HISTORY NAVIGATION ─────────────────────────────────────────
// Swipes que empiezan en el borde izquierdo (<44px) los maneja el sistema
// operativo (iOS back, Android back). Nosotros solo capturamos gestos que
// empiezan en la zona de contenido para evitar el conflicto y el lag.
let _gSwX=0,_gSwY=0,_gScroll=false;

window.addEventListener('popstate',e=>{
  if(!CU)return;
  const st=e.state;
  if(!st)return;
  if(st._ms==='triage-step'){
    if(TS>0){TS--;TM=[];requestAnimationFrame(rTriage);}
    else if(CR!=='paciente'){requestAnimationFrame(_clearTriagePatient);}
    history.pushState({_ms:'triage-step',ts:TS},'');
    return;
  }
  if(st._ms==='triage-enter'){
    if(CR!=='paciente'){_triageLookupDone=false;_triageLookupResult=null;requestAnimationFrame(_showPatientLookup);}
    history.pushState({_ms:'tab',id:'triage'},'');
    return;
  }
  if(st._ms==='tab')navigateTo(st.id,true);
});

document.addEventListener('touchstart',e=>{
  const t=e.touches[0];
  _gSwX=t.clientX;_gSwY=t.clientY;_gScroll=false;
},{passive:true});

document.addEventListener('touchmove',e=>{
  if(_gScroll)return;
  const dy=Math.abs(e.touches[0].clientY-_gSwY);
  const dx=Math.abs(e.touches[0].clientX-_gSwX);
  if(dy>10&&dy>dx)_gScroll=true;
},{passive:true});

document.addEventListener('touchend',e=>{
  if(_gScroll)return;
  // Ignorar swipes que empiezan en el borde — zona reservada del sistema
  if(_gSwX<44)return;
  const dx=e.changedTouches[0].clientX-_gSwX;
  const dy=e.changedTouches[0].clientY-_gSwY;
  if(Math.abs(dx)<52||Math.abs(dx)<Math.abs(dy)*1.4)return;
  const tag=e.target.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;
  // ── Triage ──────────────────────────────────────────────────────────
  if(_curTab==='triage'&&_triageLookupDone&&!_mciActive){
    if(dx>0){
      if(TS>0){TS--;TM=[];requestAnimationFrame(rTriage);}
      else if(CR!=='paciente'){requestAnimationFrame(_clearTriagePatient);}
    }else{
      const steps=aSteps();
      if(canAdv(steps[TS])&&TS<steps.length-1){
        history.pushState({_ms:'triage-step',ts:TS+1},'');
        TS++;TM=[];requestAnimationFrame(rTriage);
      }
    }
    return;
  }
  // ── Tabs — solo gestos amplios desde zona de contenido (≥90px) ──────
  if(Math.abs(dx)<90)return;
  const tabs=(NAV[CR]||NAV.medico).map(n=>n.id);
  const ci=tabs.indexOf(_curTab);if(ci<0)return;
  if(dx>0&&ci>0)navigateTo(tabs[ci-1]);
  else if(dx<0&&ci<tabs.length-1)navigateTo(tabs[ci+1]);
},{passive:true});

