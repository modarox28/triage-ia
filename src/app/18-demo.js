// 18-demo.js — Modo demo: la app completa sin registro, con datos ficticios.
// Reemplaza Firebase (FB) por una base de datos en memoria con la misma API que
// usa la app. No toca Firestore real: nada se guarda y todo se reinicia al salir.
// Se activa con el botón "Probar demo" o abriendo la app con ?demo=1.

window._demoMode=false;

// ── Timestamp compatible con Firestore ───────────────────────
class _DemoTS{
  constructor(ms){this._ms=ms;this.seconds=Math.floor(ms/1000);this.nanoseconds=0;}
  toDate(){return new Date(this._ms);}
  toMillis(){return this._ms;}
  valueOf(){return this._ms;}
}
function _demoVal(v){ // valor comparable para where/orderBy
  if(v instanceof _DemoTS)return v._ms;
  if(v instanceof Date)return v.getTime();
  return v;
}
function _demoClone(o){ // copia profunda que conserva los timestamps
  if(o instanceof _DemoTS)return o;
  if(Array.isArray(o))return o.map(_demoClone);
  if(o&&typeof o==="object"){const r={};for(const k in o)r[k]=_demoClone(o[k]);return r;}
  return o;
}

function _makeDemoFB(user,seed){
  const store=new Map();            // colección -> Map(id -> datos)
  const listeners=new Set();
  let seq=0;
  const col=c=>{if(!store.has(c))store.set(c,new Map());return store.get(c);};
  const newId=()=>"demo"+Date.now().toString(36)+(seq++).toString(36);
  const NOW={__now:true};
  const resolveNow=d=>{const r={};for(const k in d)r[k]=d[k]===NOW?new _DemoTS(Date.now()):d[k];return r;};
  const docSnap=(c,id)=>{
    const data=col(c).get(id);
    return{id,ref:{type:"doc",c,id},exists:()=>data!==undefined,data:()=>data===undefined?undefined:_demoClone(data),
      metadata:{fromCache:false,hasPendingWrites:false}};
  };
  const runQuery=q=>{
    const c=q.c;const cons=q.cons||[];
    let rows=[...col(c).entries()].map(([id,d])=>({id,d}));
    for(const w of cons.filter(x=>x.k==="where")){
      rows=rows.filter(({d})=>{
        const a=_demoVal(d[w.f]),b=_demoVal(w.v);
        switch(w.op){
          case "==":return a===b;case "!=":return a!==b;
          case ">=":return a>=b;case "<=":return a<=b;case ">":return a>b;case "<":return a<b;
          case "in":return Array.isArray(w.v)&&w.v.includes(a);
          case "array-contains":return Array.isArray(d[w.f])&&d[w.f].includes(w.v);
          default:return true;
        }
      });
    }
    for(const o of cons.filter(x=>x.k==="orderBy").reverse()){
      const dir=o.dir==="desc"?-1:1;
      rows.sort((x,y)=>{const a=_demoVal(x.d[o.f]),b=_demoVal(y.d[o.f]);return a===b?0:(a>b?dir:-dir);});
    }
    const lim=cons.find(x=>x.k==="limit");if(lim)rows=rows.slice(0,lim.n);
    const docs=rows.map(({id})=>docSnap(c,id));
    return{docs,size:docs.length,empty:!docs.length,forEach:f=>docs.forEach(f),metadata:{fromCache:false,hasPendingWrites:false}};
  };
  const snapshotOf=t=>t.type==="doc"?docSnap(t.c,t.id):runQuery(t.type==="col"?{c:t.c,cons:[]}:t);
  const notify=()=>setTimeout(()=>listeners.forEach(l=>{try{l.cb(snapshotOf(l.t));}catch(e){console.error(e);}}),0);
  const write=(c,id,data,merge)=>{
    const prev=col(c).get(id);
    col(c).set(id,_demoClone(resolveNow(merge&&prev?{...prev,...data}:data)));
    notify();
  };
  const notAvailable=()=>Promise.reject({code:"demo/no-disponible",message:"No disponible en el modo demo"});

  // Datos iniciales
  for(const [c,docs] of Object.entries(seed))for(const [id,d] of Object.entries(docs))col(c).set(id,_demoClone(d));

  const auth={currentUser:user};
  let authCb=null;
  return{
    _demo:true,auth,db:{},gProvider:{},
    doc:(_db,c,id)=>({type:"doc",c,id}),
    collection:(_db,c)=>({type:"col",c}),
    query:(colRef,...cons)=>({type:"q",c:colRef.c,cons}),
    where:(f,op,v)=>({k:"where",f,op,v}),
    orderBy:(f,dir="asc")=>({k:"orderBy",f,dir}),
    limit:n=>({k:"limit",n}),
    serverTimestamp:()=>NOW,
    getDoc:async ref=>docSnap(ref.c,ref.id),
    getDocs:async q=>runQuery(q.type==="col"?{c:q.c,cons:[]}:q),
    setDoc:async(ref,data,opts)=>write(ref.c,ref.id,data,!!opts?.merge),
    addDoc:async(colRef,data)=>{const id=newId();write(colRef.c,id,data,false);return{id};},
    updateDoc:async(ref,data)=>{if(!col(ref.c).has(ref.id))throw new Error("Documento no encontrado");write(ref.c,ref.id,data,true);},
    deleteDoc:async ref=>{col(ref.c).delete(ref.id);notify();},
    onSnapshot:(t,cb,_err)=>{
      const l={t,cb};listeners.add(l);
      setTimeout(()=>{if(listeners.has(l))cb(snapshotOf(t));},0);
      return()=>listeners.delete(l);
    },
    onAuthStateChanged:(_a,cb)=>{authCb=cb;setTimeout(()=>cb(user),0);return()=>{authCb=null;};},
    signOut:async()=>{_exitDemo();},
    setPersistence:async()=>{},browserLocalPersistence:{},browserSessionPersistence:{},
    signInWithEmailAndPassword:notAvailable,createUserWithEmailAndPassword:notAvailable,
    signInWithPopup:notAvailable,sendPasswordResetEmail:notAvailable,updatePassword:notAvailable,
    reauthenticateWithCredential:notAvailable,updateProfile:notAvailable,
    EmailAuthProvider:{credential:()=>({})},
  };
}

