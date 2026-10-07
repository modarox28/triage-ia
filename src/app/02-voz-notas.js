// 02-voz-notas.js — Modo voz y validación de notas clínicas
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden numérico desde index.html.
// ── VOICE MODE ──
let _voiceMode=false,_voiceRecog=null;
const _vLang={es:'es-ES',en:'en-US',pt:'pt-BR',fr:'fr-FR',de:'de-DE'};
const _vNums={
  es:['uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','siguiente'],
  en:['one','two','three','four','five','six','seven','eight','nine','ten','next'],
  pt:['um','dois','tres','quatro','cinco','seis','sete','oito','nove','dez','proximo'],
  fr:['un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','suivant'],
  de:['eins','zwei','drei','vier','funf','sechs','sieben','acht','neun','zehn','weiter']
};

function toggleVoiceMode(){
  if(!('speechSynthesis' in window)){toast(t('voiceNotSupported'));return;}
  _voiceMode=!_voiceMode;
  const fab=document.getElementById('voiceFab');
  if(fab)fab.classList.toggle('on',_voiceMode);
  if(_voiceMode){_vSpeakStep();}
  else{_vStop();}
}

function _vStop(){
  if('speechSynthesis' in window)speechSynthesis.cancel();
  if(_voiceRecog){try{_voiceRecog.abort();}catch(e){}_voiceRecog=null;}
  _vHideBanner();
}

function _vSpeak(text,cb){
  if(!_voiceMode)return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang=_vLang[CL]||'es-ES';u.rate=0.88;
  if(cb)u.onend=cb;
  speechSynthesis.speak(u);
}

function _vSpeakStep(){
  if(!_voiceMode)return;
  const steps=aSteps();
  if(TS>=steps.length)return;
  const s=steps[TS];
  const nums=_vNums[CL]||_vNums.es;
  let text=s.title+'. ';
  if(s.sub)text+=s.sub+'. ';
  if(s.t==='opts'){
    s.opts.forEach((o,i)=>{text+=`${nums[i]||i+1}: ${o.l}. `;});
    text+=t('voiceSayNumber');
  }else if(s.t==='multi'){
    s.opts.forEach((o,i)=>{text+=`${nums[i]||i+1}: ${o.l}. `;});
    text+=t('voiceSelectMulti');
  }else if(s.t==='scale'||s.t==='scale_enhanced'){
    text+=t('voiceSayScale');
  }else if(s.t==='num'){
    text+=t('voiceSayNumber');
  }else{
    text+=t('voiceNext');
  }
  _vSpeak(text,()=>_vListen(s));
}

function _vListen(s){
  if(!_voiceMode)return;
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!R){toast(t('voiceNotSupported'));return;}
  _vShowBanner();
  _voiceRecog=new R();
  _voiceRecog.lang=_vLang[CL]||'es-ES';
  _voiceRecog.interimResults=false;
  _voiceRecog.maxAlternatives=3;
  _voiceRecog.onresult=e=>{
    const heard=e.results[0][0].transcript.toLowerCase().trim();
    _voiceRecog=null;_vHideBanner();
    _vProcess(s,heard);
  };
  _voiceRecog.onerror=e=>{
    if(e.error!=='aborted'&&_voiceMode){_vHideBanner();setTimeout(()=>_vListen(s),700);}
  };
  try{_voiceRecog.start();}catch(e){}
}

function _vAdvance(){
  TS++;TM=[];rTriage();
  requestAnimationFrame(()=>{if(_voiceMode)_vSpeakStep();});
}

