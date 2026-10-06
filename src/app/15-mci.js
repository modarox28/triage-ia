// 15-mci.js — Incidente de múltiples víctimas (START) y asistente IA
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden numérico desde index.html.
// ── MCI — INCIDENTE DE MÚLTIPLES VÍCTIMAS ─────────────────────────────────
let _mciActive=false,_mciName="",_mciCounts={ROJO:0,AMARILLO:0,VERDE:0,NEGRO:0},_mciPatientN=1;

function openMCISetup(){
  if(_mciActive){confirmDeactivateMCI();return;}
  document.getElementById("mciNameInput").value="";
  const tx=L[CL]||L.es;
  document.getElementById("mciSetupTitleTxt").textContent=tx.mciSetup||"Activar Modo MCI";
  document.getElementById("mciSetupSubTxt").textContent=tx.mciSetupSub||"Incidente de multiples victimas — triage START rapido";
  document.getElementById("mciNameLbl").textContent=tx.mciName||"Nombre del incidente";
  document.getElementById("mciNameInput").placeholder=tx.mciNamePh||"Ej: Accidente vial";
  document.getElementById("mciActivateBtnTxt").textContent=tx.mciActivate||"Activar MCI";
  document.getElementById("mciSetupOverlay").classList.add("on");
  setTimeout(()=>document.getElementById("mciNameInput").focus(),350);
}
function closeMCISetup(){document.getElementById("mciSetupOverlay").classList.remove("on");}

function activateMCI(){
  const name=document.getElementById("mciNameInput").value.trim()||"Incidente MCI";
  _mciName=name;_mciCounts={ROJO:0,AMARILLO:0,VERDE:0,NEGRO:0};_mciPatientN=1;_mciActive=true;
  _mciSTARTStep='walk';_mciSTARTResult=null;
  // Skip patient lookup so triage goes directly to MCI wizard
  _patientHC=null;_triageLookupResult=null;_triageLookupDone=true;
  closeMCISetup();
  _updateMCIBanner();
  navigateTo("triage");
  if(!window._queueUnsub)loadCola();
  toast("⚠️ MCI activado: "+name);
}
function confirmDeactivateMCI(){
  const tx=L[CL]||L.es;
  if(confirm(tx.mciConfirmEnd||"Desactivar MCI y volver al modo normal?")){deactivateMCI();}
}
function deactivateMCI(){
  _mciActive=false;_mciName="";_mciCounts={ROJO:0,AMARILLO:0,VERDE:0,NEGRO:0};_mciPatientN=1;
  _mciSTARTStep='walk';_mciSTARTResult=null;
  document.getElementById("mciBanner").classList.remove("on");
  document.getElementById("mciToggleBtn").style.cssText="font-size:.72rem;padding:5px 12px;border-color:rgba(255,60,60,.4);color:#ff8060";
  document.getElementById("mciToggleBtn").textContent="⚠️ MCI";
  // Return to triage home screen (patient lookup)
  _triageLookupDone=false;_patientHC=null;_triageLookupResult=null;
  navigateTo("triage");
  toast("MCI desactivado");
}
function _updateMCIBanner(){
  if(!_mciActive)return;
  const tx=L[CL]||L.es;
  document.getElementById("mciBanner").classList.add("on");
  document.getElementById("mciBannerTxt").textContent=tx.mciActive||"MCI ACTIVO";
  document.getElementById("mciBannerName").textContent=_mciName;
  const tot=_mciCounts.ROJO+_mciCounts.AMARILLO+_mciCounts.VERDE+_mciCounts.NEGRO;
  document.getElementById("mciBannerCounts").innerHTML=
    `<span class="mci-bc ro">🔴 ${_mciCounts.ROJO}</span>`+
    `<span class="mci-bc am">🟡 ${_mciCounts.AMARILLO}</span>`+
    `<span class="mci-bc ve">🟢 ${_mciCounts.VERDE}</span>`+
    `<span class="mci-bc ng">⚫ ${_mciCounts.NEGRO}</span>`;
  document.getElementById("mciToggleBtn").textContent="⚠️ MCI "+tot;
  document.getElementById("mciToggleBtn").style.cssText="font-size:.72rem;padding:5px 12px;border-color:rgba(255,60,60,.6);color:#ff6060;background:rgba(255,40,40,.12)";
}

let _mciPendingClasif=null;
let _mciSTARTStep='walk',_mciSTARTResult=null,_mciLastCl=null;

