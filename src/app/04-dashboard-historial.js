// 04-dashboard-historial.js — Dashboard, gestión de usuarios e historial de triages
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden numérico desde index.html.
// DASHBOARD
async function loadDash(){
  if(!FB||!CU||CR==="paciente")return;
  // Role header
  const roleLabels={admin:"👑 Panel de Administrador",admin_hosp:"🏥 Panel Hospitalario",medico:"👨‍⚕️ Mi Panel"};
  const rl=document.getElementById("dashRoleLabel");if(rl)rl.textContent=roleLabels[CR]||"Dashboard";
  _renderDashHello();
  const rb=document.getElementById("dashRoleBadge");if(rb)rb.innerHTML=`<span style="font-size:.62rem;padding:3px 9px;border-radius:10px;background:var(--cy-a);color:var(--cy);font-weight:700;font-family:'JetBrains Mono',monospace;letter-spacing:.5px">${(CR||"").toUpperCase()}</span>`;
  // Show/hide admin section
  const adminSec=document.getElementById("lbUserMgmtSec");if(adminSec)adminSec.style.display=(CR==="admin"||CR==="admin_hosp")?"block":"none";
  try{
    const isAdmin=CR==="admin"||CR==="admin_hosp";
    // Triages de los últimos 30 días (alimentan el resumen de hoy, la actividad y las estadísticas)
    const hace30=new Date(Date.now()-30*864e5);
    const snap=await FB.getDocs(FB.query(FB.collection(FB.db,"triages"),
      FB.where("createdAt",">=",hace30),FB.orderBy("createdAt","desc"),FB.limit(400)));
    const myDocs=isAdmin?snap.docs:snap.docs.filter(d=>d.data().userId===CU.uid);
    // Las cifras de las tarjetas son solo de HOY (desde las 00:00)
    const inicioHoy=new Date();inicioHoy.setHours(0,0,0,0);
    const hoy=myDocs.filter(d=>{const ms=d.data().createdAt?.toMillis?.();return !ms||ms>=inicioHoy.getTime();});
    const ro=hoy.filter(d=>d.data().clasificacion==="ROJO").length;
    const am=hoy.filter(d=>d.data().clasificacion==="AMARILLO").length;
    const ve=hoy.filter(d=>d.data().clasificacion==="VERDE").length;
    const mci=hoy.filter(d=>d.data().esMCI===true).length;
    // Load prehospital notifications count
    let prehCount=0;
    try{
      const prehQ=isAdmin
        ? FB.query(FB.collection(FB.db,"prehospital"),FB.orderBy("createdAt","desc"),FB.limit(100))
        : FB.query(FB.collection(FB.db,"prehospital"),FB.where("userId","==",CU.uid),FB.orderBy("createdAt","desc"),FB.limit(100));
      const prehSnap=await FB.getDocs(prehQ);
      _dashPrehDocs=prehSnap.docs.map(d=>({_id:d.id,...d.data()}));
      prehCount=_dashPrehDocs.filter(d=>{const ms=d.createdAt?.toMillis?.();return !ms||ms>=inicioHoy.getTime();}).length;
    }catch(e){_dashPrehDocs=[];}
    _renderDashSummary(myDocs,hoy,{ro,am,ve,mci,prehCount});
    _dashAllDocs=myDocs.map(d=>({_id:d.id,...d.data()}));
    _dashShown=5;
    _renderDashRecent();
    _chartData=myDocs.map(d=>d.data());
    buildChart();
    if(CR==="admin"||CR==="admin_hosp"){
      const umc=document.getElementById("userMgmtCard");if(umc)umc.style.display="";
      const users=await FB.getDocs(FB.collection(FB.db,"users"));
      const RL={admin:"Admin",admin_hosp:"Adm.Hospital",medico:"Médico",paciente:"Paciente",pendiente:"Pendiente",rechazado:"Rechazado",eliminado:"Eliminado"};
      const roleIc={admin:"👑",admin_hosp:"🏥",medico:"👨‍⚕️",paciente:"🙋",pendiente:"⏳",rechazado:"🚫",eliminado:"🗑️"};
      const roleColors={admin:"var(--yw)",admin_hosp:"var(--pu)",medico:"var(--cy)",paciente:"var(--gn)",pendiente:"var(--yw)",rechazado:"var(--rd)",eliminado:"var(--mu)"};
      const cols=["#00c8f0","#00e07a","#a855f7","#ffb830","#ff3a5c"];
      const ORDER=["pendiente","admin","admin_hosp","medico","paciente","rechazado","eliminado"];
      const groups={};ORDER.forEach(r=>groups[r]=[]);
      users.docs.forEach(u=>{const ud=u.data();const r=ud.role||"pendiente";(groups[r]||groups.pendiente).push({u,ud});});
      const btn=(bg,fg)=>`padding:4px 9px;border-radius:7px;font-size:.7rem;font-weight:600;cursor:pointer;border:1px solid ${fg};background:${bg};color:${fg}`;
      let html="";
      ORDER.forEach(role=>{
        if(!groups[role].length)return;
        const title=role==="pendiente"?"⏳ Solicitudes pendientes":`${roleIc[role]} ${RL[role]}s`;
        html+=`<div style="font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${roleColors[role]};padding:10px 0 5px;display:flex;align-items:center;gap:5px">${title} <span style="background:var(--bg3);color:var(--mu);border-radius:10px;padding:1px 7px;font-size:.6rem;font-weight:600;margin-left:3px">${groups[role].length}</span></div>`;
        html+=groups[role].map(({u,ud})=>{
          const av=_esc((ud.name||ud.email||"?")[0].toUpperCase());const col=cols[ud.email?.charCodeAt(0)%cols.length]||"#00c8f0";
          const photoSrc=localStorage.getItem("ms_photo_"+u.id);
          const avEl=`<div class="uav" style="background:${col};overflow:hidden">${photoSrc?`<img src="${_esc(photoSrc)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:av}</div>`;
          const uid=_esc(u.id);
          let roleCtrl;
          if(ud.role==="pendiente"){
            // admin y admin de hospital pueden revisar solicitudes
            roleCtrl=`<div style="display:flex;gap:6px;flex-shrink:0"><button type="button" onclick="reviewStaff('${uid}',true)" style="${btn("var(--gn-a)","var(--gn)")}">Aprobar</button><button type="button" onclick="reviewStaff('${uid}',false)" style="${btn("var(--rd-a)","var(--rd)")}">Rechazar</button></div>`;
          }else if(CR==="admin"&&u.id===CU?.uid){
            // Tu propia cuenta: no se puede cambiar ni borrar desde aquí (evita quedarte sin admin)
            roleCtrl=`<span style="font-size:.68rem;color:var(--mu);padding:3px 8px;background:var(--bg3);border-radius:6px">👑 Tú</span>`;
          }else if(CR==="admin"){
            const opts=["admin","admin_hosp","medico","paciente","pendiente","rechazado","eliminado"];
            const delBtn=ud.role==="eliminado"?"":`<button type="button" title="Eliminar cuenta" onclick="deleteUserProfile('${uid}')" style="${btn("var(--rd-a)","var(--rd)")};padding:4px 7px">🗑</button>`;
            roleCtrl=`<div style="display:flex;gap:6px;align-items:center;flex-shrink:0"><select onchange="changeRole('${uid}',this.value)" title="${ud.role==="eliminado"?"Cambia el rol para restaurar la cuenta":"Rol"}" style="padding:3px 7px;border-radius:6px;font-size:.7rem;width:auto;background:var(--bg3);border:1px solid var(--bd);color:var(--tx)">${opts.map(r=>`<option value="${r}" ${ud.role===r?"selected":""}>${RL[r]}</option>`).join("")}</select>${delBtn}</div>`;
          }else{
            roleCtrl=`<span style="font-size:.68rem;font-family:'JetBrains Mono',monospace;color:${roleColors[ud.role]||"var(--mu)"};padding:3px 8px;background:var(--bg3);border-radius:6px">${roleIc[ud.role]||""} ${_esc(RL[ud.role]||ud.role||"")}</span>`;
          }
          const extra=ud.especialidad?` · ${_esc(ud.especialidad)}`:"";
          return`<div class="user-row">${avEl}<div style="flex:1;min-width:0"><div style="font-size:.83rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(ud.name||"—")}</div><div style="font-size:.69rem;color:var(--mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(ud.email||"")}${extra}</div></div>${roleCtrl}</div>`;
        }).join("");
      });
      document.getElementById("userList").innerHTML=html||"<div class='empty' style='padding:12px'><div class='etx'>Sin usuarios registrados</div></div>";
      if(groups.pendiente.length&&!_pendingToastShown){_pendingToastShown=true;toast(`⏳ ${groups.pendiente.length} solicitud(es) de acceso por revisar`);}
      const adminAct=document.getElementById("adminActionsCard");if(adminAct)adminAct.style.display="block";
    }else{document.getElementById("userMgmtCard").style.display="none";}
    // Show/hide meds patient lookup (only for staff roles)
    const mlCard=document.getElementById("medPatientLookupCard");
    if(mlCard)mlCard.style.display=(CR==="paciente")?"none":"";
    if(CR==="medico"||CR==="admin"||CR==="admin_hosp"){
      const nc=document.getElementById("nearbyCard");if(nc)nc.style.display="block";
      const ni=document.getElementById("nearbyEpsInput");if(ni)ni.placeholder=getInsLabel();
    }
    // Patient count card
    if(CR==="admin"||CR==="admin_hosp"||CR==="medico"){
      const countCard=document.getElementById("patientCountCard");
      const countStats=document.getElementById("patientCountStats");
      if(countCard&&countStats){
        countCard.style.display="block";
        const cached=Object.keys(_hcCache).length;
        const renderCount=(n,breakdown)=>{
          countStats.innerHTML=`
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px">
              <div style="font-size:2.6rem;font-weight:800;color:var(--cy);line-height:1">${n}</div>
              <div style="font-size:.72rem;color:var(--mu);line-height:1.4">historias<br>clínicas</div>
            </div>
            ${breakdown?`<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap">${breakdown}</div>`:""}`;
        };
        if(cached>0){
          const vals=Object.values(_hcCache);
          const bySex={M:vals.filter(v=>v.sex==="M").length,F:vals.filter(v=>v.sex==="F").length};
          const chips=[
            bySex.M?`<span style="font-size:.65rem;padding:3px 9px;border-radius:10px;background:rgba(0,200,240,.12);color:var(--cy)">♂ ${bySex.M}</span>`:"",
            bySex.F?`<span style="font-size:.65rem;padding:3px 9px;border-radius:10px;background:rgba(168,85,247,.12);color:var(--pu)">♀ ${bySex.F}</span>`:""
          ].filter(Boolean).join("");
          renderCount(cached,chips);
        }else{
          countStats.innerHTML=`<div class="skel" style="height:52px;border-radius:10px"></div>`;
          FB.getDocs(FB.query(FB.collection(FB.db,"historias"),FB.limit(200))).then(snap=>{
            const bySex={M:0,F:0};
            snap.docs.forEach(d=>{const s=d.data().sex;if(s==="M")bySex.M++;else if(s==="F")bySex.F++;});
            const chips=[
              bySex.M?`<span style="font-size:.65rem;padding:3px 9px;border-radius:10px;background:rgba(0,200,240,.12);color:var(--cy)">♂ ${bySex.M}</span>`:"",
              bySex.F?`<span style="font-size:.65rem;padding:3px 9px;border-radius:10px;background:rgba(168,85,247,.12);color:var(--pu)">♀ ${bySex.F}</span>`:""
            ].filter(Boolean).join("");
            renderCount(snap.size,chips);
          }).catch(()=>{countStats.innerHTML=`<div style="font-size:.75rem;color:var(--mu);text-align:center">—</div>`;});
        }
      }
    }
  }catch(e){console.error(e);}
}