function _vProcess(s,heard){
  if(!_voiceMode)return;
  const nums=_vNums[CL]||_vNums.es;

  if(s.t==='opts'){
    let idx=-1;
    nums.slice(0,10).some((n,i)=>{if(heard.includes(n)){idx=i;return true;}});
    if(idx===-1){const m=heard.match(/\d+/);if(m)idx=parseInt(m[0])-1;}
    let match=idx>=0&&idx<s.opts.length?s.opts[idx]:null;
    if(!match)match=s.opts.find(o=>o.l.toLowerCase().split(' ').some(w=>w.length>3&&heard.includes(w)));
    if(match){
      TD[s.id]=match.v;
      _vSpeak(`${t('voiceConfirmed')} ${match.l}.`,()=>setTimeout(()=>_vAdvance(),500));
    }else{
      _vSpeak(t('voiceNotUnderstood'),()=>_vListen(s));
    }

  }else if(s.t==='multi'){
    // "siguiente" / "next" / "weiter" → advance
    if(heard.includes(nums[10])||heard.includes('next')||heard.includes('suivant')||heard.includes('weiter')||heard.includes('proximo')){
      if(TM.length>0||( TD[s.id]&&TD[s.id].length>0)){
        _vSpeak(t('voiceNext'),()=>setTimeout(()=>_vAdvance(),400));
      }else{_vListen(s);}
      return;
    }
    let idx=-1;
    nums.slice(0,10).some((n,i)=>{if(heard.includes(n)){idx=i;return true;}});
    if(idx===-1){const m=heard.match(/\d+/);if(m)idx=parseInt(m[0])-1;}
    let match=idx>=0&&idx<s.opts.length?s.opts[idx]:null;
    if(!match)match=s.opts.find(o=>o.l.toLowerCase().split(' ').some(w=>w.length>3&&heard.includes(w)));
    if(match){
      if(match.v==='ninguno'){TM=['ninguno'];}
      else{TM=TM.filter(x=>x!=='ninguno');TM.includes(match.v)?TM=TM.filter(x=>x!==match.v):TM.push(match.v);}
      TD[s.id]=[...TM];rTriage();
      _vSpeak(`${t('voiceConfirmed')} ${match.l}. ${t('voiceSelectMulti')}`,()=>_vListen(s));
    }else{
      _vSpeak(t('voiceNotUnderstood'),()=>_vListen(s));
    }

  }else if(s.t==='scale'||s.t==='scale_enhanced'){
    const m=heard.match(/\d+/);
    if(m){
      const v=parseInt(m[0]);
      if(v>=0&&v<=10){
        TD[s.id]=v;
        _vSpeak(`${t('voiceConfirmed')} ${v}.`,()=>setTimeout(()=>_vAdvance(),500));
      }else{_vSpeak(t('voiceNotUnderstood'),()=>_vListen(s));}
    }else{_vSpeak(t('voiceNotUnderstood'),()=>_vListen(s));}

  }else if(s.t==='num'){
    const m=heard.replace(/[^0-9]/g,'');
    if(m){
      const inp=document.querySelector('#trc input.fi');
      if(inp){inp.value=m;inp.dispatchEvent(new Event('input'));}
      if(canAdv(s)){
        _vSpeak(`${t('voiceConfirmed')} ${m}.`,()=>setTimeout(()=>_vAdvance(),500));
      }else{_vSpeak(t('voiceNotUnderstood'),()=>_vListen(s));}
    }else{_vSpeak(t('voiceNotUnderstood'),()=>_vListen(s));}

  }else{
    // vitals / symptom_detail / otros — avanza directo
    _vSpeak(t('voiceNext'),()=>setTimeout(()=>_vAdvance(),400));
  }
}

// ── CLINICAL NOTES ──
// Keywords that must appear for the text to be considered clinical
const _CLINICAL_KW=['paciente','patient','patientin','dolor','pain','schmerz','presion','tension','sangrado','fiebre','fever','fieber','nausea','vomit','disnea','trauma','fractura','herida','wound','alergia','allergy','allergie','medicacion','medication','medikament','antecedente','histor','diagnos','sintoma','symptom','frecuencia','cardiaca','respiratoria','saturacion','temperatura','temperatura','cirugía','cirugia','surgery','operacion','embaraz','pregnan','schwanger','convulsion','seizure','perdida','inconsciente','mareo','dizziness','cefalea','headache','kopfschmerz','infarto','stroke','escala','escala','dosis','dose','cronica','chronicl','agudo','acute','akut'];

function _isClinical(text){
  const low=text.toLowerCase();
  return _CLINICAL_KW.some(k=>low.includes(k))||/\d+\s*(mg|ml|lpm|mmhg|rpm|bpm|°c|%|años|anos|years|meses|weeks)/i.test(low);
}

function openNotes(){
  document.getElementById('notesLabelEl').textContent=t('notesLabel');
  document.getElementById('notesCharsLbl').textContent=t('notesChars');
  document.getElementById('notesSaveBtn').textContent=t('notesSave');
  document.getElementById('notesTA').placeholder=t('notesPh');
  document.getElementById('notesTA').value=TD.notas||'';
  document.getElementById('notesErr').textContent='';
  document.getElementById('notesCounter').innerHTML=`${(TD.notas||'').length} <span id="notesCharsLbl">${t('notesChars')}</span>`;
  document.getElementById('notesPanel').classList.add('on');
  document.getElementById('notesOverlay').classList.add('on');
  setTimeout(()=>document.getElementById('notesTA').focus(),350);
}

function closeNotes(){}

