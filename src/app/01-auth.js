// 01-auth.js — Pantallas de acceso, Firebase Auth, roles, recordarme e inactividad
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden numérico desde index.html.
// AUTH VIEWS
let _staffLoginRole=null;
function showRoleError(msg){
  const banner=document.getElementById("roleErrBanner");
  const msgEl=document.getElementById("roleErrMsg");
  if(msgEl)msgEl.textContent=msg;
  if(banner){
    banner.style.display="";
    clearTimeout(banner._t);
    banner._t=setTimeout(()=>{banner.style.display="none";},7000);
  }
}
function _clearRoleError(){
  const banner=document.getElementById("roleErrBanner");
  if(banner){clearTimeout(banner._t);banner.style.display="none";}
  const err=document.getElementById("authErr");
  if(err){err.textContent="";err.className="auth-err";}
}
function showPatientView(){
  _clearRoleError();
  const pdv=document.getElementById("authPendingView");if(pdv)pdv.style.display="none";
  const pv=document.getElementById("authPatientView");
  const sv=document.getElementById("authStaffView");
  const rv=document.getElementById("patientRegisterView");
  sv.style.display="none";
  if(rv)rv.style.display="none";
  pv.style.display="";
  pv.classList.remove("auth-slide-right","auth-slide-left");
  void pv.offsetWidth;
  pv.classList.add("auth-slide-left");
}
function showStaffLogin(role){
  _clearRoleError();
  const pdv=document.getElementById("authPendingView");if(pdv)pdv.style.display="none";
  _staffLoginRole=role||"medico";
  const pv=document.getElementById("authPatientView");
  const sv=document.getElementById("authStaffView");
  const rv=document.getElementById("patientRegisterView");
  pv.style.display="none";
  if(rv)rv.style.display="none";
  sv.style.display="";
  // Update context badge
  const badge=document.getElementById("staffRoleContext");
  if(badge){
    if(_staffLoginRole==="admin"){
      badge.textContent="🔑 Administrador";
      badge.style.background="rgba(168,85,247,.12)";
      badge.style.color="var(--pu)";
    }else{
      badge.textContent="🩺 Médico";
      badge.style.background="rgba(0,200,240,.12)";
      badge.style.color="var(--cy)";
    }
  }
  sv.classList.remove("auth-slide-right","auth-slide-left");
  void sv.offsetWidth;
  sv.classList.add("auth-slide-right");
}
function authTab(m){
  const isIn=m==="in";
  document.getElementById("atab-in").classList.toggle("on",isIn);
  document.getElementById("atab-up").classList.toggle("on",!isIn);
  document.getElementById("nameField").style.display=isIn?"none":"block";
  const pf=document.getElementById("phoneField");if(pf)pf.style.display=isIn?"none":"block";
  const sf=document.getElementById("specialtyField");if(sf)sf.style.display=isIn?"none":(_staffLoginRole==="medico"?"block":"none");
  const tf=document.getElementById("termsField");if(tf)tf.style.display=isIn?"none":"flex";
  const ap=document.getElementById("aPass");if(ap)ap.setAttribute("autocomplete",isIn?"current-password":"new-password");
  document.getElementById("authErr").textContent="";
  document.getElementById("authErr").className="auth-err";
  const hint=document.getElementById("emailHint");
  if(hint)hint.textContent="";
  const email=document.getElementById("aEmail").value.trim();
  if(email&&EMAIL_RE.test(email)&&!isIn)onEmailBlur();
}

// FIREBASE
// Con ?demo=1 la app arranca en modo demo (18-demo.js) y no se conecta a Firebase real
const _DEMO_URL=new URLSearchParams(window.location.search).has("demo");
window.addEventListener("fbready",()=>{L=window.L;if(_DEMO_URL||window._demoMode){setLang(CL);return;}FB=window._fb;initAuth();_initOfflineDetection();setLang(CL);});
setTimeout(()=>{if(!FB&&window._fb&&!_DEMO_URL&&!window._demoMode){FB=window._fb;initAuth();_initOfflineDetection();}},2000);

