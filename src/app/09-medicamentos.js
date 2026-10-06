// 09-medicamentos.js — Búsqueda de medicamentos, interacciones y atajos de teclado
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden numérico desde index.html.
// DRUG SEARCH — patient lookup for meds context
let _medPatientHC=null;
async function lookupMedPatient(){
  const docId=document.getElementById("medPatientIdInput")?.value.trim();
  const res=document.getElementById("medPatientResult");
  if(!docId){if(res)res.innerHTML=`<span style="color:var(--mu)">Ingrese un ID.</span>`;return;}
  if(!FB||!CU){if(res)res.innerHTML=`<span style="color:var(--mu)">Sin sesión.</span>`;return;}
  if(res)res.innerHTML=`<span class="sp" style="margin-right:6px"></span>Buscando...`;
  try{
    const q=await FB.getDocs(FB.query(FB.collection(FB.db,"historias"),FB.where("doc","==",docId),FB.limit(1)));
    if(q.empty){
      _medPatientHC=null;
      if(res)res.innerHTML=`<span style="color:var(--yw)">⚠️ Paciente no encontrado en la base de datos.</span>`;
      return;
    }
    _medPatientHC=q.docs[0].data();
    if(res)res.innerHTML=`<span style="color:var(--gn)">✓ <b>${_esc(_medPatientHC.name)}</b> — ${_esc(_medPatientHC.age)} años${_medPatientHC.alergias?.length?` · Alergias: ${_esc(_medPatientHC.alergias.join(", "))}`:""}${_medPatientHC.antecedentes?.length?` · Antecedentes: ${_esc(_medPatientHC.antecedentes.slice(0,3).join(", "))}`:""}</span>
    <button onclick="_medPatientHC=null;document.getElementById('medPatientResult').innerHTML='';document.getElementById('medPatientIdInput').value=''" style="margin-left:8px;background:none;border:none;color:var(--mu);font-size:.7rem;cursor:pointer;text-decoration:underline">Limpiar</button>`;
    toast(`Contexto cargado: ${_medPatientHC.name}`);
  }catch(e){if(res)res.innerHTML=`<span style="color:var(--rd)">Error: ${_esc(e.message)}</span>`;}
}

