// 08-triage.js — Pasos del triage y resultado con IA
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden numérico desde index.html.
// TRIAGE STEPS
function getSteps(){return _getStepsModule(L,CL);}
function aSteps(){return getSteps().filter(s=>!s.skip||!s.skip(TD));}

function rTriage(){
  if(_mciActive){_renderMCITriage();return;}
  const steps=aSteps();const tot=steps.length;
  document.getElementById("pg").style.width=((TS/tot)*100)+"%";
  if(TS>=tot){if(_lastResult){rResult(_lastResult);return;}rAnalyzing();return;}
  _updatePatientHCStrip();
  const s=steps[TS];const c=document.getElementById("trc");c.innerHTML="";
  const st=document.createElement("div");st.className="stag";st.textContent=`${t("step")||"Paso"} ${TS+1} ${t("of")||"de"} ${tot}`;c.appendChild(st);
  if(TD.tipo==="nino"||TD.tipo==="adolescente"){const n=document.createElement("div");n.className="cnote";n.innerHTML=`<span style="font-size:.95rem;flex-shrink:0">👨‍👩‍👦</span><span><strong>${t("pedNote")||"Paciente pediatrico / adolescente"}</strong> — ${t("pedNoteSub")||"Completar con padre, madre o tutor."}</span>`;c.appendChild(n);}
  if(TD.tipo==="movilidad"){const n=document.createElement("div");n.className="cnote";n.style.cssText="background:rgba(255,184,48,.08);border:1px solid rgba(255,184,48,.28);color:#ffb830;";n.innerHTML=`<span style="font-size:.95rem;flex-shrink:0">♿</span><span><strong>${t("mobilityNote")||"Se requiere enfermero o tutor presente"}</strong><br><span style="font-size:.72rem;opacity:.85">${t("mobilityNoteSub")||"Este paciente necesita asistencia durante la evaluacion."}</span></span>`;c.appendChild(n);}
  const card=document.createElement("div");card.className="card";
  card.innerHTML=`<div class="qtitle">${s.title}</div><div class="qsub">${s.sub}</div>`;
  if(s.t==="opts"){
    const g=document.createElement("div");g.className="opts";
    s.opts.forEach(o=>{const b=document.createElement("button");b.className="opt"+(TD[s.id]===o.v?" sel":"");b.innerHTML=`<span class="opic">${o.ic}</span>${o.l}`;b.onclick=()=>{TD[s.id]=o.v;rTriage();};g.appendChild(b);});
    card.appendChild(g);
    if(s.id==="consc"){
      const tx2=L[CL]||L.es;
      if(TD.gcs){
        const chip=document.createElement("div");chip.className="gcs-fab-chip";
        chip.innerHTML=`🧠 GCS ${TD.gcs.total}/15 &nbsp;(E${TD.gcs.E} V${TD.gcs.V} M${TD.gcs.M})`;
        chip.onclick=()=>openGCS();
        card.appendChild(chip);
      } else {
        const gb=document.createElement("button");gb.className="bsec";
        gb.style.cssText="margin-top:12px;width:100%;font-size:.78rem;";
        gb.textContent="🧠 "+(tx2.gcsBtn||"Calcular Escala de Glasgow");
        gb.onclick=()=>openGCS();
        card.appendChild(gb);
      }
    }
  }else if(s.t==="multi"){
    if(!TM.length&&TD[s.id])TM=[...TD[s.id]];
    const g=document.createElement("div");g.className="opts";
    s.opts.forEach(o=>{const sel=TM.includes(o.v);const b=document.createElement("button");b.className="opt"+(sel?" selm":"");b.innerHTML=`<span class="opic">${o.ic}</span>${o.l}`;
      b.onclick=()=>{if(o.v==="ninguno"){TM=["ninguno"];}else{TM=TM.filter(x=>x!=="ninguno");TM.includes(o.v)?TM=TM.filter(x=>x!==o.v):TM.push(o.v);}TD[s.id]=[...TM];rTriage();};g.appendChild(b);});
    card.appendChild(g);
  }else if(s.t==="scale_enhanced"){
    renderScaleEnhanced(card, s.id);
  }else if(s.t==="symptom_detail"){
    const skipped = renderSymptomDetail(card);
    if(skipped) return;
  }else if(s.t==="vitals"){
    if(!TD.vit)TD.vit={};
    const tx4=L[CL]||L.es;
    const vcBtn=document.createElement("button");vcBtn.className="bsec";
    vcBtn.style.cssText="width:100%;font-size:.76rem;margin-bottom:10px;";
    vcBtn.textContent="📷 "+(tx4.vitcamTitle||"Vitales por imagen");
    vcBtn.onclick=()=>openVitcam();
    card.appendChild(vcBtn);
    const vg=document.createElement("div");vg.className="vgrid";
    [{id:"ps",l:t("vSysBP")||"P. sistolica (mmHg)",ph:"120"},{id:"pd",l:t("vDiaBP")||"P. diastolica (mmHg)",ph:"80"},{id:"fc",l:t("vHR")||"Frec. cardiaca (lpm)",ph:"80"},{id:"sat",l:t("vSpO2")||"Saturacion O2 (%)",ph:"97"},{id:"tem",l:t("vTemp")||"Temperatura (C)",ph:"37"},{id:"fr",l:t("vRR")||"Frec. respiratoria (rpm)",ph:"16"}].forEach(f=>{
      const w=document.createElement("div");w.className="vf";w.innerHTML=`<label>${f.l}</label>`;
      const i=document.createElement("input");i.type="number";i.id="vf_"+f.id;i.placeholder=f.ph;i.value=TD.vit[f.id]||"";
      i.oninput=()=>{TD.vit[f.id]=i.value;_checkVitalsRealtime();};
      w.appendChild(i);vg.appendChild(w);});
    card.appendChild(vg);
    const vitAlertBox=document.createElement("div");vitAlertBox.id="vitAlertBox";vitAlertBox.style.cssText="margin-top:8px;";card.appendChild(vitAlertBox);
  }else if(s.t==="notes_step"){
    if(!TD.notas)TD.notas=s.defaultMsg||"";
    if(_patientHC){
      const hcBadge=document.createElement("div");
      hcBadge.style.cssText="display:flex;align-items:center;gap:6px;font-size:.72rem;color:var(--cy);background:rgba(0,200,240,.08);border:1px solid rgba(0,200,240,.25);border-radius:10px;padding:6px 10px;margin-top:4px;margin-bottom:6px;animation:fadeUp .3s both";
      hcBadge.innerHTML=`<span>🗂️</span><span>Pre-cargado desde historia clínica de <strong>${_esc(_patientHC.name)}</strong>. Edita si hay cambios.</span>`;
      card.appendChild(hcBadge);
    }
    const ta=document.createElement("textarea");
    ta.className="fi";ta.style.cssText="resize:vertical;min-height:120px;font-size:.8rem;line-height:1.55;padding:12px;margin-top:4px;font-family:'Familjen Grotesk',sans-serif;border-color:"+(_patientHC?"rgba(0,200,240,.4)":"");
    ta.value=TD.notas;
    const warnEl=document.createElement("div");warnEl.className="notes-warn";
    warnEl.textContent="⚠️ Incluya informacion clinica: antecedentes, alergias, medicacion, signos relevantes o \"Sin antecedentes conocidos.\"";
    ta.oninput=()=>{
      TD.notas=ta.value;
      const v=ta.value.trim();
      warnEl.classList.toggle("on",v.length>10&&!_isClinical(v));
    };
    card.appendChild(ta);
    card.appendChild(warnEl);
    const hint=document.createElement("div");
    hint.style.cssText="font-size:.68rem;color:var(--mu);margin-top:7px;font-family:'JetBrains Mono',monospace;line-height:1.4;border-left:2px solid var(--cy);padding-left:8px;";
    hint.textContent=_patientHC?"Datos clínicos cargados automáticamente desde el registro del paciente.":(s.hint||"");
    card.appendChild(hint);
    setTimeout(()=>ta.focus(),80);
  }else if(s.t==="freetext"){
    const fta=document.createElement("textarea");
    fta.className="fi";fta.style.cssText="resize:vertical;min-height:90px;font-size:.85rem;line-height:1.55;padding:12px;margin-top:4px;font-family:'Familjen Grotesk',sans-serif;";
    fta.placeholder=s.placeholder||"Describe brevemente...";
    fta.value=TD[s.id]||"";
    fta.oninput=()=>{TD[s.id]=fta.value;};
    card.appendChild(fta);
    if(s.hint){const fh=document.createElement("div");fh.style.cssText="font-size:.67rem;color:var(--mu);margin-top:7px;font-family:'JetBrains Mono',monospace;line-height:1.4;border-left:2px solid var(--cy);padding-left:8px;";fh.textContent=s.hint;card.appendChild(fh);}
    setTimeout(()=>fta.focus(),80);
  }else if(s.t==="scale"){
    const sg=document.createElement("div");sg.className="sgrid";
    for(let i=0;i<=10;i++){const b=document.createElement("button");const hi=i>=7;b.className="sb"+(TD[s.id]==i?(hi?" selh":" sel"):"");b.textContent=i;b.onclick=()=>{TD[s.id]=i;rTriage();};sg.appendChild(b);}
    const lb=document.createElement("div");lb.className="slabs";lb.innerHTML=`<span>${t("noPain")||"Sin dolor"}</span><span>${t("unbearable")||"Insoportable"}</span>`;card.appendChild(sg);card.appendChild(lb);
  }else if(s.t==="num"){
    // Dynamic min/max for child age based on patient type
    let vMin=s.min,vMax=s.max;
    if(s.id==="enino"){vMin=TD.tipo==="adolescente"?13:0;vMax=TD.tipo==="adolescente"?17:12;}
    const i=document.createElement("input");i.className="fi";i.type="number";i.placeholder=s.unit;i.min=vMin;i.max=vMax;
    i.value=(TD[s.id]!==undefined&&TD[s.id]!=="")?""+TD[s.id]:"";
    i.style.cssText="font-size:1.1rem;text-align:center;letter-spacing:1px;";
    const errEl=document.createElement("div");errEl.className="num-err";
    card.appendChild(i);card.appendChild(errEl);
    const checkNum=()=>{
      const v=+i.value;const empty=i.value==="";
      let errMsg="",valid=!empty&&!isNaN(v);
      if(valid){
        if(v<vMin||v>vMax){
          valid=false;
          if(s.id==="enino"){errMsg=TD.tipo==="adolescente"?t("ageErrorTeen")||"Edad invalida para adolescente (13-17 anos).":t("ageErrorPed")||"Edad invalida para paciente pediatrico (0-12 anos).";}
          else{errMsg=`Valor debe estar entre ${vMin} y ${vMax} ${s.unit}.`;}
        }
      }
      errEl.textContent=errMsg;
      const nx=document.querySelector("#trc .bnxt");
      if(nx)nx.disabled=!valid;
      TD[s.id]=valid?i.value:"";
    };
    i.oninput=checkNum;
    requestAnimationFrame(()=>i.focus());
    if(s.id==="enino"||s.id==="semanas"){
      const tx3=L[CL]||L.es;
      const dcb=document.createElement("button");dcb.className="bsec";
      dcb.style.cssText="margin-top:12px;width:100%;font-size:.76rem;";
      dcb.textContent="👶 "+(tx3.dospTitle||"Calculadora dosis pediatrica");
      dcb.onclick=()=>openDosP(TD.enino?+TD.enino:null);
      card.appendChild(dcb);
    }
  }
  const nav=document.createElement("div");nav.className="bnav-row";
  if(TS>0){
    const b=document.createElement("button");b.className="bbk";b.textContent="← "+(t("back")||"Atras");b.onclick=()=>{TS--;TM=[];rTriage();};nav.appendChild(b);
  }else if(CR!=="paciente"){
    const b=document.createElement("button");b.className="bbk";
    b.style.cssText="color:var(--tx);border-color:var(--bd);font-weight:600;";
    b.textContent="← "+(t("back")||"Volver");
    b.onclick=()=>_clearTriagePatient();
    nav.appendChild(b);
  }
  const nx=document.createElement("button");nx.className="bnxt";
  nx.textContent=TS===steps.length-1?(t("analyze")||"Analizar")+" →":(t("continueBtn")||"Continuar")+" →";
  nx.disabled=!canAdv(s);nx.onclick=()=>{history.pushState({_ms:'triage-step',ts:TS+1},'');TS++;TM=[];rTriage();};nav.appendChild(nx);card.appendChild(nav);c.appendChild(card);
  if(TD.motivo&&s.id!=="tipo"&&s.id!=="motivo"){const ch=_getCopilotHints();if(ch)c.appendChild(_renderCopilotCard(ch));}
}

