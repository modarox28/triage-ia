/**
 * MedAI Suite — Clinical Copilot (Layer 1: deterministic hints)
 * Stateless. Receives triage data object, returns hint sets per chief complaint.
 * @module src/clinical/copilot
 */

/**
 * Returns deterministic red-flags, questions, and protocol hints for the current triage.
 * @param {Object} TD - triage data object (motivo, vit, sint, consc, tipo, otraDesc)
 * @returns {{flags:string[],questions:string[],protocols:string[],urgency:string}|null}
 */
export function getCopilotHints(TD){
  const m=TD.motivo;
  if(!m)return null;
  const vt=TD.vit||{};
  const sint=TD.sint||[];
  const consc=TD.consc;
  const fc=parseFloat(vt.fc),ps=parseFloat(vt.ps),sat=parseFloat(vt.sat),fr=parseFloat(vt.fr),tem=parseFloat(vt.tem);
  const h={flags:[],questions:[],protocols:[],urgency:"medium"};
  if(m==="dolor_pecho"){
    h.flags=["Posible síndrome coronario agudo","Considerar disección aórtica si dolor desgarrante irradiado a espalda"];
    h.questions=["¿Irradia al brazo izquierdo, mandíbula o espalda?","¿Sudoración fría o náuseas?","¿Inicio súbito en reposo?","¿Historial de cardiopatía o stent previo?"];
    h.protocols=["ECG 12 derivaciones (< 10 min)","Troponinas I/T","Acceso venoso periférico","AAS 300mg si sospecha IAM"];
    h.urgency="high";
  }else if(m==="disnea"){
    h.flags=["Riesgo insuficiencia respiratoria aguda"];
    if(sat&&sat<92)h.flags.push("SpO₂ crítica — soporte ventilatorio urgente");
    h.questions=["¿Inicio súbito o progresivo?","¿Fiebre o tos productiva?","¿Historial de asma, EPOC o ICC?","¿Edema en miembros inferiores?"];
    h.protocols=["Saturometría continua","Rx tórax AP",sat&&sat<92?"Gasometría arterial urgente":"Gasometría si SpO₂ < 92%","O₂ según saturación"];
    h.urgency=sat&&sat<90?"high":"medium";
  }else if(m==="neuro"){
    h.flags=["Posible ACV — evaluar escala NIHSS","Descartar hipoglucemia (glucemia capilar urgente)"];
    if(tem&&tem>38.5)h.flags.push("Fiebre + síntoma neurológico: descartar meningitis/encefalitis");
    h.questions=["¿Déficit motor o sensitivo de inicio súbito?","¿Cefalea intensa de inicio brusco?","¿Fiebre o rigidez de nuca?","¿Duración del episodio?"];
    h.protocols=["Glucemia capilar inmediata","TAC craneal urgente","Vía venosa + analítica completa","Escala NIHSS si ACV sospechado"];
    h.urgency="high";
  }else if(m==="fiebre"){
    const qsCrit=(consc&&consc!=="alerta")||(fr&&fr>22)||(ps&&ps<=100);
    if(qsCrit){h.flags=["Criterios qSOFA presentes — evaluar sepsis urgente","Iniciar protocolo sepsis si ≥ 2 criterios"];h.urgency="high";}
    else{h.flags=["Investigar foco infeccioso","Descartar meningitis en fiebre + cefalea intensa"];}
    h.questions=["¿Foco identificado (urinario, respiratorio, cutáneo)?","¿Rigidez de nuca o fotofobia?","¿Inmunosupresión o quimioterapia reciente?","¿Viaje reciente a zona endémica?"];
    h.protocols=qsCrit?["Hemocultivos x2 antes de ATB","Lactato sérico","Antibiótico < 1h si sepsis","Hidratación IV si hipotensión"]:["Hemocultivos si fiebre sin foco","Analítica: PCR, leucocitos","Antipiréticos + hidratación"];
  }else if(m==="trauma"){
    h.flags=["Evaluar inestabilidad hemodinámica","Riesgo lesión columna cervical"];
    if(ps&&ps<90)h.flags.push("Hipotensión en trauma — shock hemorrágico probable");
    h.questions=["¿Mecanismo de alta energía (accidente vial, caída > 2m)?","¿Pérdida de consciencia?","¿Dolor cervical, torácico o abdominal?","¿Sangrado activo visible?"];
    h.protocols=["ABCDE sistemático","Inmovilización cervical si indicado","2 vías venosas gruesas","Rx columna cervical, tórax, pelvis si trauma severo"];
    h.urgency=ps&&ps<90?"high":"medium";
  }else if(m==="abdominal"){
    h.flags=["Considerar abdomen agudo quirúrgico"];
    if(TD.tipo==="embarazada")h.flags.push("Embarazada: descartar embarazo ectópico urgente");
    if(sint.includes("sangrado"))h.flags.push("Sangrado activo — potencialmente quirúrgico");
    h.questions=["¿Inicio súbito o gradual?","¿Signos peritoneales (rebote, defensa)?","¿Última menstruación?","¿Cirugías abdominales previas?"];
    h.protocols=["Analítica urgente: PCR, leucocitos, amilasa, lipasa","Ecografía abdominal","Dieta absoluta hasta valoración quirúrgica","Acceso venoso + analgesia IV"];
  }else if(m==="otro"){
    const conscAlt=consc&&consc!=="alerta";
    const desc=(TD.otraDesc||"").trim();
    if(conscAlt)h.flags.push("Alteración de consciencia — evaluación urgente");
    if(fc&&fc>100&&ps&&ps<90)h.flags.push("Taquicardia + hipotensión — posible shock");
    if(sint.includes("cianosis"))h.flags.push("Cianosis presente — descartar hipoxia");
    if(sint.includes("sangrado"))h.flags.push("Sangrado activo — determinar origen");
    if(!h.flags.length)h.flags=["Síntomas generales: monitorizar evolución","Confirmar signos vitales completos"];
    if(desc)h.flags.unshift(`Síntoma referido: "${desc.length>70?desc.slice(0,67)+"…":desc}"`);
    h.questions=["¿Cuándo comenzaron los síntomas y cómo han evolucionado?","¿Síntomas asociados: náuseas, fiebre, mareo?","¿Medicación habitual o alergias conocidas?","¿Enfermedades crónicas o cirugías previas?","¿Consultas de urgencias recientes?"];
    h.protocols=["Signos vitales completos","Analítica básica si ingreso probable","Anamnesis detallada","Vigilar signos de deterioro clínico"];
    h.urgency=conscAlt||(fc&&fc>100&&ps&&ps<90)?"high":sint.includes("cianosis")||sint.includes("sangrado")?"medium":"low";
  }
  return h.flags.length?h:null;
}

