// Pruebas de las reglas de seguridad de Firestore (firestore.rules) con el emulador oficial.
// Se ejecutan con:  npm run test:rules   (necesita Java; ver README)
// Cada prueba intenta una operación con un usuario concreto y comprueba que las reglas
// la permitan o la bloqueen, igual que en producción.
import { test, before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, collection, query, where, serverTimestamp, arrayUnion,
} from "firebase/firestore";

let env;
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080").split(":");

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-media-suite",
    firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"), host, port: Number(port) },
  });
});
after(async () => { await env?.cleanup(); });

const USUARIOS = {
  admin: { role: "admin", name: "Admin" },
  hosp: { role: "admin_hosp", name: "Admin hospital" },
  medico: { role: "medico", name: "Dra. Gómez" },
  medico2: { role: "medico", name: "Dr. Pérez" },
  pend: { role: "pendiente", name: "Nuevo" },
  elim: { role: "eliminado", name: "Eliminado" },
  pac: { role: "paciente", name: "Carlos", doc: "482951" },
};
const HC = { doc: "482951", name: "Carlos Rodríguez", userId: "medico", antecedentes: ["HTA"], alergias: [], medicacion: [], notes: "" };
const TRIAGE = { clasificacion: "AMARILLO", motivo: "disnea", tipo: "adulto", userId: "medico", notas: "", atendido: false,
  cambios: [{ tipo: "creado", por: "Dra. Gómez", at: "2026-10-08T12:00:00Z" }] };

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    for (const [uid, u] of Object.entries(USUARIOS)) await setDoc(doc(db, "users", uid), u);
    await setDoc(doc(db, "historias", "hc1"), HC);
    await setDoc(doc(db, "historias", "hc2"), { ...HC, doc: "999999", name: "Otra persona" });
    await setDoc(doc(db, "historias", "hcPac"), { ...HC, userId: "pac" });
    await setDoc(doc(db, "triages", "t1"), TRIAGE);
    await setDoc(doc(db, "auditLogs", "a1"), { userId: "medico", action: "login" });
  });
});

// Contextos: personal con su uid; el paciente inicia sesión con su cuenta interna <ID>@pacientes...
const como = uid => env.authenticatedContext(uid, uid === "pac" ? { email: "482951@pacientes.media-suite.app" } : { email: uid + "@hospital.test" }).firestore();
const anonimo = () => env.unauthenticatedContext().firestore();

// ── 6. Forzar la autenticación ──
test("sin sesión no se lee ni escribe nada", async () => {
  const db = anonimo();
  await assertFails(getDoc(doc(db, "historias", "hc1")));
  await assertFails(getDoc(doc(db, "triages", "t1")));
  await assertFails(getDoc(doc(db, "users", "medico")));
  await assertFails(setDoc(doc(db, "triages", "x"), TRIAGE));
});

test("una colección no prevista está cerrada para todos", async () => {
  await assertFails(setDoc(doc(como("admin"), "secretos", "x"), { a: 1 }));
  await assertFails(getDoc(doc(como("admin"), "secretos", "x")));
});

// ── 4 y 7. Acceso por filas: cada quien ve solo lo suyo ──
test("el paciente solo ve su propia historia clínica", async () => {
  await assertSucceeds(getDoc(doc(como("pac"), "historias", "hc1")));
  await assertFails(getDoc(doc(como("pac"), "historias", "hc2")));
});

test("cuentas pendientes o eliminadas no ven historias ni triages", async () => {
  for (const uid of ["pend", "elim"]) {
    await assertFails(getDoc(doc(como(uid), "historias", "hc1")));
    await assertFails(getDoc(doc(como(uid), "triages", "t1")));
    await assertFails(getDocs(query(collection(como(uid), "historias"), where("doc", "==", "482951"))));
  }
});

test("el paciente no ve triages ni perfiles de otros", async () => {
  await assertFails(getDoc(doc(como("pac"), "triages", "t1")));
  await assertFails(getDoc(doc(como("pac"), "users", "medico")));
  await assertSucceeds(getDoc(doc(como("pac"), "users", "pac")));
});

