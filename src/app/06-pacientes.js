// 06-pacientes.js — Historia del paciente en el triage y acceso de pacientes (ID + PIN)
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden numérico desde index.html.
// ── PATIENT HC HELPERS ────────────────────────────────────────────────────────
function _applyPatientHCToNotes(){
  if(!_patientHC)return;
  // Auto-set patient type from registered age
  const age=parseInt(_patientHC.age);
  if(!isNaN(age)&&!TD.tipo){
    if(age<=12)TD.tipo="nino";
    else if(age<=17)TD.tipo="adolescente";
    else if(age<=59)TD.tipo="adulto";
    else TD.tipo="adulto_mayor";
  }
  // Pre-fill clinical notes
  const parts=[];
  if(_patientHC.antecedentes?.length)parts.push(`Antecedentes: ${_patientHC.antecedentes.join(", ")}`);
  if(_patientHC.alergias?.length)parts.push(`ALERGIAS (IMPORTANTE): ${_patientHC.alergias.join(", ")}`);
  if(_patientHC.medicacion?.length)parts.push(`Medicación actual: ${_patientHC.medicacion.join(", ")}`);
  if(_patientHC.notes)parts.push(_patientHC.notes);
  if(parts.length)TD.notas=parts.join("\n");
}

function _updatePatientHCStrip(){
  const strip=document.getElementById("patientHCStrip");
  if(!strip)return;
  if(!_patientHC){strip.innerHTML="";return;}
  const av=(_patientHC.name||"?")[0].toUpperCase();
  const aleHtml=(_patientHC.alergias||[]).length?`<div class="pt-ale">⚠️ Alergias: ${_patientHC.alergias.join(", ")}</div>`:"";
  strip.innerHTML=`<div class="pt-hc-chip">
    <div class="pt-av">${av}</div>
    <div style="flex:1;min-width:0">
      <div class="pt-name">${_patientHC.name}</div>
      <div class="pt-sub">${_patientHC.age} años · ${_patientHC.sex==="M"?"Masculino":"Femenino"} · ID: ${_patientHC.doc||"—"}</div>
      ${aleHtml}
    </div>
    <button onclick="_clearTriagePatient()" style="background:none;border:none;color:var(--mu);font-size:.85rem;cursor:pointer;padding:4px;flex-shrink:0" title="Cambiar paciente">✕</button>
  </div>`;
}

function _clearTriagePatient(){
  _patientHC=null;_triageLookupDone=false;_triageLookupResult=null;TD.notas="";
  _updatePatientHCStrip();
  _stopTriageTimer();_triageStartTime=null;TS=0;TD={};TM=[];_lastResult=null;
  document.getElementById("pg").style.width="0%";
  _showPatientLookup();
}