function canAdv(s){
  if(s.t==="vitals")return true;
  if(s.t==="notes_step")return true;
  if(s.t==="scale_enhanced")return TD[s.id]!==undefined;
  if(s.t==="symptom_detail")return true;
  if(s.t==="multi")return TM.length>0||(TD[s.id]&&TD[s.id].length>0);
  if(s.t==="num"){
    if(TD[s.id]===undefined||TD[s.id]==="")return false;
    const v=+TD[s.id];if(isNaN(v))return false;
    let mn=s.min,mx=s.max;
    if(s.id==="enino"){mn=TD.tipo==="adolescente"?13:0;mx=TD.tipo==="adolescente"?17:12;}
    return v>=mn&&v<=mx;
  }
  if(s.t==="scale")return TD[s.id]!==undefined;
  if(s.t==="freetext")return true;
  return!!TD[s.id];
}

function rAnalyzing(){
  document.getElementById("trc").innerHTML=`<div class="card" style="text-align:center;padding:24px 14px">
    <div style="font-size:1.8rem;margin-bottom:10px">🔬</div>
    <div class="qtitle" style="text-align:center">${t("analyzing")||"Analizando datos..."}</div>
    <div class="qsub" style="text-align:center">${t("analyzingSub")||"La IA evalua signos vitales y sintomas."}</div>
    <div style="display:flex;gap:6px;justify-content:center;margin:14px 0">
      <span style="width:7px;height:7px;background:var(--cy);border-radius:50%;animation:dot 1.2s infinite;display:inline-block"></span>
      <span style="width:7px;height:7px;background:var(--cy);border-radius:50%;animation:dot 1.2s .2s infinite;display:inline-block"></span>
      <span style="width:7px;height:7px;background:var(--cy);border-radius:50%;animation:dot 1.2s .4s infinite;display:inline-block"></span>
    </div>
    <style>@keyframes dot{0%,80%,100%{transform:scale(.5);opacity:.4}40%{transform:scale(1);opacity:1}}</style>
    <div style="font-family:JetBrains Mono,monospace;font-size:.56rem;color:var(--mu);letter-spacing:2px" data-i18n="analyzing">${t("analyzingLabel")||"EVALUANDO RIESGO CLINICO"}</div>
  </div>`;
  callAI();
}