// START triage step definitions (extended)
const _MCI_STEPS={
  walk:    {label:"PASO 1 · MOVILIDAD",     emoji:"🚶", q:"¿El paciente camina por sí mismo?",             hint:"Indica que camine unos pasos",                        y:"✓ SÍ, CAMINA",       n:"✕ NO CAMINA"},
  w_inj:   {label:"PASO 1b · LESIÓN",       emoji:"🩹", q:"¿Presenta lesión visible o dolor agudo intenso?",hint:"Fractura, herida, quemadura, dolor 7+ / 10",           y:"✓ SÍ, LESIÓN",       n:"✕ NO / LEVE"},
  breathe: {label:"PASO 2 · RESPIRACIÓN",   emoji:"🫁", q:"¿El paciente respira?",                         hint:"Observa movimiento torácico 5-10 seg",                y:"✓ RESPIRA",          n:"✕ NO RESPIRA"},
  breathe2:{label:"PASO 2b · VÍA AÉREA",   emoji:"⚠️", q:"Tras la maniobra, ¿respira ahora?",             hint:"",instr:"Extiende el cuello / tracción mandibular. Espera 5 seg.", y:"✓ RESPIRA AHORA",    n:"✕ SIGUE SIN RESPIRAR"},
  rr:      {label:"PASO 3 · FRECUENCIA RESP.",emoji:"🌬️",q:"¿Frecuencia respiratoria mayor de 30 rpm?",   hint:"Cuenta resp. en 15 seg × 4",                          y:"> 30 rpm",           n:"≤ 30 rpm"},
  pulse:   {label:"PASO 4 · PERFUSIÓN",     emoji:"🫀", q:"¿Pulso radial presente?",                       hint:"Palpar muñeca 5-10 seg",                              y:"✓ PULSO PRESENTE",   n:"✕ PULSO AUSENTE"},
  shock:   {label:"PASO 4b · CHOQUE",       emoji:"🥶", q:"¿Signos de choque? (piel fría/pálida/sudorosa)",hint:"Evaluar llenado capilar >2 seg y color de la piel",  y:"✓ HAY CHOQUE",       n:"✕ SIN CHOQUE"},
  mental:  {label:"PASO 5 · CONSCIENCIA",   emoji:"🧠", q:"¿Obedece órdenes simples?",                    hint:"\"Cierra los ojos\" / \"Aprieta mi mano\"",            y:"✓ OBEDECE",          n:"✕ NO OBEDECE"},
  hemorr:  {label:"PASO 6 · HEMORRAGIA",    emoji:"🩸", q:"¿Hemorragia activa sin controlar?",             hint:"Sangrado externo que no cede con presión directa",    y:"✓ SANGRADO ACTIVO",  n:"✕ SIN HEMORRAGIA"},
};
const _MCI_RESULT_LBL={ROJO:"ROJO — INMEDIATO",AMARILLO:"AMARILLO — DIFERIDO",VERDE:"VERDE — MENOR",NEGRO:"NEGRO — EXPECTANTE"};
const _MCI_RESULT_DESC={ROJO:"Amenaza vital — atención inmediata.",AMARILLO:"Lesión seria pero estable — puede esperar.",VERDE:"Lesión leve — puede caminar.",NEGRO:"Sin signos de vida — expectante."};

