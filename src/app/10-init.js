// 10-init.js — Arranque: alarmas y service worker
// Script clásico: comparte el ámbito global con los demás archivos de src/app,
// que se cargan en orden numérico desde index.html.
// INIT
MEDS.forEach(m=>{if(m.active)sAlarm(m);});
if("serviceWorker" in navigator){
  let _swReloading=false;
  function _swReload(){if(!_swReloading){_swReloading=true;window.location.reload();}}

  navigator.serviceWorker.register("./sw.js").then(reg=>{
    reg.update();
    setInterval(()=>reg.update(),30000);
    // Detecta cuando se instala un SW nuevo y recarga cuando activa (crítico para iOS)
    reg.addEventListener("updatefound",()=>{
      const nw=reg.installing;
      if(!nw)return;
      nw.addEventListener("statechange",()=>{if(nw.state==="activated")_swReload();});
    });
  }).catch(()=>{});

  // Fallback 1: controllerchange (Android/Chrome)
  navigator.serviceWorker.addEventListener("controllerchange",_swReload);

  // Fallback 2: mensaje directo del SW (disparado en activate)
  navigator.serviceWorker.addEventListener("message",e=>{
    if(e.data&&e.data.type==="SW_UPDATED")_swReload();
  });

  // Fallback 3: cada vez que la PWA vuelve al foco verifica actualizaciones
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible"){
      navigator.serviceWorker.getRegistration().then(reg=>{if(reg)reg.update();}).catch(()=>{});
    }
  });
}

