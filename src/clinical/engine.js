/**
 * MedAI Suite — Clinical Scoring Engine
 * Deterministic clinical scores. No AI, no side effects, pure functions.
 * @module src/clinical/engine
 */

export function checkCriticalVitals(vitals){
  const alerts=[];
  const {sys,hr,spo2,rr,temp}=vitals;
  if(spo2&&spo2<90)alerts.push({key:"SpO2",val:spo2,msg:`SpO₂ crítico: ${spo2}% (< 90%)`});
  else if(spo2&&spo2<95)alerts.push({key:"SpO2_warn",val:spo2,msg:`SpO₂ bajo: ${spo2}%`,warn:true});
  if(hr&&hr>150)alerts.push({key:"HR_high",val:hr,msg:`FC muy elevada: ${hr} lpm`});
  else if(hr&&hr>100)alerts.push({key:"HR_tach",val:hr,msg:`Taquicardia: ${hr} lpm`,warn:true});
  if(hr&&hr<40)alerts.push({key:"HR_low",val:hr,msg:`FC muy baja: ${hr} lpm`});
  else if(hr&&hr<60)alerts.push({key:"HR_brad",val:hr,msg:`Bradicardia: ${hr} lpm`,warn:true});
  if(sys&&sys>180)alerts.push({key:"SYS_high",val:sys,msg:`PA sistólica muy elevada: ${sys} mmHg`});
  else if(sys&&sys>160)alerts.push({key:"SYS_htn",val:sys,msg:`Hipertensión: ${sys} mmHg`,warn:true});
  if(sys&&sys<70)alerts.push({key:"SYS_low",val:sys,msg:`PA sistólica muy baja: ${sys} mmHg`});
  else if(sys&&sys<90)alerts.push({key:"SYS_hypo",val:sys,msg:`Hipotensión: ${sys} mmHg`,warn:true});
  if(rr&&rr>30)alerts.push({key:"RR_high",val:rr,msg:`FR muy elevada: ${rr} rpm`});
  else if(rr&&rr>20)alerts.push({key:"RR_tach",val:rr,msg:`Taquipnea: ${rr} rpm`,warn:true});
  if(rr&&rr<8)alerts.push({key:"RR_low",val:rr,msg:`FR muy baja: ${rr} rpm`});
  if(temp&&temp>=39.5)alerts.push({key:"TEMP_high",val:temp,msg:`Fiebre alta: ${temp}°C`});
  else if(temp&&temp>=38)alerts.push({key:"TEMP_fev",val:temp,msg:`Fiebre: ${temp}°C`,warn:true});
  if(temp&&temp<35)alerts.push({key:"TEMP_low",val:temp,msg:`Hipotermia: ${temp}°C`});
  else if(temp&&temp<36)alerts.push({key:"TEMP_hypo",val:temp,msg:`Temperatura baja: ${temp}°C`,warn:true});
  return alerts;
}

/** qSOFA — Quick SOFA sepsis screening (0-3). score >= 2 = high risk. */
export function calcQSOFA(vitals,consciousness){
  let score=0,details=[];
  if(vitals.rr&&vitals.rr>=22){score++;details.push("FR ≥ 22 rpm");}
  if(consciousness&&consciousness!=="alerta"){score++;details.push("Alteración nivel de consciencia");}
  if(vitals.sys&&vitals.sys<=100){score++;details.push("PAS ≤ 100 mmHg");}
  return{score,details,risk:score>=2?"high":"low"};
}

/**
 * NEWS2 — National Early Warning Score 2 (0-17), escala 1 de SpO₂.
 * Riesgo según RCP (2017): 0-4 bajo; un parámetro con 3 puntos = bajo-medio
 * (respuesta urgente en sala); 5-6 medio; ≥ 7 alto.
 * No incluye el punto por oxígeno suplementario (la app no registra ese dato).
 */