function _renderMCITriage(){
  const tx=L[CL]||L.es;
  const c=document.getElementById("trc");if(!c)return;
  c.innerHTML="";
  document.getElementById("pgWrap").style.display="none";
  const tot=_mciCounts.ROJO+_mciCounts.AMARILLO+_mciCounts.VERDE+_mciCounts.NEGRO;

  const hdr=`<div class="mci-header-bar">
    <div>
      <div class="mci-header-name">⚠️ MCI — ${_mciName}</div>
      <div class="mci-counts-inline">
        <span style="color:#ff6060">🔴 ${_mciCounts.ROJO}</span>
        <span style="color:#ffc832">🟡 ${_mciCounts.AMARILLO}</span>
        <span style="color:#00e07a">🟢 ${_mciCounts.VERDE}</span>
        <span style="color:#aaa">⚫ ${_mciCounts.NEGRO}</span>
        <span style="color:var(--mu)">· ${tot} total</span>
      </div>
    </div>
    <button class="bsec" style="width:auto;padding:5px 11px;font-size:.7rem;margin:0;flex-shrink:0" onclick="confirmDeactivateMCI()">Finalizar</button>
  </div>`;

  // ── RESULT STEP ──────────────────────────────────────────────────────────
  if(_mciSTARTStep==='result'){
    const cc={ROJO:'ro',AMARILLO:'am',VERDE:'ve',NEGRO:'ng'}[_mciSTARTResult]||'ng';
    const ic={ROJO:'🔴',AMARILLO:'🟡',VERDE:'🟢',NEGRO:'⚫'}[_mciSTARTResult]||'⚪';
    const bdrClr={ro:'rgba(255,60,60,.4)',am:'rgba(255,200,50,.4)',ve:'rgba(0,200,80,.4)',ng:'rgba(128,128,128,.4)'}[cc];
    const proto=_MCI_PROTOCOL[_mciSTARTResult];
    const accionesList=proto?proto.acciones.map((a,i)=>`<li style="margin-bottom:4px"><span style="color:var(--cy);font-weight:700;margin-right:4px">${i+1}.</span>${a}</li>`).join(''):'';
    const alertHtml=proto?`<div style="background:rgba(255,200,50,.1);border-left:3px solid var(--yw);padding:6px 10px;border-radius:0 6px 6px 0;font-size:.73rem;color:var(--yw);line-height:1.4;margin-top:8px">⚠️ ${proto.alerta}</div>`:'';
    const aiBtn={ROJO:'background:linear-gradient(135deg,rgba(255,60,60,.25),rgba(255,100,60,.15));border-color:rgba(255,80,80,.5);color:#ff8080',AMARILLO:'background:linear-gradient(135deg,rgba(255,200,50,.25),rgba(255,160,30,.15));border-color:rgba(255,200,50,.5);color:#ffd060',VERDE:'background:linear-gradient(135deg,rgba(0,200,80,.25),rgba(0,180,60,.15));border-color:rgba(0,200,80,.5);color:#60e090',NEGRO:'background:linear-gradient(135deg,rgba(120,120,120,.25),rgba(100,100,100,.15));border-color:rgba(140,140,140,.5);color:#aaa'}[_mciSTARTResult]||'';
    c.innerHTML=hdr+`
    <div class="mci-result-card" style="border-color:${bdrClr};text-align:left">
      <div style="text-align:center;margin-bottom:10px">
        <div class="mci-result-emoji" style="margin-bottom:4px">${ic}</div>
        <div class="mci-result-label ${cc}">${_MCI_RESULT_LBL[_mciSTARTResult]||_mciSTARTResult}</div>
        <div class="mci-result-desc">${_MCI_RESULT_DESC[_mciSTARTResult]||""}</div>
      </div>
      <div style="background:rgba(0,200,240,.06);border:1px solid rgba(0,200,240,.18);border-radius:10px;padding:10px 12px;margin-bottom:12px">
        <div style="font-size:.62rem;font-weight:700;color:var(--cy);letter-spacing:1px;font-family:'JetBrains Mono',monospace;margin-bottom:6px">🧠 PROTOCOLO INMEDIATO</div>
        <ol style="margin:0;padding-left:14px;font-size:.76rem;color:var(--tx);line-height:1.55">${accionesList}</ol>
        ${alertHtml}
      </div>
      <button onclick="_mciCallDeepAI('${_mciSTARTResult}')" id="mciAIMainBtn" style="width:100%;padding:12px 16px;border-radius:12px;border:2px solid;font-size:.83rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:14px;transition:all .2s;${aiBtn}">
        <span id="mciAISpinner" style="display:none" class="sp" style="width:14px;height:14px;border-width:2px"></span>
        <span>✨</span><span id="mciAIBtnTxt">Recomendación IA para este incidente</span>
      </button>
      <div id="mciAIResult" style="font-size:.8rem;line-height:1.6;color:var(--tx);margin-bottom:12px;display:none;background:rgba(0,200,240,.05);border-radius:10px;padding:10px 12px;border:1px solid rgba(0,200,240,.15)"></div>
      <div style="height:1px;background:var(--bd);margin-bottom:10px"></div>
      <div style="font-size:.6rem;color:var(--mu);font-family:'JetBrains Mono',monospace;font-weight:700;letter-spacing:1px;margin-bottom:8px">DATOS DEL PACIENTE (OPCIONAL)</div>
      <input class="fi" id="mciQNombre" type="text" placeholder="Nombre del paciente" style="height:38px;margin-bottom:8px;font-size:.82rem" autocomplete="off">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
        <select class="fi" id="mciQSex" style="height:38px;font-size:.82rem">
          <option value="">Sexo</option><option value="M">Masculino</option><option value="F">Femenino</option><option value="O">Otro</option>
        </select>
        <input class="fi" id="mciQDoc" type="text" placeholder="ID / Documento" style="height:38px;font-size:.82rem" autocomplete="off">
      </div>
      <button class="mci-confirm-btn" onclick="_mciSTARTConfirm()">✓ CONFIRMAR · SIGUIENTE PACIENTE</button>
      <div style="text-align:center;margin-top:8px">
        <span class="mci-mode-link" onclick="_mciSetMode('walk')">← Volver a corregir</span>
      </div>
    </div>`;
    return;
  }

  // ── MANUAL MODE ──────────────────────────────────────────────────────────
  if(_mciSTARTStep==='manual'){
    c.innerHTML=hdr+`
    <div class="card" style="border:1px solid rgba(255,60,60,.25);margin-bottom:10px">
      <div class="mci-patient-n">${tx.mciPatient||"Paciente #"}${_mciPatientN} · clasificación manual</div>
      <div class="mci-btns">
        <button class="mci-btn ro" onclick="_mciSTARTSetResult('ROJO')"><div class="mci-btn-ic">🔴</div>${tx.mciImmediate||"INMEDIATO"}</button>
        <button class="mci-btn am" onclick="_mciSTARTSetResult('AMARILLO')"><div class="mci-btn-ic">🟡</div>${tx.mciDelayed||"DIFERIDO"}</button>
        <button class="mci-btn ve" onclick="_mciSTARTSetResult('VERDE')"><div class="mci-btn-ic">🟢</div>${tx.mciMinor||"MENOR"}</button>
        <button class="mci-btn ng" onclick="_mciSTARTSetResult('NEGRO')"><div class="mci-btn-ic">⚫</div>${tx.mciExpectant||"EXPECTANTE"}</button>
      </div>
      <div style="text-align:center;margin-top:4px">
        <span class="mci-mode-link" onclick="_mciSetMode('walk')">← Usar algoritmo START</span>
      </div>
    </div>
    <button class="bsec" style="width:100%;font-size:.75rem" onclick="deactivateMCI()">📋 ${tx.mciFullTriage||"Triage completo"}</button>`;
    return;
  }

  // ── NEXT PATIENT STEP ────────────────────────────────────────────────────
  if(_mciSTARTStep==='next'){
    const ic={ROJO:'🔴',AMARILLO:'🟡',VERDE:'🟢',NEGRO:'⚫'}[_mciLastCl]||'✓';
    const cc={ROJO:'ro',AMARILLO:'am',VERDE:'ve',NEGRO:'ng'}[_mciLastCl]||'ve';
    c.innerHTML=hdr+`
    <div class="mci-result-card" style="border-color:var(--gn-a);text-align:center;padding:22px 16px">
      <div style="font-size:2.4rem;margin-bottom:6px">${ic}</div>
      <div class="mci-result-label ${cc}" style="margin-bottom:4px">${_MCI_RESULT_LBL[_mciLastCl]||_mciLastCl}</div>
      <div class="mci-result-desc">Paciente #${_mciPatientN-1} clasificado y guardado en cola</div>
      <div style="height:1px;background:var(--bd);margin:14px 0"></div>
      <button class="mci-confirm-btn" onclick="_mciSetMode('walk')" style="background:var(--cy)">→ SIGUIENTE PACIENTE</button>
      <div style="margin-top:10px;display:flex;justify-content:center;gap:16px;flex-wrap:wrap">
        <span class="mci-mode-link" onclick="_mciSetMode('manual')">Modo manual</span>
        <span class="mci-mode-link" onclick="confirmDeactivateMCI()">Finalizar MCI</span>
      </div>
    </div>`;
    return;
  }

  // ── START WIZARD ─────────────────────────────────────────────────────────
  const SORD=['walk','breathe','rr','pulse','mental'];
  const step=_MCI_STEPS[_mciSTARTStep]||_MCI_STEPS.walk;
  const prog=SORD.map(s=>`<div class="mci-prog-dot${s===_mciSTARTStep||(_mciSTARTStep==='breathe2'&&s==='breathe')?' on':''}"></div>`).join('');
  const instrHtml=step.instr?`<div class="mci-step-instr">🔧 ${step.instr}</div>`:'';

  // Clinical context shown automatically for each step
  const _CTX={
    walk:{
      tip:"Si camina: valorar lesión — puede ser AMARILLO (lesión) o VERDE (ileso).",
      items:["Pida que de 3-4 pasos sin apoyo","Caminar no descarta lesión grave","Fractura de MMII puede permitir deambulación parcial"]
    },
    w_inj:{
      tip:"Paciente camina → determinar si tiene lesión que requiere atención.",
      items:["Evaluar visualmente: deformidades, heridas, quemaduras","Preguntar por dolor 7+/10","Si no hay lesión evidente → VERDE (puede esperar)","Si hay lesión → AMARILLO (diferido)"]
    },
    breathe:{
      tip:"Paciente NO camina → evaluar vía aérea y respiración es PRIORITARIO.",
      items:["Observar tórax 5-10 seg: ¿hay movimiento?","Acercar mejilla/oído a boca y nariz","Sin respiración → maniobra de apertura aérea ANTES de declarar NEGRO"]
    },
    breathe2:{
      tip:"Apertura aérea: frente-mentón o tracción mandibular. Esperar 5 seg.",
      items:["Hiperextensión cervical (salvo trauma columna sospechado)","Tracción mandibular en trauma de alta energía","Si respira tras maniobra → ROJO (urgente)","Si sigue sin respirar → NEGRO (expectante)"]
    },
    rr:{
      tip:"Respiración presente → contar frecuencia. >30 rpm indica trabajo respiratorio elevado.",
      items:["Contar respiraciones en 15 seg y multiplicar ×4",">30 rpm: trabajo respiratorio compensatorio → ROJO","≤30 rpm: continuar evaluación de perfusión"]
    },
    pulse:{
      tip:"Evaluar perfusión: pulso radial es rápido y confiable en campo.",
      items:["Palpar arteria radial (muñeca) 5-10 seg","Pulso ausente o filiforme → shock descompensado → ROJO","Pulso presente → evaluar signos de choque"]
    },
    shock:{
      tip:"Pulso presente pero evaluar compensación hemodinámica.",
      items:["Piel fría, pálida o marmórea: vasocontricción por shock","Sudoración fría: respuesta adrenérgica → shock","Llenado capilar >2 seg (presionar uña 2 seg y soltar)","Shock presente → ROJO aunque tenga pulso"]
    },
    mental:{
      tip:"Estado neurológico: ¿el paciente sigue órdenes simples?",
      items:["Orden verbal: \"Cierra los ojos\" / \"Aprieta mi mano\"","Si obedece → evaluar hemorragia activa","Si NO obedece → lesión neurológica significativa → ROJO","No confundir desorientación con no obedecer órdenes"]
    },
    hemorr:{
      tip:"Paciente con estado mental conservado → detectar hemorragia activa.",
      items:["Sangrado que no cede con presión directa 2 min → ROJO","Heridas que ceden → AMARILLO (diferido)","Torniquete si hemorragia en extremidades sin control","Verificar espalda, cuero cabelludo y axilas"]
    }
  };
  const ctx=_CTX[_mciSTARTStep];
  const ctxHtml=ctx?`
    <div style="background:rgba(0,200,240,.07);border-left:3px solid rgba(0,200,240,.4);border-radius:0 10px 10px 0;padding:10px 12px;margin-bottom:10px;animation:fadeUp .25s ease">
      <div style="font-size:.65rem;font-weight:700;color:var(--cy);letter-spacing:1px;font-family:'JetBrains Mono',monospace;margin-bottom:5px">🧠 ASISTENTE CLÍNICO</div>
      <div style="font-size:.78rem;color:var(--tx);margin-bottom:6px;line-height:1.4">${ctx.tip}</div>
      <ul style="margin:0;padding-left:14px;font-size:.74rem;color:var(--mu);line-height:1.6">
        ${ctx.items.map(i=>`<li>${i}</li>`).join('')}
      </ul>
    </div>`:'';

  c.innerHTML=hdr+`
    <div style="font-family:'JetBrains Mono',monospace;font-size:.7rem;color:var(--mu);text-align:center;margin-bottom:8px">${tx.mciPatient||"Paciente #"}${_mciPatientN} · ${tot} clasificados</div>
    <div class="mci-prog-bar">${prog}</div>
    <div class="mci-step-card">
      <div class="mci-step-label">${step.label}</div>
      <div class="mci-step-emoji">${step.emoji}</div>
      <div class="mci-step-question">${step.q}</div>
      ${step.hint?`<div class="mci-step-hint">${step.hint}</div>`:''}
      ${instrHtml}
    </div>
    <div class="mci-yesno">
      <button class="mci-yes" onclick="_mciSTARTAnswer(true)"><span style="font-size:1.4rem">✓</span>${step.y}</button>
      <button class="mci-no" onclick="_mciSTARTAnswer(false)"><span style="font-size:1.4rem">✕</span>${step.n}</button>
    </div>
    ${ctxHtml}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
      <span class="mci-mode-link" onclick="_mciSetMode('manual')">Clasificar manualmente</span>
      <button class="bsec" style="width:auto;padding:4px 10px;font-size:.7rem;margin:0" onclick="deactivateMCI()">📋 Triage completo</button>
    </div>`;
}

