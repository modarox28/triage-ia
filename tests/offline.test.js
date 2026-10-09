// Clasificación provisional sin IA (src/clinical/offline.js): se usa cuando no hay conexión.
import { test } from "node:test";
import assert from "node:assert/strict";
import { clasificarSinIA } from "../src/clinical/offline.js";

const normal = { ps: "120", fc: "80", sat: "98", tem: "36.8", fr: "16" };

test("paciente estable sin alarmas queda en verde", () => {
  const r = clasificarSinIA({ vit: normal, consc: "alerta", dolor: 2, motivo: "otro", sint: [] });
  assert.equal(r.clasificacion, "VERDE");
  assert.equal(r.local, true);
  assert.match(r.justificacion, /sin IA/);
});

test("un signo vital crítico sube a rojo y se explica", () => {
  const r = clasificarSinIA({ vit: { ...normal, sat: "86" }, consc: "alerta" });
  assert.equal(r.clasificacion, "ROJO");
  assert.ok(r.red_flags.some(f => f.includes("SpO₂ 86")));
});

test("alteración de la consciencia es rojo aunque los vitales sean normales", () => {
  assert.equal(clasificarSinIA({ vit: normal, consc: "voz" }).clasificacion, "ROJO");
  assert.equal(clasificarSinIA({ consc: "inconsc" }).clasificacion, "ROJO");
});

test("signos de advertencia, dolor intenso o dolor de pecho dan amarillo", () => {
  assert.equal(clasificarSinIA({ vit: { ...normal, fc: "112" }, consc: "alerta" }).clasificacion, "AMARILLO");
  assert.equal(clasificarSinIA({ vit: normal, consc: "alerta", dolor: 8 }).clasificacion, "AMARILLO");
  assert.equal(clasificarSinIA({ vit: normal, consc: "alerta", motivo: "dolor_pecho" }).clasificacion, "AMARILLO");
});

test("qSOFA de 2 o más y sangrado activo dan rojo", () => {
  assert.equal(clasificarSinIA({ vit: { ...normal, fr: "23", ps: "98" }, consc: "alerta" }).clasificacion, "ROJO");
  assert.equal(clasificarSinIA({ vit: normal, consc: "alerta", sint: ["sangrado"] }).clasificacion, "ROJO");
});

test("sin datos de vitales no falla y no inventa alarmas", () => {
  const r = clasificarSinIA({});
  assert.equal(r.clasificacion, "VERDE");
  assert.deepEqual(r.red_flags, []);
});

// Sincronización de la cola local (src/firebase/triages.js) con un Firestore simulado
import { syncOfflineQueue, newTriageId } from "../src/firebase/triages.js";
function fakeFB({ fallarCon } = {}) {
  const escritos = {};
  return {
    escritos, db: {},
    doc: (_db, c, id) => ({ c, id }),
    collection: (_db, c) => ({ c }),
    serverTimestamp: () => "SERVER_TS",
    setDoc: async (ref, data, opts) => {
      if (fallarCon && data.motivo === fallarCon) throw new Error("sin red");
      escritos[ref.id] = { ...(opts?.merge ? escritos[ref.id] : {}), ...data };
    },
    addDoc: async () => { throw new Error("no debería usarse con id"); },
  };
}

test("la cola local se envía con su id, su hora real y marcada como offline", async () => {
  const FB = fakeFB();
  const queuedAt = Date.UTC(2026, 9, 6, 14, 30);
  const restantes = await syncOfflineQueue(FB, [{ _id: "abc123", queuedAt, motivo: "disnea", clasificacion: "ROJO" }]);
  assert.deepEqual(restantes, []);
  const d = FB.escritos.abc123;
  assert.equal(d.createdAt.getTime(), queuedAt);
  assert.equal(d.offline, true);
  assert.equal(d.syncedAt, "SERVER_TS");
  assert.equal(d._id, undefined);
  assert.equal(d.queuedAt, undefined);
});

test("reintentar el mismo triage no lo duplica y lo que falla se conserva", async () => {
  const FB = fakeFB({ fallarCon: "trauma" });
  const cola = [{ _id: "uno", queuedAt: 1, motivo: "fiebre" }, { _id: "dos", queuedAt: 2, motivo: "trauma" }];
  const restantes = await syncOfflineQueue(FB, cola);
  await syncOfflineQueue(FB, [cola[0]]);
  assert.deepEqual(Object.keys(FB.escritos), ["uno"]);
  assert.deepEqual(restantes.map(r => r._id), ["dos"]);
});

test("si el triage ya existe y las reglas no dejan reescribirlo, sale de la cola", async () => {
  const FB = fakeFB();
  FB.setDoc = async () => { const e = new Error("denegado"); e.code = "permission-denied"; throw e; };
  FB.getDoc = async ref => ({ exists: () => ref.id === "ya-esta" });
  const restantes = await syncOfflineQueue(FB, [{ _id: "ya-esta", queuedAt: 1 }, { _id: "no-esta", queuedAt: 2 }]);
  assert.deepEqual(restantes.map(r => r._id), ["no-esta"]);
});

test("los ids generados tienen 20 caracteres y no se repiten", () => {
  const ids = new Set(Array.from({ length: 500 }, newTriageId));
  assert.equal(ids.size, 500);
  for (const id of ids) assert.match(id, /^[A-Za-z0-9]{20}$/);
});
