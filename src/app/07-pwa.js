// 07-pwa.js — Instalación como app (PWA) y submenús de medicamentos
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden numérico desde index.html.
// PWA INSTALL
let _deferredInstallPrompt=null;
const _isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;
const _isStandalone=window.navigator.standalone===true||window.matchMedia('(display-mode:standalone)').matches;

function _showInstallBanner(){
  if(localStorage.getItem('ms_install_dismissed'))return;
  const banner=document.getElementById('installFloatBanner');
  if(!banner)return;
  const btn=document.getElementById('installBannerBtn');
  const iosMsg=document.getElementById('installBannerIosMsg');
  if(_isIOS){
    if(btn)btn.style.display='none';
    if(iosMsg)iosMsg.style.display='';
  }else{
    if(btn)btn.style.display='';
    if(iosMsg)iosMsg.style.display='none';
  }
  banner.style.display='';
}

// iOS: mostrar banner con instrucciones si no está instalada
if(_isIOS&&!_isStandalone&&!localStorage.getItem('ms_install_dismissed')){
  const iosLoginBtn=document.getElementById('installBtnLogin');
  if(iosLoginBtn){
    iosLoginBtn.style.display='';
    iosLoginBtn.textContent='📲 Agregar a pantalla de inicio';
    iosLoginBtn.onclick=function(){_showInstallBanner();};
  }
  setTimeout(_showInstallBanner,3000);
}

window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  _deferredInstallPrompt=e;
  document.querySelectorAll('.install-pwa-btn').forEach(b=>b.style.display='');
  const card=document.getElementById('installPWACard');if(card)card.style.display='';
  if(!localStorage.getItem('ms_install_dismissed')){
    setTimeout(()=>{if(_deferredInstallPrompt)_showInstallBanner();},3000);
  }
});
function _tryShowInstallBanner(){
  if(localStorage.getItem('ms_install_dismissed'))return;
  if(_deferredInstallPrompt||(_isIOS&&!_isStandalone)){
    setTimeout(()=>{if(_deferredInstallPrompt||(_isIOS&&!_isStandalone))_showInstallBanner();},2500);
  }
}
window.addEventListener('appinstalled',()=>{
  _deferredInstallPrompt=null;
  document.querySelectorAll('.install-pwa-btn').forEach(b=>b.style.display='none');
  const card=document.getElementById('installPWACard');if(card)card.style.display='none';
  const banner=document.getElementById('installFloatBanner');if(banner)banner.style.display='none';
  toast('MedAI Suite instalado en pantalla de inicio 📲');
});
async function installPWA(){
  if(_isIOS){_showInstallBanner();return;}
  if(!_deferredInstallPrompt)return;
  _deferredInstallPrompt.prompt();
  const{outcome}=await _deferredInstallPrompt.userChoice;
  if(outcome==='accepted'){
    _deferredInstallPrompt=null;
    document.querySelectorAll('.install-pwa-btn').forEach(b=>b.style.display='none');
    const card=document.getElementById('installPWACard');if(card)card.style.display='none';
  }
  const banner=document.getElementById('installFloatBanner');if(banner)banner.style.display='none';
}
function dismissInstallBanner(){
  const banner=document.getElementById('installFloatBanner');if(banner)banner.style.display='none';
  localStorage.setItem('ms_install_dismissed','1');
}

async function seedDemoPatients(){
  if(!FB||!CU){toast("Sin sesión activa");return;}
  try{
    let seeded=0;
    for(const p of DEMO_PATIENTS){
      const q=await FB.getDocs(FB.query(FB.collection(FB.db,"historias"),FB.where("doc","==",p.doc),FB.limit(1)));
      if(q.empty){
        await FB.addDoc(FB.collection(FB.db,"historias"),{...p,createdAt:FB.serverTimestamp(),userId:CU.uid,userEmail:CU.email||""});
        seeded++;
      }
    }
    toast(seeded>0?`${seeded} paciente(s) demo insertado(s)`:"Los pacientes demo ya existen");
    downloadPatientsPDF();
    if(document.getElementById("sc-hc")?.classList.contains("on"))loadHC();
  }catch(e){toast("Error al insertar: "+e.message);}
}