test("el personal aprobado sí ve historias y triages", async () => {
  await assertSucceeds(getDoc(doc(como("medico2"), "historias", "hc2")));
  await assertSucceeds(getDoc(doc(como("medico2"), "triages", "t1")));
});

// ── 8. Bloquear la manipulación de campos ──
test("nadie se asigna un rol a sí mismo", async () => {
  await assertFails(updateDoc(doc(como("pend"), "users", "pend"), { role: "admin" }));
  await assertFails(updateDoc(doc(como("medico"), "users", "medico"), { role: "admin" }));
  await assertFails(setDoc(doc(como("nuevo"), "users", "nuevo"), { role: "medico", name: "X" }));
  await assertSucceeds(setDoc(doc(como("nuevo"), "users", "nuevo"), { role: "pendiente", name: "X" }));
  await assertSucceeds(updateDoc(doc(como("medico"), "users", "medico"), { name: "Dra. Laura Gómez" }));
});

test("el admin de hospital solo aprueba o rechaza solicitudes", async () => {
  await assertSucceeds(updateDoc(doc(como("hosp"), "users", "pend"), { role: "medico", reviewedBy: "hosp", reviewedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(como("hosp"), "users", "medico2"), { role: "admin" }));
});

test("perfil: la foto tiene un tamaño máximo", async () => {
  await assertFails(updateDoc(doc(como("medico"), "users", "medico"), { photoBase64: "x".repeat(200001) }));
  await assertSucceeds(updateDoc(doc(como("medico"), "users", "medico"), { photoBase64: "data:image/jpeg;base64,AAAA" }));
});

test("el paciente no puede marcarse el PIN como cambiado por otro ni cambiar su documento", async () => {
  await assertFails(updateDoc(doc(como("pac"), "users", "pac"), { pinResetBy: "medico" }));
  await assertFails(updateDoc(doc(como("pac"), "users", "pac"), { doc: "999999" }));
});

test("historia: nadie cambia el dueño; el documento solo lo corrige un administrador", async () => {
  await assertFails(updateDoc(doc(como("pac"), "historias", "hcPac"), { doc: "999999" }));
  await assertFails(updateDoc(doc(como("medico"), "historias", "hc1"), { userId: "medico2" }));
  await assertSucceeds(updateDoc(doc(como("hosp"), "historias", "hc1"), { doc: "482952" }));
  await assertSucceeds(updateDoc(doc(como("medico"), "historias", "hc1"), { notes: "Control en 1 mes" }));
});

test("triage: al crearlo no puede venir atendido, con otro dueño ni con una prioridad inventada", async () => {
  const db = como("medico");
  await assertSucceeds(setDoc(doc(db, "triages", "n1"), TRIAGE));
  await assertFails(setDoc(doc(db, "triages", "n2"), { ...TRIAGE, atendido: true }));
  await assertFails(setDoc(doc(db, "triages", "n3"), { ...TRIAGE, userId: "medico2" }));
  await assertFails(setDoc(doc(db, "triages", "n4"), { ...TRIAGE, clasificacion: "MORADO" }));
  await assertFails(setDoc(doc(db, "triages", "n5"), { ...TRIAGE, cambios: [TRIAGE.cambios[0], TRIAGE.cambios[0]] }));
});

test("triage: solo se cambian los campos de atención y de revisión", async () => {
  const db = como("medico2");
  await assertSucceeds(updateDoc(doc(db, "triages", "t1"), { atendido: true, atendidoPor: "Dr. Pérez", atendidoAt: serverTimestamp(),
    cambios: arrayUnion({ tipo: "atendido", por: "Dr. Pérez", at: "2026-10-08T12:10:00Z" }) }));
  await assertFails(updateDoc(doc(db, "triages", "t1"), { notas: "texto cambiado" }));
  await assertFails(updateDoc(doc(db, "triages", "t1"), { userId: "medico2" }));
  await assertFails(updateDoc(doc(db, "triages", "t1"), { clasificacion: "MORADO" }));
});

test("triage: el registro de cambios solo puede crecer", async () => {
  const db = como("medico2");
  await assertFails(updateDoc(doc(db, "triages", "t1"), { cambios: [] }));
  await assertFails(updateDoc(doc(db, "triages", "t1"), { cambios: [{ tipo: "creado", por: "Otra persona", at: "2026-10-08T12:00:00Z" }] }));
  await assertSucceeds(updateDoc(doc(db, "triages", "t1"), { clasificacion: "ROJO", overridePor: "Dr. Pérez", overrideRazon: "Reevaluado",
    overrideOriginal: "AMARILLO", cambios: arrayUnion({ tipo: "reclasificado", de: "AMARILLO", a: "ROJO", at: "2026-10-08T12:20:00Z" }) }));
});

test("triage sin conexión: solo quien lo creó completa la sincronización", async () => {
  const datos = { createdAt: new Date("2026-10-08T11:58:00Z"), syncedAt: serverTimestamp(), offline: true };
  await assertFails(updateDoc(doc(como("medico2"), "triages", "t1"), datos));
  await assertSucceeds(updateDoc(doc(como("medico"), "triages", "t1"), datos));
});

// ── 14. Validar entradas: tipos y tamaños ──
test("historia: rechaza nombres, notas o listas gigantes", async () => {
  const db = como("medico");
  await assertSucceeds(addDoc(collection(db, "historias"), HC));
  await assertFails(addDoc(collection(db, "historias"), { ...HC, name: "x".repeat(121) }));
  await assertFails(addDoc(collection(db, "historias"), { ...HC, notes: "x".repeat(5001) }));
  await assertFails(addDoc(collection(db, "historias"), { ...HC, alergias: Array(61).fill("x") }));
  await assertFails(addDoc(collection(db, "historias"), { ...HC, doc: "" }));
});

test("triage: rechaza notas o justificaciones gigantes", async () => {
  await assertFails(setDoc(doc(como("medico"), "triages", "g1"), { ...TRIAGE, notas: "x".repeat(5001) }));
  await assertFails(setDoc(doc(como("medico"), "triages", "g2"), { ...TRIAGE, justificacion: "x".repeat(5001) }));
});

test("auditoría y errores: solo campos permitidos, nunca se editan ni los lee el personal", async () => {
  const db = como("medico");
  await assertSucceeds(addDoc(collection(db, "auditLogs"), { userId: "medico", action: "login", meta: {} }));
  await assertFails(addDoc(collection(db, "auditLogs"), { userId: "medico", action: "login", rol: "admin" }));
  await assertFails(addDoc(collection(db, "auditLogs"), { userId: "medico2", action: "login" }));
  await assertFails(updateDoc(doc(db, "auditLogs", "a1"), { action: "otra" }));
  await assertFails(deleteDoc(doc(como("admin"), "auditLogs", "a1")));
  await assertFails(getDoc(doc(db, "auditLogs", "a1")));
  await assertSucceeds(getDoc(doc(como("admin"), "auditLogs", "a1")));
  await assertFails(addDoc(collection(db, "errorLogs"), { userId: "medico", msg: "x".repeat(501), stack: "" }));
  await assertSucceeds(addDoc(collection(db, "errorLogs"), { userId: "medico", msg: "TypeError", stack: "" }));
});

test("presencia: cada quien escribe solo la suya y con campos limitados", async () => {
  await assertSucceeds(setDoc(doc(como("medico"), "presence", "medico"), { name: "Dra. Gómez", online: true, lastSeen: serverTimestamp() }));
  await assertFails(setDoc(doc(como("medico"), "presence", "medico2"), { name: "Suplantado", online: true }));
  await assertFails(setDoc(doc(como("medico"), "presence", "medico"), { name: "Dra. Gómez", role: "admin", isAdmin: true }));
});