export function calcNEWS2(vitals,consc){
  const{sys,rr,spo2,hr,temp}=vitals;
  let score=0,components=[];
  const add=(pts,label,val)=>{if(pts>0){score+=pts;components.push({l:label,v:val,pts});}};
  if(rr){const p=rr<=8||rr>=25?3:rr>=21?2:rr<=11?1:0;add(p,"FR",`${rr} rpm`);}
  if(spo2){const p=spo2<=91?3:spo2<=93?2:spo2<=95?1:0;add(p,"SpO₂",`${spo2}%`);}
  if(sys){const p=sys<=90||sys>=220?3:sys<=100?2:sys<=110?1:0;add(p,"PAS",`${sys} mmHg`);}
  if(hr){const p=hr<=40||hr>=131?3:hr>=111?2:(hr<=50||hr>=91)?1:0;add(p,"FC",`${hr} lpm`);}
  if(temp){const p=temp<=35?3:temp>=39.1?2:(temp>=38.1||temp<=36)?1:0;add(p,"Temp",`${temp}°C`);}
  if(consc&&consc!=="alerta"){score+=3;components.push({l:"Consciencia",v:"Alterada",pts:3});}
  const anyThree=components.some(c=>c.pts>=3);
  let risk,riskLabel,riskColor;
  if(score>=7){risk="high";riskLabel="Alto — Respuesta de emergencia";riskColor="var(--rd)";}
  else if(score>=5){risk="medium";riskLabel="Medio — Respuesta urgente";riskColor="var(--yw)";}
  else if(anyThree){risk="medium";riskLabel="Bajo-medio — Un parámetro en 3: respuesta urgente en sala";riskColor="var(--yw)";}
  else{risk="low";riskLabel="Bajo — Monitoreo rutinario";riskColor="var(--gn)";}
  return{score,risk,riskLabel,riskColor,components,singleParam3:anyThree};
}

/** Shock Index — HR / SBP ratio. >= 1.4 = severe. */
export function calcShockIndex(hr,sbp){
  hr=parseFloat(hr);sbp=parseFloat(sbp);
  if(!hr||!sbp||sbp===0)return null;
  const idx=hr/sbp;
  let risk,label,color;
  if(idx>=1.4){risk="severe";label="Riesgo severo — Atención inmediata";color="var(--rd)";}
  else if(idx>=1.0){risk="moderate";label="Hipoperfusión moderada";color="var(--yw)";}
  else if(idx>=0.8){risk="mild";label="Monitorear";color="var(--yw)";}
  else{risk="normal";label="Normal";color="var(--gn)";}
  return{idx:idx.toFixed(2),risk,label,color};
}

/**
 * CURB-65 — Pneumonia severity index (0-5).
 * @param {{confusion:boolean, urea_high:boolean, rr:number, sbp:number, dbp:number, age:number}} p
 * @returns {{score:number, risk:string, label:string, color:string, details:string[]}}
 */
export function calcCURB65(p){
  let score=0,details=[];
  if(p.confusion){score++;details.push("Confusión aguda");}
  if(p.urea_high){score++;details.push("Urea > 7 mmol/L");}
  if(p.rr&&p.rr>=30){score++;details.push("FR ≥ 30 rpm");}
  if((p.sbp&&p.sbp<90)||(p.dbp&&p.dbp<=60)){score++;details.push("PA < 90/60 mmHg");}
  if(p.age&&p.age>=65){score++;details.push("Edad ≥ 65 años");}
  let risk,label,color;
  if(score>=3){risk="high";label="Alto — Hospitalización / UCI";color="var(--rd)";}
  else if(score===2){risk="medium";label="Moderado — Hospitalización";color="var(--yw)";}
  else{risk="low";label="Bajo — Tratamiento ambulatorio";color="var(--gn)";}
  return{score,risk,label,color,details};
}

/**
 * HEART Score — Chest pain risk stratification (0-10).
 * H=History, E=ECG, A=Age, R=Risk factors, T=Troponin
 * Risk: 0-3=low, 4-6=moderate, 7-10=high
 */
