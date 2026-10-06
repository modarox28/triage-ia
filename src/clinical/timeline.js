/**
 * MedIA Suite — Clinical Timeline Builder (P5)
 * Generates a triage session event log from scored data.
 * Depends on checkCriticalVitals from engine.js.
 * @module src/clinical/timeline
 */
import{checkCriticalVitals}from"./engine.js";

/**
 * Returns an HTML string representing the triage timeline card.
 * @param {Object} TD - triage data object (vit, clasificacion via res)
 * @param {number} triageStartTime - epoch ms when triage started
 * @param {Object|null} qsofa - result from calcQSOFA
 * @param {Object|null} news2  - result from calcNEWS2
 * @param {Object|null} si     - result from calcShockIndex
 * @param {Object} res         - triage result ({clasificacion})
 * @param {number|null} elapsed - seconds elapsed (null = use Date.now())
 * @returns {string} HTML string or empty string if insufficient data
 */
export function buildTriageTimeline(TD,triageStartTime,qsofa,news2,si,res,elapsed){
  if(!triageStartTime)return"";
  const vt=TD.vit||{};
  const hasVit=vt.ps||vt.fc||vt.sat||vt.tem||vt.fr;
  const critAlerts=checkCriticalVitals({sys:parseFloat(vt.ps),hr:parseFloat(vt.fc),spo2:parseFloat(vt.sat),rr:parseFloat(vt.fr),temp:parseFloat(vt.tem)});
  const crits=critAlerts.filter(a=>!a.warn);
  const warns=critAlerts.filter(a=>a.warn);
  const hasAlerts=crits.length||warns.length||(qsofa&&qsofa.risk==="high")||(news2&&news2.risk!=="low")||(si&&si.risk!=="normal");
  if(!hasVit&&!hasAlerts)return"";
  const fmtT=ms=>{const d=new Date(ms);return`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;};
  const dot="···";
  const endMs=elapsed!=null?triageStartTime+elapsed*1000:Date.now();
  const classIcon={ROJO:"🔴",AMARILLO:"🟡",VERDE:"🟢"}[res.clasificacion]||"⚪";
  const classLabel={ROJO:"ATENCIÓN INMEDIATA",AMARILLO:"URGENTE",VERDE:"PUEDE ESPERAR"}[res.clasificacion]||"";
  const evts=[];
  evts.push({t:fmtT(triageStartTime),ic:"🏥",txt:"Triage iniciado",sub:null,lv:"normal"});
  if(hasVit){
    const parts=[vt.ps?`PA ${vt.ps}/${vt.pd||"?"}`:null,vt.fc?`FC ${vt.fc} lpm`:null,vt.sat?`SpO₂ ${vt.sat}%`:null,vt.tem?`${vt.tem}°C`:null,vt.fr?`FR ${vt.fr} rpm`:null].filter(Boolean);
    evts.push({t:dot,ic:"📊",txt:"Signos vitales",sub:parts.join(" · "),lv:"normal"});
  }
  if(crits.length)evts.push({t:dot,ic:"🚨",txt:crits.length===1?"Alerta crítica":`${crits.length} alertas críticas`,sub:crits.map(a=>a.msg).join(" · "),lv:"critical"});
  else if(warns.length)evts.push({t:dot,ic:"⚠",txt:warns.map(a=>a.msg).join(" · "),sub:null,lv:"warning"});
  if(qsofa&&qsofa.risk==="high")evts.push({t:dot,ic:"⚠",txt:`qSOFA ${qsofa.score}/3 — Posible sepsis`,sub:qsofa.details.length?qsofa.details.join(" · "):null,lv:"critical"});
  if(news2&&news2.risk==="high")evts.push({t:dot,ic:"🚨",txt:`NEWS2 ${news2.score} — Respuesta de emergencia`,sub:null,lv:"critical"});
  else if(news2&&news2.risk==="medium")evts.push({t:dot,ic:"⚠",txt:`NEWS2 ${news2.score} — Respuesta urgente`,sub:null,lv:"warning"});
  if(si&&si.risk==="severe")evts.push({t:dot,ic:"⚡",txt:`Shock Index ${si.idx} — Riesgo severo`,sub:null,lv:"critical"});
  else if(si&&si.risk==="moderate")evts.push({t:dot,ic:"⚡",txt:`Shock Index ${si.idx} — Hipoperfusión`,sub:null,lv:"warning"});
  evts.push({t:fmtT(endMs),ic:classIcon,txt:`${res.clasificacion} — ${classLabel}`,sub:null,lv:res.clasificacion==="ROJO"?"critical":res.clasificacion==="AMARILLO"?"warning":"normal"});
  if(elapsed!=null){const m=Math.floor(elapsed/60),s=elapsed%60;evts.push({t:dot,ic:"⏱",txt:`Duración total: ${m}m ${String(s).padStart(2,"0")}s`,sub:null,lv:"normal"});}
  const cM={critical:"var(--rd)",warning:"var(--yw)",normal:"var(--tx)"};
  const dM={critical:"var(--rd)",warning:"var(--yw)",normal:"var(--bd)"};
  const rows=evts.map(ev=>`<div style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-bottom:1px solid var(--bd)">
    <div style="font-family:JetBrains Mono,monospace;font-size:.58rem;color:var(--mu);flex-shrink:0;width:28px;padding-top:3px;text-align:right">${ev.t}</div>
    <div style="width:5px;height:5px;border-radius:50%;background:${dM[ev.lv]};flex-shrink:0;margin-top:6px;box-shadow:0 0 4px ${dM[ev.lv]}99"></div>
    <div style="flex:1;min-width:0">
      <div style="font-size:.77rem;color:${cM[ev.lv]};font-weight:${ev.lv==="normal"?"400":"600"}">${ev.ic} ${ev.txt}</div>
      ${ev.sub?`<div style="font-size:.66rem;color:var(--mu);margin-top:2px;line-height:1.4">${ev.sub}</div>`:""}
    </div></div>`).join("");
  return`<div class="card"><div class="clabel">Línea de tiempo clínica</div>${rows}</div>`;
}
