// 13-cola.js — Cola de pacientes
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden numérico desde index.html.
// ══════════════════════════════════════
// COLA DE PACIENTES
// ══════════════════════════════════════
let _colaData=[], _colaFilter="all", _colaInterval=null, _colaTimerInterval=null, _prevColaIds=new Set();
let _colaScoreCache=new Map(); // id -> {qs,n2,vitHash} — avoids recalculating on every render
let _presenceInterval=null,_presenceUnsub=null;
function _initPresence(){
  if(!FB||!CU)return;
  const ref=FB.doc(FB.db,"presence",CU.uid);
  FB.setDoc(ref,{name:uName(),role:CR||"medico",email:CU.email||"",online:true,lastSeen:FB.serverTimestamp()},{merge:true}).catch(()=>{});
  if(_presenceInterval)clearInterval(_presenceInterval);
  _presenceInterval=setInterval(()=>{if(FB&&CU)FB.setDoc(ref,{lastSeen:FB.serverTimestamp(),online:true},{merge:true}).catch(()=>{});},55000);
  if(_presenceUnsub)_presenceUnsub();
  const q=FB.query(FB.collection(FB.db,"presence"),FB.orderBy("lastSeen","desc"),FB.limit(25));
  _presenceUnsub=FB.onSnapshot(q,snap=>{
    const now=Date.now();
    const docs=snap.docs.map(d=>({id:d.id,...d.data()})).filter(d=>{
      if(!d.online)return false;
      if(d.id===CU?.uid)return false;
      const last=d.lastSeen?.toMillis?.()??0;
      return(now-last)<180000; // visible si activo en los últimos 3 min
    });
    _renderPresence(docs);
  },()=>{});
}
function _clearPresence(){
  if(_presenceInterval){clearInterval(_presenceInterval);_presenceInterval=null;}
  if(_presenceUnsub){_presenceUnsub();_presenceUnsub=null;}
  if(FB&&CU)FB.setDoc(FB.doc(FB.db,"presence",CU.uid),{online:false,lastSeen:FB.serverTimestamp()},{merge:true}).catch(()=>{});
}
function _renderPresence(docs){
  const bar=document.getElementById("presenceBar");if(!bar)return;
  if(!docs.length){bar.style.display="none";bar.innerHTML="";return;}
  const rl={admin:"Admin",admin_hosp:"Hosp",medico:"Médico",paciente:"Pac"};
  bar.style.display="flex";bar.className="presence-bar";
  bar.innerHTML=`<div style="font-size:.62rem;font-weight:700;color:var(--mu);text-transform:uppercase;letter-spacing:1px;width:100%;margin-bottom:2px">🟢 Conectados ahora (${docs.length})</div>${docs.map(d=>`<div class="presence-chip"><span class="pdot"></span>${d.name||d.email?.split("@")[0]||"Usuario"}<span style="font-size:.55rem;opacity:.65;margin-left:2px">${rl[d.role]||""}</span></div>`).join("")}`;
}


function _stopColaTimer(){
  if(_colaInterval){clearInterval(_colaInterval);_colaInterval=null;}
  if(_colaTimerInterval){clearInterval(_colaTimerInterval);_colaTimerInterval=null;}
  // Listener (_queueUnsub) intentionally kept alive — cola data stays fresh in background
}
function _stopColaListener(){
  _stopColaTimer();
  window._queueUnsub?.();window._queueUnsub=null;
}