// ── Datos ficticios ──────────────────────────────────────────
function _demoSeed(uid){
  const now=Date.now(),min=60000;
  const ts=m=>new _DemoTS(now-m*min);
  const users={
    [uid]:{name:"Usuario Demo",email:"demo@media-suite.app",role:"admin",createdAt:ts(60*24*30)},
    "demo-med-1":{name:"Dra. Laura Gómez",email:"laura.gomez@hospital.demo",role:"medico",especialidad:"Urgencias",createdAt:ts(60*24*20)},
    "demo-med-2":{name:"Dr. Andrés Pérez",email:"andres.perez@hospital.demo",role:"medico",especialidad:"Medicina interna",createdAt:ts(60*24*12)},
    "demo-hosp":{name:"Coordinación Hospital Demo",email:"coordinacion@hospital.demo",role:"admin_hosp",createdAt:ts(60*24*25)},
    "demo-pend-1":{name:"Dr. Julián Ríos",email:"julian.rios@hospital.demo",role:"pendiente",especialidad:"Pediatría",createdAt:ts(40)},
    "demo-pend-2":{name:"Dra. Sofía Martínez",email:"sofia.martinez@hospital.demo",role:"pendiente",especialidad:"Ginecología",createdAt:ts(15)},
  };
  const historias={};
  (typeof DEMO_PATIENTS!=="undefined"?DEMO_PATIENTS:[]).forEach((p,i)=>{
    historias["demo-hc-"+i]={...p,userId:uid,telefono:"+57 300 000 "+String(1000+i),createdAt:ts(60*24*(i+1))};
  });
  const T=(m,o)=>({userId:"demo-med-1",userName:"Dra. Laura Gómez",userRole:"medico",userEmail:"laura.gomez@hospital.demo",
    tipo:"adulto",dolor:0,notas:"",atendido:false,createdAt:ts(m),...o});
  const triages={
    "demo-t1":T(8,{clasificacion:"ROJO",motivo:"dolor_pecho",dolor:9,vit:{fc:118,ps:88,pd:54,sat:91,fr:26,tem:36.8},
      pacienteNombre:"Carlos Rodríguez Mendez",notas:"Dolor opresivo retroesternal irradiado a brazo izquierdo, diaforesis.",
      justificacion:"Dolor torácico típico con hipotensión y taquicardia: sospecha de síndrome coronario agudo.",
      acciones:["ECG de 12 derivaciones inmediato","Monitorización continua","Acceso venoso y troponinas","Aspirina 300 mg si no hay contraindicación"]}),
    "demo-t2":T(22,{clasificacion:"AMARILLO",motivo:"disnea",dolor:3,vit:{fc:104,ps:132,pd:84,sat:93,fr:24,tem:37.9},
      userId:"demo-med-2",userName:"Dr. Andrés Pérez",notas:"Disnea progresiva de 2 días, tos productiva.",
      justificacion:"Disnea moderada con saturación limítrofe y fiebre: probable neumonía adquirida en la comunidad.",
      acciones:["Radiografía de tórax","Hemograma y PCR","Oxígeno para SpO2 > 94%"]}),
    "demo-t3":T(35,{clasificacion:"VERDE",motivo:"fiebre",tipo:"nino",dolor:2,vit:{fc:110,ps:100,pd:65,sat:98,fr:22,tem:38.4},
      notas:"Fiebre de 24 h, buen estado general, tolera vía oral.",
      justificacion:"Fiebre sin signos de alarma en paciente pediátrico estable.",acciones:["Antipirético según peso","Hidratación oral","Control en 24-48 h"]}),
    "demo-t4":T(50,{clasificacion:"AMARILLO",motivo:"abdominal",tipo:"embarazada",semanas:30,dolor:6,vit:{fc:96,ps:128,pd:82,sat:98,fr:18,tem:37.1},
      justificacion:"Dolor abdominal en gestante de 30 semanas: requiere valoración obstétrica prioritaria.",
      acciones:["Monitoreo fetal","Valoración por ginecoobstetricia","Uroanálisis"]}),
    "demo-t5":T(75,{clasificacion:"VERDE",motivo:"otro",tipo:"adulto_mayor",dolor:1,vit:{fc:78,ps:138,pd:80,sat:96,fr:16,tem:36.6},
      atendido:true,atendidoAt:ts(60),atendidoPor:"Dr. Andrés Pérez",
      justificacion:"Consulta por control de presión arterial, sin síntomas de alarma.",acciones:["Control ambulatorio"]}),
    "demo-t6":T(110,{clasificacion:"ROJO",motivo:"neuro",dolor:0,vit:{fc:92,ps:182,pd:104,sat:95,fr:18,tem:36.9},
      atendido:true,atendidoAt:ts(100),atendidoPor:"Dra. Laura Gómez",
      notas:"Desviación de comisura labial y debilidad en brazo derecho de inicio hace 40 min.",
      justificacion:"Déficit neurológico focal agudo dentro de ventana terapéutica: código ACV.",
      acciones:["Activar código ACV","TAC cerebral simple urgente","Glucometría"]}),
    "demo-t7":T(140,{clasificacion:"VERDE",motivo:"trauma",dolor:4,vit:{fc:84,ps:124,pd:78,sat:99,fr:16,tem:36.5},
      userId:"demo-med-2",userName:"Dr. Andrés Pérez",atendido:true,atendidoAt:ts(130),atendidoPor:"Dr. Andrés Pérez",
      justificacion:"Esguince de tobillo sin deformidad ni compromiso neurovascular.",acciones:["Radiografía si reglas de Ottawa positivas","Hielo y elevación"]}),
  };
  const prehospital={
    "demo-p1":{age:67,sex:"M",mechanism:"Dolor torácico en domicilio",vitals:{fc:110,pa:"95/60",sat:92,fr:24},treatment:"Aspirina 300 mg",eta:10,
      userId:uid,userName:"Ambulancia 12",createdAt:ts(5)},
  };
  return{users,historias,triages,prehospital,presence:{},auditLogs:{}};
}

