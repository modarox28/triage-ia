// Pruebas de la búsqueda de pacientes (src/app/00-busqueda.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = {};
vm.runInNewContext(readFileSync(new URL("../src/app/00-busqueda.js", import.meta.url), "utf8")
  + ";this.f={_searchKeys,_parseSearch,_matchesSearch,_normTxt};", ctx);
const { _searchKeys, _parseSearch, _matchesSearch, _normTxt } = ctx.f;

// Simula la consulta de Firestore (array-contains) + el filtro del cliente
function buscar(hcs, q) {
  const p = _parseSearch(q);
  if (!p) return null;
  return hcs.filter(h => _searchKeys(h.name, h.doc).includes(p.key) && _matchesSearch(h, p)).map(h => h.name);
}
const HCS = [
  { name: "Carlos Rodríguez Mendez", doc: "1045123456" },
  { name: "María José Peña", doc: "52.987.654" },
  { name: "Carlos Pérez", doc: "1045999888" },
  { name: "Ana Sofía Núñez de la Torre", doc: "TI-1098765" },
];

test("quita tildes, ñ y mayúsculas", () => {
  assert.equal(_normTxt("Núñez PEÑA Rodríguez"), "nunez pena rodriguez");
});

test("las claves incluyen prefijos del nombre y del documento", () => {
  const k = _searchKeys("Carlos Rodríguez", "1.045.123");
  for (const x of ["ca", "carlos", "ro", "rodri", "rodriguez", "104", "1045123"]) assert.ok(k.includes(x), x);
  assert.ok(!k.includes("c"));   // una sola letra no
  assert.ok(!k.includes("10"));  // menos de 3 dígitos no
});

test("las claves tienen un límite razonable", () => {
  const k = _searchKeys("Maximilianoaurelianodelossantos Pérez", "12345678901234567890");
  assert.ok(k.every(x => x.length <= 15));
  assert.ok(k.length < 60);
});

test("buscar por parte del nombre, sin importar tildes ni orden", () => {
  assert.deepEqual(buscar(HCS, "rodri"), ["Carlos Rodríguez Mendez"]);
  assert.deepEqual(buscar(HCS, "carlos"), ["Carlos Rodríguez Mendez", "Carlos Pérez"]);
  assert.deepEqual(buscar(HCS, "carlos mendez"), ["Carlos Rodríguez Mendez"]);
  assert.deepEqual(buscar(HCS, "mendez carlos"), ["Carlos Rodríguez Mendez"]);
  assert.deepEqual(buscar(HCS, "PENA"), ["María José Peña"]);
  assert.deepEqual(buscar(HCS, "nuñez"), ["Ana Sofía Núñez de la Torre"]);
});

test("buscar por documento completo o parcial, con puntos", () => {
  assert.deepEqual(buscar(HCS, "1045"), ["Carlos Rodríguez Mendez", "Carlos Pérez"]);
  assert.deepEqual(buscar(HCS, "1045123456"), ["Carlos Rodríguez Mendez"]);
  assert.deepEqual(buscar(HCS, "52.987"), ["María José Peña"]);
  assert.deepEqual(buscar(HCS, "1098"), ["Ana Sofía Núñez de la Torre"]);  // documento con letras (TI-)
});

test("no confunde términos que no coinciden", () => {
  assert.deepEqual(buscar(HCS, "carlos peña"), []);
  assert.deepEqual(buscar(HCS, "xyz"), []);
});

test("pide más texto antes de buscar", () => {
  assert.equal(_parseSearch("c"), null);
  assert.equal(_parseSearch("10"), null);
  assert.equal(_parseSearch("   "), null);
  assert.equal(_parseSearch("ana").tipo, "nombre");
  assert.equal(_parseSearch("1.045").tipo, "doc");
});