async function changeRole(uid,role){
  if(uid===CU?.uid){toast("No puedes cambiar tu propio rol");loadDash();return;}
  try{await FB.updateDoc(FB.doc(FB.db,"users",uid),{role});toast("Rol actualizado");loadDash();}
  catch(e){toast("No se pudo cambiar el rol: "+e.message);}
}
// Eliminar una cuenta (solo admin).
// La cuenta queda marcada con rol "eliminado": pierde todo acceso, ve el aviso
// "Cuenta eliminada" y no puede volver a registrarse con el mismo correo.
// Se puede restaurar cambiando su rol en el selector.
// (El correo de inicio de sesión solo se borra desde la consola de Firebase → Authentication.)
async function deleteUserProfile(uid){
  if(uid===CU?.uid){toast("No puedes eliminar tu propia cuenta");return;}
  if(!confirm("¿Eliminar esta cuenta?\n\nPerderá todo acceso y no podrá volver a registrarse con el mismo correo. Puedes restaurarla después cambiando su rol."))return;
  try{
    await FB.updateDoc(FB.doc(FB.db,"users",uid),{role:"eliminado",deletedBy:CU.uid,deletedAt:FB.serverTimestamp()});
    try{await FB.deleteDoc(FB.doc(FB.db,"presence",uid));}catch(_){}
    logAudit("user_deleted",{uid});
    toast("Cuenta eliminada ✓");
    loadDash();
  }catch(e){toast("Error: "+e.message);}
}
// Aprobar o rechazar una cuenta de personal pendiente
let _pendingToastShown=false;
async function reviewStaff(uid,approve){
  const ok=approve||confirm("¿Rechazar esta solicitud de acceso?");
  if(!ok)return;
  try{
    await FB.updateDoc(FB.doc(FB.db,"users",uid),{role:approve?"medico":"rechazado",reviewedBy:CU.uid,reviewedAt:FB.serverTimestamp()});
    logAudit(approve?"staff_approved":"staff_rejected",{uid});
    toast(approve?"Cuenta aprobada como médico ✓":"Solicitud rechazada");
    loadDash();
  }catch(e){toast("Error: "+e.message);}
}