// ── Entrar y salir ───────────────────────────────────────────
function startDemo(){
  if(window._demoMode)return;
  window._demoMode=true;
  const uid="demo-admin";
  const user={uid,email:"demo@media-suite.app",displayName:"Usuario Demo",providerData:[{providerId:"password"}]};
  FB=_makeDemoFB(user,_demoSeed(uid));
  try{localStorage.setItem("ms_role_"+uid,"admin");}catch(_){}
  _showDemoBanner();
  initAuth();
}
function _exitDemo(){
  const url=new URL(window.location.href);url.searchParams.delete("demo");
  window.location.replace(url.toString());
}
function _showDemoBanner(){
  if(document.getElementById("demoBanner"))return;
  const b=document.createElement("div");
  b.id="demoBanner";
  b.style.cssText="position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 84px);z-index:9998;background:var(--yw);color:#1a1300;font-size:.72rem;font-weight:700;padding:6px 8px 6px 12px;border-radius:20px;box-shadow:0 4px 16px rgba(0,0,0,.35);display:flex;gap:8px;align-items:center;max-width:calc(100% - 32px)";
  b.innerHTML='<span>👀 MODO DEMO · datos ficticios, nada se guarda</span><button type="button" onclick="_exitDemo()" style="background:#1a1300;color:var(--yw);border:none;border-radius:12px;padding:3px 10px;font-size:.68rem;font-weight:700;cursor:pointer">Salir</button>';
  document.body.appendChild(b);
}

// Enlace directo: https://media-suite-6f432.web.app/?demo=1
if(new URLSearchParams(window.location.search).has("demo")){
  window.addEventListener("load",()=>setTimeout(startDemo,50));
}