function loadCola(){
  if(!FB||!CU)return;
  const listEl=document.getElementById("colaList");
  if(!listEl)return;
  // Fast path: listener already running → just re-render cached data and restart timer
  if(window._queueUnsub&&_colaData.length>=0&&_prevColaIds.size>=0){
    _renderCola();
    if(!_colaTimerInterval)_colaTimerInterval=setInterval(_renderColaTimers,60000);
    return;
  }
  listEl.innerHTML=`<div class="ldg"><div class="sp"></div>Cargando cola...</div>`;
  window._queueUnsub?.();window._queueUnsub=null;
  // Server-side 12h filter — Firestore returns only relevant docs (no client-side filtering)
  const since=new Date(Date.now()-12*60*60*1000);
  window._queueUnsub=subscribeTriageQueue(FB,since,(newData)=>{
    // Detect new critical patients — alert staff
    if(_prevColaIds.size>0){
      const newRojo=newData.filter(d=>d.clasificacion==="ROJO"&&!d.atendido&&!_prevColaIds.has(d.id));
      if(newRojo.length>0){
        navigator.vibrate?.([300,100,300,100,300]);
        const nb=document.getElementById("nb-cola");
        if(nb){nb.style.transform="scale(1.25)";setTimeout(()=>nb.style.transform="",600);}
      }
    }
    _prevColaIds=new Set(newData.map(d=>d.id));
    _colaData=newData;window._colaData=newData;
    // Full render only when cola tab is visible; else just update badge
    const colaTab=document.getElementById("sc-cola");
    if(colaTab&&colaTab.classList.contains("on")){
      _renderCola();
      if(_colaView==='board')_renderColaBoard();
    }else{_updateColaBadge(_colaData.filter(d=>!d.atendido).length);}
  },(e)=>{
    if(listEl)listEl.innerHTML=`<div class="card" style="color:var(--rd);font-size:.82rem">Error: ${e.message}</div>`;
  });
  if(_colaTimerInterval){clearInterval(_colaTimerInterval);_colaTimerInterval=null;}
  _colaTimerInterval=setInterval(_renderColaTimers,60000);
}

function setColaFilter(f,btn){
  _colaFilter=f;
  document.querySelectorAll("[data-cf]").forEach(b=>b.classList.remove("on"));
  if(btn)btn.classList.add("on");
  _renderCola();
}

// Queue drag-and-drop (local reorder only — does not persist to Firestore)
let _colaDragId=null;
function _colaDragStart(e,el){
  _colaDragId=el.dataset.id;
  e.dataTransfer.effectAllowed="move";
  setTimeout(()=>{if(el)el.style.opacity="0.35";},0);
}
function _colaDragOver(e){
  e.preventDefault();
  e.dataTransfer.dropEffect="move";
  const card=e.target.closest(".cola-card");
  if(card){document.querySelectorAll(".cola-card").forEach(c=>c.classList.remove("drag-over"));if(card.dataset.id!==_colaDragId)card.classList.add("drag-over");}
}
function _colaDrop(e,el){
  e.preventDefault();
  document.querySelectorAll(".cola-card").forEach(c=>c.classList.remove("drag-over"));
  const toId=el.dataset.id;
  if(!_colaDragId||_colaDragId===toId)return;
  const fromIdx=_colaData.findIndex(d=>d.id===_colaDragId);
  const toIdx=_colaData.findIndex(d=>d.id===toId);
  if(fromIdx<0||toIdx<0)return;
  if(_colaData[fromIdx].atendido!==_colaData[toIdx].atendido)return;
  const[item]=_colaData.splice(fromIdx,1);
  _colaData.splice(toIdx,0,item);
  _renderCola();
}
function _colaDragEnd(){
  _colaDragId=null;
  document.querySelectorAll(".cola-card").forEach(c=>{c.style.opacity="";c.classList.remove("drag-over");});
}

