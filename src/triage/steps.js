/**
 * MedIA Suite — Triage Step Definitions
 * Returns the ordered triage wizard steps, localized via the L/CL pair.
 * @module src/triage/steps
 */

/**
 * @param {Object} L  - full i18n dictionary from src/i18n/index.js
 * @param {string} CL - current language code (e.g. "es")
 * @returns {Object[]} ordered step descriptors
 */
export function getSteps(L,CL){
  const tx=L[CL]||L.es;
  return [
    {id:"tipo",title:tx.patientType||"Tipo de paciente",sub:tx.selectProfile||"Seleccione el perfil.",t:"opts",opts:[
      {ic:"👶",l:tx.childLbl||"Pediatrico (0-12)",v:"nino"},
      {ic:"🧒",l:tx.teenLbl||"Adolescente (13-17)",v:"adolescente"},
      {ic:"🧑",l:tx.adultLbl||"Adulto (18-59)",v:"adulto"},
      {ic:"👴",l:tx.elderLbl||"Tercera edad (60+)",v:"adulto_mayor"},
      {ic:"🤰",l:tx.pregLbl||"Embarazada",v:"embarazada"},
      {ic:"♿",l:tx.mobilityLbl||"Movilidad / capacidad reducida",v:"movilidad"}]},
    {id:"motivo",title:tx.mainReason||"Motivo de consulta",sub:tx.selectSymptom||"Seleccione el sintoma dominante.",t:"opts",opts:[
      {ic:"💔",l:tx.chestPainL||"Dolor en el pecho",v:"dolor_pecho"},
      {ic:"🫁",l:tx.breathingL||"Dificultad para respirar",v:"disnea"},
      {ic:"🤕",l:tx.traumaL||"Trauma / golpe / herida",v:"trauma"},
      {ic:"🤢",l:tx.abdominalL||"Dolor abdominal / vomito",v:"abdominal"},
      {ic:"🧠",l:tx.neuroL||"Convulsion / perdida de consciencia",v:"neuro"},
      {ic:"🌡️",l:tx.feverL||"Fiebre alta",v:"fiebre"},
      {ic:"😰",l:tx.otherL||"Otro / sintomas generales",v:"otro"}]},
    {id:"otraDesc",title:"Describe el síntoma principal",sub:"Breve descripción del motivo de consulta para el asistente de IA.",t:"freetext",placeholder:"Ej: dolor de cabeza desde ayer, erupciones en la piel, cansancio extremo...",hint:"Este texto ayuda al Copilot y a la IA a dar sugerencias más precisas. Puede dejarse vacío.",skip:d=>d.motivo!=="otro"},
    {id:"consc",title:tx.consciousness||"Nivel de consciencia",sub:tx.evalAlert||"Evalua el estado de alerta.",t:"opts",opts:[
      {ic:"👁️",l:tx.consc1||"Alerta — responde normalmente",v:"alerta"},
      {ic:"🗣️",l:tx.consc2||"Responde solo a voz",v:"voz"},
      {ic:"✊",l:tx.consc3||"Responde solo al dolor",v:"dolor_e"},
      {ic:"❌",l:tx.consc4||"No responde (inconsciente)",v:"inconsc"}]},
    {id:"vit",title:tx.vitals||"Signos vitales",sub:tx.enterVitals||"Ingrese los valores disponibles.",t:"vitals"},
    {id:"dolor",title:tx.painScale||"Escala de dolor",sub:tx.painNumeric||"Nivel 0 a 10.",t:"scale_enhanced"},
    {id:"sintoma_detalle",title:tx.symptomDetail||"Caracteristicas del sintoma",sub:tx.selectApply||"Selecciona las que apliquen.",t:"symptom_detail"},
    {id:"sint",title:tx.additionalSymptoms||"Sintomas adicionales",sub:tx.markApply||"Marque todos los que apliquen.",t:"multi",opts:[
      {ic:"🩸",l:tx.sym1||"Sangrado activo",v:"sangrado"},
      {ic:"💧",l:tx.sym2||"Palidez o sudoracion fria",v:"palido"},
      {ic:"🌀",l:tx.sym3||"Mareo / perdida de equilibrio",v:"mareo"},
      {ic:"👄",l:tx.sym4||"Cianosis (labios o unas azulados)",v:"cianosis"},
      {ic:"🔥",l:tx.sym5||"Temperatura >39C",v:"temp_alta"},
      {ic:"📉",l:tx.sym6||"Debilidad muscular intensa",v:"debilidad"},
      {ic:"🤮",l:tx.sym8||"Nauseas / vomito intenso",v:"nauseas"},
      {ic:"🫀",l:tx.sym9||"Palpitaciones / arritmia",v:"palpitaciones"},
      {ic:"👁️",l:tx.sym10||"Vision borrosa o doble",v:"vision_alt"},
      {ic:"💛",l:tx.sym11||"Ictericia (piel u ojos amarillos)",v:"ictericia"},
      {ic:"🦵",l:tx.sym12||"Edema / hinchazon en extremidades",v:"edema"},
      {ic:"🩺",l:tx.sym13||"Hemoptisis (sangre al toser)",v:"hemoptisis"},
      {ic:"🩻",l:tx.sym14||"Dolor irradiado (espalda / brazo / mandibula)",v:"dolor_irr"},
      {ic:"😴",l:tx.sym15||"Somnolencia excesiva / dificil de despertar",v:"somnolencia"},
      {ic:"🤒",l:tx.sym16||"Escalofrios / rigidez generalizada",v:"escalofrios"},
      {ic:"💉",l:tx.sym17||"Hematuria (orina con sangre)",v:"hematuria"},
      {ic:"❌",l:tx.sym7||"Ninguno de los anteriores",v:"ninguno"}]},
    {id:"enino",title:tx.childAge||"Edad",sub:tx.selectApply||"Ingrese la edad en anos.",t:"num",unit:"años",min:0,max:17,skip:d=>d.tipo!=="nino"&&d.tipo!=="adolescente"},
    {id:"semanas",title:tx.gestWeeks||"Semanas de gestacion",sub:tx.selectApply||"Semanas aproximadas.",t:"num",unit:"semanas",min:1,max:42,skip:d=>d.tipo!=="embarazada"},
    {id:"notas",title:tx.clinicalNotes||"Anotaciones clinicas",sub:tx.clinicalNotesSub||"Revise y complete con informacion relevante del paciente.",t:"notes_step",
      defaultMsg:tx.defaultNotes||"El paciente no refiere alergias medicamentosas conocidas ni antecedentes patologicos de relevancia clinica al momento de la evaluacion. No reporta medicacion habitual en curso. Sin historia previa de cirugias, hospitalizaciones recientes ni enfermedades cronicas diagnosticadas.",
      hint:tx.notesHint||"Modifique si el paciente refiere alergias, medicacion actual o antecedentes patologicos."},
  ];
}