function initAuth(){
  FB.onAuthStateChanged(FB.auth,async user=>{
    if(user){
      if(_patientAuthBusy)return; // registerPatient() termina el flujo por su cuenta
      CU=user;
      try{
        const snap=await FB.getDoc(FB.doc(FB.db,"users",user.uid));
        if(snap.exists()){
          CR=snap.data().role;CUName=snap.data().name||null;CUPhoto=snap.data().photoBase64||null;
          try{localStorage.setItem("ms_role_"+user.uid,CR||"");}catch(_){}
          _watchOwnRole(user.uid);
          if(CUPhoto)localStorage.setItem("ms_photo_"+user.uid,CUPhoto);
          if(CR==="pendiente"||CR==="rechazado"||CR==="eliminado"){
            _staffLoginRole=null;
            _showPendingView(CR);
            return;
          }
          if(["paciente","medico","admin","admin_hosp"].includes(CR)&&snap.data().consent?.version!==CONSENT_VERSION){
            const ok=await _ensureConsent(user.uid,CR);
            if(!ok)return;
          }
          if(CR==="paciente"){
            _staffLoginRole=null;
            try{_patientHC=await _loadPatientHC(snap.data().doc);}catch(e){_patientHC=null;}
            showApp();
            return;
          }
          // Role enforcement: only when user explicitly used a staff login button
          if(_staffLoginRole!==null){
            const allowed=_staffLoginRole==="admin"?["admin","admin_hosp"]:["medico"];
            if(!allowed.includes(CR)){
              const rNames={admin:"Administrador",admin_hosp:"Admin Hospital",medico:"Médico",paciente:"Paciente"};
              const actualRole=rNames[CR]||CR; // save before signOut clears CR
              const expectedRole=_staffLoginRole==="admin"?"Administrador":"Médico";
              _staffLoginRole=null;
              await FB.signOut(FB.auth);
              // showAuthScreen() already called by onAuthStateChanged(null) — show banner after reset
              setTimeout(()=>{
                showRoleError(`Tu cuenta está registrada como "${actualRole}". Ingresa desde el botón "${actualRole}" en la pantalla de inicio.`);
              },150);
              return;
            }
          }
          _staffLoginRole=null;
        }else{
          // Cuenta nueva de personal (p. ej. Google): queda pendiente hasta que
          // un administrador la apruebe. Nadie puede asignarse un rol.
          const autoName=user.displayName||user.email.split("@")[0];
          CUName=autoName;
          if((user.email||"").endsWith("@"+PATIENT_DOMAIN)){
            // Registro de paciente que se interrumpió: se completa como paciente, nunca como médico
            CR="paciente";
            await FB.setDoc(FB.doc(FB.db,"users",user.uid),{name:autoName,role:"paciente",doc:autoName,createdAt:FB.serverTimestamp()});
            try{_patientHC=await _loadPatientHC(autoName);}catch(e){_patientHC=null;}
            _staffLoginRole=null;showApp();return;
          }
          CR="pendiente";
          // merge: no borra teléfono/especialidad si doAuth() ya guardó el perfil
          await FB.setDoc(FB.doc(FB.db,"users",user.uid),{name:autoName,email:user.email,role:CR,createdAt:FB.serverTimestamp()},{merge:true});
          _staffLoginRole=null;
          _watchOwnRole(user.uid);
          _showPendingView("pendiente");
          return;
        }
      }catch(e){
        // Sin conexión: se usa el último rol conocido en este dispositivo (las reglas de
        // Firestore siguen protegiendo los datos). Si no hay ninguno, no se asume un rol.
        _staffLoginRole=null;
        let cached="";try{cached=localStorage.getItem("ms_role_"+user.uid)||"";}catch(_){}
        if(cached==="medico"||cached==="admin"||cached==="admin_hosp"){CR=cached;}
        else{
          toast("No se pudo verificar tu cuenta. Revisa tu conexión e intenta de nuevo.");
          try{await FB.signOut(FB.auth);}catch(_){}
          return;
        }
      }
      showApp();
      logAudit("login",{method:user.providerData?.[0]?.providerId||"unknown"});
    }else{_stopRoleWatch();showAuthScreen();}
  });
}

