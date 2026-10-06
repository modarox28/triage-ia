// 00-iconos.js — Íconos de línea de toda la app (estilo Lucide, licencia ISC).
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden desde index.html.
//
// Además de _icon(), aquí vive el reemplazo de emojis: la app tenía cientos de
// emojis repartidos en botones, alertas y opciones. En vez de editar cada texto,
// _iconize() cambia cada emoji conocido por su ícono SVG (o por un punto de color
// en el caso de 🔴🟡🟢) en todo lo que se muestra en pantalla, también en lo que
// se agrega después. Los emojis sin equivalente se quitan.

const _ICON_PATHS={
  // Navegación
  dash:'<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  triage:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  cola:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  meds:'<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
  hc:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  hist:'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  scores:'<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>',
  config:'<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
  more:'<circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/>',
  // Generales
  alert:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  clipboard:'<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  medical:'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/>',
  zap:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  heart:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  wind:'<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>',
  thermo:'<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
  siren:'<path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"/><path d="M21 12h1"/><path d="M18.5 4.5 18 5"/><path d="M2 12h1"/><path d="M12 2v1"/><path d="m4.929 4.929.707.707"/><path d="M12 12v6"/>',
  clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  camera:'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  phone:'<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
  folder:'<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  mic:'<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
  search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  steth:'<path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>',
  xcircle:'<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  check:'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  trash:'<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  pin:'<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  crown:'<path d="M2 18 4 6l5 5 3-7 3 7 5-5 2 12Z"/>',
  eye:'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  share:'<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>',
  lock:'<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  globe:'<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  cpu:'<rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  chart:'<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>',
  drop:'<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  bandage:'<path d="M10 10.01h.01"/><path d="M10 14.01h.01"/><path d="M14 10.01h.01"/><path d="M14 14.01h.01"/><path d="M18 6v12"/><path d="M6 6v12"/><rect x="2" y="6" width="20" height="12" rx="2"/>',
  target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  flask:'<path d="M9 3h6"/><path d="M10 9V3"/><path d="M14 9V3"/><path d="M6.6 21h10.8a1 1 0 0 0 .9-1.4L14 9h-4L5.7 19.6a1 1 0 0 0 .9 1.4Z"/>',
  save:'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  refresh:'<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>',
  tag:'<path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/>',
  stop:'<rect width="14" height="14" x="5" y="5" rx="1"/>',
  help:'<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  message:'<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  hand:'<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
};
function _icon(name,size=24){
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${_ICON_PATHS[name]||""}</svg>`;
}

// Emoji → ícono ("dot-*" = punto de color; "" = se quita)
const _EMOJI_ICON={
  "⚠️":"alert","⚠":"alert","🚨":"siren","🚑":"siren","📋":"clipboard","📝":"clipboard",
  "🏥":"medical","🏨":"medical","⚕️":"steth","🩺":"steth","👨‍⚕️":"steth","👩‍⚕️":"steth",
  "💊":"meds","💉":"flask","🧪":"flask","🔬":"flask","🧠":"zap","⚡":"zap",
  "💔":"heart","🫀":"heart","💛":"heart","🫁":"wind","🌬️":"wind","🌡️":"thermo","🤒":"thermo","🥶":"thermo","🔥":"thermo",
  "⏳":"clock","⏱":"clock","⏱️":"clock","⏰":"clock","📷":"camera","📸":"camera","📲":"phone","📱":"phone","📞":"phone",
  "📄":"hc","🗂️":"folder","🗂":"folder","🎤":"mic","🗣️":"message","🗣":"message","🔍":"search","🔎":"search",
  "❌":"xcircle","🚫":"xcircle","⛔":"xcircle","✅":"check","✔️":"check",
  "👤":"user","👨":"user","👩":"user","🙋":"user","🧑":"user","👴":"user","👵":"user","👦":"user","👧":"user","👶":"user","🧒":"user","🤰":"user","♿":"user","🚶":"user",
  "🌙":"moon","☀️":"sun","☀":"sun","🗑️":"trash","🗑":"trash","📍":"pin","👑":"crown","👁️":"eye","👁":"eye","👀":"eye",
  "📤":"share","🔐":"lock","🔑":"lock","🔒":"lock","🌐":"globe","🤖":"cpu","✨":"cpu","💡":"cpu","✏️":"edit","✏":"edit",
  "📊":"chart","📉":"chart","📈":"chart","🩸":"drop","💧":"drop","🤕":"bandage","🩹":"bandage","🦵":"bandage","🩻":"bandage",
  "🤢":"target","🤮":"target","🌀":"target","🔔":"bell","💾":"save","🔄":"refresh","🏷️":"tag","⏹":"stop","⏹️":"stop",
  "❓":"help","✊":"hand","😴":"moon","😰":"alert","🔧":"config","⬅":"logout","⬅️":"logout","🎨":"",
  "🔴":"dot-r","🟡":"dot-y","🟢":"dot-g","⚫":"dot-k","⚪":"dot-w","🟠":"dot-o","🔵":"dot-b",
};
const _EMOJI_KEYS=Object.keys(_EMOJI_ICON).sort((a,b)=>b.length-a.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
// Conocidos primero; luego banderas y cualquier otro pictograma (con sus variantes y uniones)
const _EMOJI_RE=new RegExp(`(${_EMOJI_KEYS.join("|")})|([\\u{1F1E6}-\\u{1F1FF}]{2})|(\\p{Extended_Pictographic}(?:\\uFE0F|\\u200D\\p{Extended_Pictographic}\\uFE0F?)*)`,"gu");
const _EMOJI_TEST=/[\u{1F1E6}-\u{1F1FF}]|\p{Extended_Pictographic}/u;
// Símbolos tipográficos que se dejan como texto
const _EMOJI_KEEP=new Set(["©","®","™","↔","↕","♂","♀","☰","✓","✔","✕","✗","✖","⇒","↩","↪","▶","◀","⬆","⬇"]);
const _NO_ICON_TAGS=new Set(["SCRIPT","STYLE","TEXTAREA","SVG","CODE","PRE"]);

function _emojiFragment(text){
  const frag=document.createDocumentFragment();let last=0,changed=false;
  text.replace(_EMOJI_RE,(m,known,flag,other,off)=>{
    if(!known&&_EMOJI_KEEP.has(m.replace(/️/g,"")))return m;
    changed=true;
    if(off>last)frag.appendChild(document.createTextNode(text.slice(last,off)));
    last=off+m.length;
    const name=known?_EMOJI_ICON[known]:"";
    if(!name)return m;
    const s=document.createElement("span");
    if(name.startsWith("dot-")){s.className="ic-dot "+name;}
    else{s.className="ic";s.innerHTML=_icon(name);}
    s.setAttribute("aria-hidden","true");
    frag.appendChild(s);
    return m;
  });
  if(!changed)return null;
  if(last<text.length)frag.appendChild(document.createTextNode(text.slice(last)));
  return frag;
}
function _stripEmoji(text){
  return text.replace(_EMOJI_RE,(m)=>_EMOJI_KEEP.has(m.replace(/️/g,""))?m:"").replace(/^\s+/,"").replace(/\s{2,}/g," ");
}
function _iconizeText(node){
  const p=node.parentNode;
  if(!p||_NO_ICON_TAGS.has(p.nodeName.toUpperCase())||(p.closest&&p.closest("[data-no-icon],svg")))return;
  if(!_EMOJI_TEST.test(node.nodeValue))return;
  if(p.nodeName==="OPTION"||p.nodeName==="TITLE"){node.nodeValue=_stripEmoji(node.nodeValue);return;}
  const frag=_emojiFragment(node.nodeValue);
  if(frag)p.replaceChild(frag,node);
}
function _iconize(root){
  if(!root)return;
  if(root.nodeType===3){_iconizeText(root);return;}
  if(root.nodeType!==1||_NO_ICON_TAGS.has(root.nodeName.toUpperCase()))return;
  // Atributos visibles como texto
  const els=[root,...root.querySelectorAll("[placeholder],[title],[aria-label]")];
  for(const el of els){
    for(const a of ["placeholder","title","aria-label"]){
      const v=el.getAttribute&&el.getAttribute(a);
      if(v&&_EMOJI_TEST.test(v))el.setAttribute(a,_stripEmoji(v));
    }
  }
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];while(w.nextNode())nodes.push(w.currentNode);
  nodes.forEach(_iconizeText);
}
// Aplica a todo lo que ya está en pantalla y a lo que se agregue después
function _startIconize(){
  _iconize(document.body);
  new MutationObserver(muts=>{
    for(const m of muts){
      if(m.type==="characterData")_iconizeText(m.target);
      else m.addedNodes.forEach(_iconize);
    }
  }).observe(document.body,{childList:true,subtree:true,characterData:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",_startIconize);
else _startIconize();
