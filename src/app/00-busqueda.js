// 00-busqueda.js — Búsqueda de pacientes por nombre o documento.
//
// Firestore no busca texto parcial dentro de un campo, así que cada historia
// guarda "searchKeys": los prefijos de cada palabra del nombre (sin tildes ni
// mayúsculas) y del documento. Buscar "rodri" es entonces una consulta
// array-contains "rodri", que Firestore resuelve con su índice automático.
//
// Sin dependencias: lo usan la app, el modo demo y las pruebas (tests/busqueda.test.js).

const SEARCH_MIN = 2;        // letras mínimas para buscar por nombre
const SEARCH_MIN_DOC = 3;    // dígitos mínimos para buscar por documento
const SEARCH_MAX = 15;       // prefijo más largo que se guarda

function _normTxt(s){
  return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase()
    .replace(/[^a-z0-9ñ\s-]/g," ").replace(/-/g," ").trim();
}
function _normDoc(s){return String(s||"").toLowerCase().replace(/[^0-9a-z]/g,"");}
function _docForms(doc){const d=_normDoc(doc),n=d.replace(/\D/g,"");return[...new Set([d,n])].filter(Boolean);}

// Palabras del nombre (se ignoran "de", "la", etc. solo si son muy cortas: se exige SEARCH_MIN)
function _nameWords(name){return _normTxt(name).split(/\s+/).filter(w=>w.length>=SEARCH_MIN);}

function _searchKeys(name,doc){
  const keys=new Set();
  for(const w of _nameWords(name)){
    for(let i=SEARCH_MIN;i<=Math.min(w.length,SEARCH_MAX);i++)keys.add(w.slice(0,i));
  }
  // Documento tal cual (p. ej. "ti1098765") y solo sus dígitos ("1098765")
  for(const d of _docForms(doc)){
    for(let i=SEARCH_MIN_DOC;i<=Math.min(d.length,SEARCH_MAX);i++)keys.add(d.slice(0,i));
  }
  return[...keys];
}

// Convierte lo escrito en la caja en términos de búsqueda.
// Devuelve null si todavía no hay suficiente texto.
function _parseSearch(q){
  const raw=String(q||"").trim();
  if(/^[\d.\s-]+$/.test(raw)){                      // solo números: documento
    const d=_normDoc(raw);
    return d.length>=SEARCH_MIN_DOC?{tipo:"doc",terms:[d],key:d.slice(0,SEARCH_MAX)}:null;
  }
  const terms=_normTxt(raw).split(/\s+/).filter(w=>w.length>=SEARCH_MIN);
  if(!terms.length)return null;
  // Se consulta Firestore con el término más largo (el más selectivo); el resto se filtra aquí
  const key=[...terms].sort((a,b)=>b.length-a.length)[0].slice(0,SEARCH_MAX);
  return{tipo:"nombre",terms,key};
}

// ¿La historia coincide con todos los términos? Cada término debe ser el inicio
// de alguna palabra del nombre o del documento.
function _matchesSearch(hc,parsed){
  if(!parsed)return false;
  const words=_nameWords(hc.name);
  const docs=_docForms(hc.doc);
  return parsed.terms.every(t=>docs.some(d=>d.startsWith(t))||words.some(w=>w.startsWith(t)));
}