function _mciSelectClasif(clasificacion){_mciSTARTSetResult(clasificacion);}

function _mciSTARTAnswer(yes){
  switch(_mciSTARTStep){
    case 'walk':    yes?(_mciSTARTStep='w_inj'):(_mciSTARTStep='breathe'); break;
    case 'w_inj':   yes?(_mciSTARTResult='AMARILLO',_mciSTARTStep='result'):(_mciSTARTResult='VERDE',_mciSTARTStep='result'); break;
    case 'breathe': yes?(_mciSTARTStep='rr'):(_mciSTARTStep='breathe2'); break;
    case 'breathe2':_mciSTARTResult=yes?'ROJO':'NEGRO';_mciSTARTStep='result'; break;
    case 'rr':      yes?(_mciSTARTResult='ROJO',_mciSTARTStep='result'):(_mciSTARTStep='pulse'); break;
    case 'pulse':   !yes?(_mciSTARTResult='ROJO',_mciSTARTStep='result'):(_mciSTARTStep='shock'); break;
    case 'shock':   yes?(_mciSTARTResult='ROJO',_mciSTARTStep='result'):(_mciSTARTStep='mental'); break;
    case 'mental':  yes?(_mciSTARTStep='hemorr'):(_mciSTARTResult='ROJO',_mciSTARTStep='result'); break;
    case 'hemorr':  _mciSTARTResult=yes?'ROJO':'AMARILLO';_mciSTARTStep='result'; break;
  }
  _renderMCITriage();
}
function _mciSTARTSetResult(clasificacion){_mciSTARTResult=clasificacion;_mciSTARTStep='result';_renderMCITriage();}
function _mciSetMode(mode){_mciSTARTStep=mode;_mciSTARTResult=null;_renderMCITriage();}
async function _mciSTARTConfirm(){
  if(!_mciSTARTResult)return;
  const cl=_mciSTARTResult;
  const nombre=(document.getElementById("mciQNombre")?.value||"").trim();
  const docId=(document.getElementById("mciQDoc")?.value||"").trim();
  const sex=document.getElementById("mciQSex")?.value||"";
  const extra={};
  if(nombre)extra.pacienteNombre=nombre;
  if(docId)extra.pacienteDoc=docId;
  if(sex)extra.pacienteSex=sex;
  // Optimistic: update counts immediately and show summary step
  _mciCounts[cl]=(_mciCounts[cl]||0)+1;_mciPatientN++;
  _mciSTARTStep='next';_mciSTARTResult=null;_mciLastCl=cl;
  _updateMCIBanner();_renderMCITriage();
  toast(`✓ ${cl} — Paciente #${_mciPatientN-1}${nombre?" ("+nombre+")":""}`);
  if(FB&&CU){
    try{
      const data={clasificacion:cl,tipo:"MCI",motivo:_mciName,notas:"Triage START MCI",
        userId:CU.uid,userName:CUName||CU.email,createdAt:FB.serverTimestamp(),esMCI:true,...extra};
      await saveTriage(FB,data);
      _updateColaBadge(_colaData.filter(d=>!d.atendido).length+1);
    }catch(e){toast("⚠️ Error guardando paciente MCI: "+e.message);}
  }
}