export function calcHEART(p){
  let score=0,details=[];
  // History (0-2)
  const hScore=p.history??0;score+=hScore;
  if(hScore===2)details.push("Historia muy sospechosa (2)");
  else if(hScore===1)details.push("Historia moderadamente sospechosa (1)");
  else details.push("Historia poco sospechosa (0)");
  // ECG (0-2)
  const eScore=p.ecg??0;score+=eScore;
  if(eScore===2)details.push("ECG: desviación ST significativa (2)");
  else if(eScore===1)details.push("ECG: repolarización inespecífica (1)");
  else details.push("ECG: normal (0)");
  // Age (0-2)
  const age=p.age??0;
  const aScore=age>=65?2:age>=45?1:0;score+=aScore;
  details.push(`Edad ${age} años (${aScore})`);
  // Risk factors (0-2)
  const rScore=p.risk??0;score+=rScore;
  if(rScore===2)details.push("Factores de riesgo: ≥3 o ateroesclerosis conocida (2)");
  else if(rScore===1)details.push("Factores de riesgo: 1-2 (1)");
  else details.push("Sin factores de riesgo (0)");
  // Troponin (0-2)
  const tScore=p.troponin??0;score+=tScore;
  if(tScore===2)details.push("Troponina: >3× normal (2)");
  else if(tScore===1)details.push("Troponina: 1-3× normal (1)");
  else details.push("Troponina: ≤ normal (0)");
  let risk,label,color,action;
  if(score>=7){risk="high";label="Alto riesgo — Revascularización urgente";color="var(--rd)";action="Ingreso + coronariografía precoz";}
  else if(score>=4){risk="medium";label="Riesgo moderado — Observación y pruebas";color="var(--yw)";action="Observación 6-12h + troponinas seriadas";}
  else{risk="low";label="Bajo riesgo — Alta precoz posible";color="var(--gn)";action="Protocolo de alta acelerada (si 2 troponinas negativas)";}
  return{score,risk,label,color,details,action};
}

/**
 * ROSIER Scale — Recognition of Stroke in the Emergency Room (−2 to +5).
 * Stroke likely if score > 0.
 */
export function calcROSIER(p){
  let score=0,details=[];
  // Ítems negativos separados (Nor et al., 2005). `syncope_seizure` se mantiene por compatibilidad.
  if(p.syncope||(p.syncope_seizure&&p.syncope===undefined)){score-=1;details.push("Pérdida de consciencia o síncope (−1)");}
  if(p.seizure){score-=1;details.push("Actividad convulsiva (−1)");}
  if(p.face_weakness){score+=1;details.push("Debilidad facial asimétrica (+1)");}
  if(p.arm_weakness){score+=1;details.push("Debilidad en brazo (+1)");}
  if(p.leg_weakness){score+=1;details.push("Debilidad en pierna (+1)");}
  if(p.speech_disturbance){score+=1;details.push("Trastorno del habla (+1)");}
  if(p.visual_field){score+=1;details.push("Defecto campo visual (+1)");}
  const strokeLikely=score>0;
  let risk,label,color,action;
  if(score>=3){risk="high";label="ACV muy probable";color="var(--rd)";action="Activar protocolo CÓDIGO ICTUS — TAC urgente";}
  else if(score>0){risk="medium";label="ACV posible";color="var(--yw)";action="TAC craneal urgente — Neurología";}
  else{risk="low";label="ACV poco probable";color="var(--gn)";action="Considerar diagnósticos alternativos";}
  return{score,risk,label,color,details,strokeLikely,action};
}

/**
 * Wells DVT Score — Deep vein thrombosis probability (modelo de 3 niveles, Wells 1997).
 * Alta ≥ 3, moderada 1-2, baja ≤ 0.
 * @param {{cancer:boolean, paralysis:boolean, bedridden:boolean, tenderness:boolean, leg_swollen:boolean, calf_diff:boolean, pitting:boolean, collateral:boolean, previous_dvt:boolean, alt_diagnosis:boolean}} p
 * @returns {{score:number, risk:string, label:string, color:string}}
 */
export function calcWellsDVT(p){
  let score=0;
  if(p.cancer)score+=1;
  if(p.paralysis)score+=1;
  if(p.bedridden)score+=1;
  if(p.tenderness)score+=1;
  if(p.leg_swollen)score+=1;
  if(p.calf_diff)score+=1;
  if(p.pitting)score+=1;
  if(p.collateral)score+=1;
  if(p.previous_dvt)score+=1;
  if(p.alt_diagnosis)score-=2;
  let risk,label,color;
  if(score>=3){risk="high";label="Alta probabilidad TVP";color="var(--rd)";}
  else if(score>=1){risk="medium";label="Probabilidad moderada TVP";color="var(--yw)";}
  else{risk="low";label="Baja probabilidad TVP";color="var(--gn)";}
  return{score,risk,label,color};
}
