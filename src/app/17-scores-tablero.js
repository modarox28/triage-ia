// 17-scores-tablero.js — Scores clínicos, tablero kanban y override médico
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden numérico desde index.html.
// ══════════════════════════════════════
// SCORES CLÍNICOS
// ══════════════════════════════════════
function _initScoresTab(){
  ['heart','rosier','wells','esi'].forEach(id=>{
    const form=document.getElementById(id+'-form');
    const arrow=document.getElementById(id+'-arrow');
    if(form){form.style.display='block';if(arrow)arrow.style.transform='rotate(180deg)';}
  });
}

function _toggleScoreCard(id){
  const form=document.getElementById(id+'-form');
  const arrow=document.getElementById(id+'-arrow');
  if(!form)return;
  const open=form.style.display!=='none';
  form.style.display=open?'none':'block';
  if(arrow)arrow.style.transform=open?'rotate(0deg)':'rotate(180deg)';
}

function _scoreResultHTML(score,label,color,action,details){
  const detailList=details?.length?`<ul style="margin:6px 0 0 14px;padding:0;font-size:.74rem;color:var(--mu);line-height:1.6">${details.map(d=>`<li>${d}</li>`).join('')}</ul>`:'';
  return`<div style="background:var(--bg2);border:2px solid ${color};border-radius:12px;padding:14px 16px;animation:fadeUp .25s ease">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <div style="font-size:1.6rem;font-weight:900;color:${color}">${score}</div>
      <div><div style="font-weight:700;font-size:.85rem;color:${color}">${label}</div>${action?`<div style="font-size:.73rem;color:var(--mu);margin-top:2px">→ ${action}</div>`:''}</div>
    </div>
    ${detailList}
  </div>`;
}

function _calcHeartScore(){
  const getRadio=name=>{const el=document.querySelector(`input[name="${name}"]:checked`);return el?parseInt(el.value):0;};
  const cb=id=>!!document.getElementById(id)?.checked;
  const age=parseInt(document.getElementById('heart_age')?.value||'0');
  const aterosc=cb('heart_r_ateroscl');
  const rCount=['heart_r_hta','heart_r_dm','heart_r_tab','heart_r_lip','heart_r_fam','heart_r_obes'].filter(id=>cb(id)).length;
  const rScore=aterosc||rCount>=3?2:rCount>=1?1:0;
  const badge=document.getElementById('heart-r-badge');
  if(badge){
    const txt=rScore===2?(aterosc?'Ateroesclerosis conocida':'≥ 3 factores de riesgo')+' — puntuación R: 2':rScore===1?`${rCount} factor${rCount>1?'es':''} de riesgo — puntuación R: 1`:'Sin factores de riesgo — puntuación R: 0';
    badge.textContent=txt;
    badge.style.color=rScore===2?'var(--rd)':rScore===1?'var(--yw)':'var(--mu)';
  }
  const result=calcHEART({history:getRadio('heart_h'),ecg:getRadio('heart_e'),age,risk:rScore,troponin:getRadio('heart_t')});
  const div=document.getElementById('heart-result');
  if(!div)return;
  div.style.display='block';
  div.innerHTML=_scoreResultHTML(result.score+'/10',result.label,result.color,result.action,result.details);
}

function _calcROSIERScore(){
  const cb=id=>!!document.getElementById(id)?.checked;
  const result=calcROSIER({syncope:cb('rosier_syncope'),seizure:cb('rosier_seizure'),face_weakness:cb('rosier_face'),arm_weakness:cb('rosier_arm'),leg_weakness:cb('rosier_leg'),speech_disturbance:cb('rosier_speech'),visual_field:cb('rosier_visual')});
  const div=document.getElementById('rosier-result');
  if(!div)return;
  div.style.display='block';
  const strokeBanner=result.strokeLikely?`<div style="background:rgba(255,60,60,.12);border-left:3px solid var(--rd);padding:8px 12px;border-radius:0 8px 8px 0;font-size:.8rem;font-weight:700;color:var(--rd);margin-top:8px">⚠️ ACV PROBABLE — Activar protocolo CÓDIGO ICTUS</div>`:`<div style="background:rgba(0,200,80,.08);border-left:3px solid var(--gn);padding:8px 12px;border-radius:0 8px 8px 0;font-size:.8rem;color:var(--gn);margin-top:8px">ACV poco probable en este momento</div>`;
  div.innerHTML=_scoreResultHTML(result.score+'/5',result.label,result.color,result.action,result.details)+strokeBanner;
}