async function _lookupMciPatient(){
  const doc=document.getElementById("mciPacDoc").value.trim();
  const res=document.getElementById("mciPatientDbResult");
  if(!doc){res.innerHTML=`<span style="color:var(--mu)">Ingrese un ID para buscar.</span>`;return;}
  if(!FB||!CU){res.innerHTML=`<span style="color:var(--mu)">Sin conexión Firebase.</span>`;return;}
  res.innerHTML=`<span class="sp" style="margin-right:6px"></span>Buscando...`;
  try{
    const q=await FB.getDocs(FB.query(FB.collection(FB.db,"historias"),FB.where("doc","==",doc),FB.limit(1)));
    if(q.empty){res.innerHTML=`<span style="color:var(--yw)">⚠️ Paciente no encontrado en la base de datos.</span>`;return;}
    const d=q.docs[0].data();
    document.getElementById("mciPacNombre").value=d.name||"";
    document.getElementById("mciPacSex").value=d.sex||"";
    res.innerHTML=`<span style="color:var(--gn)">✓ Paciente encontrado: <b>${_esc(d.name)}</b> — ${_esc(d.age)} años</span>`;
  }catch(e){res.innerHTML=`<span style="color:var(--rd)">Error al buscar: ${_esc(e.message)}</span>`;}
}

