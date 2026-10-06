// 20-pin.js — Recuperación del PIN de pacientes.
//
// Flujo:
//  1. El paciente olvida su PIN y se acerca con su documento de identidad.
//  2. El personal (médico o admin) abre su historia y toca "Restablecer PIN".
//     El Worker (/reset-pin) verifica que quien lo pide es personal aprobado,
//     genera un PIN temporal y marca la cuenta con mustChangePin.
//  3. El paciente entra con ese PIN y la app lo obliga a crear uno nuevo.
//
// Un solo modal (#pinModal) sirve para los tres pasos; su contenido se arma aquí.

const _STAFF_ROLES=["medico","admin","admin_hosp"];

function _pinModal(html){
  const m=document.getElementById("pinModal");
  document.getElementById("pinModalBox").innerHTML=html;
  m.style.display="flex";
  return m;
}
function _closePinModal(){document.getElementById("pinModal").style.display="none";}

// ── Paciente: "¿Olvidaste tu PIN?" ──
function _forgotPinInfo(){
  _pinModal(`
    <div class="modal-title">¿Olvidaste tu PIN?</div>
    <div class="pin-txt">Por seguridad, el PIN solo se puede restablecer en persona.</div>
    <ol class="pin-steps">
      <li>Acércate al personal de salud o a admisiones con tu <b>documento de identidad</b>.</li>
      <li>Te entregarán un <b>PIN temporal</b>.</li>
      <li>Al entrar con él, la app te pedirá crear uno nuevo.</li>
    </ol>
    <button type="button" class="bpri" style="width:100%;margin:6px 0 0" onclick="_closePinModal()">Entendido</button>`);
}

// ── Personal: restablecer el PIN desde la historia ──
function _resetPinCard(d){
  if(!d||!d.doc||!_STAFF_ROLES.includes(CR))return"";
  return`<div class="card" style="animation:fadeUp .3s .25s both">
    <div class="clabel">Acceso del paciente</div>
    <div style="font-size:.82rem;color:var(--mu);line-height:1.5;margin-bottom:10px">Si el paciente olvidó su PIN, genera uno temporal. Verifica antes su identidad con el documento.</div>
    <button type="button" class="bsec" style="width:100%;margin:0" onclick="_confirmResetPin()">Restablecer PIN del paciente</button>
  </div>`;
}
function _confirmResetPin(){
  const d=_hcCache[_currentHCId];if(!d)return;
  _pinModal(`
    <div class="modal-title">Restablecer PIN</div>
    <div class="pin-txt">Paciente: <b>${_esc(d.name||"Sin nombre")}</b><br>Documento: <span class="pin-mono">${_esc(d.doc)}</span></div>
    <div class="consent-row" style="margin-top:4px">
      <input type="checkbox" id="pinIdChk">
      <label for="pinIdChk">Verifiqué la identidad del paciente con su documento.</label>
    </div>
    <div class="auth-err" id="pinErr"></div>
    <div style="display:flex;gap:8px;margin-top:6px">
      <button type="button" class="bsec" style="flex:1;margin:0" onclick="_closePinModal()">Cancelar</button>
      <button type="button" class="bpri" style="flex:1;margin:0" id="pinGo" onclick="_doResetPin()">Generar PIN</button>
    </div>`);
}
async function _doResetPin(){
  const d=_hcCache[_currentHCId];if(!d)return;
  const err=document.getElementById("pinErr");
  const fail=m=>{err.className="auth-err er";err.textContent=m;};
  if(!document.getElementById("pinIdChk").checked){fail("Confirma que verificaste la identidad");return;}
  const btn=document.getElementById("pinGo");btn.disabled=true;btn.textContent="Generando…";
  try{
    let pin;
    if(FB._demo){
      pin=String(Math.floor(Math.random()*1e6)).padStart(6,"0");
    }else{
      const r=await fetch(PROXY+"reset-pin",{method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+await FB.auth.currentUser.getIdToken()},
        body:JSON.stringify({doc:d.doc})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j.error||("Error "+r.status));
      pin=j.pin;
    }
    logAudit("pin_reset",{doc:d.doc});
    _pinModal(`
      <div class="modal-title">PIN temporal</div>
      <div class="pin-code">${_esc(pin)}</div>
      <div class="pin-txt">Entrégaselo al paciente. Al ingresar con su documento y este PIN, la app le pedirá crear uno nuevo.<br><b>No lo guardes ni lo compartas por otros medios.</b></div>
      <button type="button" class="bpri" style="width:100%;margin:6px 0 0" onclick="_closePinModal()">Listo</button>`);
  }catch(e){fail(e.message);btn.disabled=false;btn.textContent="Generar PIN";}
}

// ── Paciente: cambio obligatorio tras un PIN temporal ──
let _pinChangeResolve=null;
function _forcePinChange(){
  return new Promise(res=>{
    _pinChangeResolve=res;
    dismissSplash();
    _pinModal(`
      <div class="modal-title">Crea tu nuevo PIN</div>
      <div class="pin-txt">Entraste con un PIN temporal. Elige uno nuevo de 6 dígitos que solo tú conozcas.</div>
      <input class="fi pin-in" id="pinNew1" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="Nuevo PIN">
      <input class="fi pin-in" id="pinNew2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="Repite el PIN"
             onkeydown="if(event.key==='Enter')_savePinChange()">
      <div class="auth-err" id="pinErr"></div>
      <div style="display:flex;gap:8px;margin-top:6px">
        <button type="button" class="bsec" style="flex:1;margin:0" onclick="_cancelPinChange()">Cerrar sesión</button>
        <button type="button" class="bpri" style="flex:1;margin:0" id="pinGo" onclick="_savePinChange()">Guardar</button>
      </div>`);
    setTimeout(()=>document.getElementById("pinNew1")?.focus(),60);
  });
}
async function _savePinChange(){
  const a=document.getElementById("pinNew1").value.trim(),b=document.getElementById("pinNew2").value.trim();
  const err=document.getElementById("pinErr");
  const fail=m=>{err.className="auth-err er";err.textContent=m;};
  if(!PIN_RE.test(a)){fail("El PIN debe tener 6 dígitos");return;}
  if(a!==b){fail("Los PIN no coinciden");return;}
  if(/^(\d)\1{5}$/.test(a)||"0123456789".includes(a)||"9876543210".includes(a)){fail("Elige un PIN menos predecible");return;}
  const btn=document.getElementById("pinGo");btn.disabled=true;
  try{
    await FB.updatePassword(FB.auth.currentUser,_patientPwd(a));
    await FB.updateDoc(FB.doc(FB.db,"users",FB.auth.currentUser.uid),{mustChangePin:false,pinChangedAt:FB.serverTimestamp()});
    logAudit("pin_changed");
    _closePinModal();
    toast("PIN actualizado");
    const r=_pinChangeResolve;_pinChangeResolve=null;if(r)r(true);
  }catch(e){
    if(e.code==="auth/requires-recent-login")fail("Por seguridad, vuelve a entrar con el PIN temporal e inténtalo de nuevo.");
    else fail("No se pudo guardar: "+e.message);
    btn.disabled=false;
  }
}
function _cancelPinChange(){
  _closePinModal();
  const r=_pinChangeResolve;_pinChangeResolve=null;if(r)r(false);
  doSignOut();
}