function _calcWellsScore(){
  const cb=id=>!!document.getElementById(id)?.checked;
  const result=calcWellsDVT({cancer:cb('wells_cancer'),paralysis:cb('wells_paralysis'),bedridden:cb('wells_bedridden'),tenderness:cb('wells_tenderness'),leg_swollen:cb('wells_swollen'),calf_diff:cb('wells_calf'),pitting:cb('wells_pitting'),collateral:cb('wells_collateral'),previous_dvt:cb('wells_prev'),alt_diagnosis:cb('wells_alt')});
  const div=document.getElementById('wells-result');
  if(!div)return;
  div.style.display='block';
  div.innerHTML=_scoreResultHTML(result.score+' pts',result.label,result.color,'Eco-Doppler venoso según clínica',[]);
}

let _esiSelected=null;
function _setESI(level){
  _esiSelected=level;
  document.querySelectorAll('.esi-opt').forEach(el=>{
    const isSelected=parseInt(el.dataset.esi)===level;
    el.style.opacity=isSelected?'1':'0.45';
    el.style.transform=isSelected?'scale(1.02)':'scale(1)';
  });
  const labels={1:{label:"NIVEL 1 — Atención INMEDIATA",color:"var(--rd)",action:"Sala de reanimación — Personal a bedside ahora"},2:{label:"NIVEL 2 — Atención EMERGENTE",color:"#ff7800",action:"Evaluación médica en < 15 min"},3:{label:"NIVEL 3 — URGENTE (múltiples recursos)",color:"var(--yw)",action:"Sala de espera — evaluación en < 30 min"},4:{label:"NIVEL 4 — MENOS URGENTE",color:"var(--gn)",action:"Sala de espera — evaluación en < 60 min"},5:{label:"NIVEL 5 — NO URGENTE",color:"var(--cy)",action:"Sala de espera — evaluación en < 120 min"}};
  const info=labels[level];
  const div=document.getElementById('esi-result');
  if(!div||!info)return;
  div.style.display='block';
  div.innerHTML=_scoreResultHTML(`ESI ${level}`,info.label,info.color,info.action,[]);
}

// ══════════════════════════════════════
// TABLERO VISUAL (KANBAN BOARD) — Cola
// ══════════════════════════════════════
let _colaView='list';
function _setColaView(mode){
  _colaView=mode;
  const list=document.getElementById('colaList');
  const board=document.getElementById('colaBoard');
  const btnList=document.getElementById('colaViewList');
  const btnBoard=document.getElementById('colaViewBoard');
  if(mode==='board'){
    if(list)list.style.display='none';
    if(board)board.style.display='block';
    if(btnList)btnList.style.opacity='0.5';
    if(btnBoard)btnBoard.style.opacity='1';
    _renderColaBoard();
  }else{
    if(list)list.style.display='block';
    if(board)board.style.display='none';
    if(btnList)btnList.style.opacity='1';
    if(btnBoard)btnBoard.style.opacity='0.5';
  }
}

