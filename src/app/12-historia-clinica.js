// 12-historia-clinica.js — Historia clínica y exportación a PDF
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden numérico desde index.html.
// ══════════════════════════════════════
// HISTORIA CLINICA
// ══════════════════════════════════════
let hcAnts=[], hcAlers=[], hcMedActs=[], hcPhoto=null;
let _hcUnsub=null, _hcCache={}; // {docId: docData} — avoids re-fetching on every tab visit

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
function removeAnt(v){
  hcAnts=hcAnts.filter(x=>x!==v);
  const btn=document.getElementById('antBtn-'+v);
  if(btn)btn.classList.remove('sel');
  renderAntChips();
}
function renderAntChips(){
  document.getElementById('antChips').innerHTML=hcAnts.map(v=>`<span class="ant-chip">${v}<span class="ax" onclick="removeAnt('${v}')">✕</span></span>`).join('');
}

function addAler(){
  const v=document.getElementById('alerInput').value.trim();
  if(v&&!hcAlers.includes(v)){hcAlers.push(v);document.getElementById('alerInput').value='';}
  renderAlerChips();
}
function removeAler(v){hcAlers=hcAlers.filter(x=>x!==v);renderAlerChips();}
function renderAlerChips(){
  document.getElementById('alerChips').innerHTML=hcAlers.map(v=>`<span class="ant-chip" style="color:#ff8fa3;border-color:rgba(255,58,92,.25);background:rgba(255,58,92,.08)">${v}<span class="ax" onclick="removeAler('${v}')">✕</span></span>`).join('');
}

function addMedAct(){
  const v=document.getElementById('medActInput').value.trim();
  if(v&&!hcMedActs.includes(v)){hcMedActs.push(v);document.getElementById('medActInput').value='';}
  renderMedActChips();
}
function removeMedAct(v){hcMedActs=hcMedActs.filter(x=>x!==v);renderMedActChips();}
function renderMedActChips(){
  document.getElementById('medActChips').innerHTML=hcMedActs.map(v=>`<span class="ant-chip" style="color:var(--cy);border-color:rgba(0,200,240,.25);background:var(--cy-a)">${v}<span class="ax" onclick="removeMedAct('${v}')">✕</span></span>`).join('');
}