function downloadPatientsPDF(){
  if(typeof window.jspdf==="undefined"){
    const lines=DEMO_PATIENTS.map(p=>[
      `Nombre: ${p.name}`,`ID de acceso: ${p.doc}`,
      `Edad: ${p.age} años | Sexo: ${p.sex==="M"?"Masculino":"Femenino"}`,
      `Antecedentes: ${p.antecedentes.join(", ")||"Ninguno"}`,
      `Alergias: ${p.alergias.join(", ")||"Ninguna"}`,
      `Medicación: ${p.medicacion.join(", ")||"Ninguna"}`,
      `Notas: ${p.notes}`,`${"─".repeat(40)}`
    ].join("\n")).join("\n\n");
    const a=document.createElement("a");
    a.href="data:text/plain;charset=utf-8,"+encodeURIComponent("PACIENTES DEMO — MedIA Suite\n\n"+lines);
    a.download="pacientes-demo-mediasuite.txt";a.click();return;
  }
  const {jsPDF}=window.jspdf;
  const pdf=new jsPDF({unit:"mm",format:"a4"});
  const W=210,M=18,CW=W-M*2;
  const palette=["#00c8f0","#00e07a","#a855f7","#ffb830","#ff6b6b","#4ecdc4","#ffd93d","#6bcb77","#c77dff","#ff9f43","#48dbfb","#ff6348"];
  let y=M;
  // Background
  pdf.setFillColor(11,17,32);pdf.rect(0,0,W,297,"F");
  // Header
  pdf.setFontSize(18);pdf.setTextColor(0,200,240);pdf.setFont(undefined,"bold");
  pdf.text("MedIA Suite",M,y);
  pdf.setFontSize(9);pdf.setTextColor(150,160,180);pdf.setFont(undefined,"normal");
  pdf.text("Tarjetas de acceso — Pacientes demo",M,y+7);
  pdf.setFontSize(7);pdf.text(`Generado: ${new Date().toLocaleDateString("es-ES")}`,M,y+13);
  y+=24;
  DEMO_PATIENTS.forEach((p,i)=>{
    if(y>250){pdf.addPage();pdf.setFillColor(11,17,32);pdf.rect(0,0,W,297,"F");y=M;}
    const hex=palette[i]||"#00c8f0";
    const [r,g,b]=hex.replace("#","").match(/.{2}/g).map(x=>parseInt(x,16));
    // Card background
    pdf.setFillColor(17,25,44);pdf.setDrawColor(40,50,70);pdf.roundedRect(M,y,CW,60,4,4,"FD");
    // Accent left bar
    pdf.setFillColor(r,g,b);pdf.roundedRect(M,y,4,60,2,2,"F");
    // Name
    pdf.setFontSize(13);pdf.setTextColor(240,245,255);pdf.setFont(undefined,"bold");
    pdf.text(p.name,M+8,y+10);
    // ID chip
    pdf.setFillColor(r,g,b);pdf.roundedRect(M+8,y+13,CW-12,8,2,2,"F");
    pdf.setFontSize(11);pdf.setTextColor(11,17,32);pdf.setFont(undefined,"bold");
    pdf.text(`ID DE ACCESO: ${p.doc}`,M+10,y+19);
    // Info row
    y+=26;
    pdf.setFontSize(7.5);pdf.setTextColor(180,190,210);pdf.setFont(undefined,"normal");
    pdf.text(`Edad: ${p.age} años  ·  ${p.sex==="M"?"Masculino":"Femenino"}`,M+8,y);y+=6;
    if(p.antecedentes.length){
      pdf.setFont(undefined,"bold");pdf.setTextColor(r,g,b);pdf.text("Antecedentes:",M+8,y);
      pdf.setFont(undefined,"normal");pdf.setTextColor(180,190,210);
      pdf.text(p.antecedentes.join(", "),M+38,y);y+=6;
    }
    if(p.alergias.length){
      pdf.setFont(undefined,"bold");pdf.setTextColor(255,100,100);pdf.text("Alergias:",M+8,y);
      pdf.setFont(undefined,"normal");pdf.setTextColor(255,140,140);
      pdf.text(p.alergias.join(", "),M+28,y);y+=6;
    }
    pdf.setFont(undefined,"bold");pdf.setTextColor(150,200,240);pdf.text("Medicación:",M+8,y);
    pdf.setFont(undefined,"normal");pdf.setTextColor(150,190,220);
    const mLine=pdf.splitTextToSize(p.medicacion.join(", ")||"Ninguna",CW-35);
    pdf.text(mLine,M+32,y);y+=mLine.length*4+4;
    y+=6;
  });
  // Footer
  pdf.setFontSize(7);pdf.setTextColor(80,90,110);pdf.setFont(undefined,"normal");
  pdf.text("MedIA Suite — Documento confidencial de uso interno",M,288);
  pdf.save("pacientes-demo-mediasuite.pdf");
}

// VOICE
function voz(inp,btn){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast("Navegador no soporta voz");return;}
  const b=document.getElementById(btn);
  if(REC[btn]){recog&&recog.stop();return;}
  recog=new SR();recog.lang="es-ES";recog.interimResults=false;
  recog.onresult=e=>{document.getElementById(inp).value=e.results[0][0].transcript;toast("🎤 "+e.results[0][0].transcript);};
  recog.onend=()=>{REC[btn]=false;b.classList.remove("rec");b.textContent="🎤";};
  recog.start();REC[btn]=true;b.classList.add("rec");b.textContent="⏹";
}

// MEDS SUBSCREENS
function ss(n){
  ["bs","ms","al","in"].forEach(x=>{document.getElementById("ms-"+x).classList.remove("on");document.getElementById("st-"+x).classList.remove("on");});
  document.getElementById("ms-"+n).classList.add("on");document.getElementById("st-"+n).classList.add("on");
  if(n==="al")rRL();if(n==="ms")rML();if(n==="bs")_showDefaultDrugs();if(n==="in")_applyPatientMedsToInteractions();
}
function _showDefaultDrugs(){
  const dr=document.getElementById("dr");if(!dr)return;
  if(dr.innerHTML.trim()&&!dr.querySelector(".opt"))return;
  const cmn=["Ibuprofeno","Paracetamol","Amoxicilina","Metformina","Atorvastatina","Omeprazol","Losartán","Aspirina","Diazepam","Furosemida","Captopril","Salbutamol","Adrenalina","Morfina","Metronidazol","Ciprofloxacino"];
  dr.innerHTML=`<div class="card"><div class="clabel">Consultas frecuentes</div><div style="display:flex;flex-wrap:wrap;gap:8px">${cmn.map(m=>`<button class="opt" style="font-size:.75rem;padding:7px 12px" onclick="document.getElementById('di').value='${m}';buscarDrug()">${m}</button>`).join("")}</div></div>`;
}