async function doAuth(){
  const email=document.getElementById("aEmail").value.trim();
  const pass=document.getElementById("aPass").value;
  const err=document.getElementById("authErr");
  err.textContent="";err.className="auth-err";
  if(!email||!pass){err.className="auth-err er";err.textContent="Completa todos los campos";return;}
  if(!EMAIL_RE.test(email)){err.className="auth-err er";err.textContent="El correo no tiene un formato valido";return;}
  const isIn=document.getElementById("atab-in").classList.contains("on");
  try{
    const persistence=_rememberOn?FB.browserLocalPersistence:FB.browserSessionPersistence;
    await FB.setPersistence(FB.auth,persistence);
    if(isIn){await FB.signInWithEmailAndPassword(FB.auth,email,pass);}
    else{
      const name=document.getElementById("aName").value.trim();
      const phone=document.getElementById("aPhone")?.value.trim()||"";
      const specialty=document.getElementById("aSpecialty")?.value.trim()||"";
      if(!name){err.className="auth-err er";err.textContent="El nombre es obligatorio";return;}
      if(!phone){err.className="auth-err er";err.textContent="El teléfono es obligatorio";return;}
      if(_staffLoginRole==="medico"&&!specialty){err.className="auth-err er";err.textContent="La especialidad es obligatoria";return;}
      if(_staffLoginRole==="admin"){err.className="auth-err er";err.textContent="Las cuentas de administrador las crea otro administrador. Regístrate como médico.";return;}
      if(!document.getElementById("aTerms")?.checked){err.className="auth-err er";err.textContent="Debes aceptar los términos de uso y la política de tratamiento de datos";return;}
      const cred=await FB.createUserWithEmailAndPassword(FB.auth,email,pass);
      const regRole="pendiente";
      const userData={name,email,role:regRole,phone,createdAt:FB.serverTimestamp(),consent:{version:CONSENT_VERSION,tipo:"personal",at:FB.serverTimestamp()}};
      if(specialty)userData.especialidad=specialty;
      await FB.setDoc(FB.doc(FB.db,"users",cred.user.uid),userData);
    }
    if(_rememberOn){localStorage.setItem("ms_remember_email",email);}else{localStorage.removeItem("ms_remember_email");}
  }catch(e){
    err.className="auth-err er";
    const msgs={"auth/invalid-credential":"Correo o contrasena incorrectos","auth/email-already-in-use":"Este correo ya esta registrado","auth/weak-password":"La contrasena debe tener al menos 6 caracteres","auth/invalid-email":"Correo no valido","auth/user-not-found":"Usuario no encontrado","auth/wrong-password":"Contrasena incorrecta"};
    err.textContent=msgs[e.code]||e.message;
  }
}

async function doGoogle(){
  const err=document.getElementById("authErr");
  err.className="auth-err";err.textContent="";
  try{
    FB.gProvider.setCustomParameters({prompt:"select_account"});
    await FB.signInWithPopup(FB.auth,FB.gProvider);
  }catch(e){
    if(e.code==="auth/popup-closed-by-user"||e.code==="auth/cancelled-popup-request")return;
    err.className="auth-err er";
    const gMsgs={
      "auth/popup-blocked":"El navegador bloqueo la ventana emergente. Permite ventanas emergentes para este sitio.",
      "auth/unauthorized-domain":"Este dominio no esta autorizado en Firebase. Contacta al administrador.",
      "auth/operation-not-allowed":"Google Sign-In no esta habilitado. Contacta al administrador.",
      "auth/network-request-failed":"Error de conexion. Verifica tu internet."
    };
    err.textContent=gMsgs[e.code]||("Error: "+e.message);
  }
}

async function doForgot(){
  const email=document.getElementById("aEmail").value.trim();
  const err=document.getElementById("authErr");
  if(!email){err.className="auth-err er";err.textContent="Ingresa tu correo primero";return;}
  try{
    await FB.sendPasswordResetEmail(FB.auth,email);
    err.className="auth-err ok";err.textContent=t("resetSent");
  }catch(e){err.className="auth-err er";err.textContent=t("resetErr");}
}

// EMAIL VALIDATION
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
let _emailCheckTimer=null;

function onEmailInput(){
  clearTimeout(_emailCheckTimer);
  const email=document.getElementById("aEmail").value.trim();
  const hint=document.getElementById("emailHint");
  if(!email){hint.textContent="";hint.className="email-hint";return;}
  if(!EMAIL_RE.test(email)){hint.textContent="Formato de correo invalido";hint.className="email-hint er";return;}
  hint.textContent="";hint.className="email-hint";
}