function _renderColaBoard(){
  const board=document.getElementById('colaBoard');
  if(!board)return;
  const data=window._colaData||[];
  const cols={ROJO:[],AMARILLO:[],VERDE:[],ATENDIDO:[]};
  data.forEach(d=>{
    if(d.atendido)cols.ATENDIDO.push(d);
    else cols[d.clasificacion]?.push(d)||cols.VERDE.push(d);
  });
  const colCfg=[
    {key:'ROJO',label:'🔴 Críticos',bg:'rgba(255,60,60,.08)',bd:'rgba(255,60,60,.3)',tc:'var(--rd)'},
    {key:'AMARILLO',label:'🟡 Urgentes',bg:'rgba(255,200,50,.08)',bd:'rgba(255,200,50,.3)',tc:'var(--yw)'},
    {key:'VERDE',label:'🟢 Estables',bg:'rgba(0,200,80,.08)',bd:'rgba(0,200,80,.3)',tc:'var(--gn)'},
    {key:'ATENDIDO',label:'✅ Atendidos',bg:'rgba(100,120,150,.08)',bd:'rgba(100,120,150,.3)',tc:'var(--mu)'},
  ];
  // Assign display numbers before rendering
  let n=1;data.filter(d=>!d.atendido).forEach(d=>d._boardN=n++);
  board.innerHTML=`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
    ${colCfg.map(col=>`
      <div style="background:${col.bg};border:1px solid ${col.bd};border-radius:14px;padding:10px">
        <div style="font-size:.72rem;font-weight:700;color:${col.tc};margin-bottom:8px;letter-spacing:.5px">${col.label} <span style="opacity:.7">(${cols[col.key].length})</span></div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${cols[col.key].length===0?`<div style="font-size:.72rem;color:var(--mu);text-align:center;padding:10px 0">—</div>`:''}
          ${cols[col.key].map(d=>{
            const motIc={dolor_pecho:'💔',disnea:'🫁',trauma:'🤕',abdominal:'🤢',neuro:'🧠',fiebre:'🌡️',otro:'📋'}[d.motivo]||'📋';
            const now=Date.now();const created=d.createdAt?.toDate?.()?.getTime()||d.createdAt?.seconds*1000||now;const mins=Math.floor((now-created)/60000);
            const name=d.pacienteNombre||`#${d._boardN||'?'}`;
            return`<div style="background:var(--bg2);border-radius:9px;padding:8px 10px;font-size:.75rem;cursor:pointer;border:1px solid var(--bd)" onclick="navigateTo('cola')">
              <div style="font-weight:700;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${motIc} ${_esc(name)}</div>
              <div style="color:var(--mu);font-size:.68rem">${mins}m · ${_esc(_tipoLabel(d.tipo))}${d.esMCI?' · MCI':''}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`).join('')}
  </div>`;
}

// ══════════════════════════════════════
// OVERRIDE MÉDICO — Cola
// ══════════════════════════════════════
let _overrideTargetId=null,_overrideOriginal=null;
function _openOverrideModal(id,currentClasif){
  _overrideTargetId=id;_overrideOriginal=currentClasif||null;
  let modal=document.getElementById('overrideModal');
  if(!modal){
    modal=document.createElement('div');
    modal.id='overrideModal';
    modal.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px)';
    modal.innerHTML=`<div style="background:var(--bg2);border:1px solid var(--bd);border-radius:18px;padding:22px 20px;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5);animation:bounceIn .3s ease">
      <div style="font-weight:700;font-size:.95rem;margin-bottom:14px">✏️ Revisar clasificación</div>
      <div style="font-size:.75rem;color:var(--mu);margin-bottom:10px">Nueva clasificación:</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px">
        <button onclick="_selectOverrideClasif('ROJO',this)" class="hist-flt" style="color:var(--rd);padding:8px 4px;font-size:.78rem">🔴 Crítico</button>
        <button onclick="_selectOverrideClasif('AMARILLO',this)" class="hist-flt" style="color:var(--yw);padding:8px 4px;font-size:.78rem">🟡 Urgente</button>
        <button onclick="_selectOverrideClasif('VERDE',this)" class="hist-flt" style="color:var(--gn);padding:8px 4px;font-size:.78rem">🟢 Estable</button>
      </div>
      <div style="font-size:.75rem;color:var(--mu);margin-bottom:6px">Razón clínica (requerida):</div>
      <textarea id="overrideReason" class="fi" style="height:72px;resize:none;font-size:.8rem" placeholder="Ej: Signos vitales estabilizados tras intervención..."></textarea>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="bsec" style="flex:1" onclick="document.getElementById('overrideModal').style.display='none'">Cancelar</button>
        <button class="bpri" style="flex:1" id="overrideConfirmBtn" onclick="_confirmOverride()">Confirmar</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('overrideReason').value='';
  document.querySelectorAll('#overrideModal .hist-flt').forEach(b=>b.classList.remove('on'));
  modal._selectedClasif=currentClasif||null;
  modal.style.display='flex';
}

function _selectOverrideClasif(cl,btn){
  document.querySelectorAll('#overrideModal .hist-flt').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('overrideModal')._selectedClasif=cl;
}

async function _confirmOverride(){
  const modal=document.getElementById('overrideModal');
  const cl=modal._selectedClasif;
  const reason=document.getElementById('overrideReason')?.value.trim();
  if(!cl){toast('Selecciona una clasificación');return;}
  if(!reason){toast('La razón clínica es requerida');return;}
  if(!FB||!CU||!_overrideTargetId){toast('Sin sesión activa');return;}
  try{
    await FB.updateDoc(FB.doc(FB.db,'triages',_overrideTargetId),{
      clasificacion:cl,
      overridePor:uName(),
      overrideRazon:reason,
      overrideAt:FB.serverTimestamp(),
      overrideOriginal:_overrideOriginal,
      ...(FB.arrayUnion?{cambios:FB.arrayUnion(_cambioTriage("reclasificado",{de:_overrideOriginal||"",a:cl,razon:reason.slice(0,300)}))}:{})
    });
    logAudit('triage_override',{id:_overrideTargetId,nuevaClasif:cl,razon:reason});
    modal.style.display='none';
    toast('Clasificación actualizada ✓');
  }catch(e){toast('Error: '+e.message);}
}