function _cancelMciPatient(){
  document.getElementById("mciPatientForm").style.display="none";
  if(_mciPendingClasif)quickMCI(_mciPendingClasif,{});
  _mciPendingClasif=null;
}

function _confirmMciPatient(){
  if(!_mciPendingClasif)return;
  const nombre=document.getElementById("mciPacNombre").value.trim();
  const sex=document.getElementById("mciPacSex").value;
  const doc=document.getElementById("mciPacDoc").value.trim();
  document.getElementById("mciPatientForm").style.display="none";
  quickMCI(_mciPendingClasif,{pacienteNombre:nombre||undefined,pacienteSex:sex||undefined,pacienteDoc:doc||undefined});
  _mciPendingClasif=null;
}

async function quickMCI(clasificacion,extra={}){
  _mciCounts[clasificacion]++;_mciPatientN++;
  _updateMCIBanner();
  if(FB&&CU){
    try{
      const data={clasificacion,tipo:"MCI",motivo:_mciName,notas:"Triage START rapido MCI",
        userId:CU.uid,userName:CUName||CU.email,
        createdAt:FB.serverTimestamp(),esMCI:true,...extra};
      await saveTriage(FB,data);
      _updateColaBadge(_colaData.filter(d=>!d.atendido).length+1);
    }catch(e){toast("⚠️ Error guardando paciente MCI: "+e.message);}
  }
  _renderMCITriage();
  const nombre=extra.pacienteNombre?` (${extra.pacienteNombre})`:"";
  toast(`✓ ${clasificacion} — Paciente #${_mciPatientN-1}${nombre}`);
}

