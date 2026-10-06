/**
 * MedIA Suite — Firestore Triages Data Layer
 * All Firestore CRUD for the "triages" collection. No UI, no side effects.
 * @module src/firebase/triages
 */

/** Save a triage document (caller must include createdAt/syncedAt fields). */
export async function saveTriage(FB,data){
  return FB.addDoc(FB.collection(FB.db,"triages"),data);
}

/**
 * Mark a triage as attended / un-attended.
 * @param {string} userName - display name of the user performing the action
 */
export async function updateTriageAttended(FB,id,done,userName){
  return FB.updateDoc(FB.doc(FB.db,"triages",id),{
    atendido:done,
    atendidoAt:done?FB.serverTimestamp():null,
    atendidoPor:done?userName:"",
  });
}

/**
 * Load triage history (newest first).
 * @returns {{empty:boolean, docs:Object[]}}
 */
export async function getTriagesHistory(FB,limitN=100){
  const snap=await FB.getDocs(FB.query(
    FB.collection(FB.db,"triages"),
    FB.orderBy("createdAt","desc"),
    FB.limit(limitN)
  ));
  return{empty:snap.empty,docs:snap.docs.map(d=>({_id:d.id,...d.data()}))};
}

/**
 * Attempt to sync every item in `queue` to Firestore.
 * @returns {Object[]} items that still failed (to be kept in local queue)
 */
export async function syncOfflineQueue(FB,queue){
  const remaining=[];
  for(const item of queue){
    try{await FB.addDoc(FB.collection(FB.db,"triages"),{...item,syncedAt:FB.serverTimestamp()});}
    catch(e){remaining.push(item);}
  }
  return remaining;
}

/**
 * Subscribe to the live triage queue (last 12 h, max 60 docs).
 * @param {Date} since - lower bound for createdAt filter
 * @param {(docs:Object[])=>void} onUpdate - called with `{id,...data}[]` on every change
 * @param {(err:Error)=>void} onError
 * @returns {()=>void} unsubscribe function
 */
export function subscribeTriageQueue(FB,since,onUpdate,onError){
  const q=FB.query(
    FB.collection(FB.db,"triages"),
    FB.where("createdAt",">=",since),
    FB.orderBy("createdAt","desc"),
    FB.limit(60)
  );
  return FB.onSnapshot(q,snap=>onUpdate(snap.docs.map(d=>({id:d.id,...d.data()}))),onError);
}
