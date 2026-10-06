// 11-dolor-sintomas.js — Escala de dolor y preguntas por síntoma
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden numérico desde index.html.
// ══════════════════════════════════════
// SCALA DE DOLOR MEJORADA + FACIAL
// ══════════════════════════════════════
function renderScaleEnhanced(card, stepId){
  const tx2=L[CL]||L.es;
  // Numeric scale
  const numWrap = document.createElement('div');
  numWrap.innerHTML = `<div class="qsub" style="margin-bottom:8px;font-weight:600;color:var(--tx)">${tx2.painNumeric||'Escala numerica (0-10)'}</div>`;
  const sg = document.createElement('div'); sg.className='sgrid';
  for(let i=0;i<=10;i++){
    const b=document.createElement('button'); const hi=i>=7;
    b.className='sb'+(TD[stepId]==i?(hi?' selh':' sel'):'');
    b.textContent=i; b.onclick=()=>{
      TD[stepId]=i;
      // Highlight buttons inline — no full re-render
      document.querySelectorAll('#trc .sb').forEach(bb=>{const v2=+bb.textContent;bb.className='sb'+(v2===i?(i>=7?' selh':' sel'):'');});
      // Sync face carousel to nearest face without overriding the numeric value
      const ni=faces.reduce((best,f,fi)=>Math.abs(f.score-i)<Math.abs(faces[best].score-i)?fi:best,0);
      buildFC(ni,ni>cIdx?1:-1,true);
      const nx=document.querySelector('#trc .bnxt');if(nx)nx.disabled=false;
    };
    sg.appendChild(b);
  }
  const lb=document.createElement('div'); lb.className='slabs';
  lb.innerHTML=`<span>${t('noPain')||'Sin dolor'}</span><span>${t('unbearable')||'Insoportable'}</span>`;
  numWrap.appendChild(sg); numWrap.appendChild(lb);
  card.appendChild(numWrap);

  // Separator
  const sep = document.createElement('div');
  sep.style.cssText='margin:14px 0;font-size:.72rem;color:var(--mu);text-align:center;display:flex;align-items:center;gap:8px';
  sep.innerHTML=`<span style="flex:1;height:1px;background:var(--bd)"></span>${tx2.painFacialOr||'O usa la escala facial'}<span style="flex:1;height:1px;background:var(--bd)"></span>`;
  card.appendChild(sep);

  // Facial label
  const faceLabel = document.createElement('div');
  faceLabel.innerHTML=`<div class="qsub" style="margin-bottom:4px;font-weight:600;color:var(--tx)">${tx2.painFacial||'Escala facial'} <span style="font-size:.72rem;font-weight:400;color:var(--mu)">— ${tx2.painFacialSub||'Para ninos o dificultades de expresion'}</span></div>`;
  card.appendChild(faceLabel);

  const faces=[
    {score:0, label:t('f0')||'Sin dolor',   color:'#00e07a', svg:'<circle cx="18" cy="14" r="2.2" fill="#1a4a2e"/><circle cx="30" cy="14" r="2.2" fill="#1a4a2e"/><path d="M13 27 Q24 35 35 27" stroke="#1a4a2e" stroke-width="2.5" fill="none" stroke-linecap="round"/>'},
    {score:2, label:t('f2')||'Muy leve',    color:'#7ee8a2', svg:'<circle cx="18" cy="14" r="2.2" fill="#1a4a2e"/><circle cx="30" cy="14" r="2.2" fill="#1a4a2e"/><path d="M14 28 Q24 33 34 28" stroke="#1a4a2e" stroke-width="2.5" fill="none" stroke-linecap="round"/>'},
    {score:4, label:t('f4')||'Leve',        color:'#ffeb3b', svg:'<circle cx="18" cy="14" r="2.2" fill="#5a4a00"/><circle cx="30" cy="14" r="2.2" fill="#5a4a00"/><path d="M15 29 Q24 29 33 29" stroke="#5a4a00" stroke-width="2.5" fill="none" stroke-linecap="round"/>'},
    {score:6, label:t('f6')||'Moderado',    color:'#ffb830', svg:'<circle cx="18" cy="13" r="2.2" fill="#5a3600"/><circle cx="30" cy="13" r="2.2" fill="#5a3600"/><path d="M14 31 Q24 26 34 31" stroke="#5a3600" stroke-width="2.5" fill="none" stroke-linecap="round"/>'},
    {score:8, label:t('f8')||'Fuerte',      color:'#ff7043', svg:'<circle cx="18" cy="12" r="2.2" fill="#4a1000"/><circle cx="30" cy="12" r="2.2" fill="#4a1000"/><ellipse cx="18" cy="9.5" rx="3.5" ry="1.8" fill="#4a1000" opacity=".35"/><ellipse cx="30" cy="9.5" rx="3.5" ry="1.8" fill="#4a1000" opacity=".35"/><path d="M13 33 Q24 26 35 33" stroke="#4a1000" stroke-width="2.5" fill="none" stroke-linecap="round"/>'},
    {score:10,label:t('f10')||'Insoportable',color:'#ff3a5c', svg:'<circle cx="18" cy="11" r="2.2" fill="#3a0010"/><circle cx="30" cy="11" r="2.2" fill="#3a0010"/><ellipse cx="18" cy="8.5" rx="4" ry="2.2" fill="#3a0010" opacity=".4"/><ellipse cx="30" cy="8.5" rx="4" ry="2.2" fill="#3a0010" opacity=".4"/><ellipse cx="24" cy="33" rx="7" ry="4.5" fill="#3a0010" opacity=".18"/><path d="M13 34 Q24 26 35 34" stroke="#3a0010" stroke-width="2.8" fill="none" stroke-linecap="round"/>'},
  ];

  // CAROUSEL
  const cWrap = document.createElement('div');
  let cIdx = TD[stepId]!==undefined ? faces.reduce((b,f,i)=>Math.abs(f.score-TD[stepId])<Math.abs(faces[b].score-TD[stepId])?i:b,0) : 0;

  function buildFC(idx, dir, keepScore=false){
    cIdx = Math.max(0, Math.min(idx, faces.length-1));
    const f = faces[cIdx];
    if(!keepScore) TD[stepId] = f.score;
    // Sync numeric grid — highlight actual TD value, not necessarily the face score
    document.querySelectorAll('#trc .sb').forEach(b=>{
      const v=+b.textContent;b.className='sb'+(v===TD[stepId]?(v>=7?' selh':' sel'):'');
    });
    const bnxt=document.querySelector('#trc .bnxt');
    if(bnxt) bnxt.disabled=false;
    cWrap.innerHTML=`
      <div class="fcarousel" id="fcarousel" style="background:${f.color}16;box-shadow:0 0 48px ${f.color}1a">
        <div class="fc-face" style="--fsl:${dir*28}px">
          <svg class="fc-svg" viewBox="0 0 48 48" fill="none" style="filter:drop-shadow(0 8px 24px ${f.color}88)">
            <circle cx="24" cy="24" r="20" fill="${f.color}" opacity=".92"/>
            ${f.svg}
          </svg>
          <div class="fc-score" style="color:${f.color}">${f.score}</div>
          <div class="fc-label" style="color:${f.color}">${f.label}</div>
        </div>
        <div class="fc-dots">
          ${faces.map((ff,i)=>`<div class="fc-dot${i===cIdx?' on':''}" data-fi="${i}" style="${i===cIdx?`width:22px;background:${f.color}`:''}"></div>`).join('')}
        </div>
        <div class="fc-navs">
          <button class="fc-btn" id="fc-prev" style="color:${f.color}" ${cIdx===0?'disabled':''}>&#8592;</button>
          <button class="fc-btn" id="fc-next" style="color:${f.color}" ${cIdx===faces.length-1?'disabled':''}>&#8594;</button>
        </div>
      </div>`;
    cWrap.querySelectorAll('.fc-dot').forEach(d=>{
      d.onclick=()=>{const ni=+d.dataset.fi;if(ni!==cIdx)buildFC(ni,ni>cIdx?1:-1);};
    });
    const pBtn=cWrap.querySelector('#fc-prev');const nBtn=cWrap.querySelector('#fc-next');
    if(pBtn)pBtn.onclick=()=>{if(cIdx>0)buildFC(cIdx-1,-1);};
    if(nBtn)nBtn.onclick=()=>{if(cIdx<faces.length-1)buildFC(cIdx+1,1);};
    let tX=0;
    const fc=cWrap.querySelector('#fcarousel');
    fc.addEventListener('touchstart',e=>{tX=e.touches[0].clientX;},{passive:true});
    fc.addEventListener('touchend',e=>{
      const dx=e.changedTouches[0].clientX-tX;
      if(Math.abs(dx)>40){if(dx<0&&cIdx<faces.length-1)buildFC(cIdx+1,1);else if(dx>0&&cIdx>0)buildFC(cIdx-1,-1);}
    },{passive:true});
  }
  buildFC(cIdx, 0, TD[stepId]!==undefined);
  card.appendChild(cWrap);
}