async function onEmailBlur(){
  const email=document.getElementById("aEmail").value.trim();
  const hint=document.getElementById("emailHint");
  const isRegister=!document.getElementById("atab-in").classList.contains("on");
  if(!email||!EMAIL_RE.test(email))return;
  if(!isRegister){hint.textContent="";hint.className="email-hint";return;}
  if(!FB)return;
  hint.textContent="Verificando...";hint.className="email-hint mu";
  try{
    // Por privacidad no se consulta la lista de usuarios: si el correo ya existe,
    // Firebase Auth lo indica al registrar (auth/email-already-in-use).
    hint.textContent="";hint.className="email-hint";
  }catch(e){hint.textContent="";hint.className="email-hint";}
}

async function doSignOut(){
  _clearPresence();
  stopInactivityTimer();
  if(_bgTimer){clearTimeout(_bgTimer);_bgTimer=null;}
  _bgHiddenAt=null;
  _patientHC=null;_medPatientHC=null;
  intDrugs=[];
  _lastDrugInfo=null;
  ["dr","ir"].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML="";});
  if(_hcUnsub){_hcUnsub();_hcUnsub=null;}_hcCache={};
  _stopRoleWatch();
  if(CR==="paciente"){CR=null;CU=null;try{await FB.signOut(FB.auth);}catch(e){}showAuthScreen();return;}
  await logAudit("logout");
  try{await FB.signOut(FB.auth);}catch(e){showAuthScreen();}
}

function dismissSplash(){
  const s=document.getElementById('splash');
  if(!s||s.classList.contains('out'))return;
  s.classList.add('out');
  setTimeout(()=>s.remove(),520);
}

function showAuthScreen(){
  dismissSplash();
  _voiceMode=false;_vStop();
  const fab=document.getElementById('voiceFab');if(fab){fab.classList.remove('on','vis');}
  document.getElementById("authScreen").style.display="flex";
  document.getElementById("mainApp").classList.remove("on");
  showPatientView();CU=null;CR=null;CUName=null;CUPhoto=null;
  // Pre-fill email if saved
  const saved=localStorage.getItem("ms_remember_email");
  if(saved){document.getElementById("aEmail").value=saved;_rememberOn=true;document.getElementById("rememberCheck").classList.add("on");}
}

// ── ACEPTACIÓN DE LA POLÍTICA DE DATOS (Ley 1581 de 2012) ──
// Cuentas creadas antes de la política (o con una versión anterior) deben aceptarla
// una vez al entrar. Se guarda la versión y la fecha en el perfil.
let _consentResolve=null,_consentUid=null;
function _ensureConsent(uid,role){
  return new Promise(res=>{
    _consentResolve=res;_consentUid=uid;
    dismissSplash();
    const pac=role==="paciente";
    document.getElementById("consentTxt").innerHTML=pac
      ?'Para seguir usando MedIA Suite necesitamos tu autorización para tratar tus datos personales y de salud, que la ley considera datos sensibles. Puedes leer la <a href="./privacidad.html" target="_blank" rel="noopener">política completa</a>.'
      :'Actualizamos los términos de uso y la política de tratamiento de datos de MedIA Suite. Léelos en la <a href="./privacidad.html" target="_blank" rel="noopener">política completa</a>.';
    document.getElementById("consentLbl").textContent=pac
      ?"Autorizo de forma explícita el tratamiento de mis datos personales y de salud para mi atención."
      :"Acepto los términos de uso y me comprometo a mantener la confidencialidad de la información clínica.";
    document.getElementById("consentChk").checked=false;
    document.getElementById("consentErr").textContent="";
    document.getElementById("consentModal").style.display="flex";
    document.getElementById("consentModal").dataset.tipo=pac?"paciente":"personal";
  });
}
async function _consentAccept(){
  const err=document.getElementById("consentErr");
  if(!document.getElementById("consentChk").checked){err.className="auth-err er";err.textContent="Marca la casilla para continuar";return;}
  const btn=document.getElementById("consentOk");btn.disabled=true;
  try{
    const tipo=document.getElementById("consentModal").dataset.tipo;
    await FB.updateDoc(FB.doc(FB.db,"users",_consentUid),{consent:{version:CONSENT_VERSION,tipo,at:FB.serverTimestamp()}});
    document.getElementById("consentModal").style.display="none";
    const r=_consentResolve;_consentResolve=null;if(r)r(true);
  }catch(e){err.className="auth-err er";err.textContent="No se pudo guardar: "+e.message;}
  finally{btn.disabled=false;}
}
function _consentDecline(){
  document.getElementById("consentModal").style.display="none";
  const r=_consentResolve;_consentResolve=null;if(r)r(false);
  doSignOut();
}