function _renderCola(){
  const listEl=document.getElementById("colaList");
  const statsEl=document.getElementById("colaStats");
  if(!listEl)return;

  const tx=L[CL]||L.es;
  const tM={adulto:t("adultLbl")||"Adulto",adulto_mayor:t("elderLbl")||"Ad. mayor",embarazada:t("pregLbl")||"Embarazada",nino:t("childLbl")||"Pediatrico",adolescente:t("teenLbl")||"Adolescente"};
  const mM={dolor_pecho:"💔 Dolor pecho",disnea:"🫁 Disnea",trauma:"🤕 Trauma",abdominal:"🤢 Abdominal",neuro:"🧠 Neurologico",fiebre:"🌡️ Fiebre",otro:"❓ Otro"};
  const icM={ROJO:"🔴",AMARILLO:"🟡",VERDE:"🟢"};
  const ccM={ROJO:"ro",AMARILLO:"am",VERDE:"ve"};
  const priorityOrder={ROJO:0,AMARILLO:1,VERDE:2};

  // Estadísticas
  const pending=_colaData.filter(d=>!d.atendido);
  const done=_colaData.filter(d=>d.atendido);
  const ro=pending.filter(d=>d.clasificacion==="ROJO").length;
  const am=pending.filter(d=>d.clasificacion==="AMARILLO").length;
  const ve=pending.filter(d=>d.clasificacion==="VERDE").length;

  if(statsEl){
    statsEl.innerHTML=`
      <div class="cola-stat"><span class="cola-stat-n total">${_colaData.length}</span><span class="cola-stat-l">${tx.colaShift||"en turno"}</span></div>
      <div class="cola-stat"><span class="cola-stat-n ro">${ro}</span><span class="cola-stat-l">🔴 ${tx.colaPending||"Pendientes"}</span></div>
      <div class="cola-stat"><span class="cola-stat-n am">${am}</span><span class="cola-stat-l">🟡 ${tx.colaPending||"Pendientes"}</span></div>
      <div class="cola-stat"><span class="cola-stat-n ve">${ve}</span><span class="cola-stat-l">🟢 ${tx.colaPending||"Pendientes"}</span></div>`;
  }

  // Filtrar
  let filtered=_colaData;
  if(_colaFilter==="pending")filtered=pending;
  else if(_colaFilter==="done")filtered=done;

  // Ordenar: pendientes por urgencia+tiempo, atendidos al fondo por hora desc
  filtered=[...filtered].sort((a,b)=>{
    if(a.atendido!==b.atendido)return a.atendido?1:-1;
    if(!a.atendido){
      const pd=(priorityOrder[a.clasificacion]??3)-(priorityOrder[b.clasificacion]??3);
      if(pd!==0)return pd;
      const ta=a.createdAt?.toDate?.()??new Date(0);
      const tb=b.createdAt?.toDate?.()??new Date(0);
      return ta-tb; // más antiguo primero
    }
    const ta=a.createdAt?.toDate?.()??new Date(0);
    const tb=b.createdAt?.toDate?.()??new Date(0);
    return tb-ta;
  });

  // Banner de alerta crítica para ROJO vencidos
  const overdueRojo=pending.filter(d=>{
    if(d.clasificacion!=="ROJO")return false;
    const ts=d.createdAt?.toDate?.()??new Date(0);
    return Math.floor((Date.now()-ts.getTime())/60000)>COLA_DEADLINE.ROJO;
  });
  const bannerHtml=overdueRojo.length?`<div style="background:var(--rd-a);border:1.5px solid rgba(255,58,92,.45);border-radius:12px;padding:10px 14px;margin-bottom:10px;animation:critBlink 1.2s ease-in-out infinite;display:flex;align-items:center;gap:10px">
    <span style="font-size:1.3rem;flex-shrink:0">🚨</span>
    <div><div style="font-family:'JetBrains Mono',monospace;font-size:.58rem;color:var(--rd);font-weight:700;letter-spacing:1.5px;margin-bottom:2px">ALERTA CRÍTICA</div>
    <div style="font-size:.8rem;color:var(--rd);font-weight:600">${overdueRojo.length} paciente${overdueRojo.length>1?"s":""} ROJO vencido${overdueRojo.length>1?"s":""} — Atención inmediata requerida</div></div>
  </div>`:"";

  if(!filtered.length){
    listEl.innerHTML=bannerHtml+`<div class="cola-empty"><div class="cola-empty-ic">✅</div><div class="cola-empty-tx">${tx.colaEmpty||"Sin pacientes pendientes"}</div></div>`;
    return;
  }

  listEl.innerHTML=bannerHtml+filtered.map((d,_qi)=>{
    const cc=ccM[d.clasificacion]||"ve";
    const ic=icM[d.clasificacion]||"⚪";
    const ts=d.createdAt?.toDate?.()??new Date(0);
    const elapsedMs=Date.now()-ts.getTime();
    const elapsedMin=Math.floor(elapsedMs/60000);
    const deadlineMin=COLA_DEADLINE[d.clasificacion]??30;
    const remainMin=deadlineMin-elapsedMin;
    const isDone=!!d.atendido;
    const patNum=_qi+1;
    const isNew=elapsedMs<120000&&!isDone; // < 2 min

    let dlClass="ok",dlLabel="";
    if(!isDone){
      if(remainMin<0){dlClass="over";dlLabel=`${tx.colaOverdue||"VENCIDO"} +${Math.abs(remainMin)}min`;}
      else if(remainMin<=Math.round(deadlineMin*0.3)){dlClass="warn";dlLabel=`${remainMin}min ${tx.colaRemaining||"restantes"}`;}
      else{dlClass="ok";dlLabel=`${remainMin}min ${tx.colaRemaining||"restantes"}`;}
    }
    const elapsedLabel=elapsedMin<1?"Ahora":`${tx.colaAgo||"hace"} ${elapsedMin}min`;

    // Vitales resumidos (solo si existen)
    const vit=d.vit||{};
    const vitParts=[vit.ps?`PA ${vit.ps}/${vit.pd||"?"}`:null,vit.fc?`FC ${vit.fc}`:null,vit.sat?`SpO₂ ${vit.sat}%`:null,vit.fr?`FR ${vit.fr}rpm`:null].filter(Boolean);
    const vitLine=vitParts.length?`<div style="font-size:.65rem;color:var(--mu);margin-top:3px;font-family:'JetBrains Mono',monospace;line-height:1.4">${vitParts.join(" · ")}</div>`:"";

    // Clinical scores — cached per patient + vitals hash to avoid recalculating on every render
    const _vh=[vit.ps,vit.fc,vit.sat,vit.fr,vit.tem,d.consc].join("|");
    let _sc=_colaScoreCache.get(d.id);
    if(!_sc||_sc.h!==_vh){
      const qs=(vit.ps||vit.fr)?calcQSOFA({sys:parseFloat(vit.ps),rr:parseFloat(vit.fr)},d.consc):null;
      const n2=vitParts.length?calcNEWS2({sys:parseFloat(vit.ps),rr:parseFloat(vit.fr),spo2:parseFloat(vit.sat),hr:parseFloat(vit.fc),temp:parseFloat(vit.tem)},d.consc):null;
      _sc={qs,n2,h:_vh};_colaScoreCache.set(d.id,_sc);
    }
    const {qs,n2}=_sc;
    const qsBadge=qs?.risk==="high"?`<span style="font-size:.6rem;font-family:'JetBrains Mono',monospace;background:var(--rd-a);color:var(--rd);border-radius:6px;padding:1px 6px;margin-left:5px;font-weight:700">qSOFA 2+</span>`:"";
    const n2Badge=n2?.risk==="high"?`<span style="font-size:.6rem;font-family:'JetBrains Mono',monospace;background:var(--yw-a);color:var(--yw);border-radius:6px;padding:1px 6px;margin-left:5px;font-weight:700">NEWS2 ${n2.score}</span>`:"";

    const byLine=d.userName?`<div class="cola-by">por ${d.userName}</div>`:"";
    const atendidoAt=d.atendidoAt?.toDate?.();
    const doneLabel=atendidoAt?`<div class="cola-done-lbl">✓ ${String(atendidoAt.getHours()).padStart(2,"0")}:${String(atendidoAt.getMinutes()).padStart(2,"0")}</div>`:`<div class="cola-done-lbl">✓ ${tx.colaAttended||"Atendido"}</div>`;

    return `<div class="cola-card${isDone?" done":""}${dlClass==="over"&&!isDone?" vencido":""}" id="colacard-${d.id}" data-id="${d.id}" draggable="${!isDone}" ondragstart="_colaDragStart(event,this)" ondragover="_colaDragOver(event)" ondrop="_colaDrop(event,this)" ondragend="_colaDragEnd()" style="${isNew?"animation:fadeUp .4s both":""}">
      <div class="cola-bar2 ${cc}"></div>
      <div class="cola-body">
        <div class="cola-top">
          <span class="cola-num">#${patNum}</span>
          <span>${ic}</span>
          <span class="cola-class ${cc}">${d.clasificacion}</span>
          ${isNew?`<span style="font-size:.58rem;font-family:'JetBrains Mono',monospace;background:var(--cy-a);color:var(--cy);border-radius:6px;padding:1px 7px;margin-left:4px;font-weight:700">NUEVO</span>`:""}
          ${qsBadge}${n2Badge}
        </div>
        <div class="cola-pt">${tM[d.tipo]||d.tipo||"—"}</div>
        <div class="cola-mot">${mM[d.motivo]||d.motivo||"—"}</div>
        ${vitLine}
        <div class="cola-times">
          <span class="cola-elapsed" id="elapsed-${d.id}">${elapsedLabel}</span>
          ${!isDone?`<span class="cola-dlchip ${dlClass}" id="dlchip-${d.id}">${dlLabel}</span>`:""}
        </div>
        ${byLine}
      </div>
      <div class="cola-actions">
        ${isDone
          ? doneLabel+`<button class="cola-btn done-btn" onclick="markCola('${d.id}',false)">${tx.colaUndone||"Pendiente"}</button>`
          : `<button class="cola-btn" onclick="markCola('${d.id}',true)">${tx.colaMarkDone||"Atendido"}</button>`
        }
        ${(CR==='medico'||CR==='admin'||CR==='admin_hosp')&&!isDone?`<button class="cola-btn" style="background:rgba(0,200,240,.12);color:var(--cy);border-color:rgba(0,200,240,.3);font-size:.7rem;padding:5px 9px" onclick="event.stopPropagation();_openOverrideModal('${d.id}','${d.clasificacion}')">✏️ Revisar</button>`:''}
      </div>
    </div>`;
  }).join("");

  // Badge de pendientes en el botón nav
  _updateColaBadge(pending.length);
}

