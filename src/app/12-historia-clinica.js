// 12-historia-clinica.js — Historia clínica y exportación a PDF
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden numérico desde index.html.
// ══════════════════════════════════════
// HISTORIA CLINICA
// ══════════════════════════════════════
let hcAnts=[], hcAlers=[], hcMedActs=[], hcPhoto=null;
let _hcUnsub=null, _hcCache={}, _hcRecentIds=[]; // {docId: docData} — avoids re-fetching on every tab visit

function toggleAnt(val,btn){
  if(hcAnts.includes(val)){
    hcAnts=hcAnts.filter(x=>x!==val);
    if(btn)btn.classList.remove('sel');
  }else{
    hcAnts.push(val);
    if(btn)btn.classList.add('sel');
  }
  renderAntChips();
}
function addAntCustom(){
  const v=document.getElementById('antCustom').value.trim();
  if(v&&!hcAnts.includes(v)){hcAnts.push(v);document.getElementById('antCustom').value='';}
  renderAntChips();
}
function removeAnt(v){if(typeof v==="number")v=hcAnts[v];  // índice desde el chip (evita meter texto en el onclick)
  
  hcAnts=hcAnts.filter(x=>x!==v);
  const btn=document.getElementById('antBtn-'+v);
  if(btn)btn.classList.remove('sel');
  renderAntChips();
}
function renderAntChips(){
  document.getElementById('antChips').innerHTML=hcAnts.map((v,i)=>`<span class="ant-chip">${_esc(v)}<span class="ax" onclick="removeAnt(${i})">✕</span></span>`).join('');
}

function addAler(){
  const v=document.getElementById('alerInput').value.trim();
  if(v&&!hcAlers.includes(v)){hcAlers.push(v);document.getElementById('alerInput').value='';}
  renderAlerChips();
}
function removeAler(v){if(typeof v==="number")v=hcAlers[v];  // índice desde el chip (evita meter texto en el onclick)
  hcAlers=hcAlers.filter(x=>x!==v);renderAlerChips();}
function renderAlerChips(){
  document.getElementById('alerChips').innerHTML=hcAlers.map((v,i)=>`<span class="ant-chip" style="color:#ff8fa3;border-color:rgba(255,58,92,.25);background:rgba(255,58,92,.08)">${_esc(v)}<span class="ax" onclick="removeAler(${i})">✕</span></span>`).join('');
}

function addMedAct(){
  const v=document.getElementById('medActInput').value.trim();
  if(v&&!hcMedActs.includes(v)){hcMedActs.push(v);document.getElementById('medActInput').value='';}
  renderMedActChips();
}
function removeMedAct(v){if(typeof v==="number")v=hcMedActs[v];  // índice desde el chip (evita meter texto en el onclick)
  hcMedActs=hcMedActs.filter(x=>x!==v);renderMedActChips();}
function renderMedActChips(){
  document.getElementById('medActChips').innerHTML=hcMedActs.map((v,i)=>`<span class="ant-chip" style="color:var(--cy);border-color:rgba(0,200,240,.25);background:var(--cy-a)">${_esc(v)}<span class="ax" onclick="removeMedAct(${i})">✕</span></span>`).join('');
}