// ── CAMBIOS DE ROL EN TIEMPO REAL ──
// Si un admin cambia el rol de esta cuenta (o borra su perfil) mientras está
// abierta, la app se recarga para aplicar el nuevo rol de inmediato.
// Las reglas de Firestore ya bloquean los datos; esto actualiza la pantalla.
let _roleUnsub=null,_roleReloading=false;
function _stopRoleWatch(){if(_roleUnsub){try{_roleUnsub();}catch(_){}_roleUnsub=null;}}
function _watchOwnRole(uid){
  _stopRoleWatch();
  if(!FB?.onSnapshot)return;
  _roleUnsub=FB.onSnapshot(FB.doc(FB.db,"users",uid),snap=>{
    if(snap.metadata?.fromCache||snap.metadata?.hasPendingWrites)return; // solo datos confirmados por el servidor
    if(!CU||CU.uid!==uid||_roleReloading)return;
    const role=snap.exists()?snap.data().role:null;
    if(role===CR)return;
    _roleReloading=true;
    try{localStorage.setItem("ms_role_"+uid,role||"");}catch(_){}
    const msg=role==="medico"&&CR==="pendiente"?"✓ Tu cuenta fue aprobada":
      (role==="eliminado"||!role?"Tu cuenta fue eliminada por un administrador":"Un administrador cambió tu rol");
    toast(msg);
    _stopRoleWatch();
    setTimeout(()=>window.location.reload(),1500);
  },()=>{});
}

// ── CUENTA EN REVISIÓN ──
// El personal nuevo entra con rol "pendiente" y espera aprobación de un admin.
// state: "pendiente" | "rechazado" | "eliminado"
function _showPendingView(state){
  const rejected=state==="rechazado"||state==="eliminado";
  dismissSplash();
  document.getElementById("authScreen").style.display="flex";
  document.getElementById("mainApp").classList.remove("on");
  ["authPatientView","authStaffView","patientRegisterView"].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display="none";});
  const v=document.getElementById("authPendingView");if(!v)return;
  v.style.display="";
  const T={
    pendiente:["⏳","Cuenta en revisión","Tu cuenta ("+(CU?.email||"")+") fue creada. Un administrador debe aprobarla antes de que puedas ver pacientes y triages."],
    rechazado:["🚫","Solicitud rechazada","Un administrador rechazó el acceso de esta cuenta. Si crees que es un error, contacta al administrador de tu hospital."],
    eliminado:["🗑️","Cuenta eliminada","Un administrador eliminó esta cuenta. Ya no tiene acceso a MedIA Suite. Si crees que es un error, contacta al administrador de tu hospital."],
  }[state]||[];
  document.getElementById("pendIcon").textContent=T[0];
  document.getElementById("pendTitle").textContent=T[1];
  document.getElementById("pendMsg").textContent=T[2];
  const retry=document.getElementById("pendRetryBtn");if(retry)retry.style.display=rejected?"none":"";
}
async function _recheckPending(){
  if(!FB||!CU)return;
  const btn=document.getElementById("pendRetryBtn");
  if(btn){btn.disabled=true;btn.textContent="Revisando...";}
  try{
    const snap=await FB.getDoc(FB.doc(FB.db,"users",CU.uid));
    const role=snap.exists()?snap.data().role:null;
    if(role&&role!=="pendiente"&&role!=="rechazado"&&role!=="eliminado"){window.location.reload();return;}
    if(role==="rechazado"||role==="eliminado"){CR=role;_showPendingView(role);return;}
    toast("Tu cuenta sigue pendiente de aprobación");
  }catch(e){toast("Error: "+e.message);}
  finally{if(btn){btn.disabled=false;btn.textContent="Revisar de nuevo";}}
}