async function callAI(){
  // Validate clinical notes before wasting an API call
  if(TD.notas&&TD.notas.trim()&&!_isClinical(TD.notas)){
    const lastStep=aSteps().length-1;
    document.getElementById("trc").innerHTML=`
      <div class="card">
        <div class="ib rd" style="margin-bottom:12px">
          <div class="ibl">⚠️ Anotaciones no validas</div>
          <div class="ibt">Las anotaciones deben contener informacion clinica relevante: antecedentes, alergias, medicacion actual, signos vitales, diagnosticos previos, etc.<br><br>Si el paciente no refiere datos adicionales, deje el texto predeterminado o escriba "Sin antecedentes conocidos."</div>
        </div>
        <button class="bsec" onclick="TS=${lastStep};rTriage()">← Corregir anotaciones</button>
      </div>`;
    return;
  }
  const prompt=buildTriagePrompt(TD,CL,_patientHC);
  try{
    const r=await fetch(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"deepseek-chat",max_tokens:750,messages:[{role:"user",content:prompt}]})});
    const d=await r.json();
    const txt=d.choices[0].message.content.replace(/```json|```/g,"").trim();
    const res=JSON.parse(txt);
    if(FB&&CU&&CR!=="paciente"){
      const triageData={...TD,clasificacion:res.clasificacion,justificacion:res.justificacion,motivo:TD.motivo,tipo:TD.tipo,dolor:TD.dolor,notas:TD.notas||"",userName:uName(),userRole:CR||"",userEmail:CU?.email||"",userId:CU?.uid||""};
      if(!navigator.onLine){_queueOfflineTriage(triageData);}
      else{try{await saveTriage(FB,{...triageData,createdAt:FB.serverTimestamp()});logAudit("triage_completed",{clasificacion:res.clasificacion,motivo:TD.motivo,tipo:TD.tipo});}catch(e){_queueOfflineTriage(triageData);}}
    }
    rResult(res);
  }catch(e){
    document.getElementById("trc").innerHTML=`<div class="card"><div style="color:var(--rd);font-size:.83rem">Error al conectar con la IA.<br><small style="color:var(--mu)">${_esc(e.message)}</small></div><button class="bsec" onclick="resetT()">← Reintentar</button></div>`;
  }
}

