// Validación de entradas y política de contraseñas (src/app/00-validacion.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = {};
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../src/app/00-validacion.js", import.meta.url), "utf8") +
  "\nthis._validarClave=_validarClave;this._imagenPermitida=_imagenPermitida;this._limpiarTexto=_limpiarTexto;this._telefonoValido=_telefonoValido;", ctx);

test("contraseña: rechaza cortas, sin números, obvias o con datos personales", () => {
  const v = (c, o) => ctx._validarClave(c, o);
  assert.match(v("Ab12"), /10 caracteres/);
  assert.match(v("soloLetrasLargas"), /letras y números/);
  assert.match(v("1234567890123"), /letras y números/);
  assert.match(v("Password2026x"), /fácil de adivinar/);
  assert.match(v("laura.gomez99", { correo: "laura.gomez@hospital.co" }), /correo/);
  assert.match(v("Rodriguez2026!", { nombre: "Carlos Rodriguez" }), /nombre/);
  assert.equal(v("Triage-Urg3ncias!", { correo: "laura@h.co", nombre: "Laura Gómez" }), "");
});

test("textos: quita caracteres de control, espacios sobrantes y recorta al máximo", () => {
  assert.equal(ctx._limpiarTexto("  Dra.\u0000  Laura\n\tGómez  ", 120), "Dra. Laura Gómez");
  assert.equal(ctx._limpiarTexto("x".repeat(200), 120).length, 120);
  assert.equal(ctx._limpiarTexto(null, 10), "");
});

test("teléfono: solo números y separadores comunes", () => {
  assert.ok(ctx._telefonoValido("+57 300 123 4567"));
  assert.ok(ctx._telefonoValido("(605) 385-1234"));
  assert.ok(!ctx._telefonoValido("<script>"));
  assert.ok(!ctx._telefonoValido("12"));
});

test("archivos: solo fotos JPG, PNG o WebP de hasta 10 MB", () => {
  vm.runInContext("this._imagenPermitida=_imagenPermitida;", ctx);
  const f = (type, size) => ({ type, size });
  assert.equal(ctx._imagenPermitida(f("image/jpeg", 50_000)), "");
  assert.equal(ctx._imagenPermitida(f("image/webp", 50_000)), "");
  assert.match(ctx._imagenPermitida(f("image/svg+xml", 500)), /Solo se permiten/);
  assert.match(ctx._imagenPermitida(f("application/pdf", 500)), /Solo se permiten/);
  assert.match(ctx._imagenPermitida(f("text/html", 500)), /Solo se permiten/);
  assert.match(ctx._imagenPermitida(f("image/png", 11 * 1024 * 1024)), /10 MB/);
  assert.match(ctx._imagenPermitida(null), /ningún archivo/);
});