async function handleHCPhoto(input){
  const file=input.files[0];if(!file)return;
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
      const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:'deepseek-chat',max_tokens:600,messages:[
          {role:'user',content:`Analiza esta imagen de documento medico y extrae antecedentes, alergias y medicacion actual si los hay. Si no es un documento medico, indica que no se encontro informacion medica. SOLO JSON:
{"antecedentes":["..."],"alergias":["..."],"medicacion":["..."],"nota":"..."}

Imagen: ${base64.substring(0,100)}... (imagen adjunta)`}
        ]})
      });
      const d=await r.json();
      const txt=d.choices[0].message.content.replace(/\`\`\`json|\`\`\`/g,'').trim();
      const extracted=JSON.parse(txt);
      if(extracted.antecedentes?.length){extracted.antecedentes.forEach(a=>{if(!hcAnts.includes(a))hcAnts.push(a);});renderAntChips();}
      if(extracted.alergias?.length){extracted.alergias.forEach(a=>{if(!hcAlers.includes(a)){hcAlers.push(a);}});renderAlerChips();}
      if(extracted.medicacion?.length){extracted.medicacion.forEach(m=>{if(!hcMedActs.includes(m)){hcMedActs.push(m);}});renderMedActChips();}
      analysis.innerHTML=`<div class="ib gn"><div class="ibl">Datos extraidos por IA</div><div class="ibt">${extracted.nota||'Datos agregados automaticamente arriba.'}</div></div>`;
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
  const ants=dt.antecedentes?.length?dt.antecedentes.slice(0,3).join(', '):'Sin antecedentes';
  const alers=dt.alergias?.length?`⚠️ ${dt.alergias.join(', ')}`:'';
  const safeName=(dt.name||'').replace(/'/g,"\\'");
  return`<div class="hc-card" onclick="viewHC('${id}')">
    <div style="display:flex;gap:12px;align-items:flex-start">
      ${dt.photo?`<img src="${dt.photo}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0">`:`<div class="hc-avatar" style="background:${col}">${av}</div>`}
      <div style="flex:1;min-width:0">
        <div class="hc-name">${dt.name||'—'}</div>
        <div class="hc-detail">${dt.age?dt.age+' años · ':''}${dt.sex==='M'?'Masculino':dt.sex==='F'?'Femenino':'Otro'}${dt.doc?` · <span style="font-family:'JetBrains Mono',monospace;font-size:.65rem">${dt.doc}</span>`:''}</div>
        <div class="hc-detail" style="margin-top:3px">${ants}</div>
        ${alers?`<div class="hc-badge" style="background:var(--rd-a);color:var(--rd)">${alers}</div>`:''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;margin-left:4px">
        <button onclick="event.stopPropagation();_exportHCPDF('${id}')" style="background:none;border:1px solid rgba(0,200,240,.3);border-radius:8px;color:var(--cy);font-size:.72rem;padding:5px 8px;cursor:pointer;transition:all .18s" title="Exportar PDF">📄</button>
        <button onclick="event.stopPropagation();confirmDeleteHC('${id}','${safeName}')" style="background:none;border:1px solid rgba(255,58,92,.3);border-radius:8px;color:var(--rd);font-size:.72rem;padding:5px 8px;cursor:pointer;transition:all .18s" title="Eliminar historia clínica">🗑️</button>
      </div>
    </div>
  </div>`;
}

function confirmDeleteHC(id, name){
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
  }catch(e){toast('Error al eliminar: '+e.message);}
}

function loadHC(){
  const el=document.getElementById('hcList');
  if(!el)return;
  if(!FB||!CU){el.innerHTML=`<div class="empty"><div class="etx">Sin sesión activa</div></div>`;return;}
  // Show skeletons immediately — instant perceived load
  if(!Object.keys(_hcCache).length) el.innerHTML=_hcSkeleton(3);
  else _refreshHCList(el); // re-render from cache with no delay
  // Subscribe once; re-use on subsequent tab visits
  if(_hcUnsub)return;
  const q=FB.query(FB.collection(FB.db,'historias'),FB.orderBy('createdAt','desc'),FB.limit(30));
  _hcUnsub=FB.onSnapshot(q,(snap)=>{
    _hcCache={};
    snap.docs.forEach(d=>{_hcCache[d.id]=d.data();});
    const listEl=document.getElementById('hcList');
    if(listEl)_refreshHCList(listEl);
  },(e)=>{
    const listEl=document.getElementById('hcList');
    if(listEl)listEl.innerHTML=`<div class="empty"><div class="etx">Error: ${e.message}</div></div>`;
  });
}

function _refreshHCList(el){
  const ids=Object.keys(_hcCache);
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
  const ants=(d.antecedentes||[]).map(a=>`<span class="chip">${a}</span>`).join('');
  const alers=(d.alergias||[]).map(a=>`<span class="chip" style="background:var(--rd-a);color:var(--rd)">${a}</span>`).join('');
  const meds=(d.medicacion||[]).map(m=>`<span class="chip" style="background:var(--cy-a);color:var(--cy)">${m}</span>`).join('');
  const date=d.createdAt?.toDate?.()?.toLocaleDateString('es-ES')||'';
  const av=(d.name||'?')[0].toUpperCase();
  el.innerHTML=`
    <div class="card" style="display:flex;gap:12px;align-items:center;animation:fadeUp .3s both">
      ${d.photo?`<img src="${d.photo}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0">`:
        `<div style="width:56px;height:56px;border-radius:50%;background:var(--cy-a);display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:700;color:var(--cy);flex-shrink:0">${av}</div>`}
      <div>
        <div style="font-size:1.05rem;font-weight:700">${d.name||'Sin nombre'}</div>
        <div class="hc-detail">${d.age?d.age+' años · ':''}${d.sex==='M'?'Masculino':d.sex==='F'?'Femenino':'Otro'}${d.doc?` · <span style="font-family:'JetBrains Mono',monospace">${d.doc}</span>`:''}</div>
        <div style="font-size:.68rem;color:var(--mu);margin-top:2px">${date}</div>
      </div>
    </div>
    ${ants?`<div class="card" style="animation:fadeUp .3s .05s both"><div class="clabel">Antecedentes</div><div style="display:flex;flex-wrap:wrap;gap:6px">${ants}</div></div>`:''}
    ${alers?`<div class="card" style="animation:fadeUp .3s .1s both"><div class="clabel">Alergias</div><div style="display:flex;flex-wrap:wrap;gap:6px">${alers}</div></div>`:''}
    ${meds?`<div class="card" style="animation:fadeUp .3s .15s both"><div class="clabel">Medicación actual</div><div style="display:flex;flex-wrap:wrap;gap:6px">${meds}</div></div>`:''}
    ${d.notes?`<div class="card" style="animation:fadeUp .3s .2s both"><div class="clabel">Notas</div><div style="font-size:.84rem;line-height:1.55">${d.notes}</div></div>`:''}
  `;
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
  }catch(e){el.innerHTML=`<div class="card" style="color:var(--rd)">Error: ${e.message}</div>`;}
}


function toggleExplain(i){const el=document.getElementById("explain-"+i);if(el)el.classList.toggle("open");}

// ══════════════════════════════════════
// HC — EXPORT PDF
// ══════════════════════════════════════
function _buildHCPDF(d){
  if(typeof window.jspdf==="undefined")return null;
  const {jsPDF}=window.jspdf;
  const pdf=new jsPDF({unit:"mm",format:"a4"});
  const W=210,M=16,CW=W-M*2;
  let y=M;

  // Background
  pdf.setFillColor(11,17,32);pdf.rect(0,0,W,297,"F");

  // Header bar
  pdf.setFillColor(0,50,80);pdf.rect(0,0,W,28,"F");
  pdf.setFontSize(14);pdf.setTextColor(0,200,240);pdf.setFont(undefined,"bold");
  pdf.text("MedIA Suite",M,12);
  pdf.setFontSize(8);pdf.setTextColor(140,160,190);pdf.setFont(undefined,"normal");
  pdf.text("Historia Clínica — Documento confidencial",M,19);
  pdf.setFontSize(7);pdf.text(`Generado: ${new Date().toLocaleString("es-ES")}`,M,25);
  y=36;

  // Patient name + avatar block
  const av=(d.name||"?")[0].toUpperCase();
  pdf.setFillColor(17,25,44);pdf.setDrawColor(0,200,240);pdf.roundedRect(M,y,CW,22,4,4,"FD");
  pdf.setFillColor(0,200,240);pdf.circle(M+11,y+11,8,"F");
  pdf.setFontSize(11);pdf.setTextColor(11,17,32);pdf.setFont(undefined,"bold");pdf.text(av,M+8.5,y+14);
  pdf.setFontSize(13);pdf.setTextColor(230,240,255);pdf.setFont(undefined,"bold");
  pdf.text(d.name||"Sin nombre",M+22,y+9);
  pdf.setFontSize(8.5);pdf.setTextColor(140,160,190);pdf.setFont(undefined,"normal");
  const sexLabel=d.sex==="M"?"Masculino":d.sex==="F"?"Femenino":"Otro";
  pdf.text(`${d.age?d.age+" años  ·  ":""}${sexLabel}${d.doc?"  ·  ID: "+d.doc:""}`,M+22,y+16);
  y+=30;

  function sectionBox(title,color,items,notes){
    if(!items?.length&&!notes)return;
    const rows=notes?[notes]:items;
    const lineH=5.5;
    const textW=CW-14;
    let lines=[];
    rows.forEach(r=>{
      const wrapped=pdf.splitTextToSize(r,textW);
      lines=[...lines,...wrapped];
    });
    const boxH=12+lines.length*lineH+4;
    if(y+boxH>280){pdf.addPage();pdf.setFillColor(11,17,32);pdf.rect(0,0,W,297,"F");y=M;}
    const [r,g,b]=color;
    pdf.setFillColor(17,25,44);pdf.setDrawColor(r,g,b);
    pdf.roundedRect(M,y,CW,boxH,3,3,"FD");
    pdf.setFillColor(r,g,b);pdf.roundedRect(M,y,4,boxH,2,2,"F");
    pdf.setFontSize(7);pdf.setTextColor(r,g,b);pdf.setFont(undefined,"bold");
    pdf.text(title.toUpperCase(),M+7,y+6);
    pdf.setFontSize(8.5);pdf.setTextColor(200,215,235);pdf.setFont(undefined,"normal");
    lines.forEach((l,i)=>pdf.text(l,M+7,y+11+i*lineH));
    y+=boxH+4;
  }

  sectionBox("Antecedentes patológicos",[0,200,240],d.antecedentes||[]);
  sectionBox("Alergias conocidas",[255,80,80],d.alergias||[]);
  sectionBox("Medicación actual",[80,220,160],d.medicacion||[]);
  if(d.notes){sectionBox("Notas clínicas",[180,160,255],null,d.notes);}

  // Footer
  pdf.setFontSize(6.5);pdf.setTextColor(60,75,100);pdf.setFont(undefined,"normal");
  pdf.text("MedIA Suite — Documento de uso interno exclusivo del personal autorizado",M,291);
  pdf.text(`${d.name||"Paciente"}  ·  ${d.doc||""}  ·  ${new Date().toLocaleDateString("es-ES")}`,W-M,291,{align:"right"});
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

function _doExportHCPDF(d){
  if(typeof window.jspdf==="undefined"){toast("PDF no disponible — recarga la app");return;}
  try{
    const pdf=_buildHCPDF(d);
    if(pdf){pdf.save(`historia-${(d.doc||"hc")}-${(d.name||"paciente").replace(/\s+/g,"-").toLowerCase()}.pdf`);toast("PDF generado ✓");}
    else toast("No se pudo generar el PDF");
  }catch(e){toast("Error PDF: "+e.message);console.error("[HC-PDF]",e);}
}

