/**
 * seed-patients.mjs — Inyecta los 17 pacientes demo directamente en Firestore
 * Uso: node seed-patients.mjs <contraseña>
 * Ejemplo: node seed-patients.mjs miContraseña123
 */
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where, limit, serverTimestamp } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAsNUBDVXaU-L7kuM8nDfuiFyZtjAdjSAo",
  authDomain: "media-suite-6f432.firebaseapp.com",
  projectId: "media-suite-6f432",
  storageBucket: "media-suite-6f432.firebasestorage.app",
  messagingSenderId: "158351804051",
  appId: "1:158351804051:web:af7f68859b555025162f66"
};

const DEMO_PATIENTS = [
  {doc:"482951",name:"Carlos Rodríguez Mendez",age:"45",sex:"M",antecedentes:["Hipertensión arterial","Diabetes tipo 2"],alergias:["Sulfas"],medicacion:["Metformina 850mg","Losartán 50mg","Aspirina 100mg"],notes:"Paciente con DM2 e HTA controladas. Última HbA1c 7.2%. Ex-fumador 10 años. Control cardiológico anual."},
  {doc:"739264",name:"María López Garza",age:"67",sex:"F",antecedentes:["EPOC moderado","Insuficiencia cardíaca leve","Osteoporosis"],alergias:["Penicilina","AINES"],medicacion:["Salbutamol inhalador","Furosemida 40mg","Omeprazol 20mg","Calcio+D3"],notes:"EPOC estadio II GOLD. FEV1 62%. ICC compensada. SatO2 basal 94%. Hospitalización hace 8 meses por reagudización."},
  {doc:"156873",name:"Andrés Martínez Ruiz",age:"28",sex:"M",antecedentes:["Asma bronquial leve intermitente"],alergias:["Penicilina","Ibuprofeno"],medicacion:["Salbutamol a demanda"],notes:"Asma desencadenada por ejercicio y exposición a alérgenos. Sin hospitalización previa."},
  {doc:"624018",name:"Carmen Vega Torres",age:"55",sex:"F",antecedentes:["Hipotiroidismo primario","Depresión mayor","Obesidad grado I"],alergias:[],medicacion:["Levotiroxina 100mcg","Sertralina 50mg","Metformina 500mg"],notes:"Hipotiroidismo en tratamiento sustitutivo. TSH último control 2.8. Terapia psicológica activa."},
  {doc:"318745",name:"Laura Quintero Sánchez",age:"29",sex:"F",antecedentes:["Embarazo 32 semanas","Hipertensión gestacional","Preclampsia leve"],alergias:["Aspirina"],medicacion:["Metildopa 250mg","Calcio 1g","Ácido fólico 5mg","Hierro oral"],notes:"Gestante G2P1, 32 semanas. HTA gestacional en control. PA basal 140/90. Edemas en MMII."},
  {doc:"201983",name:"Samuel Ortiz Ramos",age:"8",sex:"M",antecedentes:["Asma bronquial moderada persistente","Rinitis alérgica"],alergias:["Penicilina","Polen","Ácaros"],medicacion:["Fluticasona inhalada 100mcg","Salbutamol rescate","Cetirizina 5mg"],notes:"Niño de 8 años con asma moderada persistente. Múltiples hospitalizaciones previas."},
  {doc:"574921",name:"Beatriz Herrera Molina",age:"72",sex:"F",antecedentes:["Demencia senil moderada","Fibrilación auricular","HTA","Insuficiencia renal crónica estadio 3"],alergias:["Contraste yodado","AINES"],medicacion:["Rivaroxabán 20mg","Amlodipino 5mg","Donepezilo 10mg","Omeprazol 20mg"],notes:"Paciente con deterioro cognitivo moderado. FA permanente anticoagulada. TFG estimada 42 ml/min."},
  {doc:"447632",name:"Diego Sarmiento Peña",age:"35",sex:"M",antecedentes:["Paraplejia espástica (lesión T6)","Vejiga neurógena","Infecciones urinarias a repetición"],alergias:["Sulfametoxazol"],medicacion:["Baclofeno 10mg","Oxibutinina 5mg","Vitamina D3","Omeprazol 20mg"],notes:"Paraplejia completa desde los 22 años. Usa silla de ruedas. Historia de 3 ITU en el último año."},
  {doc:"389017",name:"Valentina Ríos Castro",age:"15",sex:"F",antecedentes:["Diabetes tipo 1","Hipotiroidismo autoinmune"],alergias:[],medicacion:["Insulina glargina 18 UI/noche","Insulina lispro a razón de comida","Levotiroxina 50mcg"],notes:"Adolescente con DM1 diagnosticada a los 9 años. HbA1c 7.8%. Sin complicaciones crónicas."},
  {doc:"665248",name:"Roberto Cárdenas Gil",age:"52",sex:"M",antecedentes:["Epilepsia focal con generalización secundaria","Hepatitis B crónica","Depresión moderada"],alergias:["Carbamazepina"],medicacion:["Levetiracetam 1000mg c/12h","Ácido valproico 500mg c/12h","Tenofovir 300mg","Escitalopram 10mg"],notes:"Epilepsia con buen control. Última crisis hace 14 meses. HBsAg positivo, carga viral baja."},
  {doc:"512834",name:"Isabella Moreno Díaz",age:"6",sex:"F",antecedentes:["Cardiopatía congénita operada (CIV pequeña)","Anemia ferropénica"],alergias:["Amoxicilina"],medicacion:["Sulfato ferroso pediátrico","Vitamina C"],notes:"Niña de 6 años. CIV intervenida a los 3 años. Anemia en seguimiento nutricional. Sin limitaciones funcionales."},
  {doc:"103856",name:"María Fernanda Osorio Pérez",age:"34",sex:"F",antecedentes:["Embarazo 38 semanas","Preeclampsia severa","Placenta previa marginal","Anemia ferropénica severa (Hb 7.2 g/dL)"],alergias:["Ibuprofeno","Ketorolaco"],medicacion:["Labetalol 100mg c/8h","Nifedipino 30mg retard","Sulfato de magnesio","Hierro IV semanal","Ácido fólico 5mg"],notes:"Gestante G1P0, 38 semanas. Preeclampsia severa PA 165/105. Placenta previa. Hb 7.2. ALERTA: riesgo eclampsia."},
  {doc:"887234",name:"Tomás Galeano Ruiz",age:"4",sex:"M",antecedentes:["Asma bronquial grave persistente","Síndrome nefrótico en remisión parcial","Inmunosupresión por corticoides"],alergias:["Penicilina","Látex","Mariscos"],medicacion:["Prednisolona 1mg/kg/día","Fluticasona+Salmeterol inhalado","Salbutamol rescate","Montelukast 4mg","Cotrimoxazol profiláctico"],notes:"Niño de 4 años con asma grave, 4 hospitalizaciones previas. Inmunosuprimido. Peso 14 kg."},
  {doc:"294671",name:"Jorge Palomino Vera",age:"61",sex:"M",antecedentes:["IAM con STEMI anterior (hace 2 años)","Insuficiencia renal crónica estadio 4 (TFG 22)","EPOC severo (FEV1 38%)","Diabetes tipo 2 insulinorrequiriente","Polineuropatía diabética"],alergias:["Contraste yodado","Sulfas","Metamizol"],medicacion:["Insulina glargina 30 UI/noche","Insulina aspart","Carvedilol 25mg","Atorvastatina 40mg","Amlodipino 10mg","Sevelamer 800mg","Eritropoyetina SC","Tiotropio inhalado","Gabapentina 300mg c/8h"],notes:"Pluripatológico. FG 22, en lista de espera de diálisis. STEMI previo FE 38%. EPOC IV. HbA1c 9.1%. Úlcera plantar activa."},
  {doc:"563092",name:"Nadia Contreras Espinosa",age:"47",sex:"F",antecedentes:["Lupus eritematoso sistémico activo","Nefritis lúpica clase III","Hipertensión secundaria","Osteoporosis por corticoides","Depresión mayor recurrente"],alergias:["Sulfametoxazol","Cloroquina","AINES"],medicacion:["Micofenolato 1g c/12h","Prednisona 10mg","Hidroxicloroquina 200mg","Enalapril 10mg","Alendronato 70mg semanal","Calcio+D3","Escitalopram 20mg","Omeprazol 40mg"],notes:"LES SLEDAI-2K 8. Nefritis lúpica, proteinuria 1.2 g/24h. Inmunosuprimida. Fractura vertebral T11 previa."},
  {doc:"741583",name:"Fernando Castellanos Nieto",age:"19",sex:"M",antecedentes:["Ceguera congénita bilateral (atrofia óptica bilateral)","Hipoacusia neurosensorial leve izquierda"],alergias:[],medicacion:["Sin medicación habitual"],notes:"Ceguera congénita total. Hipoacusia leve izq. Independiente con bastón. Estudiante universitario. COMUNICACIÓN: orientar verbalmente en todo momento."},
  {doc:"930427",name:"Rosa Amparo Peñaloza",age:"78",sex:"F",antecedentes:["ACV isquémico silviano derecho (hace 3 años)","Enfermedad de Parkinson estadio III","Disfagia orofaríngea moderada","Desnutrición calórico-proteica","Fibrilación auricular permanente","HTA","Incontinencia urinaria"],alergias:["Metoclopramida","AINES"],medicacion:["Levodopa/Carbidopa 250/25mg c/6h","Pramipexol 1mg c/8h","Apixabán 2.5mg c/12h","Enalapril 5mg","Omeprazol 20mg","Espesante alimenticio","Calcio+D3"],notes:"Parkinson III + ACV. Hemiparesia izquierda. Disfagia: RIESGO BRONCOASPIRACIÓN. BMI 17.1. Anticoagulada."}
];

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error("\n❌  Uso: node seed-patients.mjs <contraseña>\n   Ejemplo: node seed-patients.mjs miPassword123\n");
    process.exit(1);
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const email = "mdq2804@gmail.com";

  console.log(`\n🏥  MedIA Suite — Seed de pacientes demo`);
  console.log(`🔐  Autenticando como ${email}...`);

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    console.log(`✅  Sesión OK\n`);

    let inserted = 0, skipped = 0;
    for (const p of DEMO_PATIENTS) {
      const q = query(collection(db, "historias"), where("doc", "==", p.doc), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        console.log(`⏭️  ${p.doc} · ${p.name} — ya existe`);
        skipped++;
        continue;
      }
      await addDoc(collection(db, "historias"), {
        ...p,
        createdAt: serverTimestamp(),
        userId: uid,
        userEmail: email
      });
      console.log(`✅  ${p.doc} · ${p.name}`);
      inserted++;
    }

    console.log(`\n🎉  ${inserted} insertados, ${skipped} ya existían`);
    console.log(`📋  Total en DEMO_PATIENTS: ${DEMO_PATIENTS.length}`);
  } catch (e) {
    console.error(`\n❌  Error: ${e.message}`);
    process.exit(1);
  }
  process.exit(0);
}

main();