let _lastResult=null;
function rResult(r){
  const elapsed=_getTriageElapsed();
  _stopTriageTimer();
  const timerBadge=document.getElementById("triageTimerBadge");if(timerBadge)timerBadge.style.display="none";
  _lastResult={...r,tipo:TD.tipo,motivo:TD.motivo,ts:Date.now(),elapsed};
  const cc={ROJO:"ro",AMARILLO:"am",VERDE:"ve"}[r.clasificacion]||"ve";
  const ic={ROJO:"🔴",AMARILLO:"🟡",VERDE:"🟢"}[r.clasificacion];
  const pm={ROJO:t("immAttn")||"ATENCION INMEDIATA",AMARILLO:t("urgent")||"URGENTE",VERDE:t("canWait")||"PUEDE ESPERAR"}[r.clasificacion];
  // Attention deadline chip
  const deadlineMin={ROJO:0,AMARILLO:30,VERDE:120}[r.clasificacion]??30;
  let attnHtml="";
  if(deadlineMin===0){attnHtml=`<div class="attn-chip now">⚡ ATENDER AHORA</div>`;}
  else{const dl=new Date(Date.now()+deadlineMin*60000);const hh=String(dl.getHours()).padStart(2,"0");const mm2=String(dl.getMinutes()).padStart(2,"0");attnHtml=`<div class="attn-chip ${deadlineMin<=30?"soon":"wait"}">⏱ Atender antes de las ${hh}:${mm2}</div>`;}

  // Timer display
  let timerHtml="";
  if(elapsed!=null){const m=Math.floor(elapsed/60),s=elapsed%60;timerHtml=`<div style="font-size:.65rem;opacity:.7;margin-top:4px">⏱ Triage completado en ${m}:${String(s).padStart(2,"0")}</div>`;}

  // Clinical scores (deterministic — not AI)
  const vt=TD.vit||{};
  const _sv={sys:parseFloat(vt.ps),rr:parseFloat(vt.fr),spo2:parseFloat(vt.sat),hr:parseFloat(vt.fc),temp:parseFloat(vt.tem)};
  const qsofa=calcQSOFA(_sv,TD.consc);
  const hasVit=vt.ps||vt.fr||vt.sat||vt.fc||vt.tem;
  const news2=hasVit?calcNEWS2(_sv,TD.consc):null;
  const si=vt.fc&&vt.ps?calcShockIndex(vt.fc,vt.ps):null;
  const timelineHtml=_buildTriageTimeline(qsofa,news2,si,r,elapsed);
  let copilotResultHtml="";
  if((r.red_flags&&r.red_flags.length)||(r.suggested_tests&&r.suggested_tests.length)||r.protocol_hint){
    const _rfH=r.red_flags&&r.red_flags.length?`<div style="margin-bottom:10px"><div style="font-size:.58rem;font-family:JetBrains Mono,monospace;color:var(--rd);letter-spacing:1px;margin-bottom:4px">⚠ RED FLAGS DETECTADOS</div>${r.red_flags.map(f=>`<div style="font-size:.74rem;color:var(--rd);margin-bottom:3px;font-weight:600">• ${_esc(f)}</div>`).join("")}</div>`:"";
    const _stH=r.suggested_tests&&r.suggested_tests.length?`<div style="margin-bottom:10px"><div style="font-size:.58rem;font-family:JetBrains Mono,monospace;color:var(--cy);letter-spacing:1px;margin-bottom:6px">🔬 ESTUDIOS SUGERIDOS</div><div style="display:flex;flex-wrap:wrap;gap:4px">${r.suggested_tests.map(ts=>`<span style="font-size:.68rem;padding:3px 8px;border-radius:20px;background:rgba(0,200,240,.1);border:1px solid rgba(0,200,240,.3);color:var(--cy)">${_esc(ts)}</span>`).join("")}</div></div>`:"";
    const _phH=r.protocol_hint?`<div><div style="font-size:.58rem;font-family:JetBrains Mono,monospace;color:var(--gn);letter-spacing:1px;margin-bottom:4px">📋 PROTOCOLO SUGERIDO</div><div style="font-size:.8rem;font-weight:700;color:var(--tx)">${_esc(r.protocol_hint)}</div></div>`:"";
    copilotResultHtml=`<div class="card" style="border-color:rgba(0,200,240,.3);background:rgba(0,200,240,.04)"><div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><span>🤖</span><div class="clabel" style="margin:0;color:var(--cy)">AI Copilot</div></div>${_rfH}${_stH}${_phH}<div style="font-size:.6rem;color:var(--mu);margin-top:10px;font-style:italic">Sugerencias orientativas. Decisión clínica a cargo del profesional de salud.</div></div>`;
  }

  let qsofaHtml="";
  if(qsofa.score>0||vt.fr||vt.ps){
    qsofaHtml=`<div class="card"><div style="display:flex;align-items:center;gap:10px">
      <div class="score-ring ${qsofa.risk==="high"?"crit":qsofa.score===1?"warn":"ok"}">${qsofa.score}/3</div>
      <div><div style="font-weight:700;font-size:.88rem">qSOFA ${qsofa.risk==="high"?"— Riesgo sepsis ⚠️":"— Bajo riesgo"}</div>
      ${qsofa.details.length?`<div style="font-size:.72rem;color:var(--mu);margin-top:3px">${qsofa.details.join(" · ")}</div>`:"<div style='font-size:.72rem;color:var(--mu);margin-top:3px'>Sin criterios positivos</div>"}
      ${qsofa.risk==="high"?`<div style="font-size:.68rem;color:var(--rd);margin-top:4px;font-weight:700">≥2 criterios → Evaluar sepsis. Hemocultivos, lactato, antibióticos.</div>`:""}
      </div></div></div>`;
  }

  let news2Html="";
  if(news2){
    const rc=news2.risk==="high"?"crit":news2.risk==="medium"?"warn":"ok";
    news2Html=`<div class="card"><div style="display:flex;align-items:center;gap:10px">
      <div class="score-ring ${rc}" style="font-size:1.1rem">${news2.score}</div>
      <div style="flex:1;min-width:0"><div style="font-weight:700;font-size:.88rem">NEWS2 — <span style="color:${news2.riskColor}">${news2.riskLabel}</span></div>
      ${news2.components.length?`<div style="font-size:.71rem;color:var(--mu);margin-top:3px">${news2.components.map(c=>`${c.l} <span style="color:${c.pts>=3?"var(--rd)":c.pts>=2?"var(--yw)":"var(--mu)"}">+${c.pts}</span>`).join(" · ")}</div>`:`<div style="font-size:.71rem;color:var(--mu);margin-top:3px">Todos los parámetros dentro del rango</div>`}
      ${news2.risk==="high"?`<div style="font-size:.67rem;color:var(--rd);margin-top:4px;font-weight:700">NEWS2 ≥ 7 → Respuesta de emergencia. Monitorización continua.</div>`:""}
      </div></div></div>`;
  }

  let siHtml="";
  if(si){
    const rc=si.risk==="severe"?"crit":si.risk==="normal"?"ok":"warn";
    siHtml=`<div class="card"><div style="display:flex;align-items:center;gap:10px">
      <div class="score-ring ${rc}" style="font-size:.95rem">${si.idx}</div>
      <div><div style="font-weight:700;font-size:.88rem">Shock Index — <span style="color:${si.color}">${si.label}</span></div>
      <div style="font-size:.71rem;color:var(--mu);margin-top:3px">FC ${vt.fc} ÷ PAS ${vt.ps} = ${si.idx}</div>
      ${si.risk==="severe"?`<div style="font-size:.67rem;color:var(--rd);margin-top:4px;font-weight:700">IS ≥ 1.4 → Evaluar shock hemorrágico / hipovolemia severa.</div>`:""}
      </div></div></div>`;
  }

  // CURB-65 (pneumonia severity) — shown for fever/dyspnea in adult patients
  let curb65Html="";
  if((TD.motivo==="fiebre"||TD.motivo==="disnea")&&(TD.tipo==="adulto"||TD.tipo==="adulto_mayor")){
    const _c65=calcCURB65({confusion:TD.consc&&TD.consc!=="alerta",urea_high:false,rr:parseFloat(vt.fr)||0,sbp:parseFloat(vt.ps)||0,dbp:parseFloat(vt.pd)||0,age:TD.tipo==="adulto_mayor"?70:40});
    const _rc65=_c65.risk==="high"?"crit":_c65.risk==="medium"?"warn":"ok";
    curb65Html=`<div class="card"><div style="display:flex;align-items:center;gap:10px">
      <div class="score-ring ${_rc65}" style="font-size:.95rem">${_c65.score}/5</div>
      <div><div style="font-weight:700;font-size:.88rem">CURB-65 — <span style="color:${_c65.color}">${_c65.label}</span></div>
      ${_c65.details.length?`<div style="font-size:.71rem;color:var(--mu);margin-top:3px">${_c65.details.join(" · ")}</div>`:`<div style="font-size:.71rem;color:var(--mu);margin-top:3px">Sin criterios de gravedad detectados</div>`}
      <div style="font-size:.62rem;color:var(--mu);margin-top:3px;font-style:italic">Urea no evaluada en triage — verificar laboratorio</div>
      ${_c65.risk==="high"?`<div style="font-size:.67rem;color:var(--rd);margin-top:4px;font-weight:700">CURB-65 ≥ 3 → Hospitalización / valorar UCI.</div>`:_c65.risk==="medium"?`<div style="font-size:.67rem;color:var(--yw);margin-top:4px;font-weight:600">CURB-65 = 2 → Valorar hospitalización.</div>`:""}
      </div></div></div>`;
  }

  const tM2={adulto:t("adultLbl")||"Adulto",adulto_mayor:t("elderLbl")||"Tercera edad",embarazada:t("pregLbl")||"Embarazada",nino:t("childLbl")||"Pediatrico",adolescente:t("teenLbl")||"Adolescente"};
  const dc={normal:"var(--gn)",warning:"var(--yw)",critical:"var(--rd)"};
  const vcs=[vt.ps?{l:"PA",v:`${vt.ps}/${vt.pd||"—"}`,s:chkPA(vt.ps)}:null,vt.fc?{l:"FC",v:`${vt.fc} lpm`,s:chkFC(vt.fc)}:null,vt.sat?{l:"SatO₂",v:`${vt.sat}%`,s:chkSat(vt.sat)}:null,vt.tem?{l:"Temp",v:`${vt.tem}°C`,s:chkT(vt.tem)}:null,vt.fr?{l:"FR",v:`${vt.fr} rpm`,s:chkFR(vt.fr)}:null].filter(Boolean);
  const alH=r.alertas_criticas&&r.alertas_criticas.length?`<div style="background:var(--rd-a);border:1px solid rgba(255,58,92,.25);border-radius:8px;padding:9px;margin-top:8px"><div style="font-family:JetBrains Mono,monospace;font-size:.55rem;color:var(--rd);margin-bottom:4px;letter-spacing:1px">ALERTAS CRITICAS</div>${r.alertas_criticas.map(a=>`<div style="font-size:.78rem;color:#ff8fa3;margin-bottom:2px">⚠ ${_esc(a)}</div>`).join("")}</div>`:"";
  const pedH=(TD.tipo==="nino"||TD.tipo==="adolescente")?`<div class="cnote"><span style="font-size:.9rem;flex-shrink:0">👨‍👩‍👦</span><span>${t("pedNote")||"Paciente pediatrico / adolescente"}${TD.enino?` — ${TD.enino} años`:""}. ${t("pedNoteSub")||"Confirmar con pediatra."}</span></div>`:"";
  document.getElementById("trc").innerHTML=`
    ${pedH}
    <div class="rcard ${cc}" style="animation:bounceIn .5s cubic-bezier(.34,1.4,.64,1)"><span class="ric">${ic}</span><div class="rlbl">${_esc(r.clasificacion)}</div>
    <div class="rpri">${pm}${r.tiempo_atencion?" · "+_esc(r.tiempo_atencion):""}</div>
    ${attnHtml}${timerHtml}
    <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;margin-top:8px">
      <span class="chip">${_esc(tM2[TD.tipo]||"")}</span>${TD.semanas?`<span class="chip">${TD.semanas} sem.</span>`:""}${TD.enino?`<span class="chip">${TD.enino} años</span>`:""}
      <span class="chip">Dolor: ${TD.dolor}/10</span></div></div>
    <div class="card"><div class="clabel" data-i18n="clinicalAnalysis">${t("clinicalAnalysis")||"Analisis clinico"}</div><div style="font-size:.83rem;line-height:1.65">${_esc(r.justificacion)}</div>${alH}</div>
    ${qsofaHtml}${news2Html}${siHtml}${curb65Html}
    ${vcs.length?`<div class="card"><div class="clabel">Signos vitales</div>${vcs.map(v=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd)"><div style="width:8px;height:8px;border-radius:50%;background:${dc[v.s]};flex-shrink:0;box-shadow:0 0 6px ${dc[v.s]}55;"></div><div style="flex:1;font-size:.76rem;color:var(--mu)">${v.l}</div><div style="font-family:JetBrains Mono,monospace;font-size:.84rem;font-weight:700;color:${dc[v.s]}">${v.v}</div></div>`).join("")}</div>`:""}
    ${timelineHtml}
    ${copilotResultHtml}
    <div class="card"><div class="clabel">${t("priorityActions")||"Acciones prioritarias"}</div>${r.acciones.map((a,i)=>`<div style="display:flex;gap:8px;margin-bottom:8px;align-items:flex-start"><span style="font-family:JetBrains Mono,monospace;font-size:.64rem;color:var(--cy);flex-shrink:0;margin-top:3px;background:var(--cy-a);padding:2px 5px;border-radius:4px">${String(i+1).padStart(2,"0")}</span><span style="font-size:.84rem;line-height:1.55">${_esc(a)}</span></div>`).join("")}</div>
    <div class="wnote">${t("disclaimer")}</div>
    <div style="display:flex;gap:10px;margin-top:6px;animation:fadeUp .4s .2s both">
      <button class="btn-share" onclick="shareResult()"><span class="bsi">📤</span>Compartir</button>
      <button class="btn-share btn-pdf" onclick="exportTriagePDF()"><span class="bsi">📄</span>Exportar PDF</button>
    </div>
    <button class="bsec" onclick="resetT()" style="animation:fadeUp .4s .3s both">← ${t("newPatient")||"Nuevo paciente"}</button>`;
}

function resetT(){
  TS=0;TD={};TM=[];_lastResult=null;
  _stopTriageTimer();_triageStartTime=null;
  document.getElementById("pg").style.width="0%";
  _updatePatientHCStrip();
  if(CR==="paciente"){
    if(_patientHC)_applyPatientHCToNotes();
    _startTriageTimer();rTriage();
  }else{
    _patientHC=null;_triageLookupDone=false;_triageLookupResult=null;
    _showPatientLookup();
  }
}

function shareResult(){
  if(!_lastResult)return;
  const r=_lastResult;
  const ic={ROJO:"🔴",AMARILLO:"🟡",VERDE:"🟢"}[r.clasificacion]||"⚪";
  const tM2={adulto:"Adulto",adulto_mayor:"Adulto mayor",embarazada:"Embarazada",nino:"Pediatrico",adolescente:"Adolescente"};
  const mM2={dolor_pecho:"Dolor en el pecho",disnea:"Dificultad respiratoria",trauma:"Trauma/herida",abdominal:"Dolor abdominal",neuro:"Neurologico",fiebre:"Fiebre alta",otro:"Otro"};
  const now=new Date();const ts=`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  const acciones=(r.acciones||[]).map((a,i)=>`${String(i+1).padStart(2,"0")}. ${a}`).join("\n");
  const elapsedTxt=r.elapsed!=null?`\nDuración triage: ${Math.floor(r.elapsed/60)}m ${r.elapsed%60}s`:"";
  const text=`🏥 RESULTADO DE TRIAGE — MedIA Suite\n${"─".repeat(35)}\n${ic} ${r.clasificacion} · ${tM2[r.tipo]||r.tipo||""}\nMotivo: ${mM2[r.motivo]||r.motivo||""} · ${ts}${elapsedTxt}\n${"─".repeat(35)}\n📋 Analisis:\n${r.justificacion||""}\n${"─".repeat(35)}\n✅ Acciones:\n${acciones}\n${"─".repeat(35)}\nGenerado con MedIA Suite`;
  if(navigator.share){
    navigator.share({title:"Resultado de Triage — MedIA Suite",text}).catch(()=>{
      navigator.clipboard?.writeText(text).then(()=>toast("Copiado al portapapeles")).catch(()=>{});
    });
  }else{
    navigator.clipboard?.writeText(text).then(()=>toast("Resultado copiado al portapapeles")).catch(()=>toast("No se pudo compartir"));
  }
}
function _buildTriagePDF(r){
  const {jsPDF}=window.jspdf;
  if(!jsPDF)return null;
  const pdf=new jsPDF({unit:"mm",format:"a4"});
  const W=210,PH=297,margin=18,cw=W-margin*2;
  let y=margin;
  const newPage=()=>{pdf.addPage();pdf.setFillColor(255,255,255);y=margin;};
  const chk=(need=10)=>{if(y+need>PH-15)newPage();};
  const ln=(txt,sz,bold,col)=>{
    chk(sz?sz*0.5+3:8);
    pdf.setFontSize(sz||11);pdf.setFont("helvetica",bold?"bold":"normal");
    if(col)pdf.setTextColor(...col);else pdf.setTextColor(30,30,30);
    pdf.text(txt,margin,y);y+=sz?sz*0.45+2:7;
  };
  const rule=(col=[200,200,200])=>{chk(6);pdf.setDrawColor(...col);pdf.line(margin,y,W-margin,y);y+=4;};
  const colorMap={ROJO:[220,38,38],AMARILLO:[202,138,4],VERDE:[21,128,61]};
  const clr=colorMap[r.clasificacion]||[80,80,80];

  pdf.setFillColor(11,17,32);pdf.rect(0,0,W,28,"F");
  pdf.setFontSize(16);pdf.setFont("helvetica","bold");pdf.setTextColor(255,255,255);
  pdf.text("MedIA Suite — Resultado de Triage",margin,13);
  pdf.setFontSize(9);pdf.setFont("helvetica","normal");pdf.setTextColor(160,180,200);
  pdf.text(new Date().toLocaleString("es-ES"),margin,21);
  y=36;

  pdf.setFillColor(...clr);pdf.roundedRect(margin,y,cw,14,3,3,"F");
  pdf.setFontSize(14);pdf.setFont("helvetica","bold");pdf.setTextColor(255,255,255);
  pdf.text(`${r.clasificacion}  —  ${r.tiempo_atencion||""}`,margin+4,y+9);
  y+=20;

  const tMl={adulto:"Adulto",adulto_mayor:"Adulto mayor",embarazada:"Embarazada",nino:"Pediatrico",adolescente:"Adolescente",MCI:"MCI"};
  const mMl={dolor_pecho:"Dolor en el pecho",disnea:"Dificultad respiratoria",trauma:"Trauma/herida",abdominal:"Dolor abdominal",neuro:"Neurologico",fiebre:"Fiebre alta",otro:"Otro"};
  ln("PACIENTE",8,true,[100,120,150]);y-=1;
  ln(`Tipo: ${tMl[r.tipo]||r.tipo||"—"}   Motivo: ${mMl[r.motivo]||r.motivo||"—"}`);
  if(r.dolor!=null)ln(`Dolor: ${r.dolor}/10`);
  if(r.userName)ln(`Atendido por: ${r.userName}`);
  if(r.pacienteNombre)ln(`Paciente: ${r.pacienteNombre}`);
  rule();

  const _rvit=r.vit||r.vitals||{};
  if(Object.keys(_rvit).some(k=>_rvit[k])){
    ln("SIGNOS VITALES",8,true,[100,120,150]);y-=1;
    const vlbl={fc:"FC",ps:"P.Sistolica",pd:"P.Diastolica",sat:"SpO2",tem:"Temperatura",fr:"FR",gcs:"Glasgow"};
    const vun={fc:"lpm",ps:"mmHg",pd:"mmHg",sat:"%",tem:"C",fr:"rpm",gcs:""};
    Object.entries(_rvit).forEach(([k,v])=>{if(v)ln(`${vlbl[k]||k}: ${v} ${vun[k]||""}`,10,false);});
    rule();
  }

  if(r.justificacion){
    ln("ANALISIS IA",8,true,[100,120,150]);y-=1;
    const just=pdf.splitTextToSize(r.justificacion||"",cw);
    const lineH=5;
    for(let i=0;i<just.length;i++){
      chk(lineH+2);
      pdf.setFontSize(11);pdf.setFont("helvetica","normal");pdf.setTextColor(30,30,30);
      pdf.text(just[i],margin,y);y+=lineH;
    }
    y+=3;rule();
  }

  if(r.acciones&&r.acciones.length){
    ln("ACCIONES PRIORITARIAS",8,true,[100,120,150]);y-=1;
    r.acciones.forEach((a,i)=>{
      const lines=pdf.splitTextToSize(`${i+1}. ${a}`,cw);
      const lineH=5;
      for(let j=0;j<lines.length;j++){
        chk(lineH+2);
        pdf.setFontSize(11);pdf.setFont("helvetica","normal");pdf.setTextColor(30,30,30);
        pdf.text(lines[j],margin,y);y+=lineH;
      }
      y+=2;
    });
    y+=2;rule([220,220,220]);
  }

  if(r.notas){
    chk(20);ln("NOTAS CLINICAS",8,true,[100,120,150]);y-=1;
    const nlines=pdf.splitTextToSize(r.notas,cw);
    const lineH=5;
    for(let i=0;i<nlines.length;i++){
      chk(lineH+2);
      pdf.setFontSize(10);pdf.setFont("helvetica","normal");pdf.setTextColor(60,60,60);
      pdf.text(nlines[i],margin,y);y+=lineH;
    }
    y+=3;rule([220,220,220]);
  }

  chk(8);
  pdf.setFontSize(8);pdf.setFont("helvetica","italic");pdf.setTextColor(130,130,130);
  pdf.text("Generado con MedIA Suite. Solo para uso clinico de apoyo — no reemplaza criterio medico.",margin,y);
  return pdf;
}

function exportTriagePDF(){
  if(!_lastResult){toast("Sin resultado para exportar");return;}
  if(typeof window.jspdf==="undefined"){toast("PDF no disponible");return;}
  const pdf=_buildTriagePDF(_lastResult);
  if(pdf)pdf.save(`triage-${_lastResult.clasificacion}-${Date.now()}.pdf`);
}

function exportDataPDF(data){
  if(!data){toast("Sin datos para exportar");return;}
  if(typeof window.jspdf==="undefined"){toast("PDF no disponible — recarga la app");return;}
  try{
    const pdf=_buildTriagePDF(data);
    if(pdf){pdf.save(`triage-${data.clasificacion||"resultado"}-${Date.now()}.pdf`);toast("PDF generado ✓");}
    else toast("No se pudo generar el PDF");
  }catch(e){toast("Error al generar PDF: "+e.message);console.error("[PDF]",e);}
}
function _exportHistPDF(idx){exportDataPDF(_histFiltered[idx]);}
function _exportDashPDF(idx){exportDataPDF(window._dashFiltered?.[idx]);}