// ── REMEMBER ME ──
let _rememberOn=localStorage.getItem("ms_remember_email")!==null;
(()=>{
  // Pre-fill email on page load
  const saved=localStorage.getItem("ms_remember_email");
  if(saved){
    window.addEventListener("DOMContentLoaded",()=>{
      const el=document.getElementById("aEmail");if(el)el.value=saved;
    },{once:true});
    setTimeout(()=>{const el=document.getElementById("aEmail");if(el&&!el.value)el.value=saved;},400);
  }
})();

function toggleRemember(){
  if(!_rememberOn){
    // Show confirmation dialog before enabling
    const ov=document.getElementById("confirmOverlay");
    document.getElementById("confirmTitle").textContent=t("rememberMe")||"Recordarme";
    document.getElementById("confirmMsg").textContent=t("rememberWarn")||"Las credenciales se guardaran en este dispositivo.";
    document.getElementById("confirmOkBtn").textContent=t("rememberConfirm")||"Entendido, guardar";
    document.getElementById("confirmCancelBtn").textContent=t("rememberCancel")||"Cancelar";
    ov.classList.add("on");
  } else {
    _rememberOn=false;
    document.getElementById("rememberCheck").classList.remove("on");
    localStorage.removeItem("ms_remember_email");
  }
}

function confirmRemember(ok){
  document.getElementById("confirmOverlay").classList.remove("on");
  if(ok){
    _rememberOn=true;
    document.getElementById("rememberCheck").classList.add("on");
  }
}

// ── INACTIVITY TIMEOUT ──
let _lastActive=Date.now(),_inactTimer=null,_warnShown=false;

function resetActivity(){
  _lastActive=Date.now();_warnShown=false;
  const b=document.getElementById("inactBanner");
  if(b&&b.classList.contains("on")){
    b.classList.add("out");
    setTimeout(()=>{b.classList.remove("on","out");},350);
  }
}

function startInactivityTimer(){
  if(_inactTimer)clearInterval(_inactTimer);
  _inactTimer=setInterval(()=>{
    if(!CU||CR==="paciente")return;
    const elapsed=Date.now()-_lastActive;
    if(elapsed>=INACT_MS){
      clearInterval(_inactTimer);_inactTimer=null;
      toast(t("sessionOut")||"Sesion cerrada por inactividad.");
      doSignOut();
    }else if(elapsed>=WARN_MS&&!_warnShown){
      _warnShown=true;
      const b=document.getElementById("inactBanner");
      const msg=document.getElementById("inactMsg");
      const btn=document.querySelector(".inact-btn");
      if(msg)msg.textContent=t("inactWarn")||"Tu sesion se cerrara pronto por inactividad.";
      if(btn)btn.textContent=t("stayActive")||"Seguir activo";
      if(b){b.classList.remove("out");b.classList.add("on");}
    }
  },15000);
}

function stopInactivityTimer(){
  if(_inactTimer){clearInterval(_inactTimer);_inactTimer=null;}
  resetActivity();
}

// Track user activity
["touchstart","touchmove","mousedown","keydown"].forEach(ev=>{
  document.addEventListener(ev,resetActivity,{passive:true});
});

// Auto-logout when app goes to background for too long
const BG_TIMEOUT_MS=5*60*1000;
let _bgTimer=null,_bgHiddenAt=null;
document.addEventListener("visibilitychange",()=>{
  if(document.hidden){
    _bgHiddenAt=Date.now();
    if(CU&&CR!=="paciente"){
      _bgTimer=setTimeout(()=>{
        if(document.hidden&&CU){
          toast(t("sessionOut")||"Sesion cerrada por inactividad en segundo plano.");
          doSignOut();
        }
      },BG_TIMEOUT_MS);
    }
  }else{
    if(_bgTimer){clearTimeout(_bgTimer);_bgTimer=null;}
    // If we came back after >BG_TIMEOUT_MS, force logout
    if(_bgHiddenAt&&CU&&CR!=="paciente"&&Date.now()-_bgHiddenAt>=BG_TIMEOUT_MS){
      toast(t("sessionOut")||"Sesion cerrada por inactividad en segundo plano.");
      doSignOut();
    }
    _bgHiddenAt=null;
  }
});

