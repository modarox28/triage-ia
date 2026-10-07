/**
 * MedIA Suite — Clasificación provisional sin IA
 * Se usa cuando no hay conexión (o la IA no responde) para no perder el triage.
 * Reglas conservadoras: ante la duda sube la prioridad. Funciones puras.
 * @module src/clinical/offline
 */
import { chkPA, chkFC, chkSat, chkT, chkFR } from "../utils/clinical.js?v=4";
import { calcNEWS2, calcQSOFA } from "./engine.js?v=4";

const NOMBRES = { ps: "PA sistólica", fc: "FC", sat: "SpO₂", tem: "Temperatura", fr: "FR" };
const UNIDADES = { ps: "mmHg", fc: "lpm", sat: "%", tem: "°C", fr: "rpm" };
const CHK = { ps: chkPA, fc: chkFC, sat: chkSat, tem: chkT, fr: chkFR };
const SINT_ROJO = { sangrado: "sangrado activo", cianosis: "cianosis" };
const MOTIVO_AMARILLO = { dolor_pecho: "dolor de pecho", disnea: "dificultad respiratoria", neuro: "síntoma neurológico" };

/**
 * @param {Object} td datos del triage (TD): vit {ps,fc,sat,tem,fr}, consc, dolor, sint[], motivo
 * @returns {{clasificacion:"ROJO"|"AMARILLO"|"VERDE", acciones:string[], justificacion:string, red_flags:string[], local:true}}
 */
export function clasificarSinIA(td = {}) {
  const vt = td.vit || {};
  const rojo = [], amarillo = [];
  for (const k of Object.keys(CHK)) {
    const v = parseFloat(vt[k]);
    if (!Number.isFinite(v)) continue;
    const st = CHK[k](v);
    const txt = `${NOMBRES[k]} ${v} ${UNIDADES[k]}`;
    if (st === "critical") rojo.push(txt);
    else if (st === "warning") amarillo.push(txt);
  }
  if (td.consc && td.consc !== "alerta") rojo.push(td.consc === "voz" ? "responde solo a la voz" : td.consc === "dolor_e" ? "responde solo al dolor" : "no responde");

  const sv = { sys: parseFloat(vt.ps), hr: parseFloat(vt.fc), spo2: parseFloat(vt.sat), rr: parseFloat(vt.fr), temp: parseFloat(vt.tem) };
  const hayVit = Object.values(sv).some(Number.isFinite);
  if (hayVit) {
    const n2 = calcNEWS2(sv, td.consc);
    if (n2.score >= 7) rojo.push(`NEWS2 ${n2.score}`);
    else if (n2.score >= 5 || n2.singleParam3) amarillo.push(`NEWS2 ${n2.score}`);
    const q = calcQSOFA(sv, td.consc);
    if (q.score >= 2) rojo.push(`qSOFA ${q.score}/3 (riesgo de sepsis)`);
  }

  const sint = Array.isArray(td.sint) ? td.sint : [];
  for (const s of sint) if (SINT_ROJO[s]) rojo.push(SINT_ROJO[s]);
  if (sint.includes("palido")) amarillo.push("palidez o sudoración fría");
  if (MOTIVO_AMARILLO[td.motivo]) amarillo.push(MOTIVO_AMARILLO[td.motivo]);
  const dolor = parseFloat(td.dolor);
  if (Number.isFinite(dolor) && dolor >= 7) amarillo.push(`dolor ${dolor}/10`);

  const clasificacion = rojo.length ? "ROJO" : amarillo.length ? "AMARILLO" : "VERDE";
  const motivos = rojo.length ? rojo : amarillo;
  const base = "Clasificación provisional sin IA, calculada con los umbrales de signos vitales, NEWS2 y qSOFA.";
  const detalle = motivos.length ? ` Motivos: ${[...new Set(motivos)].join(", ")}.` : " Sin signos de alarma en los datos registrados.";
  const acciones = {
    ROJO: ["Atención médica inmediata en sala de reanimación", "Monitorizar signos vitales de forma continua", "Avisar al médico de turno"],
    AMARILLO: ["Valoración médica en menos de 30 minutos", "Repetir signos vitales cada 15 minutos", "Reclasificar si empeora"],
    VERDE: ["Atención por orden de llegada (objetivo: 120 minutos)", "Reevaluar si cambian los síntomas o los signos vitales"],
  }[clasificacion];
  return {
    clasificacion,
    acciones,
    justificacion: base + detalle + " Confírmela con criterio clínico.",
    red_flags: [...new Set(rojo)],
    local: true,
  };
}
