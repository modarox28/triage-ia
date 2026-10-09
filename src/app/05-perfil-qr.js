// 05-perfil-qr.js — Configuración, perfil y códigos QR
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden numérico desde index.html.
// CONFIG & PROFILE
function loadConfig(){
  const name=uName();
  document.getElementById("profName").textContent=name;
  document.getElementById("profEmail").textContent=CU?.email||"";
  const RL={admin:"ADMIN",admin_hosp:"ADM. HOSP",medico:"MEDICO",paciente:"PACIENTE"};
  const RC={admin:"admin",admin_hosp:"admin_hosp",medico:"medico",paciente:"paciente"};
  const pr=document.getElementById("profRole");if(pr){pr.textContent=RL[CR]||CR;pr.className="role-badge "+(RC[CR]||"medico");}
  ["es","en","pt","fr","de","ja"].forEach(l=>{const b=document.getElementById("lng-"+l);if(b)b.classList.toggle("sel",l===CL);});
  ["CO","AR","US","DE","JP"].forEach(c=>{const b=document.getElementById("ctr-"+c);if(b)b.classList.toggle("sel",c===CC);});
  document.getElementById("lbCountryLabel")?.setAttribute("data-i18n","countryLabel");
  document.getElementById("lbCountrySub")?.setAttribute("data-i18n","countrySub");
  // Photo
  const av=name[0].toUpperCase();const cols=["#00c8f0","#00e07a","#a855f7","#ffb830"];const col=cols[av.charCodeAt(0)%cols.length];
  const photoEl=document.getElementById("configPhotoAv");
  const saved=localStorage.getItem("ms_photo_"+CU?.uid);
  if(photoEl){
    if(saved){photoEl.innerHTML=`<img src="${saved}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;}
    else{photoEl.textContent=av;photoEl.style.background=col;}
  }
  // Password change section (only for email-based staff accounts)
  const pSection=document.getElementById("changePassSection");
  if(pSection)pSection.style.display=(CR!=="paciente"&&CU?.email&&!CU?.providerData?.some(p=>p.providerId==="google.com"))?"block":"none";
  // Labels
  const lbCP=document.getElementById("changePassLbl");if(lbCP)lbCP.textContent=t("changePass");
  const lbCur=document.getElementById("lbCurPass");if(lbCur)lbCur.textContent=t("curPass");
  const lbNew=document.getElementById("lbNewPass");if(lbNew)lbNew.textContent=t("newPass");
  const lbConf=document.getElementById("lbConfirmPass");if(lbConf)lbConf.textContent=t("confirmPass");
  const lbSave=document.getElementById("savePassLbl");if(lbSave)lbSave.textContent=t("savePass");
}

function loadProf(){
  const name=uName("Paciente");
  const av=name[0].toUpperCase();const cols=["#00c8f0","#00e07a","#a855f7","#ffb830"];
  const col=cols[av.charCodeAt(0)%cols.length];
  const profEl=document.getElementById("profAv2");
  const photo=CUPhoto||localStorage.getItem("ms_photo_"+CU?.uid);
  if(profEl){
    if(photo){profEl.innerHTML=`<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;profEl.style.background="transparent";}
    else{profEl.textContent=av;profEl.style.background=col;}
  }
  document.getElementById("profName2").textContent=name;
  document.getElementById("profEmail2").textContent=CU?.email||"Acceso QR";
}

function togglePassForm(){
  const f=document.getElementById("passForm");
  f.classList.toggle("open");
  if(!f.classList.contains("open")){
    document.getElementById("curPassInput").value="";
    document.getElementById("newPassInput").value="";
    document.getElementById("confirmPassInput").value="";
    document.getElementById("passErr").textContent="";
  }
}

async function doChangePass(){
  const cur=document.getElementById("curPassInput").value;
  const np=document.getElementById("newPassInput").value;
  const conf=document.getElementById("confirmPassInput").value;
  const errEl=document.getElementById("passErr");
  errEl.className="auth-err";errEl.textContent="";
  if(np!==conf){errEl.className="auth-err er";errEl.textContent=t("passMatch");return;}
  if(np.length<6){errEl.className="auth-err er";errEl.textContent=t("passShort");return;}
  try{
    const cred=FB.EmailAuthProvider.credential(CU.email,cur);
    await FB.reauthenticateWithCredential(CU,cred);
    await FB.updatePassword(CU,np);
    errEl.className="auth-err ok";errEl.textContent=t("passChanged");
    setTimeout(()=>{togglePassForm();},1500);
  }catch(e){
    errEl.className="auth-err er";
    errEl.textContent=e.code==="auth/wrong-password"?t("reauth"):t("passError");
  }
}

function handleProfilePhoto(input,ctx){
  const file=input.files[0];if(!file)return;
  {const _e=_imagenPermitida(file);if(_e){toast(_e);input.value="";return;}}
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=async()=>{
      const MAX=220;let w=img.width,h=img.height;
      if(w>h){if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}}else{if(h>MAX){w=Math.round(w*MAX/h);h=MAX;}}
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      const data=canvas.toDataURL('image/jpeg',0.78);
      CUPhoto=data;
      localStorage.setItem("ms_photo_"+CU?.uid,data);
      if(FB&&CU){try{await FB.updateDoc(FB.doc(FB.db,"users",CU.uid),{photoBase64:data});}catch(e){}}
      const avStyle="width:100%;height:100%;object-fit:cover;border-radius:50%";
      const inner=`<img src="${data}" style="${avStyle}">`;
      const ids=ctx==="config"?["configPhotoAv","userAvSidebar"]:["profAv2","userAvSidebar"];
      ids.forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=inner;});
      toast(t("photoUpdated"));
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

