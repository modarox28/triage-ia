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
  toast('MedIA Suite instalado en pantalla de inicio 📲');
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
        await FB.addDoc(FB.collection(FB.db,"historias"),{...p,searchKeys:_searchKeys(p.name,p.doc),createdAt:FB.serverTimestamp(),userId:CU.uid,userEmail:CU.email||""});
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
  const fondo=()=>{pdf.setFillColor(11,17,32);pdf.rect(0,0,W,297,"F");};
  DEMO_PATIENTS.forEach((p,i)=>{
    const hex=palette[i%palette.length]||"#00c8f0";
    const [r,g,b]=hex.replace("#","").match(/.{2}/g).map(x=>parseInt(x,16));
    // Filas con etiqueta y texto ajustado al ancho; la tarjeta crece según el contenido
    const labelW=26,valX=M+8+labelW,valW=CW-12-labelW;
    const filas=[];
    if(p.antecedentes?.length)filas.push(["Antecedentes:",[r,g,b],[180,190,210],p.antecedentes.join(", ")]);
    if(p.alergias?.length)filas.push(["Alergias:",[255,100,100],[255,140,140],p.alergias.join(", ")]);
    filas.push(["Medicación:",[150,200,240],[150,190,220],p.medicacion?.join(", ")||"Ninguna"]);
    filas.forEach(fl=>fl.push(_pdfLines(pdf,fl[3],valW,7.5)));
    const lineH=3.8;
    const cardH=33+filas.reduce((h,fl)=>h+fl[4].length*lineH+2,0)+3;
    if(y+cardH>285){pdf.addPage();fondo();y=M;}
    pdf.setFillColor(17,25,44);pdf.setDrawColor(40,50,70);pdf.roundedRect(M,y,CW,cardH,4,4,"FD");
    pdf.setFillColor(r,g,b);pdf.roundedRect(M,y,4,cardH,2,2,"F");
    _pdfFont(pdf,13,"bold",[240,245,255]);
    pdf.text(_pdfFit(pdf,p.name,CW-14,13,"bold"),M+8,y+10);
    pdf.setFillColor(r,g,b);pdf.roundedRect(M+8,y+13,CW-12,8,2,2,"F");
    _pdfFont(pdf,11,"bold",[11,17,32]);
    pdf.text(`ID DE ACCESO: ${p.doc}`,M+10,y+19);
    _pdfFont(pdf,7.5,"normal",[180,190,210]);
    pdf.text(`Edad: ${p.age} años  ·  ${p.sex==="M"?"Masculino":"Femenino"}`,M+8,y+27);
    let fy=y+33;
    filas.forEach(([lbl,cLbl,cVal,,lines])=>{
      _pdfFont(pdf,7.5,"bold",cLbl);pdf.text(lbl,M+8,fy);
      _pdfFont(pdf,7.5,"normal",cVal);
      lines.forEach((l,k)=>pdf.text(l,valX,fy+k*lineH));
      fy+=lines.length*lineH+2;
    });
    y+=cardH+6;
  });
  // Footer
  _pdfFooter(pdf,{left:"MedIA Suite — Documento confidencial de uso interno",margin:M,y:290,color:[80,90,110]});
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