// ══════════════════════════════════════
// PREGUNTAS ESPECIFICAS POR SINTOMA
// ══════════════════════════════════════
const SYM_QS = {
  es:{
    dolor_pecho:[
      {k:'tipo_dolor', q:'Tipo de dolor', opts:['Opresivo / apretante','Quemante / ardor','Punzante / agudo','Sordo / presion constante']},
      {k:'irradia', q:'El dolor se extiende hacia', opts:['Brazo izquierdo','Mandibula / cuello','Espalda','No se extiende']},
      {k:'inicio', q:'Cuando comenzo', opts:['Al hacer esfuerzo','En reposo','Con la respiracion','Despues de comer']},
    ],
    disnea:[
      {k:'dif_tipo', q:'La dificultad para respirar es', opts:['Al caminar','En reposo','Al acostarse','Constante']},
      {k:'dif_inicio', q:'Comenzo', opts:['De repente','Gradualmente','Con esfuerzo','Hace dias']},
    ],
    abdominal:[
      {k:'ab_zona', q:'Ubicacion del dolor', opts:['Parte alta (estomago)','Parte baja','Lado derecho','Lado izquierdo','Todo el abdomen']},
      {k:'ab_tipo', q:'Tipo de dolor', opts:['Tipo calambre / colico','Constante','Mejora al comer','Empeora al comer']},
    ],
    trauma:[
      {k:'trauma_tipo', q:'Tipo de trauma', opts:['Caida','Accidente de transito','Golpe directo','Herida cortante']},
      {k:'trauma_zona', q:'Zona afectada', opts:['Cabeza / craneo','Torax / costillas','Abdomen','Extremidades']},
    ],
    neuro:[
      {k:'neuro_tipo', q:'El episodio fue', opts:['Convulsiones / sacudidas','Desmayo / sincope','Confusion / desorientacion','ACV / paralisis']},
      {k:'neuro_dur', q:'Duracion', opts:['Menos de 1 minuto','1-5 minutos','Mas de 5 minutos','Continua']},
    ],
    fiebre:[
      {k:'fiebre_tiempo', q:'Cuanto tiempo lleva con fiebre', opts:['Menos de 24 horas','1-3 dias','Mas de 3 dias']},
      {k:'fiebre_otros', q:'Acompanado de', opts:['Escalofrios','Sudoracion','Dolor de cabeza','Erupcion en la piel']},
    ],
  },
  en:{
    dolor_pecho:[
      {k:'tipo_dolor', q:'Type of pain', opts:['Pressure / tightness','Burning / heartburn','Sharp / stabbing','Dull / constant pressure']},
      {k:'irradia', q:'Pain radiates to', opts:['Left arm','Jaw / neck','Back','Does not radiate']},
      {k:'inicio', q:'When it started', opts:['During exertion','At rest','With breathing','After eating']},
    ],
    disnea:[
      {k:'dif_tipo', q:'Difficulty breathing occurs', opts:['While walking','At rest','When lying down','Constantly']},
      {k:'dif_inicio', q:'It started', opts:['Suddenly','Gradually','With exertion','Days ago']},
    ],
    abdominal:[
      {k:'ab_zona', q:'Pain location', opts:['Upper abdomen','Lower abdomen','Right side','Left side','Entire abdomen']},
      {k:'ab_tipo', q:'Type of pain', opts:['Cramps / colic','Constant','Better after eating','Worse after eating']},
    ],
    trauma:[
      {k:'trauma_tipo', q:'Type of trauma', opts:['Fall','Traffic accident','Direct blow','Cutting wound']},
      {k:'trauma_zona', q:'Affected area', opts:['Head / skull','Chest / ribs','Abdomen','Extremities']},
    ],
    neuro:[
      {k:'neuro_tipo', q:'The episode was', opts:['Seizures / convulsions','Fainting / syncope','Confusion / disorientation','Stroke / paralysis']},
      {k:'neuro_dur', q:'Duration', opts:['Less than 1 minute','1-5 minutes','More than 5 minutes','Ongoing']},
    ],
    fiebre:[
      {k:'fiebre_tiempo', q:'How long with fever', opts:['Less than 24 hours','1-3 days','More than 3 days']},
      {k:'fiebre_otros', q:'Accompanied by', opts:['Chills','Sweating','Headache','Skin rash']},
    ],
  },
  pt:{
    dolor_pecho:[
      {k:'tipo_dolor', q:'Tipo de dor', opts:['Pressao / aperto','Queimacao / azia','Pontada / aguda','Surda / pressao constante']},
      {k:'irradia', q:'A dor se estende para', opts:['Braco esquerdo','Mandibula / pescoco','Costas','Nao se estende']},
      {k:'inicio', q:'Quando comecou', opts:['Ao fazer esforca','Em repouso','Com a respiracao','Apos comer']},
    ],
    disnea:[
      {k:'dif_tipo', q:'A dificuldade para respirar e', opts:['Ao caminhar','Em repouso','Ao deitar','Constante']},
      {k:'dif_inicio', q:'Comecou', opts:['De repente','Gradualmente','Com esforca','Ha dias']},
    ],
    abdominal:[
      {k:'ab_zona', q:'Localizacao da dor', opts:['Parte alta (estomago)','Parte baixa','Lado direito','Lado esquerdo','Todo o abdome']},
      {k:'ab_tipo', q:'Tipo de dor', opts:['Tipo caimbra / colica','Constante','Melhora ao comer','Piora ao comer']},
    ],
    trauma:[
      {k:'trauma_tipo', q:'Tipo de trauma', opts:['Queda','Acidente de transito','Golpe direto','Ferida cortante']},
      {k:'trauma_zona', q:'Zona afetada', opts:['Cabeca / cranio','Torax / costelas','Abdome','Extremidades']},
    ],
    neuro:[
      {k:'neuro_tipo', q:'O episodio foi', opts:['Convulsoes / tremores','Desmaio / sincope','Confusao / desorientacao','AVC / paralisia']},
      {k:'neuro_dur', q:'Duracao', opts:['Menos de 1 minuto','1-5 minutos','Mais de 5 minutos','Continua']},
    ],
    fiebre:[
      {k:'fiebre_tiempo', q:'Ha quanto tempo tem febre', opts:['Menos de 24 horas','1-3 dias','Mais de 3 dias']},
      {k:'fiebre_otros', q:'Acompanhado de', opts:['Calafrios','Sudoracao','Dor de cabeca','Erupocao na pele']},
    ],
  },
  fr:{
    dolor_pecho:[
      {k:'tipo_dolor', q:'Type de douleur', opts:['Oppression / serrement','Brulement / aigreurs','Poignardant / aigu','Sourd / pression constante']},
      {k:'irradia', q:'La douleur irradie vers', opts:['Bras gauche','Machoire / cou','Dos','Ne rayonne pas']},
      {k:'inicio', q:'Quand cela a commence', opts:["A l'effort",'Au repos','Avec la respiration','Apres manger']},
    ],
    disnea:[
      {k:'dif_tipo', q:'La difficulte a respirer survient', opts:['En marchant','Au repos','En position allongee','Constamment']},
      {k:'dif_inicio', q:'Cela a commence', opts:['Soudainement','Progressivement',"A l'effort",'Il y a quelques jours']},
    ],
    abdominal:[
      {k:'ab_zona', q:'Localisation de la douleur', opts:['Partie haute (estomac)','Partie basse','Cote droit','Cote gauche','Tout l abdomen']},
      {k:'ab_tipo', q:'Type de douleur', opts:['Type crampe / colique','Constante','Meilleure apres manger','Pire apres manger']},
    ],
    trauma:[
      {k:'trauma_tipo', q:'Type de traumatisme', opts:['Chute','Accident de la route','Coup direct','Blessure coupante']},
      {k:'trauma_zona', q:'Zone atteinte', opts:['Tete / crane','Thorax / cotes','Abdomen','Membres']},
    ],
    neuro:[
      {k:'neuro_tipo', q:"L episode etait", opts:['Convulsions / secousses','Evanouissement / syncope','Confusion / desorientation','AVC / paralysie']},
      {k:'neuro_dur', q:'Duree', opts:['Moins de 1 minute','1-5 minutes','Plus de 5 minutes','Continue']},
    ],
    fiebre:[
      {k:'fiebre_tiempo', q:'Depuis combien de temps avec fievre', opts:['Moins de 24 heures','1-3 jours','Plus de 3 jours']},
      {k:'fiebre_otros', q:'Accompagne de', opts:['Frissons','Transpiration','Mal de tete','Eruption cutanee']},
    ],
  },
  de:{
    dolor_pecho:[
      {k:'tipo_dolor', q:'Art des Schmerzes', opts:['Druck / Enge','Brennen / Sodbrennen','Stechend / scharf','Dumpf / konstanter Druck']},
      {k:'irradia', q:'Schmerz strahlt aus in', opts:['Linken Arm','Kiefer / Hals','Rucken','Strahlt nicht aus']},
      {k:'inicio', q:'Wann begann es', opts:['Bei Anstrengung','In Ruhe','Mit der Atmung','Nach dem Essen']},
    ],
    disnea:[
      {k:'dif_tipo', q:'Atemnot tritt auf', opts:['Beim Gehen','In Ruhe','Im Liegen','Standig']},
      {k:'dif_inicio', q:'Es begann', opts:['Plotzlich','Allmahlich','Bei Anstrengung','Vor einigen Tagen']},
    ],
    abdominal:[
      {k:'ab_zona', q:'Schmerzort', opts:['Oberbauch (Magen)','Unterbauch','Rechte Seite','Linke Seite','Ganzer Bauch']},
      {k:'ab_tipo', q:'Art des Schmerzes', opts:['Krampfartig / Kolik','Konstant','Besser nach Essen','Schlimmer nach Essen']},
    ],
    trauma:[
      {k:'trauma_tipo', q:'Art des Traumas', opts:['Sturz','Verkehrsunfall','Direkter Schlag','Schnittwunde']},
      {k:'trauma_zona', q:'Betroffene Zone', opts:['Kopf / Schadel','Brustkorb / Rippen','Bauch','Extremitaten']},
    ],
    neuro:[
      {k:'neuro_tipo', q:'Die Episode war', opts:['Krampfe / Zuckungen','Ohnmacht / Synkope','Verwirrung / Desorientierung','Schlaganfall / Lahmung']},
      {k:'neuro_dur', q:'Dauer', opts:['Weniger als 1 Minute','1-5 Minuten','Mehr als 5 Minuten','Andauernd']},
    ],
    fiebre:[
      {k:'fiebre_tiempo', q:'Wie lange mit Fieber', opts:['Weniger als 24 Stunden','1-3 Tage','Mehr als 3 Tage']},
      {k:'fiebre_otros', q:'Begleitet von', opts:['Schuttelfrost','Schwitzen','Kopfschmerzen','Hautausschlag']},
    ],
  },
};
function getSymptomQs(){return SYM_QS[CL]||SYM_QS.es;}

function renderSymptomDetail(card){
  const motivo = TD.motivo;
  const questions = getSymptomQs()[motivo] || [];
  if(!questions.length){
    // No specific questions, skip
    TD.sintoma_detalle = {};
    TS++;TM=[];rTriage();
    return true; // signal to skip rendering
  }
  if(!TD.sintoma_detalle) TD.sintoma_detalle={};
  questions.forEach(q=>{
    const wrap = document.createElement('div'); wrap.className='symptom-q';
    wrap.innerHTML=`<div class="symptom-q-title">${q.q}</div>`;
    const opts = document.createElement('div'); opts.className='symptom-opts';
    q.opts.forEach(opt=>{
      const b = document.createElement('button');
      b.className='symptom-opt'+(TD.sintoma_detalle[q.k]===opt?' sel':'');
      b.textContent=opt;
      b.onclick=()=>{TD.sintoma_detalle[q.k]=opt; rTriage();};
      opts.appendChild(b);
    });
    wrap.appendChild(opts);
    card.appendChild(wrap);
  });
  return false;
}