// QR SHOW
function showPatientQR(){
  if(!_patientHC?.doc){toast("No tienes ID registrado");return;}
  const modal=document.getElementById("qrShowModal");modal.classList.add("on");
  modal.querySelector(".modal-title").textContent="📱 Mi código QR";
  modal.querySelector(".modal-sub").textContent=`ID: ${_patientHC.doc} — Muéstrale este QR al médico`;
  const wrap=document.getElementById("qrDisplay");wrap.innerHTML="";
  const qrVal=_patientHC.doc;
  if(typeof QRCode!=="undefined"){
    new QRCode(wrap,{text:qrVal,width:180,height:180,correctLevel:QRCode.CorrectLevel.M,colorDark:isDark?"#00c8f0":"#0099bb",colorLight:isDark?"#0b1120":"#ffffff"});
    setTimeout(()=>{const img=wrap.querySelector("img");if(img){img.style.borderRadius="10px";img.style.display="block";}},80);
  }else{
    wrap.innerHTML=`<div style="font-size:.8rem;color:var(--mu);text-align:center;padding:20px">No se pudo generar el código QR. Recarga la app.</div>`;
  }
}

function reloadHC(){
  if(_hcUnsub){_hcUnsub();_hcUnsub=null;}
  _hcCache={};
  loadHC();
}

function showQR(){
  document.getElementById("qrShowModal").classList.add("on");
  document.getElementById("qrShowModal").querySelector(".modal-title").textContent="📱 Código de acceso";
  document.getElementById("qrShowModal").querySelector(".modal-sub").textContent="Muestra este QR en recepción para acceso de pacientes";
  const wrap=document.getElementById("qrDisplay");
  wrap.innerHTML="";
  if(typeof QRCode!=="undefined"){
    new QRCode(wrap,{text:QR_SECRET,width:180,height:180,correctLevel:QRCode.CorrectLevel.M,colorDark:isDark?"#00c8f0":"#0099bb",colorLight:isDark?"#0b1120":"#ffffff"});
    setTimeout(()=>{const img=wrap.querySelector("img");if(img){img.style.borderRadius="10px";img.style.display="block";}},80);
  }else{
    wrap.innerHTML=`<div style="font-size:.8rem;color:var(--mu);text-align:center;padding:20px">No se pudo generar el código QR. Recarga la app.</div>`;
  }
}

// El QR de recepción solo abre el acceso de pacientes: la sesión siempre se inicia
// con ID + PIN verificados por Firebase (antes el QR abría la app sin autenticación).
function _qrAbrirAccesoPaciente(){
  if(typeof showPatientView==="function")showPatientView();
  setTimeout(()=>document.getElementById("patientIdInput")?.focus(),150);
  toast("Ingresa tu número de identificación y tu PIN");
}

// QR SCAN CAMERA
let qrStream=null,qrInt=null;
async function startQR(){
  const modal=document.getElementById("qrScanModal");modal.classList.add("on");
  const status=document.getElementById("qrStatus");
  status.textContent="Solicitando permiso de camara...";
  try{
    qrStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:{ideal:1280},height:{ideal:720}}});
    const video=document.getElementById("qrVideo");video.srcObject=qrStream;
    await video.play();
    status.textContent="Buscando codigo QR...";
    if("BarcodeDetector" in window){
      const det=new BarcodeDetector({formats:["qr_code"]});
      qrInt=setInterval(async()=>{
        try{
          const codes=await det.detect(video);
          if(codes.length>0){
            const val=codes[0].rawValue;
            if(val===QR_SECRET){stopQR();_qrAbrirAccesoPaciente();}
            else{status.style.color="var(--rd)";status.textContent="Codigo no valido. Intenta de nuevo.";}
          }
        }catch(e){}
      },600);
    }else{
      // jsQR fallback
      const script=document.createElement("script");
      script.src="./src/vendor/jsQR.js";
      script.onload=()=>{
        const canvas=document.createElement("canvas");const ctx=canvas.getContext("2d");
        qrInt=setInterval(()=>{
          if(video.readyState===video.HAVE_ENOUGH_DATA){
            canvas.height=video.videoHeight;canvas.width=video.videoWidth;
            ctx.drawImage(video,0,0,canvas.width,canvas.height);
            const imgData=ctx.getImageData(0,0,canvas.width,canvas.height);
            const code=jsQR(imgData.data,imgData.width,imgData.height);
            if(code&&code.data===QR_SECRET){stopQR();_qrAbrirAccesoPaciente();}
          }
        },500);
      };
      document.head.appendChild(script);
      status.textContent="Iniciando lector QR...";
    }
  }catch(e){
    stopQR();
    if(e.name==="NotAllowedError"){toast("Permiso de camara denegado.");}
    else if(e.name==="NotFoundError"){toast("No se encontro camara en este dispositivo.");}
    else{toast("Error al acceder a la camara.");}
  }
}
function stopQR(){
  if(qrStream){qrStream.getTracks().forEach(t=>t.stop());qrStream=null;}
  if(qrInt){clearInterval(qrInt);qrInt=null;}
  document.getElementById("qrScanModal").classList.remove("on");
}

