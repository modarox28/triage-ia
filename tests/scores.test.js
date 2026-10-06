// Pruebas de los scores clínicos contra sus criterios publicados.
// Ejecutar: npm test   (o: node --test tests/)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkCriticalVitals, calcQSOFA, calcNEWS2, calcShockIndex,
  calcCURB65, calcHEART, calcROSIER, calcWellsDVT,
} from "../src/clinical/engine.js";

// ── qSOFA (Singer et al., Sepsis-3, 2016) ───────────────────
test("qSOFA: FR ≥ 22, alteración de consciencia y PAS ≤ 100 suman 1 cada uno", () => {
  assert.equal(calcQSOFA({ rr: 16, sys: 120 }, "alerta").score, 0);
  assert.equal(calcQSOFA({ rr: 22, sys: 120 }, "alerta").score, 1);
  assert.equal(calcQSOFA({ rr: 21, sys: 101 }, "alerta").score, 0, "límites justo por debajo");
  assert.equal(calcQSOFA({ rr: 22, sys: 100 }, "confuso").score, 3);
});
test("qSOFA: riesgo alto desde 2 puntos", () => {
  assert.equal(calcQSOFA({ rr: 22, sys: 100 }, "alerta").risk, "high");
  assert.equal(calcQSOFA({ rr: 22, sys: 120 }, "alerta").risk, "low");
});

// ── NEWS2 (Royal College of Physicians, 2017) ───────────────
const news = (v, c = "alerta") => calcNEWS2(v, c);
test("NEWS2: paciente con vitales normales puntúa 0", () => {
  const r = news({ rr: 16, spo2: 98, sys: 120, hr: 70, temp: 37 });
  assert.equal(r.score, 0);
  assert.equal(r.risk, "low");
});
test("NEWS2: frecuencia respiratoria", () => {
  for (const [rr, pts] of [[8, 3], [9, 1], [11, 1], [12, 0], [20, 0], [21, 2], [24, 2], [25, 3]])
    assert.equal(news({ rr }).score, pts, `FR ${rr}`);
});
test("NEWS2: SpO₂ (escala 1)", () => {
  for (const [spo2, pts] of [[91, 3], [92, 2], [93, 2], [94, 1], [95, 1], [96, 0]])
    assert.equal(news({ spo2 }).score, pts, `SpO2 ${spo2}`);
});
test("NEWS2: presión sistólica", () => {
  for (const [sys, pts] of [[90, 3], [91, 2], [100, 2], [101, 1], [110, 1], [111, 0], [219, 0], [220, 3]])
    assert.equal(news({ sys }).score, pts, `PAS ${sys}`);
});
test("NEWS2: frecuencia cardiaca", () => {
  for (const [hr, pts] of [[40, 3], [41, 1], [50, 1], [51, 0], [90, 0], [91, 1], [110, 1], [111, 2], [130, 2], [131, 3]])
    assert.equal(news({ hr }).score, pts, `FC ${hr}`);
});
test("NEWS2: temperatura", () => {
  for (const [temp, pts] of [[35, 3], [35.1, 1], [36, 1], [36.1, 0], [38, 0], [38.1, 1], [39, 1], [39.1, 2]])
    assert.equal(news({ temp }).score, pts, `Temp ${temp}`);
});
test("NEWS2: consciencia alterada suma 3", () => {
  assert.equal(news({}, "dolor").score, 3);
});
test("NEWS2: niveles de riesgo", () => {
  const solo3 = news({ rr: 16, spo2: 98, sys: 120, hr: 70, temp: 34.8 });
  assert.equal(solo3.score, 3);
  assert.equal(solo3.risk, "medium", "un parámetro en 3 = bajo-medio, no alto");
  assert.equal(solo3.singleParam3, true);
  assert.equal(news({ rr: 22, spo2: 94, sys: 120, hr: 112, temp: 37 }).score, 5);
  assert.equal(news({ rr: 22, spo2: 94, sys: 120, hr: 112, temp: 37 }).risk, "medium", "5-6 = medio");
  assert.equal(news({ rr: 25, spo2: 93, sys: 105, hr: 95, temp: 37 }).score, 7);
  assert.equal(news({ rr: 25, spo2: 93, sys: 105, hr: 95, temp: 37 }).risk, "high", "≥ 7 = alto");
});

// ── Índice de shock ─────────────────────────────────────────
test("Índice de shock: FC / PAS con umbrales de la app", () => {
  assert.equal(calcShockIndex(70, 120).risk, "normal");
  assert.equal(calcShockIndex(90, 110).risk, "mild");
  assert.equal(calcShockIndex(100, 100).idx, "1.00");
  assert.equal(calcShockIndex(100, 100).risk, "moderate");
  assert.equal(calcShockIndex(140, 100).risk, "severe");
  assert.equal(calcShockIndex(null, 100), null);
  assert.equal(calcShockIndex(80, 0), null);
});