function _showPatientLookup(){
  const c=document.getElementById("trc");if(!c)return;
  document.getElementById("pg").style.width="0%";
  _updatePatientHCStrip();
  const tx=L[CL]||L.es;
  c.innerHTML=`<div class="lookup-wrap">
    <div class="card">
      <div class="lookup-icon-wrap">
        <span class="lookup-ic">🗂️</span>
        <div class="lookup-title">${tx.lookupTitle||"Identificar paciente"}</div>
        <div class="lookup-sub">${tx.lookupSub||"Ingresa el número de identificación para cargar la historia clínica"}</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:4px;animation:fadeUp .4s .2s both">
        <input class="fi" id="triagePatientId" type="text" inputmode="numeric"
               placeholder="${tx.idPlaceholder||"N.º ID"}"
               style="flex:1;min-width:0;width:auto;text-align:center;letter-spacing:2px;font-size:1rem;font-family:'JetBrains Mono',monospace"
               onkeydown="if(event.key==='Enter')_searchPatientForTriage()">
        <button id="triageSearchBtn"
                style="flex:0 0 auto;width:auto;padding:0 18px;background:var(--cy);border:none;border-radius:9px;color:#000;font-weight:700;font-size:.88rem;cursor:pointer;font-family:'Familjen Grotesk',sans-serif;white-space:nowrap;touch-action:manipulation;transition:all .22s"
                onclick="_searchPatientForTriage()">${tx.lookupSearch||"Buscar"}</button>
      </div>
      <div id="triageLookupResult" style="margin-top:12px"></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:9px;margin-top:10px">
      <button onclick="openPrehNotif()" class="triage-quick-btn" style="animation:fadeUp .4s .12s both;border-color:rgba(255,160,64,.2)">
        <span class="triage-quick-ic">🚑</span>
        <div class="triage-quick-body">
          <div class="triage-quick-title" style="color:#ffa040">${tx.prehTitle||"Pre-hospitalario"}</div>
          <div class="triage-quick-sub">${tx.prehSub||"Aviso de llegada al hospital"}</div>
        </div>
        <span class="triage-quick-arrow">›</span>
      </button>
      <button onclick="openMCISetup()" id="lookupMCIBtn" class="triage-quick-btn" style="animation:fadeUp .4s .2s both;border-color:rgba(255,128,96,.2)">
        <span class="triage-quick-ic">⚠️</span>
        <div class="triage-quick-body">
          <div class="triage-quick-title" style="color:#ff8060">${tx.mciMode||"MCI"}</div>
          <div class="triage-quick-sub">${tx.mciSetupSub||"Incidente de multiples victimas — triage START rapido"}</div>
        </div>
        <span class="triage-quick-arrow">›</span>
      </button>
    </div>
    <div style="text-align:center;margin-top:14px;animation:fadeUp .4s .28s both">
      <span style="cursor:pointer;font-size:.78rem;color:var(--mu);text-underline-offset:3px;text-decoration:underline" onclick="_skipPatientLookup()">${tx.lookupSkip||"Continuar con paciente no registrado"} →</span>
    </div>
  </div>`;
}


async function _searchPatientForTriage(){
  const inp=document.getElementById("triagePatientId");
  const id=(inp?.value||"").trim();
  if(!id){toast("Ingresa el número de identificación");return;}
  const btn=document.getElementById("triageSearchBtn");
  const res=document.getElementById("triageLookupResult");
  if(btn){btn.disabled=true;btn.textContent="Buscando...";}
  if(res)res.innerHTML=`<div style="display:flex;align-items:center;gap:8px;color:var(--mu);font-size:.8rem;padding:8px 0"><div class="sp"></div>Consultando base de datos...</div>`;
  if(!FB){
    if(res)res.innerHTML=`<div class="ib rd lookup-result-enter"><div class="ibl">Sin conexión</div><div class="ibt">No hay conexión a la base de datos clínicos.</div></div>`;
    if(btn){btn.disabled=false;btn.textContent="Buscar";}
    return;
  }
  try{
    const snap=await FB.getDocs(FB.query(FB.collection(FB.db,"historias"),FB.where("doc","==",id),FB.limit(1)));
    if(btn){btn.disabled=false;btn.textContent="Buscar";}
    if(snap.empty){
      res.innerHTML=`<div class="lookup-result-enter">
        <div class="ib" style="background:rgba(255,184,48,.08);border:1px solid rgba(255,184,48,.3);color:var(--yw)">
          <div class="ibl">⚠️ Paciente no encontrado</div>
          <div class="ibt">No existe historia clínica con ID <strong>${id}</strong>. Puedes continuar sin historia o crear un nuevo registro.</div>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="bsec" style="flex:1;font-size:.8rem" onclick="_skipPatientLookup()">Continuar sin HC</button>
          <button class="bpri" style="flex:1;font-size:.8rem" onclick="navigateTo('hc-new')">+ Nueva HC</button>
        </div>
      </div>`;
    }else{
      const docSnap=snap.docs[0];
      _triageLookupResult={id:docSnap.id,...docSnap.data()};
      const hc=_triageLookupResult;
      const aleHtml=hc.alergias?.length?`<div class="lf-ale">⚠️ ALERGIAS: ${hc.alergias.join(", ")}</div>`:"";
      const antHtml=hc.antecedentes?.length?`<div class="lf-ant">${hc.antecedentes.join(" · ")}</div>`:"";
      const medHtml=hc.medicacion?.length?`<div class="lf-med">💊 ${hc.medicacion.join(", ")}</div>`:"";
      res.innerHTML=`<div class="lookup-result-enter">
        <div class="lookup-found-card">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="pt-av" style="width:40px;height:40px;background:var(--cy-a);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:var(--cy);flex-shrink:0">${(hc.name||"?")[0].toUpperCase()}</div>
            <div>
              <div class="lf-name">${hc.name}</div>
              <div class="lf-meta">${hc.age} años · ${hc.sex==="M"?"Masculino":"Femenino"} · ID: ${hc.doc}</div>
            </div>
          </div>
          ${aleHtml}${antHtml}${medHtml}
        </div>
        <button class="bpri" style="width:100%;font-size:.88rem;animation:fadeUp .3s .05s both" onclick="_confirmPatientForTriage()">
          ✓ Iniciar triage con este paciente
        </button>
      </div>`;
    }
  }catch(e){
    if(btn){btn.disabled=false;btn.textContent="Buscar";}
    if(res)res.innerHTML=`<div class="ib rd lookup-result-enter"><div class="ibl">Error</div><div class="ibt">${e.message}</div></div>`;
  }
}