// ══════════════════════════════════════
// MCI — ASISTENTE CLÍNICO IA
// ══════════════════════════════════════
const _MCI_PROTOCOL={
  ROJO:{
    icon:"🔴",label:"INMEDIATO",
    acciones:["Vía aérea permeable — maniobra frente-mentón o cánula orofaríngea","Oxigenoterapia de alto flujo 10-15 L/min (mascarilla con reservorio)","Control de hemorragias externas: compresión directa / torniquete proximal","2 vías venosas gruesas (calibre 14-16G), SF 0.9% 500 mL rápido si shock","Monitorización continua (SpO₂, FC, PA) si disponible","Inmovilización cervical si trauma de alta energía","Traslado inmediato a hospital nivel III o área de reanimación"],
    alerta:"Evaluar cada 3-5 min — puede deteriorarse a NEGRO o mejorar a AMARILLO"
  },
  AMARILLO:{
    icon:"🟡",label:"DIFERIDO",
    acciones:["Vía aérea evaluada — posición de seguridad si inconsciente","Hemostasia de heridas no exanguinantes","Analgesia si disponible (paracetamol IV / ketorolaco IM) — evitar opiáceos en campo","Inmovilización de fracturas con férulas provisionales","Reevaluación cada 10-15 min para detectar deterioro","Preparar traslado en segunda oleada — hospital nivel II-III"],
    alerta:"Alta probabilidad de deterioro a ROJO si hay demora de más de 30-60 min"
  },
  VERDE:{
    icon:"🟢",label:"MENOR",
    acciones:["Área de tratamiento diferido (zona verde)","Autocuidado o atención por personal auxiliar","Heridas menores: limpieza y apósito","Analgesia oral si tolerada","Reevaluación periódica — pueden deambular en zona de espera","Traslado a urgencias convencionales cuando haya recursos disponibles"],
    alerta:"Monitorizar para detectar síntomas diferidos (cefalea progresiva, dolor torácico)"
  },
  NEGRO:{
    icon:"⚫",label:"EXPECTANTE",
    acciones:["No reanimar en campo — recursos insuficientes para supervivencia probable","Cuidados paliativos básicos: abrigo, comodidad, presencia humana","Morfina o analgesia si disponible para control del dolor","Documentar hora y circunstancias","Informar a coordinación de incidente","Revisión si los recursos aumentan o la situación del incidente cambia"],
    alerta:"Decisión reversible — reevaluar si cambia la disponibilidad de recursos"
  }
};

let _mciAILoading=false;

async function _mciAIAssist(){
  const panel=document.getElementById("mciAIPanel");
  if(!panel)return;
  if(panel.style.display==="block"&&panel.dataset.mode==="result"){panel.style.display="none";return;}
  const cl=_mciSTARTResult||_mciLastCl;
  if(!cl)return;
  _mciAIAssistColor(cl);
}