// HISTORY LEGEND
let _histLegendOpen=false;
function toggleHistLegend(){
  const panel=document.getElementById("histLegendPanel");
  if(!panel)return;
  _histLegendOpen=!_histLegendOpen;
  if(_histLegendOpen){
    panel.style.display="block";
    panel.innerHTML=`
      <div style="font-family:'JetBrains Mono',monospace;font-size:.68rem;color:var(--cy);font-weight:700;letter-spacing:.5px;margin-bottom:8px;text-transform:uppercase">${t("histLegend")||"Leyenda"}</div>
      <div class="hlg-row"><span class="hlg-ic">🔴</span><span class="hlg-lbl">ROJO</span><span class="hlg-desc">${t("legendCritical")||"Atencion inmediata"}</span></div>
      <div class="hlg-row"><span class="hlg-ic">🟡</span><span class="hlg-lbl">AMARILLO</span><span class="hlg-desc">${t("legendUrgent")||"Atencion urgente"}</span></div>
      <div class="hlg-row"><span class="hlg-ic">🟢</span><span class="hlg-lbl">VERDE</span><span class="hlg-desc">${t("legendStable")||"Puede esperar"}</span></div>
      <div class="hlg-row"><span class="hlg-ic">📝</span><span class="hlg-lbl"></span><span class="hlg-desc">${t("legendNotes")||"Anotaciones clinicas"}</span></div>
      <div class="hlg-row"><span class="hlg-ic">👤</span><span class="hlg-lbl"></span><span class="hlg-desc">${t("legendPerformedBy")||"Realizado por"}</span></div>
      <div class="hlg-row"><span class="hlg-ic">💔</span><span class="hlg-lbl"></span><span class="hlg-desc">${t("mPecho")||"Dolor pecho"}</span></div>
      <div class="hlg-row"><span class="hlg-ic">🫁</span><span class="hlg-lbl"></span><span class="hlg-desc">${t("mDisnea")||"Dif. respirar"}</span></div>
      <div class="hlg-row"><span class="hlg-ic">🤕</span><span class="hlg-lbl"></span><span class="hlg-desc">${t("mTrauma")||"Trauma"}</span></div>
      <div class="hlg-row"><span class="hlg-ic">🤢</span><span class="hlg-lbl"></span><span class="hlg-desc">${t("mAbdominal")||"Dolor abdominal"}</span></div>
      <div class="hlg-row"><span class="hlg-ic">🧠</span><span class="hlg-lbl"></span><span class="hlg-desc">${t("mNeuro")||"Neurologico"}</span></div>
      <div class="hlg-row"><span class="hlg-ic">🌡️</span><span class="hlg-lbl"></span><span class="hlg-desc">${t("mFiebre")||"Fiebre"}</span></div>`;
  }else{
    panel.style.display="none";
  }
}