function onNotesInput(el){
  const len=el.value.length;
  document.getElementById('notesCounter').innerHTML=`${len} <span>${t('notesChars')}</span>`;
  if(len>0&&!_isClinical(el.value)){
    document.getElementById('notesErr').textContent='Las anotaciones deben contener informacion clinica relevante (sintomas, medicacion, antecedentes, signos vitales, etc.).';
  }else{
    document.getElementById('notesErr').textContent='';
  }
}

function saveNotes(){
  const val=document.getElementById('notesTA').value.trim();
  if(val&&!_isClinical(val)){
    document.getElementById('notesErr').textContent='Las anotaciones deben contener informacion clinica relevante (sintomas, medicacion, antecedentes, signos vitales, etc.).';
    document.getElementById('notesTA').focus();
    return;
  }
  TD.notas=val;
  closeNotes();
  if(val)toast(t('notesIncluded'));
}

function _notesShowFab(show){
  const fab=document.getElementById('notesFab');
  if(!fab)return;
  fab.classList.toggle('vis',show&&(CR==='medico'||CR==='admin'||CR==='admin_hosp'));
  if(!show){closeNotes();}
}


function _vShowBanner(){
  const el=document.getElementById('voiceBanner');
  if(!el)return;
  el.innerHTML=`<span class="vb-dot"></span>${t('voiceListening')}`;
  el.classList.add('on');
}
function _vHideBanner(){
  document.getElementById('voiceBanner')?.classList.remove('on');
}

function showApp(){
  dismissSplash();
  document.getElementById("authScreen").style.display="none";
  document.getElementById("mainApp").classList.add("on");
  if(typeof _queueViewport==="function"){_queueViewport();setTimeout(_queueViewport,400);}
  if(typeof iniciarAvisos==="function")setTimeout(iniciarAvisos,1500);
  if(typeof _syncOfflineQueue==="function")setTimeout(_syncOfflineQueue,2500);
  // Reset triage lookup state for new session
  if(CR!=="paciente"){_triageLookupDone=false;_triageLookupResult=null;}
  buildNav();updateUI();
  const def={admin:"dash",admin_hosp:"dash",medico:"triage",paciente:"meds"}[CR]||"triage";
  navigateTo(def);
  showWelcome();
  if(CR!=="paciente"){startInactivityTimer();_initPresence();}
  _tryShowInstallBanner();
}

function showWelcome(){
  const name=uName();
  const av=name[0].toUpperCase();
  const cols=["#00c8f0","#00e07a","#a855f7","#ffb830"];
  const col=cols[av.charCodeAt(0)%cols.length];

  // Role-specific greeting (localized) + display name format
  const greetings={
    es:{medico:"Bienvenido,",admin:"Bienvenido,",admin_hosp:"Bienvenido,",paciente:"Hola,"},
    en:{medico:"Welcome,",admin:"Welcome,",admin_hosp:"Welcome,",paciente:"Hello,"},
    pt:{medico:"Bem-vindo,",admin:"Bem-vindo,",admin_hosp:"Bem-vindo,",paciente:"Ola,"},
    fr:{medico:"Bienvenue,",admin:"Bienvenue,",admin_hosp:"Bienvenue,",paciente:"Bonjour,"},
    de:{medico:"Willkommen,",admin:"Willkommen,",admin_hosp:"Willkommen,",paciente:"Hallo,"},
  };
  const prefixes={
    medico:"Doc.",
    admin:"Admin",
    admin_hosp:"Admin",
    paciente:"",
  };
  const roleBadge={
    medico:"MEDICO",admin:"ADMIN",admin_hosp:"ADM. HOSP",paciente:"PACIENTE"
  };

  const greeting=(greetings[CL]||greetings.es)[CR]||t("welcomeHello");
  const prefix=prefixes[CR]||"";
  const displayName=prefix?`${prefix} ${name}`:name;

  const ov=document.getElementById("welcomeOverlay");
  const box=document.getElementById("welcomeBox");
  const avEl=document.getElementById("welcomeAv");
  const saved=localStorage.getItem("ms_photo_"+CU?.uid);
  if(saved){
    avEl.innerHTML=`<img src="${saved}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    avEl.style.background="transparent";
  }else{
    avEl.innerHTML=av;
    avEl.style.background=col;
  }
  document.getElementById("welcomeHello").textContent=greeting;
  document.getElementById("welcomeName").textContent=displayName;
  document.getElementById("welcomeRole").textContent=roleBadge[CR]||CR;
  box.classList.remove("out");
  ov.style.display="flex";
  setTimeout(()=>{
    box.classList.add("out");
    setTimeout(()=>{ov.style.display="none";},420);
  },2400);
}