function _mciAIAssistColor(cl){
  const panel=document.getElementById("mciAIPanel");
  if(!panel)return;
  if(panel.style.display==="block"&&panel.dataset.cl===cl){panel.style.display="none";return;}
  const proto=_MCI_PROTOCOL[cl];
  if(!proto){panel.style.display="none";return;}
  const accionesList=proto.acciones.map((a,i)=>`<li style="margin-bottom:5px"><span style="color:var(--cy);font-weight:700;margin-right:4px">${i+1}.</span>${a}</li>`).join("");
  panel.dataset.cl=cl;panel.dataset.mode="result";
  panel.style.display="block";
  panel.innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:1.1rem">${proto.icon}</span>
      <span style="font-weight:700;color:var(--cy);font-size:.82rem">PROTOCOLO ${proto.label} — MCI</span>
      <span style="margin-left:auto;font-size:.7rem;color:var(--mu);cursor:pointer" onclick="document.getElementById('mciAIPanel').style.display='none'">✕</span>
    </div>
    <ol style="margin:0 0 10px 14px;padding:0;font-size:.78rem">${accionesList}</ol>
    <div style="background:rgba(255,200,50,.1);border-left:3px solid var(--yw);padding:7px 10px;border-radius:0 6px 6px 0;font-size:.74rem;color:var(--yw);line-height:1.4">
      ⚠️ ${proto.alerta}
    </div>
    <div style="margin-top:10px;border-top:1px solid rgba(0,200,240,.15);padding-top:8px">
      <div id="mciAIdeep" style="font-size:.77rem;color:var(--mu)">
        <button style="background:none;border:1px solid rgba(0,200,240,.3);border-radius:8px;color:var(--cy);font-size:.74rem;padding:5px 10px;cursor:pointer;display:flex;align-items:center;gap:5px" onclick="_mciCallDeepAI('${cl}')">
          <span class="sp" style="display:none;width:10px;height:10px;border-width:1.5px" id="mciAISpinner"></span>
          <span id="mciAIBtnTxt">✨ Recomendación IA para situación actual</span>
        </button>
        <div id="mciAIResult" style="margin-top:8px;line-height:1.55;color:var(--tx)"></div>
      </div>
    </div>`;
}

async function _mciCallDeepAI(cl){
  if(_mciAILoading)return;
  _mciAILoading=true;
  const spinner=document.getElementById("mciAISpinner");
  const btnTxt=document.getElementById("mciAIBtnTxt");
  const resultDiv=document.getElementById("mciAIResult");
  const mainBtn=document.getElementById("mciAIMainBtn");
  if(spinner)spinner.style.display="inline-block";
  if(btnTxt)btnTxt.textContent="Consultando IA...";
  if(mainBtn)mainBtn.disabled=true;
  if(resultDiv){resultDiv.style.display="block";resultDiv.innerHTML=`<span style="color:var(--mu);font-size:.76rem">⏳ Generando recomendación clínica contextual...</span>`;}

  const tot=Object.values(_mciCounts).reduce((a,b)=>a+b,0);
  const dist=Object.entries(_mciCounts).filter(([,v])=>v>0).map(([k,v])=>`${k}:${v}`).join(", ")||"ninguno aún";
  const prompt=`Eres un médico de urgencias con experiencia en incidentes de víctimas en masa (IVM/MCI).
Situación actual: Incidente "${_mciName}", ${tot} pacientes clasificados hasta ahora (distribución: ${dist}). Paciente #${_mciPatientN} clasificado como ${cl}.
Proporciona exactamente 3 puntos concisos (máx 90 palabras en total):
1. Acción clínica inmediata más crítica para este paciente ${cl}
2. Recomendación de gestión de recursos basada en la distribución actual del incidente
3. Señal de deterioro a vigilar en los próximos 5-10 minutos
Responde en español. Solo puntos numerados. Lenguaje clínico directo y operativo.`;

  try{
    const r=await fetch(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"deepseek-chat",max_tokens:220,messages:[{role:"user",content:prompt}]})});
    const d=await r.json();
    const txt=d.choices?.[0]?.message?.content?.trim()||"Sin respuesta";
    if(resultDiv)resultDiv.innerHTML=txt.split("\n").filter(l=>l.trim()).map(l=>`<p style="margin:0 0 6px">${_esc(l).replace(/^(\d+[\.\)]\s*)/,'<span style="color:var(--cy);font-weight:700">$1</span>')}</p>`).join("");
    if(btnTxt)btnTxt.textContent="↻ Actualizar recomendación";
  }catch(e){
    if(resultDiv)resultDiv.innerHTML=`<span style="color:var(--rd);font-size:.74rem">❌ Error: ${_esc(e.message)}</span>`;
    if(btnTxt)btnTxt.textContent="↻ Reintentar";
  }finally{
    _mciAILoading=false;
    if(spinner)spinner.style.display="none";
    if(mainBtn)mainBtn.disabled=false;
  }
}