// HISTORY FILTERS
let _histFilter="all";
let _histDocs=[];
let _histFiltered=[];

function toggleHistFilterMenu(){
  const m=document.getElementById("histFilterMenu");
  const ic=document.getElementById("histFilterIcon");
  if(!m)return;
  const open=m.style.display!=="none";
  m.style.display=open?"none":"";
  if(ic)ic.textContent=open?"▼":"▲";
}

function setHistFilter(f,btn){
  _histFilter=f;
  document.querySelectorAll('#histFilterMenu .hist-flt').forEach(b=>b.classList.remove('on'));
  if(btn)btn.classList.add('on');
  const lblMap={all:"Todos los triages",ROJO:"🔴 Críticos",AMARILLO:"🟡 Urgentes",VERDE:"🟢 Estables",MCI:"⚠️ MCI",
    dolor_pecho:"💔 Pecho",disnea:"🫁 Respiratorio",trauma:"🤕 Trauma",abdominal:"🤢 Abdominal",neuro:"🧠 Neurológico",fiebre:"🌡️ Fiebre",otro:"📋 Otro"};
  const lbl=document.getElementById("histFilterLbl");if(lbl)lbl.textContent=lblMap[f]||f;
  toggleHistFilterMenu();
  renderHist();
}

function renderHist(){
  const el=document.getElementById("histList");
  const mM={dolor_pecho:t("mPecho"),disnea:t("mDisnea"),trauma:t("mTrauma"),abdominal:t("mAbdominal"),neuro:t("mNeuro"),fiebre:t("mFiebre"),otro:t("mOtro")};
  _histFiltered=_histDocs.filter(d=>{
    if(_histFilter==="all")return true;
    if(_histFilter==="MCI")return d.esMCI===true;
    if(["ROJO","AMARILLO","VERDE"].includes(_histFilter))return d.clasificacion===_histFilter;
    return d.motivo===_histFilter;
  });
  if(!_histFiltered.length){el.innerHTML=`<div class="empty"><div class="eic">📋</div><div class="etx">${t("noData")||"Sin datos."}</div></div>`;return;}
  const rolePrefix={admin:"Admin",admin_hosp:"Adm.",medico:"Dr.",paciente:""};
  el.innerHTML=_histFiltered.map((dt,idx)=>{
    const cc={ROJO:"ro",AMARILLO:"am",VERDE:"ve"}[dt.clasificacion]||"ve";
    const loc2={es:"es-CO",en:"en-US",pt:"pt-BR",fr:"fr-FR",de:"de-DE",ja:"ja-JP"}[CL]||"es-CO";
    const date=dt.createdAt?.toDate?dt.createdAt.toDate().toLocaleDateString(loc2,{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—";
    const notasBadge=dt.notas?`<span style="font-size:.65rem;background:var(--gn-a);color:var(--gn);padding:1px 6px;border-radius:8px;margin-left:4px">📝</span>`:"";
    const pfx=rolePrefix[dt.userRole]||"";
    const quien=dt.userName||(dt.userEmail?.split("@")[0])||"";
    const performer=quien?`<span style="font-size:.65rem;color:var(--mu);opacity:.8">👤 ${pfx}${pfx?" ":""}${_esc(quien)}</span> · `:"";
    const mciTag=dt.esMCI?`<span style="font-size:.62rem;background:rgba(255,128,96,.15);color:#ff8060;padding:1px 5px;border-radius:6px;margin-left:4px">MCI</span>`:"";
    return`<div class="hist-row" onclick="_openHistDetail(${idx})" style="cursor:pointer">
      <span class="hist-b ${cc}">${dt.clasificacion}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:.82rem">${_esc(mM[dt.motivo]||dt.motivo||"—")}${notasBadge}${mciTag}</div>
        <div style="font-size:.69rem;color:var(--mu)">${performer}${_esc(_tipoLabel(dt.tipo))} · D:${dt.dolor??"-"}/10 · ${_esc(date)}</div>
        ${dt.justificacion?`<div style="font-size:.69rem;color:var(--mu);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(dt.justificacion.slice(0,80))}...</div>`:""}
      </div>
      <button onclick="event.stopPropagation();_exportHistPDF(${idx})" style="flex-shrink:0;background:none;border:1px solid rgba(255,184,48,.3);border-radius:7px;color:var(--yw);font-size:.72rem;padding:4px 7px;cursor:pointer;margin-left:6px;touch-action:manipulation" title="Exportar PDF">📄</button>
    </div>`;
  }).join("");
}

function _openHistDetail(idx){
  const dt=_histFiltered[idx];if(!dt)return;
  _showTriageDetail(dt);
}

// HISTORY
// ── DASHBOARD RECENT ACTIVITY ──
function _dashFilteredDocs(){
  const now=new Date();
  const cuts={day:new Date(now.getFullYear(),now.getMonth(),now.getDate()),week:new Date(Date.now()-7*864e5),month:new Date(Date.now()-30*864e5)};
  const cut=cuts[_dashPeriod]||new Date(0);
  return _dashAllDocs.filter(d=>{const ts=d.createdAt?.toDate?.();return !ts||ts>=cut;});
}
// ── Inicio (estilo A) ──
const _DASH_CLS={ROJO:{dot:"var(--rd)",txt:"#ff8fa3"},AMARILLO:{dot:"var(--yw)",txt:"#ffc451"},VERDE:{dot:"var(--gn)",txt:"#3ee68f"}};
function _renderDashHello(){
  const loc={es:"es-CO",en:"en-US",pt:"pt-BR",fr:"fr-FR",de:"de-DE",ja:"ja-JP"}[CL]||"es-CO";
  const now=new Date(),h=now.getHours();
  const turno=h>=6&&h<14?"Turno mañana":h>=14&&h<22?"Turno tarde":"Turno noche";
  const fecha=now.toLocaleDateString(loc,{weekday:"long",day:"numeric",month:"long"});
  const sh=document.getElementById("dashShift");if(sh)sh.textContent=`${turno} · ${fecha}`;
  const nombre=(uName()||"").split(" ").filter(w=>!/^(dr|dra)\.?$/i.test(w))[0]||"";
  const he=document.getElementById("dashHello");if(he)he.textContent=nombre?`Hola, ${nombre}`:"Inicio";
  const nt=document.getElementById("dashNewTriage");if(nt)nt.style.display=(CR==="admin"||CR==="medico")?"":"none";
}
function _renderDashSummary(docs,hoy,{ro,am,ve,mci,prehCount}){
  // Críticos en espera y cuántos superan su tiempo objetivo (mismos límites que la cola)
  const lim=(window.COLA_DEADLINE&&COLA_DEADLINE.ROJO)||15;
  const rojos=docs.map(d=>d.data()).filter(d=>d.clasificacion==="ROJO"&&!d.atendido);
  const vencidos=rojos.filter(d=>{const t=d.createdAt?.toMillis?.();return t&&Date.now()-t>lim*60000;}).length;
  const crit=document.getElementById("dashCritical");
  if(crit){
    const sub=!rojos.length?(ro?`${ro} hoy, todos atendidos`:"Sin pacientes críticos"):
      vencidos?`${vencidos} ${vencidos===1?"supera":"superan"} su tiempo objetivo (${lim} min)`:`Dentro del tiempo objetivo (${lim} min)`;
    crit.classList.toggle("calm",!rojos.length);
    crit.innerHTML=`<div class="dash-crit-info">
        <div class="dash-crit-lbl">Críticos en espera</div>
        <div class="dash-crit-num">${rojos.length}</div>
        <div class="dash-crit-sub">${_esc(sub)}</div>
      </div>
      <button type="button" class="dash-crit-btn" onclick="navigateTo('cola')">Ver cola</button>`;
  }
  const card=(n,lbl,color,onclick,title)=>`<button type="button" class="stat-card" ${onclick?`onclick="${onclick}"`:""} title="${title}">
      <div class="stat-num" style="color:${color}">${n}</div><div class="stat-lbl">${lbl}</div></button>`;
  document.getElementById("statGrid").innerHTML=
    card(am,t("statUrgent")||"Urgentes","#ffc451","goToHistWithFilter('AMARILLO')","Ver urgentes")+
    card(ve,t("statStable")||"Estables","#3ee68f","goToHistWithFilter('VERDE')","Ver estables")+
    card(prehCount,"Prehospital","#c39bff","","Notificaciones prehospitalarias")+
    card(hoy.length,"Total hoy","var(--cy)","goToHistWithFilter('all')","Ver todos")+
    (mci?card(mci,"MCI","#ff9a7a","goToHistWithFilter('MCI')","Ver incidentes de múltiples víctimas"):"");
  document.getElementById("statGrid").style.setProperty("--n",mci?5:4);
}

function _renderDashRecent(){
  const filtered=_dashFilteredDocs();
  window._dashFiltered=filtered;
  const el=document.getElementById("recentT");
  const moreEl=document.getElementById("recentMore");
  if(!el)return;
  if(!filtered.length){
    el.innerHTML=`<div class="empty" style="padding:10px 0"><div class="etx">Sin triages en este período</div></div>`;
    if(moreEl)moreEl.style.display="none";return;
  }
  const loc={es:"es-CO",en:"en-US",pt:"pt-BR",fr:"fr-FR",de:"de-DE",ja:"ja-JP"}[CL]||"es-CO";
  const mMD={dolor_pecho:t("mPecho"),disnea:t("mDisnea"),trauma:t("mTrauma"),abdominal:t("mAbdominal"),neuro:t("mNeuro"),fiebre:t("mFiebre"),otro:t("mOtro")};
  el.innerHTML=filtered.slice(0,_dashShown).map((dt,i)=>{
    const cls=_DASH_CLS[dt.clasificacion]||_DASH_CLS.VERDE;
    const date=dt.createdAt?.toDate?dt.createdAt.toDate().toLocaleString(loc,{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"}):"—";
    const meta=[_tipoLabel(dt.tipo),date,dt.userName].filter(Boolean).map(_esc).join(" · ");
    return`<div class="dash-row" role="button" tabindex="0" onclick="_openTriageDetail(${i})" onkeydown="if(event.key==='Enter')_openTriageDetail(${i})">
      <span class="dash-dot" style="background:${cls.dot}"></span>
      <div class="dash-row-body"><div class="dash-row-title">${_esc(mMD[dt.motivo]||dt.motivo||"—")}</div><div class="dash-row-meta">${meta}</div></div>
      <span class="dash-row-cls" style="color:${cls.txt}">${_esc(dt.clasificacion||"")}</span>
      <button type="button" class="dash-row-pdf" aria-label="Exportar PDF" title="Exportar PDF" onclick="event.stopPropagation();_exportDashPDF(${i})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></svg>
      </button>
    </div>`;
  }).join("");
  const hasMore=filtered.length>_dashShown;
  if(moreEl){
    moreEl.style.display=hasMore?"":"none";
    const btn=moreEl.querySelector("button");
    if(btn){const rem=Math.min(filtered.length-_dashShown,5);btn.textContent=`Mostrar ${rem} más · ${filtered.length} total`;}
  }
}
function _setDashPeriod(p,btn){
  _dashPeriod=p;_dashShown=5;
  document.querySelectorAll('[id^="dashPer-"]').forEach(b=>b.classList.toggle("on",b===btn));
  _renderDashRecent();
}
function _dashMore(){_dashShown+=5;_renderDashRecent();}

// ── TRIAGE DETAIL SHEET ──
let _currentTriageDetail=null;
function _showTriageDetail(dt){
  if(!dt)return;
  _currentTriageDetail=dt;
  const cc={ROJO:"ro",AMARILLO:"am",VERDE:"ve"}[dt.clasificacion]||"ve";
  const loc={es:"es-CO",en:"en-US",pt:"pt-BR",fr:"fr-FR",de:"de-DE",ja:"ja-JP"}[CL]||"es-CO";
  const mMD={dolor_pecho:t("mPecho"),disnea:t("mDisnea"),trauma:t("mTrauma"),abdominal:t("mAbdominal"),neuro:t("mNeuro"),fiebre:t("mFiebre"),otro:t("mOtro")};
  const date=dt.createdAt?.toDate?dt.createdAt.toDate().toLocaleDateString(loc,{weekday:"short",day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—";
  const row=(lbl,val,extra="")=>val!=null&&val!==""?`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--bd);font-size:.82rem"><span style="color:var(--mu)">${lbl}</span><span style="font-weight:600;${extra}">${_esc(val)}</span></div>`:"";
  const scores=[];
  if(dt.qsofa!=null)scores.push({l:"qSOFA",v:dt.qsofa,c:dt.qsofa>=2?"var(--rd)":"var(--gn)"});
  if(dt.news2!=null)scores.push({l:"NEWS2",v:dt.news2,c:dt.news2>=7?"var(--rd)":dt.news2>=5?"var(--yw)":"var(--gn)"});
  if(dt.shockIndex!=null)scores.push({l:"Shock",v:typeof dt.shockIndex==="number"?dt.shockIndex.toFixed(2):dt.shockIndex,c:dt.shockIndex>=1?"var(--rd)":"var(--gn)"});
  if(dt.curb65!=null)scores.push({l:"CURB-65",v:dt.curb65,c:dt.curb65>=3?"var(--rd)":dt.curb65>=2?"var(--yw)":"var(--gn)"});
  const accionesHtml=dt.acciones?.length?`<div style="padding:8px 0;border-bottom:1px solid var(--bd)"><div style="font-size:.71rem;color:var(--mu);margin-bottom:6px;font-weight:600">Acciones prioritarias</div>${dt.acciones.map((a,i)=>`<div style="display:flex;gap:7px;margin-bottom:5px;align-items:flex-start"><span style="font-family:'JetBrains Mono',monospace;font-size:.62rem;color:var(--cy);flex-shrink:0;margin-top:2px;background:var(--cy-a);padding:1px 5px;border-radius:4px">${String(i+1).padStart(2,"0")}</span><span style="font-size:.8rem;line-height:1.5">${_esc(a)}</span></div>`).join("")}</div>`:"";
  const mciTag=dt.esMCI?`<span style="font-size:.62rem;background:rgba(255,128,96,.15);color:#ff8060;padding:1px 6px;border-radius:6px;margin-left:6px">MCI</span>`:"";
  document.getElementById("triageDetailContent").innerHTML=`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:12px;background:var(--bg3);border-radius:12px">
      <span class="hist-b ${cc}" style="font-size:.88rem;padding:5px 14px">${dt.clasificacion}</span>
      <div style="flex:1;min-width:0"><div style="font-weight:700;font-size:.9rem">${_esc(mMD[dt.motivo]||dt.motivo||"—")}${mciTag}</div><div style="font-size:.71rem;color:var(--mu);margin-top:2px">${_esc(date)}</div></div>
    </div>
    ${row("Tipo de paciente",_tipoLabel(dt.tipo))}
    ${dt.pacienteNombre?row("Paciente",dt.pacienteNombre):""}
    ${row("Nivel de dolor",dt.dolor!=null?`${dt.dolor}/10`:null)}
    ${row("Atendido por",dt.userName)}
    ${dt.notas?`<div style="padding:8px 0;border-bottom:1px solid var(--bd)"><div style="font-size:.71rem;color:var(--mu);margin-bottom:4px;font-weight:600">Notas clínicas</div><div style="font-size:.82rem;line-height:1.55">${_esc(dt.notas)}</div></div>`:""}
    ${dt.justificacion?`<div style="padding:8px 0;border-bottom:1px solid var(--bd)"><div style="font-size:.71rem;color:var(--mu);margin-bottom:4px;font-weight:600">Justificación IA</div><div style="font-size:.82rem;line-height:1.55">${_esc(dt.justificacion)}</div></div>`:""}
    ${accionesHtml}
    ${scores.length?`<div style="margin-top:12px"><div style="font-size:.68rem;color:var(--mu);font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">Scores clínicos</div><div style="display:flex;gap:8px;flex-wrap:wrap">${scores.map(s=>`<div style="background:var(--bg3);border-radius:10px;padding:9px 14px;text-align:center;flex:1;min-width:64px"><div style="font-size:1.2rem;font-weight:800;color:${s.c}">${s.v}</div><div style="font-size:.65rem;color:var(--mu);margin-top:2px">${s.l}</div></div>`).join("")}</div></div>`:""}
  `;
  document.getElementById("triageDetailSheet").style.display="";
  document.getElementById("triageDetailOverlay").style.display="";
}
function _openTriageDetail(idx){
  const dt=window._dashFiltered?.[idx];if(!dt)return;
  _showTriageDetail(dt);
}
function _closeTriageDetail(){
  document.getElementById("triageDetailSheet").style.display="none";
  document.getElementById("triageDetailOverlay").style.display="none";
}
function _triageDetailToHist(){
  _closeTriageDetail();_histFilter="all";navigateTo("hist");
}

function goToHistWithFilter(filter){
  _histFilter=filter;
  navigateTo('hist');
  // Sync filter button highlights after navigation renders
  setTimeout(()=>{
    document.querySelectorAll('#histFilters .hist-flt').forEach(b=>{
      b.classList.toggle('on',(b.dataset.f||'all')===filter);
    });
  },60);
}

async function loadHist(){
  if(!FB||!CU)return;
  const el=document.getElementById("histList");
  const _withTimeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),ms))]);
  // Fast path: render cached data immediately, then refresh silently in background
  if(_histDocs.length>0){
    renderHist();
    _withTimeout(getTriagesHistory(FB),12000).then(({empty,docs})=>{if(!empty){_histDocs=docs;renderHist();}}).catch(()=>{});
    return;
  }
  el.innerHTML=`<div class="ldg"><div class="sp"></div>${t('loading')||'Cargando...'}</div>`;
  try{
    const{empty,docs}=await _withTimeout(getTriagesHistory(FB),12000);
    if(empty){_histDocs=[];el.innerHTML=`<div class="empty"><div class="eic">📋</div><div class="etx">${t("noData")||"Sin datos aun."}</div></div>`;return;}
    _histDocs=docs;
    renderHist();
  }catch(e){
    if(el.innerHTML.includes("sp"))el.innerHTML=`<div class="empty"><div class="eic">⚠️</div><div class="etx">Error al cargar. <button onclick="loadHist()" style="color:var(--cy);background:none;border:none;cursor:pointer;font-size:.82rem;text-decoration:underline">Reintentar</button></div></div>`;
  }
}