async function handleHCPhoto(input){
  const file=input.files[0];if(!file)return;
  {const _e=_imagenPermitida(file);if(_e){toast(_e);input.value="";return;}}
  const reader=new FileReader();
  reader.onload=async(e)=>{
    hcPhoto=e.target.result;
    const preview=document.getElementById('hcPhotoPreview');
    preview.src=hcPhoto;preview.style.display='block';
    // AI analysis of medical document
    const analysis=document.getElementById('hcPhotoAnalysis');
    analysis.innerHTML=`<div class="ldg"><div class="sp"></div>Analizando documento con IA...</div>`;
    try{
      const base64=hcPhoto.split(',')[1];
      const r=await _aiFetch({model:'deepseek-chat',max_tokens:600,messages:[
          {role:'user',content:`Analiza esta imagen de documento medico y extrae antecedentes, alergias y medicacion actual si los hay. Si no es un documento medico, indica que no se encontro informacion medica. SOLO JSON:
{"antecedentes":["..."],"alergias":["..."],"medicacion":["..."],"nota":"..."}

Imagen: ${base64.substring(0,100)}... (imagen adjunta)`}
        ]});
      const d=await r.json();
      const txt=d.choices[0].message.content.replace(/\`\`\`json|\`\`\`/g,'').trim();
      const extracted=JSON.parse(txt);
      if(extracted.antecedentes?.length){extracted.antecedentes.forEach(a=>{if(!hcAnts.includes(a))hcAnts.push(a);});renderAntChips();}
      if(extracted.alergias?.length){extracted.alergias.forEach(a=>{if(!hcAlers.includes(a)){hcAlers.push(a);}});renderAlerChips();}
      if(extracted.medicacion?.length){extracted.medicacion.forEach(m=>{if(!hcMedActs.includes(m)){hcMedActs.push(m);}});renderMedActChips();}
      analysis.innerHTML=`<div class="ib gn"><div class="ibl">Datos extraidos por IA</div><div class="ibt">${_esc(extracted.nota||'Datos agregados automaticamente arriba.')}</div></div>`;
    }catch(e){
      analysis.innerHTML=`<div style="font-size:.76rem;color:var(--mu);padding:8px">No se pudo analizar la imagen automaticamente. Ingresa los datos manualmente.</div>`;
    }
  };
  reader.readAsDataURL(file);
}

async function saveHC(){
  const name=document.getElementById('hcName').value.trim();
  if(!name){toast('Ingresa el nombre del paciente');return;}
  const hcData={
    name,age:document.getElementById('hcAge').value,sex:document.getElementById('hcSex').value,
    doc:document.getElementById('hcDoc').value.trim(),
    antecedentes:hcAnts,alergias:hcAlers,medicacion:hcMedActs,
    notes:document.getElementById('hcNotes').value.trim(),
    photo:hcPhoto||null,
    createdAt:FB?FB.serverTimestamp():new Date().toISOString(),
    userId:CU?.uid||'',userEmail:CU?.email||''
  };
  hcData.searchKeys=_searchKeys(hcData.name,hcData.doc);
  try{
    if(FB&&CU){await FB.addDoc(FB.collection(FB.db,'historias'),hcData);}
    toast('Historia clinica guardada');
    hcAnts=[];hcAlers=[];hcMedActs=[];hcPhoto=null;
    navigateTo('hc');
  }catch(e){toast('Error al guardar: '+e.message);}
}

function _hcSkeleton(n=3){
  return Array(n).fill(0).map(()=>`<div class="hc-card" style="pointer-events:none">
    <div style="display:flex;gap:12px;align-items:center">
      <div class="skel" style="width:42px;height:42px;border-radius:50%;flex-shrink:0"></div>
      <div style="flex:1">
        <div class="skel" style="height:13px;width:55%;margin-bottom:8px"></div>
        <div class="skel" style="height:10px;width:35%;margin-bottom:6px"></div>
        <div class="skel" style="height:10px;width:70%"></div>
      </div>
    </div>
  </div>`).join('');
}

function _renderHCItem(id, dt){
  const cols=['#00c8f0','#00e07a','#a855f7','#ffb830','#ff3a5c'];
  const av=(dt.name||'?')[0].toUpperCase();const col=cols[av.charCodeAt(0)%cols.length];
  const ants=dt.antecedentes?.length?_esc(dt.antecedentes.slice(0,3).join(', ')):'Sin antecedentes';
  const alers=dt.alergias?.length?`⚠️ ${_esc(dt.alergias.join(', '))}`:'';
  return`<div class="hc-card" onclick="viewHC('${id}')">
    <div style="display:flex;gap:12px;align-items:flex-start">
      ${dt.photo?`<img src="${_esc(dt.photo)}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0">`:`<div class="hc-avatar" style="background:${col}">${_esc(av)}</div>`}
      <div style="flex:1;min-width:0">
        <div class="hc-name">${_esc(dt.name||'—')}</div>
        <div class="hc-detail">${dt.age?_esc(dt.age)+' años · ':''}${dt.sex==='M'?'Masculino':dt.sex==='F'?'Femenino':'Otro'}${dt.doc?` · <span style="font-family:'JetBrains Mono',monospace;font-size:.65rem">${_esc(dt.doc)}</span>`:''}</div>
        <div class="hc-detail" style="margin-top:3px">${ants}</div>
        ${alers?`<div class="hc-badge" style="background:var(--rd-a);color:var(--rd)">${alers}</div>`:''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;margin-left:4px">
        <button onclick="event.stopPropagation();_exportHCPDF('${id}')" style="background:none;border:1px solid rgba(0,200,240,.3);border-radius:8px;color:var(--cy);font-size:.72rem;padding:5px 8px;cursor:pointer;transition:all .18s" title="Exportar PDF">📄</button>
        <button onclick="event.stopPropagation();confirmDeleteHC('${id}')" style="background:none;border:1px solid rgba(255,58,92,.3);border-radius:8px;color:var(--rd);font-size:.72rem;padding:5px 8px;cursor:pointer;transition:all .18s" title="Eliminar historia clínica">🗑️</button>
      </div>
    </div>
  </div>`;
}

function confirmDeleteHC(id, name){
  if(name===undefined)name=_hcCache?.[id]?.name||"este paciente"; // el nombre no viaja en el onclick
  const dlg=document.getElementById('deleteHCDialog');
  const msg=document.getElementById('deleteHCMsg');
  if(!dlg){
    // Create dialog if not present
    const div=document.createElement('div');
    div.id='deleteHCDialog';
    div.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px)';
    div.innerHTML=`<div style="background:var(--bg2);border:1px solid var(--bd);border-radius:18px;padding:24px 20px;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5);animation:bounceIn .3s ease">
      <div style="font-size:1.5rem;text-align:center;margin-bottom:10px">⚠️</div>
      <div style="font-weight:700;font-size:.95rem;text-align:center;margin-bottom:8px">Eliminar historia clínica</div>
      <div id="deleteHCMsg" style="font-size:.82rem;color:var(--mu);text-align:center;margin-bottom:20px;line-height:1.5"></div>
      <div style="display:flex;gap:10px">
        <button onclick="document.getElementById('deleteHCDialog').style.display='none'" class="bsec" style="flex:1">Cancelar</button>
        <button id="deleteHCConfirmBtn" class="bpri" style="flex:1;background:var(--rd);color:#fff">Sí, eliminar</button>
      </div>
    </div>`;
    document.body.appendChild(div);
  }
  const dlgEl=document.getElementById('deleteHCDialog');
  const msgEl=document.getElementById('deleteHCMsg');
  const btnEl=document.getElementById('deleteHCConfirmBtn');
  if(msgEl)msgEl.textContent=`¿Estás seguro de que deseas eliminar la historia clínica de "${name}"? Esta acción no se puede deshacer.`;
  if(btnEl){
    const newBtn=btnEl.cloneNode(true);
    newBtn.onclick=()=>{dlgEl.style.display='none';deleteHC(id,name);};
    btnEl.parentNode.replaceChild(newBtn,btnEl);
  }
  dlgEl.style.display='flex';
}

async function deleteHC(id, name){
  if(!FB||!CU){toast('Sin sesión activa');return;}
  try{
    await FB.deleteDoc(FB.doc(FB.db,'historias',id));
    toast(`Historia de "${name}" eliminada`);
    logAudit('hc_deleted',{name,id});
    delete _hcCache[id];
    if(_hcSearchQ)_runHCSearch();
  }catch(e){toast('Error al eliminar: '+e.message);}
}

function loadHC(){
  const el=document.getElementById('hcList');
  if(!el)return;
  if(!FB||!CU){el.innerHTML=`<div class="empty"><div class="etx">Sin sesión activa</div></div>`;return;}
  // Show skeletons immediately — instant perceived load
  if(!_hcRecentIds.length) el.innerHTML=_hcSkeleton(3);
  else _refreshHCList(el); // re-render from cache with no delay
  // Subscribe once; re-use on subsequent tab visits
  if(_hcUnsub)return;
  const q=FB.query(FB.collection(FB.db,'historias'),FB.orderBy('createdAt','desc'),FB.limit(30));
  _hcUnsub=FB.onSnapshot(q,(snap)=>{
    // Se fusiona (no se borra) para no perder las historias abiertas desde una búsqueda
    _hcRecentIds=snap.docs.map(d=>d.id);
    snap.docs.forEach(d=>{_hcCache[d.id]=d.data();});
    _autoPrepareHCSearch(snap.docs);
    const listEl=document.getElementById('hcList');
    if(listEl)_refreshHCList(listEl);
  },(e)=>{
    const listEl=document.getElementById('hcList');
    if(listEl)listEl.innerHTML=`<div class="empty"><div class="etx">Error: ${_esc(e.message)}</div></div>`;
  });
}

function _refreshHCList(el){
  if(_hcSearchQ)return; // hay una búsqueda en pantalla: no se reemplaza por la lista reciente
  const ids=_hcRecentIds.filter(id=>_hcCache[id]);
  if(!ids.length){el.innerHTML=`<div class="empty"><div class="eic">🗂️</div><div class="etx">Sin historias clínicas aún.<br>Crea la primera arriba.</div></div>`;return;}
  el.innerHTML=ids.map(id=>_renderHCItem(id,_hcCache[id])).join('');
}

function showNewHC(){
  hcAnts=[];hcAlers=[];hcMedActs=[];hcPhoto=null;
  ['hcName','hcAge','hcDoc','hcNotes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const preview=document.getElementById('hcPhotoPreview');if(preview)preview.style.display='none';
  const analysis=document.getElementById('hcPhotoAnalysis');if(analysis)analysis.innerHTML='';
  document.querySelectorAll('[id^="antBtn-"]').forEach(b=>b.classList.remove('sel'));
  renderAntChips();renderAlerChips();renderMedActChips();
  navigateTo('hc-new');
}

function _renderHCDetail(el, id, d){
  const ants=(d.antecedentes||[]).map(a=>`<span class="chip">${_esc(a)}</span>`).join('');
  const alers=(d.alergias||[]).map(a=>`<span class="chip" style="background:var(--rd-a);color:var(--rd)">${_esc(a)}</span>`).join('');
  const meds=(d.medicacion||[]).map(m=>`<span class="chip" style="background:var(--cy-a);color:var(--cy)">${_esc(m)}</span>`).join('');
  const date=d.createdAt?.toDate?.()?.toLocaleDateString('es-ES')||'';
  const av=(d.name||'?')[0].toUpperCase();
  el.innerHTML=`
    <div class="card" style="display:flex;gap:12px;align-items:center;animation:fadeUp .3s both">
      ${d.photo?`<img src="${_esc(d.photo)}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0">`:
        `<div style="width:56px;height:56px;border-radius:50%;background:var(--cy-a);display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:700;color:var(--cy);flex-shrink:0">${_esc(av)}</div>`}
      <div>
        <div style="font-size:1.05rem;font-weight:700">${_esc(d.name||'Sin nombre')}</div>
        <div class="hc-detail">${d.age?_esc(d.age)+' años · ':''}${d.sex==='M'?'Masculino':d.sex==='F'?'Femenino':'Otro'}${d.doc?` · <span style="font-family:'JetBrains Mono',monospace">${_esc(d.doc)}</span>`:''}</div>
        <div style="font-size:.68rem;color:var(--mu);margin-top:2px">${_esc(date)}</div>
      </div>
    </div>
    ${ants?`<div class="card" style="animation:fadeUp .3s .05s both"><div class="clabel">Antecedentes</div><div style="display:flex;flex-wrap:wrap;gap:6px">${ants}</div></div>`:''}
    ${alers?`<div class="card" style="animation:fadeUp .3s .1s both"><div class="clabel">Alergias</div><div style="display:flex;flex-wrap:wrap;gap:6px">${alers}</div></div>`:''}
    ${meds?`<div class="card" style="animation:fadeUp .3s .15s both"><div class="clabel">Medicación actual</div><div style="display:flex;flex-wrap:wrap;gap:6px">${meds}</div></div>`:''}
    ${d.notes?`<div class="card" style="animation:fadeUp .3s .2s both"><div class="clabel">Notas</div><div style="font-size:.84rem;line-height:1.55">${_esc(d.notes)}</div></div>`:''}
    ${CR!=="paciente"?`<div class="card hc-tri" id="hcTriages" style="animation:fadeUp .3s .25s both"><div class="clabel">Triages de este paciente</div><div class="skel" style="height:40px;width:100%"></div></div>`:''}
    ${typeof _resetPinCard==="function"?_resetPinCard(d):''}
  `;
  if(CR!=="paciente")_hcPintarTriages(id,d);
}

// ── Triages del paciente (enlazados por hcId, o por documento en los de múltiples víctimas) ──
const _HC_MOT={dolor_pecho:"Dolor de pecho",disnea:"Dificultad respiratoria",trauma:"Trauma",abdominal:"Dolor abdominal",neuro:"Neurológico",fiebre:"Fiebre",otro:"Otro motivo"};
const _hcTriCache={};
async function _hcTriages(id,d){
  if(!FB||CR==="paciente")return[];
  const col=FB.collection(FB.db,"triages"),res=new Map();
  const consultas=[FB.query(col,FB.where("hcId","==",id),FB.limit(40))];
  if(d?.doc)consultas.push(FB.query(col,FB.where("pacienteDoc","==",String(d.doc)),FB.limit(40)));
  for(const q of consultas){
    try{(await FB.getDocs(q)).docs.forEach(x=>res.set(x.id,{id:x.id,...x.data()}));}catch(_){}
  }
  const ms=t=>t?.toMillis?.()??(t instanceof Date?t.getTime():0);
  return[...res.values()].sort((a,b)=>ms(b.createdAt)-ms(a.createdAt));
}
function _hcFechaTri(t){
  const ms=t?.toMillis?.()??(t instanceof Date?t.getTime():null);
  return ms?new Date(ms).toLocaleString("es-CO",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"Sin fecha";
}
async function _hcPintarTriages(id,d){
  const lista=await _hcTriages(id,d);
  const el=document.getElementById("hcTriages");
  if(!el||_currentHCId!==id)return;
  _hcTriCache[id]=lista;
  const cls={ROJO:"ro",AMARILLO:"am",VERDE:"ve"};
  el.innerHTML=`<div class="clabel">Triages de este paciente${lista.length?` · ${lista.length}`:""}</div>`+(lista.length?lista.slice(0,8).map(t=>`
    <div class="hc-tri-row">
      <span class="hc-tri-dot ${cls[t.clasificacion]||"ve"}" aria-hidden="true"></span>
      <div class="hc-tri-main"><b>${_esc(t.clasificacion||"—")} · ${_esc(_HC_MOT[t.motivo]||t.motivo||"Triage")}</b>
        <span>${_esc(_hcFechaTri(t.createdAt))}${t.atendido?` · atendido${t.atendidoPor?" por "+_esc(t.atendidoPor):""}`:" · sin atender"}${t.sinIA?" · sin IA":""}</span></div>
    </div>`).join("")+(lista.length>8?`<div class="hc-tri-mas">Y ${lista.length-8} más en el PDF</div>`:""):`<div class="hc-tri-vacio">Aún no hay triages enlazados. Los nuevos se enlazan solos al iniciar el triage con "Buscar paciente".</div>`);
}

let _currentHCId=null;
async function viewHC(id){
  _currentHCId=id;
  navigateTo('hc-detail');
  const el=document.getElementById('hcDetailContent');
  if(!el)return;
  // Render from cache instantly — no spinner at all for cached records
  if(_hcCache[id]){_renderHCDetail(el,id,_hcCache[id]);return;}
  // Fallback skeleton + fetch for uncached records
  el.innerHTML=`<div class="card">${_hcSkeleton(1)}<div class="skel" style="height:13px;width:100%;margin-top:14px"></div><div class="skel" style="height:60px;width:100%;margin-top:8px"></div></div>`;
  try{
    const snap=await FB.getDoc(FB.doc(FB.db,'historias',id));
    if(!snap.exists()){el.innerHTML=`<div class="card" style="color:var(--rd)">Historia no encontrada</div>`;return;}
    const d=snap.data();_hcCache[id]=d;
    _renderHCDetail(el,id,d);
  }catch(e){el.innerHTML=`<div class="card" style="color:var(--rd)">Error: ${_esc(e.message)}</div>`;}
}


function toggleExplain(i){const el=document.getElementById("explain-"+i);if(el)el.classList.toggle("open");}

// ══════════════════════════════════════
// HC — EXPORT PDF
// ══════════════════════════════════════
function _buildHCPDF(d,triages=[]){
  if(typeof window.jspdf==="undefined")return null;
  const {jsPDF}=window.jspdf;
  const pdf=new jsPDF({unit:"mm",format:"a4"});
  const W=210,PH=297,M=16,CW=W-M*2,BOTTOM=PH-14;
  const fondo=()=>{pdf.setFillColor(11,17,32);pdf.rect(0,0,W,PH,"F");};
  let y;
  const nuevaPagina=()=>{pdf.addPage();fondo();y=M;};

  fondo();
  // Encabezado
  pdf.setFillColor(0,50,80);pdf.rect(0,0,W,28,"F");
  const lw=_pdfLogo(pdf,M,7,5.5);
  _pdfFont(pdf,14,"bold",[0,200,240]);pdf.text("MedIA Suite",M+lw+2.5,12);
  _pdfFont(pdf,8,"normal",[140,160,190]);pdf.text("Historia Clínica — Documento confidencial",M,19);
  _pdfFont(pdf,7,"normal",[140,160,190]);pdf.text(`Generado: ${new Date().toLocaleString("es-ES")}`,M,25);
  y=36;

  // Bloque del paciente (nombre y datos recortados para que nunca se salgan)
  const av=_pdfSafe((d.name||"?").trim()[0]||"?").toUpperCase()||"?";
  pdf.setFillColor(17,25,44);pdf.setDrawColor(0,200,240);pdf.roundedRect(M,y,CW,22,4,4,"FD");
  pdf.setFillColor(0,200,240);pdf.circle(M+11,y+11,8,"F");
  _pdfFont(pdf,11,"bold",[11,17,32]);pdf.text(av,M+11,y+14.5,{align:"center"});
  const textX=M+22,textW=CW-26;
  _pdfFont(pdf,13,"bold",[230,240,255]);
  pdf.text(_pdfFit(pdf,d.name||"Sin nombre",textW,13,"bold"),textX,y+9);
  const sexLabel=d.sex==="M"?"Masculino":d.sex==="F"?"Femenino":"Otro";
  _pdfFont(pdf,8.5,"normal",[140,160,190]);
  pdf.text(_pdfFit(pdf,`${d.age?d.age+" años  ·  ":""}${sexLabel}${d.doc?"  ·  ID: "+d.doc:""}`,textW,8.5),textX,y+16);
  y+=30;

  // Sección en caja; si no cabe, continúa en la página siguiente con "(cont.)"
  function sectionBox(title,color,items,notes){
    if(!items?.length&&!notes)return;
    const lineH=4.6,size=8.5,textW=CW-14;
    let lines=[];
    if(notes)lines=_pdfLines(pdf,notes,textW,size);
    else items.forEach(it=>{
      const w=_pdfLines(pdf,it,textW-4,size);
      w.forEach((l,i)=>lines.push({bullet:i===0,text:l}));
    });
    lines=lines.map(l=>typeof l==="string"?{bullet:false,text:l}:l);
    const [r,g,b]=color;
    let i=0,primera=true;
    while(i<lines.length){
      const libres=Math.floor((BOTTOM-y-12-4)/lineH);
      // Empezar en página nueva si apenas cabe el título y una o dos líneas
      if(libres<1||(primera&&libres<Math.min(3,lines.length))){nuevaPagina();continue;}
      const trozo=lines.slice(i,i+libres);
      const boxH=12+trozo.length*lineH+3;
      pdf.setFillColor(17,25,44);pdf.setDrawColor(r,g,b);
      pdf.roundedRect(M,y,CW,boxH,3,3,"FD");
      pdf.setFillColor(r,g,b);pdf.roundedRect(M,y,4,boxH,2,2,"F");
      _pdfFont(pdf,7,"bold",[r,g,b]);
      pdf.text(_pdfSafe(title.toUpperCase())+(primera?"":" (CONT.)"),M+7,y+6);
      _pdfFont(pdf,size,"normal",[200,215,235]);
      trozo.forEach((l,k)=>{
        const ly=y+11.5+k*lineH;
        if(notes)pdf.text(l.text,M+7,ly);
        else{if(l.bullet)pdf.text("•",M+7,ly);pdf.text(l.text,M+11,ly);}
      });
      y+=boxH+4;i+=trozo.length;primera=false;
      if(i<lines.length)nuevaPagina();
    }
  }

  sectionBox("Antecedentes patológicos",[0,200,240],d.antecedentes||[]);
  sectionBox("Alergias conocidas",[255,80,80],d.alergias||[]);
  sectionBox("Medicación actual",[80,220,160],d.medicacion||[]);
  if(d.notes)sectionBox("Notas clínicas",[180,160,255],null,d.notes);
  if(triages.length)sectionBox(`Historial de triages (${triages.length})`,[255,184,48],triages.map(t=>{
    const j=(t.justificacion||"").replace(/\s+/g," ").trim();
    return `${_hcFechaTri(t.createdAt)} · ${t.clasificacion||"—"} · ${_HC_MOT[t.motivo]||t.motivo||"Triage"}${t.atendido?" · atendido"+(t.atendidoPor?" por "+t.atendidoPor:""):""}${t.sinIA?" · sin IA":""}${j?" — "+(j.length>220?j.slice(0,217)+"…":j):""}`;
  }));

  _pdfFooter(pdf,{
    left:`${d.name||"Paciente"}${d.doc?"  ·  ID "+d.doc:""}  ·  Uso interno exclusivo del personal autorizado`,
    margin:M,y:291,size:6.5,color:[90,105,130],
  });
  return pdf;
}

function _exportHCPDF(id){
  const d=_hcCache[id];
  if(!d){toast("Historia no cargada aún");return;}
  _doExportHCPDF(d);
}

function _exportHCDetailPDF(){
  if(!_currentHCId){toast("Sin historia cargada");return;}
  _exportHCPDF(_currentHCId);
}

async function _doExportHCPDF(d){
  if(typeof window.jspdf==="undefined"){toast("PDF no disponible — recarga la app");return;}
  try{
    const id=Object.keys(_hcCache).find(k=>_hcCache[k]===d);
    const triages=id?(_hcTriCache[id]||await _hcTriages(id,d)):[];
    const pdf=_buildHCPDF(d,triages);
    if(pdf){pdf.save(`historia-${(d.doc||"hc")}-${(d.name||"paciente").replace(/\s+/g,"-").toLowerCase()}.pdf`);toast("PDF generado ✓");}
    else toast("No se pudo generar el PDF");
  }catch(e){toast("Error PDF: "+e.message);console.error("[HC-PDF]",e);}
}


// ── BÚSQUEDA DE PACIENTES (nombre o documento) ──
// Ver src/app/00-busqueda.js. Las historias antiguas sin searchKeys se preparan
// con el botón "Preparar búsqueda" del panel de admin; mientras tanto, el
// documento exacto también se busca por el campo doc.
let _hcSearchQ="",_hcSearchTimer=null,_hcSearchSeq=0;
function _onHCSearch(v){
  _hcSearchQ=v.trim();
  document.getElementById("hcSearchX").style.display=_hcSearchQ?"":"none";
  clearTimeout(_hcSearchTimer);
  if(!_hcSearchQ){_hcSearchSeq++;const el=document.getElementById("hcList");if(el)_refreshHCList(el);return;}
  _hcSearchTimer=setTimeout(_runHCSearch,250);
}
function _clearHCSearch(){
  const i=document.getElementById("hcSearch");i.value="";_onHCSearch("");i.focus();
}
async function _runHCSearch(){
  const el=document.getElementById("hcList");if(!el)return;
  const parsed=_parseSearch(_hcSearchQ);
  if(!parsed){
    el.innerHTML=`<div class="empty"><div class="etx">Escribe al menos ${/^\d/.test(_hcSearchQ)?SEARCH_MIN_DOC+" dígitos":SEARCH_MIN+" letras"} para buscar.</div></div>`;
    return;
  }
  const seq=++_hcSearchSeq;
  el.innerHTML=_hcSkeleton(2);
  try{
    const col=FB.collection(FB.db,"historias");
    const consultas=[FB.getDocs(FB.query(col,FB.where("searchKeys","array-contains",parsed.key),FB.limit(50)))];
    if(parsed.tipo==="doc")consultas.push(FB.getDocs(FB.query(col,FB.where("doc","==",_hcSearchQ.trim()),FB.limit(5))));
    const snaps=await Promise.all(consultas);
    if(seq!==_hcSearchSeq)return; // llegó una búsqueda más nueva
    const res=new Map();
    snaps.forEach(s=>s.docs.forEach(d=>{const v=d.data();if(_matchesSearch(v,parsed)||parsed.tipo==="doc")res.set(d.id,v);}));
    // También se buscan las historias ya cargadas (sirve para las antiguas que aún no tienen searchKeys)
    Object.entries(_hcCache).forEach(([id,v])=>{if(!res.has(id)&&_matchesSearch(v,parsed))res.set(id,v);});
    const ts=v=>v.createdAt?.toMillis?.()||Date.parse(v.createdAt)||0;
    const ids=[...res.keys()].sort((a,b)=>ts(res.get(b))-ts(res.get(a)));
    ids.forEach(id=>{_hcCache[id]=res.get(id);}); // para abrir el detalle al instante
    if(!ids.length){
      el.innerHTML=`<div class="empty"><div class="etx">Sin resultados para "${_esc(_hcSearchQ)}".<br><span style="font-size:.8rem">Revisa la ortografía o busca por documento.</span></div></div>`;
      return;
    }
    el.innerHTML=`<div class="hc-search-count">${ids.length===1?"1 paciente":ids.length+" pacientes"}${ids.length>=50?" (se muestran los primeros 50; escribe más para afinar)":""}</div>`
      +ids.map(id=>_renderHCItem(id,res.get(id))).join("");
  }catch(e){
    if(seq===_hcSearchSeq)el.innerHTML=`<div class="empty"><div class="etx">Error al buscar: ${_esc(e.message)}</div></div>`;
  }
}

// Admin: agrega searchKeys a las historias creadas antes de la búsqueda
async function prepareHCSearch(btn,silencioso=false){
  if(!FB||!CU){toast("Sin sesión activa");return;}
  const txt=btn?.textContent;if(btn){btn.disabled=true;btn.textContent="Preparando…";}
  try{
    const snap=await FB.getDocs(FB.collection(FB.db,"historias"));
    let n=0;
    for(const d of snap.docs){
      const v=d.data();
      const keys=_searchKeys(v.name,v.doc);
      const actuales=Array.isArray(v.searchKeys)?v.searchKeys:[];
      if(actuales.length===keys.length&&keys.every(k=>actuales.includes(k)))continue;
      await FB.updateDoc(FB.doc(FB.db,"historias",d.id),{searchKeys:keys});
      n++;
    }
    logAudit("search_index",{updated:n,total:snap.size});
    if(!silencioso||n)toast(n?`${n} de ${snap.size} historias preparadas para la búsqueda`:`Las ${snap.size} historias ya estaban listas`);
    if(n&&_hcSearchQ)_runHCSearch();
  }catch(e){if(!silencioso)toast("Error: "+e.message);}
  finally{if(btn){btn.disabled=false;btn.textContent=txt;}}
}

// Si un admin abre Pacientes y hay historias antiguas sin searchKeys,
// se preparan solas una vez por sesión (las reglas solo dejan editar a los admins).
let _hcAutoPrepDone=false;
function _autoPrepareHCSearch(docs){
  if(_hcAutoPrepDone||!(CR==="admin"||CR==="admin_hosp"))return;
  if(!docs.some(d=>!Array.isArray(d.data().searchKeys)))return;
  _hcAutoPrepDone=true;
  prepareHCSearch(null,true);
}