function _confirmPatientForTriage(){
  if(!_triageLookupResult){toast("Busca un paciente primero");return;}
  _patientHC=_triageLookupResult;
  _triageLookupResult=null;
  _triageLookupDone=true;
  history.pushState({_ms:'triage-enter'},'');
  _applyPatientHCToNotes();
  _updatePatientHCStrip();
  if(!_triageStartTime)_startTriageTimer();
  rTriage();
}

function _skipPatientLookup(){
  _patientHC=null;_triageLookupResult=null;_triageLookupDone=true;
  history.pushState({_ms:'triage-enter'},'');
  _updatePatientHCStrip();
  if(!_triageStartTime)_startTriageTimer();
  rTriage();
}
// ─────────────────────────────────────────────────────────────────────────────

async function loginPatientById(){
  const inp=document.getElementById("patientIdInput");
  const pinInp=document.getElementById("patientPinInput");
  const err=document.getElementById("patientLoginErr");
  const id=_normId(inp?.value);
  const pin=(pinInp?.value||"").trim();
  if(err){err.textContent="";err.className="auth-err";}
  const fail=msg=>{if(err){err.className="auth-err er";err.textContent=msg;}else toast(msg);};
  if(!id){fail("Ingresa tu número de identificación");return;}
  if(!PIN_RE.test(pin)){fail("El PIN debe tener 6 dígitos");return;}
  if(!FB){fail("Sin conexión a la base de datos");return;}
  const btn=document.getElementById("patientLoginBtn");
  if(btn){btn.disabled=true;btn.textContent=t("loading")||"...";}
  try{
    // initAuth() detecta el rol "paciente", carga la historia y abre la app
    await FB.signInWithEmailAndPassword(FB.auth,_patientEmail(id),_patientPwd(pin));
    if(pinInp)pinInp.value="";
  }catch(e){
    const bad=["auth/invalid-credential","auth/user-not-found","auth/wrong-password","auth/invalid-login-credentials"];
    if(bad.includes(e.code))fail("ID o PIN incorrectos. Si es tu primera vez, regístrate.");
    else if(e.code==="auth/too-many-requests")fail("Demasiados intentos. Espera unos minutos.");
    else fail("Error al ingresar: "+e.message);
  }finally{
    if(btn){btn.disabled=false;btn.textContent=t("patientEnter")||"Ingresar";}
  }
}
function _openPatientRegister(){
  const id=_normId(document.getElementById("patientIdInput")?.value);
  if(!id){const err=document.getElementById("patientLoginErr");if(err){err.className="auth-err er";err.textContent="Escribe primero tu número de identificación";}return;}
  _showPatientRegisterForm(id);
}
function _showPatientRegisterForm(patId){
  const pv=document.getElementById("authPatientView");
  const rv=document.getElementById("patientRegisterView");
  if(pv)pv.style.display="none";
  if(rv){
    rv.style.display="";
    const disp=document.getElementById("pRegIdDisplay");if(disp)disp.textContent=patId;
    const hid=document.getElementById("pRegId");if(hid)hid.value=patId;
    const sub=document.getElementById("pRegSubtitle");if(sub)sub.textContent="Crea tu cuenta de paciente con el ID "+patId;
    rv.classList.remove("auth-slide-right","auth-slide-left");
    void rv.offsetWidth;
    rv.classList.add("auth-slide-right");
  }
}
function _cancelPatientRegister(){
  const rv=document.getElementById("patientRegisterView");
  const pv=document.getElementById("authPatientView");
  if(rv)rv.style.display="none";
  if(pv){pv.style.display="";pv.classList.remove("auth-slide-right","auth-slide-left");void pv.offsetWidth;pv.classList.add("auth-slide-left");}
  const inp=document.getElementById("patientIdInput");if(inp)inp.value="";
}
async function registerPatient(){
  const id=_normId(document.getElementById("pRegId").value);
  const name=document.getElementById("pRegName").value.trim();
  const dob=document.getElementById("pRegDob").value;
  const sex=document.querySelector('input[name="pRegSex"]:checked')?.value;
  const phone=document.getElementById("pRegPhone").value.trim();
  const pin=document.getElementById("pRegPin").value.trim();
  const pin2=document.getElementById("pRegPin2").value.trim();
  const err=document.getElementById("pRegErr");
  err.textContent="";err.className="auth-err";
  const fail=msg=>{err.className="auth-err er";err.textContent=msg;};
  if(!name||!dob||!sex||!phone){fail("Todos los campos son obligatorios");return;}
  if(!id){fail("Error: número de ID no encontrado");return;}
  if(!PIN_RE.test(pin)){fail("El PIN debe tener exactamente 6 dígitos");return;}
  if(pin!==pin2){fail("Los PIN no coinciden");return;}
  const btn=document.getElementById("pRegBtn");
  btn.disabled=true;btn.textContent="Registrando...";
  _patientAuthBusy=true;
  try{
    const cred=await FB.createUserWithEmailAndPassword(FB.auth,_patientEmail(id),_patientPwd(pin));
    const uid=cred.user.uid;
    await FB.setDoc(FB.doc(FB.db,"users",uid),{name,role:"paciente",doc:id,phone,createdAt:FB.serverTimestamp()});
    // Si el personal médico ya había creado la historia con este ID, se reutiliza
    let hc=await _loadPatientHC(id);
    if(!hc){
      const age=Math.floor((Date.now()-new Date(dob).getTime())/(365.25*24*3600000));
      const data={doc:id,name,age,sex,dob,telefono:phone,antecedentes:[],alergias:[],medicacion:[],notes:"",userId:uid,createdAt:FB.serverTimestamp()};
      const ref=await FB.addDoc(FB.collection(FB.db,"historias"),data);
      hc={id:ref.id,...data};
    }
    _patientHC=hc;
    CU=cred.user;CR="paciente";CUName=name;
    _patientAuthBusy=false;
    showApp();
  }catch(e){
    _patientAuthBusy=false;
    if(e.code==="auth/email-already-in-use")fail("Este ID ya está registrado. Vuelve atrás e ingresa con tu PIN.");
    else fail("Error al registrar: "+e.message);
    btn.disabled=false;btn.textContent="Completar registro";
  }
}