async function buscarDrug(){
  const nm=document.getElementById("di").value.trim();
  if(!nm){toast("Escribe el nombre del medicamento");return;}
  // Use medPatientHC (doctor lookup) or patientHC (patient session)
  const activeHC=_medPatientHC||_patientHC;
  document.getElementById("dr").innerHTML=`<div class="card"><div class="ldg"><div class="sp"></div>Consultando${activeHC?` · Paciente: ${_esc(activeHC.name)}`:""}...</div></div>`;
  let hcCtx="";
  if(activeHC){
    const ant=(activeHC.antecedentes||[]).join(", ");
    const ale=(activeHC.alergias||[]).join(", ");
    const med=(activeHC.medicacion||[]).join(", ");
    hcCtx=`\nPACIENTE: ${activeHC.name}, ${activeHC.age} años.`;
    if(ant)hcCtx+=`\nAntecedentes: ${ant}.`;
    if(ale)hcCtx+=`\nALERGIAS CONOCIDAS: ${ale}.`;
    if(med)hcCtx+=`\nMedicación actual: ${med}.`;
    hcCtx+=`\nDetermina si este medicamento está CONTRAINDICADO para este paciente (alergia cruzada, interacción grave, antecedente clínico relevante). Pon "contraindicado_paciente":true si hay contraindicación real, false si es seguro. En "alerta_paciente" explica el motivo detallado si contraindicado_paciente es true, o deja vacío si es seguro.`;
  }
  try{
    const _lr2=({es:'español',en:'English',pt:'português',fr:'français',de:'Deutsch',ja:'日本語'})[CL]||'español';
    const prompt=`Informacion farmacologica sobre: "${nm}".${hcCtx} Responde valores en ${_lr2}. SOLO JSON sin backticks:\n{"nombre_comercial":"...","nombre_generico":"...","para_que_sirve":"...","dosis_tipica":"...","como_tomar":"...","efectos_secundarios":"...","contraindicaciones":"...","interacciones_comunes":"...","advertencias":"...","alerta_paciente":"","contraindicado_paciente":false}`;
    const r=await _aiFetch({model:"deepseek-chat",max_tokens:900,messages:[{role:"user",content:prompt}]});
    const d=await r.json();
    const inf=JSON.parse(d.choices[0].message.content.replace(/```json|```/g,"").trim());
    _lastDrugInfo={inf,nm};
    const isContra=activeHC&&inf.contraindicado_paciente===true;
    const ptnBadge=activeHC?`<div style="display:flex;align-items:center;gap:6px;font-size:.7rem;color:var(--cy);background:rgba(0,200,240,.07);border-radius:8px;padding:5px 9px;margin-bottom:10px">🗂️ Análisis personalizado para <strong>${_esc(activeHC.name)}</strong></div>`:"";
    const drugHead=`${ptnBadge}<div style="font-size:1.05rem;font-weight:700;margin-bottom:3px">${_esc(inf.nombre_comercial||nm)}</div><div style="font-size:.73rem;color:var(--mu);margin-bottom:11px">${_esc(inf.nombre_generico||"")}</div>`;
    if(isContra){
      document.getElementById("dr").innerHTML=`<div class="card" style="animation:fadeUp .3s both">
        ${drugHead}
        <div class="ib rd" style="margin-bottom:14px;animation:fadeUp .3s .1s both">
          <div class="ibl">&#x26D4; Contraindicado para este paciente</div>
          <div class="ibt">${_esc(inf.alerta_paciente||inf.contraindicaciones||"Consulte con el médico tratante.")}</div>
        </div>
        <button onclick="_showFullDrugInfo()" style="width:100%;padding:11px 14px;background:transparent;border:1.5px solid rgba(255,58,92,.3);border-radius:11px;color:var(--mu);font-size:.73rem;font-family:'Familjen Grotesk',sans-serif;cursor:pointer;touch-action:manipulation;transition:all .18s;text-align:center;animation:fadeUp .3s .2s both;line-height:1.6">&#x26A0;&#xFE0F; Mostrar información de todas formas<br><span style="font-size:.63rem;opacity:.55">Bajo mi propio riesgo — solo personal médico autorizado</span></button>
      </div>`;
    }else{
      const patientAlert=inf.alerta_paciente&&inf.alerta_paciente.trim()&&activeHC
        ?`<div class="ib rd" style="animation:fadeUp .3s both"><div class="ibl">&#x26A0;&#xFE0F; Alerta para ${_esc(activeHC.name)}</div><div class="ibt">${_esc(inf.alerta_paciente)}</div></div>`:"";
      document.getElementById("dr").innerHTML=`<div class="card" style="animation:fadeUp .3s both">
        ${drugHead}
        <div style="margin-bottom:11px"><span style="background:var(--cy-a);color:var(--cy);border-radius:20px;padding:3px 9px;font-size:.7rem;font-weight:600">&#x1F48A; ${_esc(inf.dosis_tipica||"Ver prospecto")}</span></div>
        ${patientAlert}
        <div class="ib gn"><div class="ibl">Para qué sirve</div><div class="ibt">${_esc(inf.para_que_sirve||"")}</div></div>
        <div class="ib cy"><div class="ibl">Cómo tomarlo</div><div class="ibt">${_esc(inf.como_tomar||"")}</div></div>
        <div class="ib yw"><div class="ibl">Efectos secundarios</div><div class="ibt">${_esc(inf.efectos_secundarios||"")}</div></div>
        <div class="ib rd"><div class="ibl">Contraindicaciones</div><div class="ibt">${_esc(inf.contraindicaciones||"")}</div></div>
        <div class="ib yw"><div class="ibl">Interacciones</div><div class="ibt">${_esc(inf.interacciones_comunes||"")}</div></div>
        ${inf.advertencias?`<div class="ib rd"><div class="ibl">Advertencias</div><div class="ibt">${_esc(inf.advertencias)}</div></div>`:""}
      </div>`;
    }
  }catch(e){document.getElementById("dr").innerHTML=`<div class="card"><div style="color:var(--rd);font-size:.83rem">Error al consultar.</div></div>`;}
}
let _lastDrugInfo=null;
function _showFullDrugInfo(){
  if(!_lastDrugInfo)return;
  const{inf,nm}=_lastDrugInfo;
  const ptnBadge=_patientHC?`<div style="display:flex;align-items:center;gap:6px;font-size:.7rem;color:var(--cy);background:rgba(0,200,240,.07);border-radius:8px;padding:5px 9px;margin-bottom:10px">&#x1F5C2;&#xFE0F; Análisis personalizado para <strong>${_esc(_patientHC.name)}</strong></div>`:"";
  document.getElementById("dr").innerHTML=`<div class="card" style="animation:fadeUp .3s both">
    ${ptnBadge}
    <div class="ib rd" style="margin-bottom:12px;padding:9px 12px">
      <div class="ibt" style="font-size:.72rem;line-height:1.55">&#x26A0;&#xFE0F; Contraindicación detectada — información mostrada bajo responsabilidad del profesional médico</div>
    </div>
    <div style="font-size:1.05rem;font-weight:700;margin-bottom:3px">${_esc(inf.nombre_comercial||nm)}</div>
    <div style="font-size:.73rem;color:var(--mu);margin-bottom:11px">${_esc(inf.nombre_generico||"")}</div>
    <div style="margin-bottom:11px"><span style="background:var(--cy-a);color:var(--cy);border-radius:20px;padding:3px 9px;font-size:.7rem;font-weight:600">&#x1F48A; ${_esc(inf.dosis_tipica||"Ver prospecto")}</span></div>
    ${inf.alerta_paciente?`<div class="ib rd" style="margin-bottom:10px"><div class="ibl">&#x26D4; Alerta para ${_esc(_patientHC?.name||"este paciente")}</div><div class="ibt">${_esc(inf.alerta_paciente)}</div></div>`:""}
    <div class="ib gn"><div class="ibl">Para qué sirve</div><div class="ibt">${_esc(inf.para_que_sirve||"")}</div></div>
    <div class="ib cy"><div class="ibl">Cómo tomarlo</div><div class="ibt">${_esc(inf.como_tomar||"")}</div></div>
    <div class="ib yw"><div class="ibl">Efectos secundarios</div><div class="ibt">${_esc(inf.efectos_secundarios||"")}</div></div>
    <div class="ib rd"><div class="ibl">Contraindicaciones</div><div class="ibt">${_esc(inf.contraindicaciones||"")}</div></div>
    <div class="ib yw"><div class="ibl">Interacciones</div><div class="ibt">${_esc(inf.interacciones_comunes||"")}</div></div>
    ${inf.advertencias?`<div class="ib rd"><div class="ibl">Advertencias</div><div class="ibt">${_esc(inf.advertencias)}</div></div>`:""}
  </div>`;
}

// MEDICATIONS
function toggleMedForm(){
  const form=document.getElementById("medAddForm");
  const ic=document.getElementById("medAddToggle");
  const on=form.classList.toggle("on");
  if(ic)ic.style.transform=on?"rotate(45deg)":"rotate(0deg)";
}
function addMed(){
  const name=document.getElementById("nn").value.trim();if(!name){toast("Escribe el nombre del medicamento");return;}
  const m={id:Date.now(),name,dose:document.getElementById("nd").value.trim(),freq:document.getElementById("nf").value,time:document.getElementById("nh").value,notes:document.getElementById("no2").value.trim(),active:true,color:["#00c8f0","#00e07a","#a855f7","#ffb830","#ff3a5c"][MEDS.length%5]};
  MEDS.push(m);saveMeds();rML();sAlarm(m);toast(t("medAdded")||"Medicamento agregado");
  document.getElementById("nn").value="";document.getElementById("nd").value="";document.getElementById("no2").value="";
  const form=document.getElementById("medAddForm");const ic=document.getElementById("medAddToggle");
  form.classList.remove("on");if(ic)ic.style.transform="rotate(0deg)";
}
function saveMeds(){localStorage.setItem("ms_meds",JSON.stringify(MEDS));}
function delMed(id){MEDS=MEDS.filter(m=>m.id!==id);if(ALM[id]){clearInterval(ALM[id]);delete ALM[id];}saveMeds();rML();rRL();toast(t("medDeleted")||"Eliminado");}
function rML(){
  const el=document.getElementById("ml");
  const hcMeds=(CR==="paciente"&&_patientHC?.medicacion?.length)?_patientHC.medicacion:[];
  const clrs=["#00c8f0","#00e07a","#a855f7","#ffb830","#ff8060"];
  let html="";
  if(hcMeds.length){
    html+=`<div style="margin-bottom:2px"><div style="font-size:.63rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--cy);padding:4px 0 8px;display:flex;align-items:center;gap:5px">🗂️ Historia clínica <span style="background:var(--cy-a);color:var(--cy);border-radius:8px;padding:1px 6px;font-size:.6rem;font-family:'JetBrains Mono',monospace">${hcMeds.length}</span></div>${hcMeds.map((m,i)=>`<div class="mi2" style="animation:fadeUp .3s ${i*.06}s both"><div class="mi2-bar" style="background:${clrs[i%clrs.length]}"></div><div class="mi2-body"><div class="mi2-name">💊 ${m}</div><div class="mi2-info" style="color:var(--cy);font-size:.68rem">Desde tu historia clínica</div></div><div class="mi2-actions"><span style="font-size:.58rem;padding:2px 7px;border-radius:8px;background:var(--cy-a);color:var(--cy);font-family:'JetBrains Mono',monospace;font-weight:700">HC</span></div></div>`).join("")}</div>`;
    if(MEDS.length)html+=`<div style="font-size:.63rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--mu);padding:10px 0 8px;border-top:1px solid var(--bd);margin-top:6px">Agregados por ti</div>`;
  }
  if(!hcMeds.length&&!MEDS.length){el.innerHTML=`<div class="empty"><div class="eic">💊</div><div class="etx">${t("noMeds")||"Sin medicamentos registrados."}</div></div>`;return;}
  el.innerHTML=html+MEDS.map(m=>`<div class="mi2"><div class="mi2-bar" style="background:${m.color}"></div><div class="mi2-body"><div class="mi2-name">💊 ${_esc(m.name)}</div><div class="mi2-info">${_esc(m.dose?m.dose+" · ":"")}${_esc(m.freq)} · ${_esc(m.time)}</div>${m.notes?`<div class="mi2-note">${_esc(m.notes)}</div>`:""}</div><div class="mi2-actions"><button class="tgl ${m.active?"on":""}" onclick="togR(${m.id},this)"></button><button class="mi2-del" onclick="delMed(${m.id})">🗑</button></div></div>`).join("");
}
function rRL(){
  const el=document.getElementById("rl");
  if(!MEDS.length){el.innerHTML=`<div class="empty"><div class="eic">⏰</div><div class="etx">${t("noReminders")||"Agrega medicamentos para ver recordatorios."}</div></div>`;return;}
  el.innerHTML=[...MEDS].sort((a,b)=>a.time.localeCompare(b.time)).map(m=>`<div class="ri2"><div class="ri2-time">${_esc(m.time)}</div><div class="ri2-dot" style="background:${m.color}"></div><div class="ri2-body"><div class="ri2-name">${_esc(m.name)}</div><div class="ri2-dose">${_esc(m.dose?m.dose+" · ":"")}${_esc(m.freq)}</div></div><button class="tgl ${m.active?"on":""}" onclick="togR(${m.id},this)"></button></div>`).join("");
}
function togR(id,btn){const m=MEDS.find(x=>x.id===id);if(!m)return;m.active=!m.active;btn.classList.toggle("on",m.active);saveMeds();if(m.active)sAlarm(m);else if(ALM[id]){clearInterval(ALM[id]);delete ALM[id];}toast(m.active?t("medActivated")||"Activado":t("medDeactivated")||"Desactivado");}
function sAlarm(m){if(ALM[m.id])clearInterval(ALM[m.id]);ALM[m.id]=setInterval(()=>{if(!m.active)return;const n=new Date();const[h,min]=m.time.split(":").map(Number);if(n.getHours()===h&&n.getMinutes()===min&&n.getSeconds()<5)showAlarm(m);},4000);}
function showAlarm(m){document.getElementById("at").textContent="💊 "+m.name;document.getElementById("as").textContent=`${m.dose?m.dose+" · ":""}${m.freq}${m.notes?" · "+m.notes:""}`;document.getElementById("ab").style.display="block";try{const ctx=new(window.AudioContext||window.webkitAudioContext)();const o=ctx.createOscillator();const g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=880;g.gain.setValueAtTime(.3,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.8);o.start();o.stop(ctx.currentTime+.8);}catch(e){}}
function dA(){document.getElementById("ab").style.display="none";}

// INTERACTIONS
let intDrugs=[];
function _applyPatientMedsToInteractions(){
  if(CR!=="paciente"||!_patientHC?.medicacion?.length)return;
  if(!intDrugs.length){intDrugs=[..._patientHC.medicacion];rIntTags();}
}
function addInt(){const v=document.getElementById("ii").value.trim();if(!v)return;if(intDrugs.includes(v)){toast("Ya esta en la lista");return;}intDrugs.push(v);document.getElementById("ii").value="";rIntTags();}
function remInt(n){if(typeof n==="number")n=intDrugs[n];intDrugs=intDrugs.filter(d=>d!==n);rIntTags();}
function rIntTags(){document.getElementById("itags").innerHTML=intDrugs.map((d,i)=>`<span class="tag">💊 ${_esc(d)}<span class="tagx" onclick="remInt(${i})">✕</span></span>`).join("");document.getElementById("chkint").disabled=intDrugs.length<2;}
async function checkInt(){
  if(intDrugs.length<2)return;
  document.getElementById("ir").innerHTML=`<div class="card"><div class="ldg"><div class="sp"></div>Verificando interacciones...</div></div>`;
  try{
    const _lr3=({es:'español',en:'English',pt:'português',fr:'français',de:'Deutsch',ja:'日本語'})[CL]||'español';
    const r=await _aiFetch({model:"deepseek-chat",max_tokens:700,messages:[{role:"user",content:`Interacciones entre: ${intDrugs.join(", ")}. Responde valores en ${_lr3}. SOLO JSON sin backticks:\n{"nivel_riesgo":"BAJO"|"MODERADO"|"ALTO"|"CONTRAINDICADO","resumen":"...","interacciones":[{"par":"...","descripcion":"...","severidad":"leve|moderada|grave"}],"recomendacion":"...","consultar_medico":true|false}`}]});
    const d=await r.json();const inf=JSON.parse(d.choices[0].message.content.replace(/```json|```/g,"").trim());
    const cm={BAJO:"gn",MODERADO:"yw",ALTO:"rd",CONTRAINDICADO:"rd"};const im={BAJO:"✅",MODERADO:"⚠️",ALTO:"🚨",CONTRAINDICADO:"⛔"};
    document.getElementById("ir").innerHTML=`<div class="card"><div class="ib ${cm[inf.nivel_riesgo]||"yw"}" style="margin-bottom:10px"><div class="ibl">${im[inf.nivel_riesgo]||"⚠️"} Riesgo: ${_esc(inf.nivel_riesgo)}</div><div class="ibt">${_esc(inf.resumen)}</div></div>${(inf.interacciones||[]).map(i=>`<div style="padding:8px 0;border-bottom:1px solid var(--bd)"><div style="font-weight:600;font-size:.8rem;margin-bottom:3px">💊 ${_esc(i.par)}</div><div style="font-size:.76rem;color:var(--mu)">${_esc(i.descripcion)}</div></div>`).join("")}<div class="ib cy" style="margin-top:9px"><div class="ibl">Recomendacion</div><div class="ibt">${_esc(inf.recomendacion)}</div></div>${inf.consultar_medico?`<div class="wnote" style="color:var(--rd);border-color:rgba(255,58,92,.2);background:var(--rd-a)">Consulta a tu medico antes de combinar estos medicamentos.</div>`:""}</div>`;
  }catch(e){document.getElementById("ir").innerHTML=`<div class="card"><div style="color:var(--rd);font-size:.83rem">Error al verificar.</div></div>`;}
}

// KEYBOARD SHORTCUTS
document.addEventListener("keypress",e=>{
  if(e.key==="Enter"){
    if(document.activeElement.id==="di")buscarDrug();
    if(document.activeElement.id==="ii")addInt();
    if(document.activeElement.id==="aEmail"||document.activeElement.id==="aPass")doAuth();
  }
});

