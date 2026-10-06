/**
 * MedIA Suite — AI Triage Prompt Builder
 * Constructs the DeepSeek prompt string from triage data. Pure function.
 * @module src/ai/prompt
 */

/**
 * @param {Object} TD          - triage data object
 * @param {string} CL          - current language code
 * @param {Object|null} patientHC - patient history record (or null)
 * @returns {string} prompt string ready to send to the AI
 */
export function buildTriagePrompt(TD,CL,patientHC){
  const mM={dolor_pecho:"Dolor pecho",disnea:"Dif. respirar",trauma:"Trauma",abdominal:"Dolor abdominal",neuro:"Convulsion/inconsciencia",fiebre:"Fiebre alta",otro:"Otro"};
  const cM={alerta:"Alerta",voz:"Solo a voz",dolor_e:"Solo al dolor",inconsc:"Inconsciente"};
  const tM={adulto:"Adulto 18-59",adulto_mayor:"Adulto mayor 60+",embarazada:"Embarazada",nino:`Nino ${TD.enino||"?"} anos`};
  const sM={sangrado:"Sangrado",palido:"Palidez/sudoracion",mareo:"Mareo",cianosis:"Cianosis",temp_alta:"Temp>39C",debilidad:"Debilidad",ninguno:"Ninguno"};
  const vt=TD.vit||{};
  const vtx=[vt.ps?`PA:${vt.ps}/${vt.pd||"?"}`:null,vt.fc?`FC:${vt.fc}lpm`:null,vt.sat?`SatO2:${vt.sat}%`:null,vt.tem?`T:${vt.tem}C`:null,vt.fr?`FR:${vt.fr}rpm`:null].filter(Boolean).join(" ")||"No disponibles";
  const sx=TD.sint?TD.sint.map(s=>sM[s]||s).join(", "):"No indicados";
  const pedN=TD.tipo==="nino"?`\nNINO: ${TD.enino||"?"} anos. Usa rangos pediatricos.`:"";
  const notasExtra=TD.notas&&TD.notas.trim()?`\nAnotaciones clinicas del profesional: ${TD.notas.trim()}`:"";
  const otraDescExtra=TD.motivo==="otro"&&TD.otraDesc&&TD.otraDesc.trim()?`\nDescripcion del sintoma (texto libre): ${TD.otraDesc.trim()}`:"";
  let hcExtra="";
  if(patientHC){
    const ant=(patientHC.antecedentes||[]).join(", ");
    const ale=(patientHC.alergias||[]).join(", ");
    const med=(patientHC.medicacion||[]).join(", ");
    const nts=patientHC.notes||"";
    hcExtra=`\n--- HISTORIA CLÍNICA REGISTRADA ---\nPaciente: ${patientHC.name||""}, ${patientHC.age||"?"}años, ${patientHC.sex==="M"?"Masculino":"Femenino"}`;
    if(ant)hcExtra+=`\nAntecedentes: ${ant}`;
    if(ale)hcExtra+=`\nAlergias conocidas: ${ale}`;
    if(med)hcExtra+=`\nMedicación actual: ${med}`;
    if(nts)hcExtra+=`\nNotas previas: ${nts}`;
    hcExtra+="\nConsidera esta historia clínica en tu clasificación y alertas.";
  }
  const _lr=({es:'español',en:'English',pt:'português',fr:'français',de:'Deutsch',ja:'日本語'})[CL]||'español';
  return `Experto triage hospitalario ESI/Manchester.${pedN}
PACIENTE: ${tM[TD.tipo]||TD.tipo}
Motivo: ${mM[TD.motivo]||TD.motivo}
Consciencia: ${cM[TD.consc]||TD.consc}
Vitales: ${vtx}
Dolor: ${TD.dolor!==undefined?TD.dolor:"N/A"}/10
Sintomas: ${sx}${TD.semanas?`\nSemanas: ${TD.semanas}`:""}${otraDescExtra}${notasExtra}${hcExtra}
Responde con todos los valores textuales en ${_lr}. SOLO JSON sin backticks:
{"clasificacion":"ROJO"|"AMARILLO"|"VERDE","justificacion":"max 2 oraciones","acciones":["...","...","..."],"alertas_criticas":[],"tiempo_atencion":"...","red_flags":["..."],"suggested_tests":["..."],"protocol_hint":"nombre del protocolo clinico o null"}`;
}
