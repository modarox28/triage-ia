// Pruebas de los clasificadores de signos vitales (src/utils/clinical.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { chkPA, chkFC, chkSat, chkT, chkFR } from "../src/utils/clinical.js";

const casos = (fn, tabla) => { for (const [v, esperado] of tabla) assert.equal(fn(v), esperado, `${fn.name}(${v})`); };

test("Presión sistólica", () => casos(chkPA, [[89, "critical"], [90, "warning"], [99, "warning"], [100, "normal"], [150, "normal"], [151, "warning"], [181, "critical"]]));
test("Frecuencia cardiaca", () => casos(chkFC, [[49, "critical"], [50, "warning"], [59, "warning"], [60, "normal"], [100, "normal"], [101, "warning"], [131, "critical"]]));
test("Saturación", () => casos(chkSat, [[89, "critical"], [90, "warning"], [94, "warning"], [95, "normal"]]));
test("Temperatura", () => casos(chkT, [[34.9, "critical"], [35, "warning"], [36, "normal"], [38.5, "normal"], [38.6, "warning"], [40.1, "critical"]]));
test("Frecuencia respiratoria", () => casos(chkFR, [[7, "critical"], [8, "warning"], [12, "normal"], [24, "normal"], [25, "warning"], [31, "critical"]]));
test("Acepta texto de los formularios", () => assert.equal(chkSat("97"), "normal"));