// ── CURB-65 (Lim et al., 2003) ──────────────────────────────
test("CURB-65: criterios y límites", () => {
  assert.equal(calcCURB65({ age: 64, sbp: 120, dbp: 80, rr: 18 }).score, 0);
  assert.equal(calcCURB65({ age: 65 }).score, 1, "edad ≥ 65");
  assert.equal(calcCURB65({ dbp: 60 }).score, 1, "PAD ≤ 60");
  assert.equal(calcCURB65({ sbp: 90, dbp: 70 }).score, 0, "PAS 90 no cuenta (< 90)");
  assert.equal(calcCURB65({ rr: 30 }).score, 1, "FR ≥ 30");
  assert.equal(calcCURB65({ confusion: true, urea_high: true, rr: 30, sbp: 85, age: 70 }).score, 5);
});
test("CURB-65: riesgo 0-1 bajo, 2 moderado, ≥ 3 alto", () => {
  assert.equal(calcCURB65({ age: 70 }).risk, "low");
  assert.equal(calcCURB65({ age: 70, confusion: true }).risk, "medium");
  assert.equal(calcCURB65({ age: 70, confusion: true, rr: 32 }).risk, "high");
});

// ── HEART (Six et al., 2008) ────────────────────────────────
test("HEART: puntos por edad", () => {
  for (const [age, pts] of [[44, 0], [45, 1], [64, 1], [65, 2]])
    assert.equal(calcHEART({ age }).score, pts, `edad ${age}`);
});
test("HEART: riesgo 0-3 bajo, 4-6 moderado, ≥ 7 alto", () => {
  assert.equal(calcHEART({ history: 1, ecg: 0, age: 50, risk: 1, troponin: 0 }).risk, "low");    // 3
  assert.equal(calcHEART({ history: 1, ecg: 1, age: 50, risk: 1, troponin: 0 }).risk, "medium"); // 4
  assert.equal(calcHEART({ history: 2, ecg: 1, age: 70, risk: 1, troponin: 0 }).risk, "medium"); // 6
  assert.equal(calcHEART({ history: 2, ecg: 2, age: 70, risk: 1, troponin: 0 }).risk, "high");   // 7
});

// ── ROSIER (Nor et al., 2005) ───────────────────────────────
test("ROSIER: síncope y convulsión son ítems separados (rango −2 a +5)", () => {
  assert.equal(calcROSIER({ syncope: true, seizure: true }).score, -2);
  const r = calcROSIER({ syncope: true, seizure: true, face_weakness: true, arm_weakness: true });
  assert.equal(r.score, 0);
  assert.equal(r.strokeLikely, false, "puntaje 0 = ACV poco probable");
  assert.equal(calcROSIER({ face_weakness: true, arm_weakness: true, leg_weakness: true, speech_disturbance: true, visual_field: true }).score, 5);
});
test("ROSIER: ACV probable si el puntaje es > 0", () => {
  assert.equal(calcROSIER({ face_weakness: true }).strokeLikely, true);
  assert.equal(calcROSIER({ syncope: true, face_weakness: true }).strokeLikely, false);
});
test("ROSIER: el campo antiguo syncope_seizure sigue funcionando", () => {
  assert.equal(calcROSIER({ syncope_seizure: true }).score, -1);
});

// ── Wells TVP (Wells et al., 1997) ──────────────────────────
test("Wells TVP: TVP previa suma 1 y diagnóstico alternativo resta 2", () => {
  assert.equal(calcWellsDVT({ previous_dvt: true }).score, 1);
  assert.equal(calcWellsDVT({ cancer: true, alt_diagnosis: true }).score, -1);
});
test("Wells TVP: alta ≥ 3, moderada 1-2, baja ≤ 0", () => {
  assert.equal(calcWellsDVT({}).risk, "low");
  assert.equal(calcWellsDVT({ cancer: true }).risk, "medium");
  assert.equal(calcWellsDVT({ cancer: true, pitting: true }).risk, "medium", "2 puntos = moderada");
  assert.equal(calcWellsDVT({ cancer: true, pitting: true, tenderness: true }).risk, "high");
});

// ── Alertas de signos vitales ───────────────────────────────
test("Alertas de vitales: críticas y advertencias", () => {
  const keys = v => checkCriticalVitals(v).map(a => a.key);
  assert.deepEqual(keys({ spo2: 89 }), ["SpO2"]);
  assert.deepEqual(keys({ spo2: 94 }), ["SpO2_warn"]);
  assert.deepEqual(keys({ spo2: 95 }), []);
  assert.deepEqual(keys({ hr: 151 }), ["HR_high"]);
  assert.deepEqual(keys({ hr: 39 }), ["HR_low"]);
  assert.deepEqual(keys({ sys: 69 }), ["SYS_low"]);
  assert.deepEqual(keys({ rr: 31 }), ["RR_high"]);
  assert.deepEqual(keys({ temp: 39.5 }), ["TEMP_high"]);
  assert.deepEqual(keys({ temp: 34.9 }), ["TEMP_low"]);
  assert.deepEqual(keys({ spo2: 98, hr: 75, sys: 120, rr: 16, temp: 36.8 }), []);
});