function _renderColaTimers(){
  const tx=L[CL]||L.es;
  _colaData.filter(d=>!d.atendido).forEach(d=>{
    const ts=d.createdAt?.toDate?.()??new Date(0);
    const elapsedMin=Math.floor((Date.now()-ts.getTime())/60000);
    const deadlineMin=COLA_DEADLINE[d.clasificacion]??30;
    const remainMin=deadlineMin-elapsedMin;
    const eEl=document.getElementById("elapsed-"+d.id);
    const dEl=document.getElementById("dlchip-"+d.id);
    if(eEl)eEl.textContent=elapsedMin<1?"Ahora":`${tx.colaAgo||"hace"} ${elapsedMin}min`;
    if(dEl){
      if(remainMin<0){dEl.className="cola-dlchip over";dEl.textContent=`${tx.colaOverdue||"VENCIDO"} +${Math.abs(remainMin)}${tx.colaMin||"min"}`;}
      else if(remainMin<=Math.round(deadlineMin*0.3)){dEl.className="cola-dlchip warn";dEl.textContent=`${remainMin}${tx.colaMin||"min"} ${tx.colaRemaining||"restantes"}`;}
      else{dEl.className="cola-dlchip ok";dEl.textContent=`${remainMin}${tx.colaMin||"min"} ${tx.colaRemaining||"restantes"}`;}
      // Si vence, añadir clase al card
      const card=document.getElementById("colacard-"+d.id);
      if(card)card.classList.toggle("vencido",remainMin<0);
    }
  });
}