/**
 * Renders the copilot hint card as a DOM element (auto-expanded).
 * @param {{flags:string[],questions:string[],protocols:string[],urgency:string}} hints
 * @returns {HTMLElement}
 */
export function renderCopilotCard(hints){
  const urgColor={high:"var(--rd)",medium:"var(--yw)",low:"var(--gn)"}[hints.urgency]||"var(--cy)";
  const urgLabel={high:"Alta prioridad",medium:"Atención moderada",low:"Observación"}[hints.urgency]||"";
  const div=document.createElement("div");
  div.style.cssText="border:1.5px solid rgba(0,200,240,.3);border-radius:14px;padding:12px 14px;margin-top:8px;background:rgba(0,200,240,.04);animation:fadeUp .3s both";
  let expanded=true;
  const header=document.createElement("div");
  header.style.cssText="display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none";
  header.innerHTML=`<div style="display:flex;align-items:center;gap:8px"><span style="font-size:.82rem">🤖</span><span style="font-size:.76rem;font-weight:700;color:var(--cy)">Asistente clínico</span><span style="font-size:.58rem;padding:2px 7px;border-radius:20px;background:${urgColor}22;color:${urgColor};font-weight:700">${urgLabel}</span></div><span id="_cp_toggle" style="font-size:.62rem;color:var(--mu)">▾ Ocultar</span>`;
  const body=document.createElement("div");
  body.id="_cp_body";body.style.cssText="display:block;margin-top:10px";
  if(hints.flags.length){
    const fl=document.createElement("div");fl.style.cssText="margin-bottom:10px";
    fl.innerHTML=`<div style="font-size:.58rem;font-family:JetBrains Mono,monospace;color:var(--rd);letter-spacing:1px;margin-bottom:4px">⚠ RED FLAGS</div>${hints.flags.map(f=>`<div style="font-size:.74rem;color:var(--rd);margin-bottom:3px;font-weight:600">• ${f}</div>`).join("")}`;
    body.appendChild(fl);
  }
  if(hints.questions.length){
    const ql=document.createElement("div");ql.style.cssText="margin-bottom:10px";
    ql.innerHTML=`<div style="font-size:.58rem;font-family:JetBrains Mono,monospace;color:var(--cy);letter-spacing:1px;margin-bottom:4px">💡 PREGUNTAR AL PACIENTE</div>${hints.questions.map(q=>`<div style="font-size:.72rem;color:var(--tx);margin-bottom:3px">• ${q}</div>`).join("")}`;
    body.appendChild(ql);
  }
  if(hints.protocols.length){
    const pl=document.createElement("div");
    pl.innerHTML=`<div style="font-size:.58rem;font-family:JetBrains Mono,monospace;color:var(--gn);letter-spacing:1px;margin-bottom:6px">📋 ACCIONES RECOMENDADAS</div><div style="display:flex;flex-wrap:wrap;gap:4px">${hints.protocols.map(p=>`<span style="font-size:.66rem;padding:3px 8px;border-radius:20px;background:rgba(0,230,118,.1);border:1px solid rgba(0,230,118,.3);color:var(--gn)">${p}</span>`).join("")}</div>`;
    body.appendChild(pl);
  }
  div.appendChild(header);div.appendChild(body);
  header.onclick=()=>{expanded=!expanded;body.style.display=expanded?"block":"none";const tg=document.getElementById("_cp_toggle");if(tg)tg.textContent=expanded?"▾ Ocultar":"▸ Ver sugerencias";};
  return div;
}