function _updateColaBadge(count){
  const btn=document.getElementById("nb-cola");
  if(!btn)return;
  const existing=btn.querySelector(".cola-badge");
  if(existing)existing.remove();
  if(count>0){
    const badge=document.createElement("span");
    badge.className="cola-badge";
    badge.style.cssText="position:absolute;top:4px;right:4px;background:var(--rd);color:#fff;border-radius:50%;width:16px;height:16px;font-size:.55rem;font-family:JetBrains Mono,monospace;font-weight:700;display:flex;align-items:center;justify-content:center;";
    badge.textContent=count>9?"9+":count;
    btn.style.position="relative";
    btn.appendChild(badge);
  }
}

async function markCola(id,done){
  if(!FB||!CU)return;
  const card=document.getElementById("colacard-"+id);
  if(card)card.style.opacity="0.5";
  try{
    await updateTriageAttended(FB,id,done,uName());
    const idx=_colaData.findIndex(d=>d.id===id);
    if(idx>=0){
      _colaData[idx].atendido=done;
      _colaData[idx].atendidoAt=done?{toDate:()=>new Date()}:null;
    }
    logAudit("queue_status_changed",{patientId:id,done});
    _renderCola();
    toast(done?t("colaAttended")||"Paciente atendido":"Marcado como pendiente");
  }catch(e){
    if(card)card.style.opacity="";
    toast("Error: "+e.message);
  }
}

